#!/usr/bin/env bun
/**
 * Generate test PPTX files for vertical text (縦書き) visual regression tests.
 *
 * Test cases are organized by category:
 * 1. Basic Vertical Text - single paragraph, simple text
 * 2. East Asian Vertical - Japanese/CJK with eaVert
 * 3. Vertical Type Comparison - vert vs vert270 vs eaVert
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.39 (ST_TextVerticalType)
 */

import { generatePptx } from "../lib/pptx-generator";
import { requirePositionalArg } from "../lib/cli";

const usage = "bun run scripts/generate/generate-vertical-text-tests.ts <output-dir>";
const BASE_DIR = requirePositionalArg({ args: process.argv.slice(2), index: 0, name: "output-dir", usage });

// Sample text for testing
const SAMPLE_TEXT_EN = "Hello";
const SAMPLE_TEXT_JP = "日本語";

// =============================================================================
// 1. Basic Vertical Text Tests
// =============================================================================

async function generateBasicVerticalTests(): Promise<void> {
  console.log("Generating basic vertical text tests...");

  // 1.1 Basic English vertical text
  await generatePptx(
    {
      paragraphs: [
        { text: SAMPLE_TEXT_EN, rPr: { fontSize: 4800 } },
      ],
      bodyPr: { vert: "vert" },
    },
    `${BASE_DIR}/vert-basic-english.pptx`,
  );

  // 1.2 Basic Japanese vertical text with vert
  await generatePptx(
    {
      paragraphs: [
        { text: SAMPLE_TEXT_JP, rPr: { fontSize: 4800 } },
      ],
      bodyPr: { vert: "vert" },
    },
    `${BASE_DIR}/vert-basic-japanese.pptx`,
  );

  console.log("  Created 2 basic vertical text test files");
}

// =============================================================================
// 2. East Asian Vertical Text Tests
// =============================================================================

async function generateEaVertTests(): Promise<void> {
  console.log("Generating East Asian vertical text tests...");

  // 2.1 Japanese with eaVert (East Asian vertical)
  await generatePptx(
    {
      paragraphs: [
        { text: SAMPLE_TEXT_JP, rPr: { fontSize: 4800 } },
      ],
      bodyPr: { vert: "eaVert" },
    },
    `${BASE_DIR}/vert-eavert-japanese.pptx`,
  );

  console.log("  Created 1 East Asian vertical text test file");
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("=== Generating Vertical Text Test PPTX Files ===\n");

  await generateBasicVerticalTests();
  await generateEaVertTests();

  console.log("\n=== Done ===");
  console.log(`Total: 3 test files generated in ${BASE_DIR}/`);
  console.log("\nNext steps:");
  console.log("1. Generate LibreOffice baselines:");
  console.log(`   ./spec/visual-regression/scripts/generate-snapshots.sh ${BASE_DIR}/vert-basic-english.pptx`);
  console.log(`   ./spec/visual-regression/scripts/generate-snapshots.sh ${BASE_DIR}/vert-basic-japanese.pptx`);
  console.log(`   ./spec/visual-regression/scripts/generate-snapshots.sh ${BASE_DIR}/vert-eavert-japanese.pptx`);
  console.log("2. Run visual regression tests: bun run test:visual -- spec/vertical-text/");
}

main().catch(console.error);
