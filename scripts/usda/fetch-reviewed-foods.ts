import fs from "node:fs/promises";
import path from "node:path";

import {
  buildFoodCatalogPilotLockFile,
  buildPilotLockRecordFromDetailResponse,
  hasSecretLikeValue,
  validateFoodCatalogPilotManifest,
} from "../../src/lib/usda/catalog-pilot";
import { loadLocalEnvFile } from "./env";
import { FOOD_CATALOG_PILOT_MANIFEST } from "./food-catalog-manifest";
import { getUsdaFoodDetailRawForScript } from "./usda-api";

function resolvePreparationState(description: string): string {
  const normalized = description.toLowerCase();
  if (normalized.includes("raw")) {
    return "raw";
  }
  if (
    normalized.includes("cooked") ||
    normalized.includes("roasted") ||
    normalized.includes("broiled") ||
    normalized.includes("baked") ||
    normalized.includes("boiled") ||
    normalized.includes("fried") ||
    normalized.includes("steamed")
  ) {
    return "cooked";
  }
  return "neutral";
}

function asFlagCell(flags: string[]): string {
  if (flags.length === 0) {
    return "—";
  }
  return flags.join("; ").replace(/\|/g, "\\|");
}

function buildReviewMarkdown(records: ReturnType<typeof buildFoodCatalogPilotLockFile>["records"]): string {
  const lines: string[] = [];
  lines.push("# USDA Common Catalog Reviewed Manifest Review Table");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| Target | FDC ID | Description | Data Type | Raw/Cooked State | kcal/100g | Protein/100g | Carbs/100g | Fat/100g | Serving Gram Basis | Warning Flags | Selection Rationale |");
  lines.push("| --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |");
  for (const record of records) {
    const servingBasis =
      record.servingWeightGrams !== null
        ? `${record.servingWeightGrams} g`
        : record.sourcePortions.find((portion) => portion.isUsableForGramConversion)?.gramWeight !== null
          ? `${record.sourcePortions.find((portion) => portion.isUsableForGramConversion)?.gramWeight} g (source portion)`
          : "none";
    lines.push(
      `| ${record.target.replace(/\|/g, "\\|")} | ${record.fdcId} | ${record.description.replace(/\|/g, "\\|")} | ${record.dataType} | ${resolvePreparationState(record.description)} | ${record.nutrientsPer100g.calories_kcal} | ${record.nutrientsPer100g.protein_g} | ${record.nutrientsPer100g.carbohydrate_g} | ${record.nutrientsPer100g.fat_g} | ${servingBasis} | ${asFlagCell(record.warnings)} | ${(record.notes ?? "").replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function assertReviewGate(records: ReturnType<typeof buildFoodCatalogPilotLockFile>["records"]): void {
  const problems: string[] = [];
  const descriptions = new Set<string>();

  for (const record of records) {
    if (record.nutrientsPer100g.calories_kcal < 0) {
      problems.push(`Negative calories detected for ${record.fdcId}.`);
    }
    if (record.nutrientsPer100g.protein_g < 0) {
      problems.push(`Negative protein detected for ${record.fdcId}.`);
    }
    if (record.nutrientsPer100g.carbohydrate_g < 0) {
      problems.push(`Negative carbohydrate detected for ${record.fdcId}.`);
    }
    if (record.nutrientsPer100g.fat_g < 0) {
      problems.push(`Negative fat detected for ${record.fdcId}.`);
    }
    if (record.nutrientDiagnostics.calories_kcal.sourceNutrientId === 1062) {
      problems.push(`kJ nutrient was selected as calories for ${record.fdcId}.`);
    }
    if (record.nutrientDiagnostics.calories_kcal.sourceNutrientId === null) {
      problems.push(`Missing selected calorie nutrient for ${record.fdcId}.`);
    }
    const normalizedDescription = record.description.trim().toLowerCase();
    if (descriptions.has(normalizedDescription)) {
      problems.push(`Duplicate description detected in pilot lock: ${record.description}`);
    }
    descriptions.add(normalizedDescription);
  }

  if (problems.length > 0) {
    throw new Error(`Review gate failed:\n- ${problems.join("\n- ")}`);
  }
}

async function main(): Promise<void> {
  loadLocalEnvFile();
  validateFoodCatalogPilotManifest(FOOD_CATALOG_PILOT_MANIFEST);

  const records = [];
  for (const manifestRecord of FOOD_CATALOG_PILOT_MANIFEST.records) {
    try {
      const detail = await getUsdaFoodDetailRawForScript(manifestRecord.fdcId);
      const lockRecord = buildPilotLockRecordFromDetailResponse({
        manifestRecord,
        detailResponse: detail,
        retrievedAtIso: new Date().toISOString(),
      });
      records.push(lockRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown USDA fetch error.";
      throw new Error(`Failed at fdcId=${manifestRecord.fdcId} target='${manifestRecord.target}': ${message}`);
    }
  }

  const lockFile = buildFoodCatalogPilotLockFile({
    manifest: FOOD_CATALOG_PILOT_MANIFEST,
    records,
    generatedAt: "2026-07-20T22:45:00.000Z",
  });

  assertReviewGate(lockFile.records);

  const outputDir = path.join(process.cwd(), "scripts", "usda", "generated");
  const lockPath = path.join(outputDir, "food-catalog-reviewed.lock.json");
  const reviewPath = path.join(outputDir, "food-catalog-reviewed.review.md");

  const lockJson = `${JSON.stringify(lockFile, null, 2)}\n`;
  if (hasSecretLikeValue(lockJson)) {
    throw new Error("Secret-like value detected in lock file output.");
  }

  await fs.writeFile(lockPath, lockJson, "utf8");
  await fs.writeFile(reviewPath, `${buildReviewMarkdown(lockFile.records)}\n`, "utf8");

  console.log(`Wrote lock file: ${path.relative(process.cwd(), lockPath)}`);
  console.log(`Wrote review table: ${path.relative(process.cwd(), reviewPath)}`);
  console.log(`Reviewed catalog record count: ${lockFile.records.length}`);
}

void main();
