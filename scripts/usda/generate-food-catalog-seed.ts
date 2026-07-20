import fs from "node:fs/promises";
import path from "node:path";

import {
  generateFoodCatalogPilotSeedSql,
  hasSecretLikeValue,
  validateFoodCatalogPilotLockFile,
} from "../../src/lib/usda/catalog-pilot";
import { FOOD_CATALOG_PILOT_MANIFEST } from "./food-catalog-manifest";

const LOCK_FILE_PATH = path.join(
  process.cwd(),
  "scripts",
  "usda",
  "generated",
  "food-catalog-pilot.lock.json",
);
const SEED_SQL_PATH = path.join(
  process.cwd(),
  "scripts",
  "usda",
  "generated",
  "food-catalog-pilot.sql",
);
const MIGRATION_FILENAME = "20260720201500_seed_usda_food_catalog_pilot.sql";

async function main(): Promise<void> {
  const lockRaw = await fs.readFile(LOCK_FILE_PATH, "utf8");
  const lockFile = JSON.parse(lockRaw);

  validateFoodCatalogPilotLockFile(lockFile, FOOD_CATALOG_PILOT_MANIFEST);
  const seedSql = generateFoodCatalogPilotSeedSql({
    lockFile,
    manifest: FOOD_CATALOG_PILOT_MANIFEST,
  });

  if (hasSecretLikeValue(seedSql)) {
    throw new Error("Secret-like value detected in generated SQL output.");
  }

  await fs.writeFile(SEED_SQL_PATH, `${seedSql}\n`, "utf8");

  const migrationPath = path.join(process.cwd(), "supabase", "migrations", MIGRATION_FILENAME);
  const migrationSql = `${seedSql}\n`;
  if (hasSecretLikeValue(migrationSql)) {
    throw new Error("Secret-like value detected in migration SQL output.");
  }
  await fs.writeFile(migrationPath, migrationSql, "utf8");

  console.log(`Wrote seed SQL: ${path.relative(process.cwd(), SEED_SQL_PATH)}`);
  console.log(`Wrote migration SQL: supabase/migrations/${MIGRATION_FILENAME}`);
}

void main();
