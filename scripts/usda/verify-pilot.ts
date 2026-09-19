import fs from "node:fs/promises";
import path from "node:path";

import {
  generateFoodCatalogPilotSeedSql,
  hasSecretLikeValue,
  validateFoodCatalogPilotLockFile,
} from "../../src/lib/usda/catalog-pilot";
import { FOOD_CATALOG_PILOT_MANIFEST } from "./food-catalog-manifest";

const LOCK_PATH = path.join(process.cwd(), "scripts", "usda", "generated", "food-catalog-reviewed.lock.json");
const SQL_PATH = path.join(process.cwd(), "scripts", "usda", "generated", "food-catalog-reviewed.sql");

async function main(): Promise<void> {
  const lockRaw = await fs.readFile(LOCK_PATH, "utf8");
  const lockFile = JSON.parse(lockRaw);
  validateFoodCatalogPilotLockFile(lockFile, FOOD_CATALOG_PILOT_MANIFEST);

  const sqlRaw = await fs.readFile(SQL_PATH, "utf8");
  const regeneratedSql = `${generateFoodCatalogPilotSeedSql({
    lockFile,
    manifest: FOOD_CATALOG_PILOT_MANIFEST,
  })}\n`;

  if (sqlRaw !== regeneratedSql) {
    throw new Error("Deterministic SQL verification failed: generated SQL differs from checked-in file.");
  }

  if (lockFile.records.length !== FOOD_CATALOG_PILOT_MANIFEST.records.length) {
    throw new Error("Manifest/lock record count mismatch.");
  }

  if (hasSecretLikeValue(lockRaw) || hasSecretLikeValue(sqlRaw)) {
    throw new Error("Secret-like value detected in lock or SQL output.");
  }

  const targetCount = lockFile.records.length;
  console.log(`Reviewed catalog verification passed for ${targetCount} records.`);
  console.log("Deterministic regeneration check: no diff.");
}

void main();
