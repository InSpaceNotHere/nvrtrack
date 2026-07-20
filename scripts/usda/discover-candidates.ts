import fs from "node:fs/promises";
import path from "node:path";

import { hasRequiredMacroNutrients } from "../../src/lib/usda/nutrients";
import { matchesPreparationExpectation } from "../../src/lib/usda/catalog-pilot";
import type { NormalizedUsdaFoodSummary } from "../../src/lib/usda/types";
import { loadLocalEnvFile } from "./env";
import { PILOT_DISCOVERY_TARGETS, type PilotDiscoveryTarget } from "./pilot-targets";
import { searchUsdaFoodsForScript } from "./usda-api";

interface CandidateSummary {
  rank: number;
  fdcId: number;
  description: string;
  dataType: string;
  brand: string | null;
  sourcePublishedDate: string | null;
  sourceModifiedDate: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  servingWeightGrams: number | null;
  nutrientSummary: {
    calories_kcal: number | null;
    protein_g: number | null;
    carbohydrate_g: number | null;
    fat_g: number | null;
  };
  flags: string[];
  rankingExplanation: string[];
}

interface TargetCandidateReport {
  targetId: string;
  target: string;
  query: string;
  category: string;
  preparationExpectation: string;
  reviewedAt: string;
  candidates: CandidateSummary[];
}

function hasAnyBrandSignal(candidate: NormalizedUsdaFoodSummary): boolean {
  return Boolean(candidate.brandName || candidate.brandOwner || candidate.gtinUpc);
}

function scoreCandidate(target: PilotDiscoveryTarget, candidate: NormalizedUsdaFoodSummary): {
  score: number;
  explanation: string[];
  flags: string[];
} {
  let score = 0;
  const explanation: string[] = [];
  const flags: string[] = [];

  const descriptionLower = candidate.description.toLowerCase();
  const normalizedQuery = target.query.toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  if (descriptionLower === normalizedQuery) {
    score += 80;
    explanation.push("Exact normalized description match.");
  } else if (descriptionLower.startsWith(normalizedQuery)) {
    score += 55;
    explanation.push("Description starts with query.");
  } else if (queryTerms.every((term) => descriptionLower.includes(term))) {
    score += 40;
    explanation.push("All query terms found in description.");
  } else {
    const termHits = queryTerms.filter((term) => descriptionLower.includes(term)).length;
    score += termHits * 5;
    explanation.push(`Partial query-term overlap (${termHits}/${queryTerms.length}).`);
  }

  if (target.preferredDataTypes.includes(candidate.dataType)) {
    score += 25;
    explanation.push(`Preferred data type (${candidate.dataType}).`);
  } else {
    score -= 30;
    flags.push(`Data type '${candidate.dataType}' is outside preferred set.`);
  }

  if (hasRequiredMacroNutrients(candidate.nutrientsPer100g)) {
    score += 20;
    explanation.push("Core nutrients are available.");
  } else {
    score -= 80;
    flags.push("Missing at least one required core nutrient (kcal/protein/carbs/fat).");
  }

  const prepMatches = matchesPreparationExpectation(candidate.description, target.preparationExpectation);
  if (prepMatches) {
    score += 20;
    explanation.push(`Preparation wording matches expectation (${target.preparationExpectation}).`);
  } else if (target.preparationExpectation !== "neutral") {
    score -= 25;
    flags.push(`Preparation wording does not match expected '${target.preparationExpectation}' state.`);
  }

  if (hasAnyBrandSignal(candidate)) {
    score -= 12;
    flags.push("Branded metadata present; prefer generic for pilot unless explicitly required.");
  }

  if (candidate.servingWeightGrams === null) {
    flags.push("Search summary lacks gram serving-weight signal (detail fetch needed).");
  }

  return { score, explanation, flags };
}

function summarizeCandidate(rank: number, candidate: NormalizedUsdaFoodSummary, scoreResult: {
  score: number;
  explanation: string[];
  flags: string[];
}): CandidateSummary {
  return {
    rank,
    fdcId: candidate.fdcId,
    description: candidate.description,
    dataType: candidate.dataType,
    brand: candidate.brandName ?? candidate.brandOwner ?? null,
    sourcePublishedDate: candidate.sourcePublishedDate,
    sourceModifiedDate: candidate.sourceModifiedDate,
    servingSize: candidate.servingSize,
    servingUnit: candidate.servingUnit,
    servingWeightGrams: candidate.servingWeightGrams,
    nutrientSummary: {
      calories_kcal: candidate.nutrientsPer100g.calories_kcal.value,
      protein_g: candidate.nutrientsPer100g.protein_g.value,
      carbohydrate_g: candidate.nutrientsPer100g.carbohydrate_g.value,
      fat_g: candidate.nutrientsPer100g.fat_g.value,
    },
    flags: scoreResult.flags,
    rankingExplanation: [
      `score=${scoreResult.score}`,
      ...scoreResult.explanation,
    ],
  };
}

function buildMarkdownReport(reports: TargetCandidateReport[]): string {
  const lines: string[] = [];
  lines.push("# USDA Pilot Candidate Discovery");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  for (const report of reports) {
    lines.push(`## ${report.target}`);
    lines.push("");
    lines.push(`- Target ID: \`${report.targetId}\``);
    lines.push(`- Query: \`${report.query}\``);
    lines.push(`- Category: \`${report.category}\``);
    lines.push(`- Preparation expectation: \`${report.preparationExpectation}\``);
    lines.push("");
    lines.push("| Rank | FDC ID | Data Type | Description | kcal | Protein | Carbs | Fat | Flags |");
    lines.push("| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | --- |");
    for (const candidate of report.candidates) {
      lines.push(
        `| ${candidate.rank} | ${candidate.fdcId} | ${candidate.dataType} | ${candidate.description.replace(/\|/g, "\\|")} | ${candidate.nutrientSummary.calories_kcal ?? "null"} | ${candidate.nutrientSummary.protein_g ?? "null"} | ${candidate.nutrientSummary.carbohydrate_g ?? "null"} | ${candidate.nutrientSummary.fat_g ?? "null"} | ${candidate.flags.join("; ") || "—"} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function discoverCandidatesForTarget(target: PilotDiscoveryTarget): Promise<TargetCandidateReport> {
  const result = await searchUsdaFoodsForScript({
    query: target.query,
    pageSize: 20,
    dataTypes: target.preferredDataTypes,
  });

  const scored = result.foods.map((candidate) => {
    const scoring = scoreCandidate(target, candidate);
    return {
      candidate,
      scoring,
    };
  });

  scored.sort((left, right) => {
    if (right.scoring.score !== left.scoring.score) {
      return right.scoring.score - left.scoring.score;
    }
    return left.candidate.fdcId - right.candidate.fdcId;
  });

  const topCandidates = scored.slice(0, 8).map((entry, index) => {
    return summarizeCandidate(index + 1, entry.candidate, entry.scoring);
  });

  return {
    targetId: target.id,
    target: target.target,
    query: target.query,
    category: target.category,
    preparationExpectation: target.preparationExpectation,
    reviewedAt: new Date().toISOString(),
    candidates: topCandidates,
  };
}

async function main(): Promise<void> {
  loadLocalEnvFile();
  const outputDir = path.join(process.cwd(), "scripts", "usda", "generated");
  const jsonPath = path.join(outputDir, ".tmp-food-catalog-pilot.candidates.json");
  const markdownPath = path.join(outputDir, ".tmp-food-catalog-pilot.candidates.md");

  const reports: TargetCandidateReport[] = [];
  for (const target of PILOT_DISCOVERY_TARGETS) {
    const report = await discoverCandidatesForTarget(target);
    reports.push(report);
  }

  await fs.writeFile(jsonPath, `${JSON.stringify(reports, null, 2)}\n`, "utf8");
  await fs.writeFile(markdownPath, `${buildMarkdownReport(reports)}\n`, "utf8");

  console.log(`Wrote candidate JSON report: ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`Wrote candidate Markdown report: ${path.relative(process.cwd(), markdownPath)}`);
}

void main();
