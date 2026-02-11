/**
 * @file Generate Test Fixtures
 *
 * Generates .docx files from .json build specs for testing.
 *
 * Usage:
 *   bun run spec/scripts/generate-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { buildDocx } from "@aurochs-builder/docx";
import type { DocxBuildSpec } from "@aurochs-builder/docx";

const SPEC_DIR = path.dirname(new URL(import.meta.url).pathname);
const ROOT_DIR = path.resolve(SPEC_DIR, "..");

/**
 * Find all .json fixture files in spec directories.
 */
function findJsonFixtures(dir: string): string[] {
  const results: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonFixtures(fullPath));
    } else if (entry.name.endsWith(".json") && fullPath.includes("/fixtures/")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Generate .docx from .json spec.
 */
async function generateFixture(jsonPath: string): Promise<void> {
  const docxPath = jsonPath.replace(/\.json$/, ".docx");

  const specContent = fs.readFileSync(jsonPath, "utf-8");
  const spec: DocxBuildSpec = JSON.parse(specContent);

  const docxData = await buildDocx(spec);
  fs.writeFileSync(docxPath, docxData);

  console.log(`Generated: ${path.relative(ROOT_DIR, docxPath)}`);
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  console.log("Generating test fixtures...\n");

  const jsonFiles = findJsonFixtures(ROOT_DIR);

  if (jsonFiles.length === 0) {
    console.log("No .json fixtures found.");
    return;
  }

  for (const jsonFile of jsonFiles) {
    await generateFixture(jsonFile);
  }

  console.log(`\nGenerated ${jsonFiles.length} fixture(s).`);
}

main().catch(console.error);
