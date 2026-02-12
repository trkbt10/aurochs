#!/usr/bin/env bun
/**
 * Generate test PPTX files for font spacing visual regression tests.
 *
 * Test cases are organized by category:
 * 1. Character Spacing (a:spc) - ECMA-376 21.1.2.3.9
 * 2. Line Spacing (a:lnSpc) - ECMA-376 21.1.2.2.10
 * 3. Paragraph Spacing (a:spcBef, a:spcAft) - ECMA-376 21.1.2.2.18-19
 * 4. Kerning (a:kern) - ECMA-376 21.1.2.3.9
 * 5. Compound cases
 */

import {
  generatePptx,
  createComparisonSlide,
  type ParagraphContent,
} from "../lib/pptx-generator";
import { requirePositionalArg } from "../lib/cli";

const usage = "bun run scripts/generate/generate-font-spacing-tests.ts <output-dir>";
const BASE_DIR = requirePositionalArg({ args: process.argv.slice(2), index: 0, name: "output-dir", usage });

// Sample text for testing
const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog.";
const SAMPLE_TEXT_JP = "日本語のテキストサンプルです。";

// =============================================================================
// 1. Character Spacing Tests (a:spc)
// =============================================================================

async function generateCharacterSpacingTests(): Promise<void> {
  console.log("Generating character spacing tests...");

  // 1.1 Normal (no spacing) - baseline
  await generatePptx(
    createComparisonSlide([
      { text: SAMPLE_TEXT, rPr: { fontSize: 2400 } },
      { text: "No character spacing applied (default)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/character-spacing/char-spacing-normal.pptx`,
  );

  // 1.2 Tight spacing (negative EMU)
  // EMU: 914400 per inch, so -100 EMU is very tight
  await generatePptx(
    createComparisonSlide([
      { text: SAMPLE_TEXT, rPr: { fontSize: 2400, charSpacing: -50 } },
      { text: "spc=\"-50\" (tight)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/character-spacing/char-spacing-tight.pptx`,
  );

  // 1.3 Loose spacing (positive EMU)
  await generatePptx(
    createComparisonSlide([
      { text: SAMPLE_TEXT, rPr: { fontSize: 2400, charSpacing: 100 } },
      { text: "spc=\"100\" (loose)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/character-spacing/char-spacing-loose.pptx`,
  );

  // 1.4 Various values comparison
  const charSpacingValues: ParagraphContent[] = [
    { text: "spc=-100: " + SAMPLE_TEXT.substring(0, 30), rPr: { fontSize: 1800, charSpacing: -100 } },
    { text: "spc=-50:  " + SAMPLE_TEXT.substring(0, 30), rPr: { fontSize: 1800, charSpacing: -50 } },
    { text: "spc=0:    " + SAMPLE_TEXT.substring(0, 30), rPr: { fontSize: 1800, charSpacing: 0 } },
    { text: "spc=50:   " + SAMPLE_TEXT.substring(0, 30), rPr: { fontSize: 1800, charSpacing: 50 } },
    { text: "spc=100:  " + SAMPLE_TEXT.substring(0, 30), rPr: { fontSize: 1800, charSpacing: 100 } },
    { text: "spc=200:  " + SAMPLE_TEXT.substring(0, 30), rPr: { fontSize: 1800, charSpacing: 200 } },
  ];
  await generatePptx(
    createComparisonSlide(charSpacingValues),
    `${BASE_DIR}/character-spacing/char-spacing-values.pptx`,
  );

  console.log("  Created 4 character spacing test files");
}

// =============================================================================
// 2. Line Spacing Tests (a:lnSpc)
// =============================================================================

async function generateLineSpacingTests(): Promise<void> {
  console.log("Generating line spacing tests...");

  const multiLineText = "Line 1: The quick brown fox\nLine 2: jumps over the lazy dog\nLine 3: Sample text continues";

  // 2.1 Single spacing (100%)
  await generatePptx(
    createComparisonSlide([
      {
        text: multiLineText.split("\n")[0],
        pPr: { lineSpacing: { type: "pct", value: 100000 } },
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[1],
        pPr: { lineSpacing: { type: "pct", value: 100000 } },
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[2],
        pPr: { lineSpacing: { type: "pct", value: 100000 } },
        rPr: { fontSize: 2400 },
      },
      { text: "lnSpc: spcPct val=\"100000\" (single)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/line-spacing/line-spacing-single.pptx`,
  );

  // 2.2 1.5 spacing (150%)
  await generatePptx(
    createComparisonSlide([
      {
        text: multiLineText.split("\n")[0],
        pPr: { lineSpacing: { type: "pct", value: 150000 } },
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[1],
        pPr: { lineSpacing: { type: "pct", value: 150000 } },
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[2],
        pPr: { lineSpacing: { type: "pct", value: 150000 } },
        rPr: { fontSize: 2400 },
      },
      { text: "lnSpc: spcPct val=\"150000\" (1.5x)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/line-spacing/line-spacing-1.5.pptx`,
  );

  // 2.3 Double spacing (200%)
  await generatePptx(
    createComparisonSlide([
      {
        text: multiLineText.split("\n")[0],
        pPr: { lineSpacing: { type: "pct", value: 200000 } },
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[1],
        pPr: { lineSpacing: { type: "pct", value: 200000 } },
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[2],
        pPr: { lineSpacing: { type: "pct", value: 200000 } },
        rPr: { fontSize: 2400 },
      },
      { text: "lnSpc: spcPct val=\"200000\" (double)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/line-spacing/line-spacing-double.pptx`,
  );

  // 2.4 Exact points (24pt)
  await generatePptx(
    createComparisonSlide([
      {
        text: multiLineText.split("\n")[0],
        pPr: { lineSpacing: { type: "pts", value: 2400 } }, // 24pt in 1/100pt
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[1],
        pPr: { lineSpacing: { type: "pts", value: 2400 } },
        rPr: { fontSize: 2400 },
      },
      {
        text: multiLineText.split("\n")[2],
        pPr: { lineSpacing: { type: "pts", value: 2400 } },
        rPr: { fontSize: 2400 },
      },
      { text: "lnSpc: spcPts val=\"2400\" (24pt exact)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/line-spacing/line-spacing-exact.pptx`,
  );

  console.log("  Created 4 line spacing test files");
}

// =============================================================================
// 3. Paragraph Spacing Tests (a:spcBef, a:spcAft)
// =============================================================================

async function generateParagraphSpacingTests(): Promise<void> {
  console.log("Generating paragraph spacing tests...");

  // 3.1 Space before
  await generatePptx(
    createComparisonSlide([
      { text: "Paragraph 1 (no spacing before)", rPr: { fontSize: 2000 } },
      {
        text: "Paragraph 2 (12pt before)",
        pPr: { spaceBefore: { type: "pts", value: 1200 } },
        rPr: { fontSize: 2000 },
      },
      {
        text: "Paragraph 3 (24pt before)",
        pPr: { spaceBefore: { type: "pts", value: 2400 } },
        rPr: { fontSize: 2000 },
      },
      { text: "spcBef: spcPts values", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/paragraph-spacing/para-spacing-before.pptx`,
  );

  // 3.2 Space after
  await generatePptx(
    createComparisonSlide([
      {
        text: "Paragraph 1 (12pt after)",
        pPr: { spaceAfter: { type: "pts", value: 1200 } },
        rPr: { fontSize: 2000 },
      },
      {
        text: "Paragraph 2 (24pt after)",
        pPr: { spaceAfter: { type: "pts", value: 2400 } },
        rPr: { fontSize: 2000 },
      },
      { text: "Paragraph 3 (no spacing after)", rPr: { fontSize: 2000 } },
      { text: "spcAft: spcPts values", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/paragraph-spacing/para-spacing-after.pptx`,
  );

  // 3.3 Both before and after
  await generatePptx(
    createComparisonSlide([
      {
        text: "Paragraph 1",
        pPr: {
          spaceBefore: { type: "pts", value: 600 },
          spaceAfter: { type: "pts", value: 600 },
        },
        rPr: { fontSize: 2000 },
      },
      {
        text: "Paragraph 2",
        pPr: {
          spaceBefore: { type: "pts", value: 1200 },
          spaceAfter: { type: "pts", value: 1200 },
        },
        rPr: { fontSize: 2000 },
      },
      {
        text: "Paragraph 3",
        pPr: {
          spaceBefore: { type: "pts", value: 600 },
          spaceAfter: { type: "pts", value: 600 },
        },
        rPr: { fontSize: 2000 },
      },
      { text: "spcBef + spcAft combined", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/paragraph-spacing/para-spacing-both.pptx`,
  );

  console.log("  Created 3 paragraph spacing test files");
}

// =============================================================================
// 4. Kerning Tests (a:kern)
// =============================================================================

async function generateKerningTests(): Promise<void> {
  console.log("Generating kerning tests...");

  // Text with kerning pairs: AV, To, We, etc.
  const kerningText = "AVATAR WAVE Tokyo";

  // 4.1 Default kerning
  await generatePptx(
    createComparisonSlide([
      { text: kerningText, rPr: { fontSize: 4800 } },
      { text: "Default kerning (no kern attribute)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/kerning/kerning-default.pptx`,
  );

  // 4.2 No kerning (kern="0")
  await generatePptx(
    createComparisonSlide([
      { text: kerningText, rPr: { fontSize: 4800, kerning: 0 } },
      { text: "kern=\"0\" (no kerning)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/kerning/kerning-none.pptx`,
  );

  // 4.3 Specific threshold (kern="1200" = 12pt threshold)
  await generatePptx(
    createComparisonSlide([
      { text: kerningText, rPr: { fontSize: 4800, kerning: 1200 } },
      { text: "kern=\"1200\" (12pt threshold)", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/kerning/kerning-specific.pptx`,
  );

  console.log("  Created 3 kerning test files");
}

// =============================================================================
// 5. Compound Tests
// =============================================================================

async function generateCompoundTests(): Promise<void> {
  console.log("Generating compound tests...");

  // 5.1 All spacing combined
  await generatePptx(
    createComparisonSlide([
      {
        text: "Combined: char spacing + line spacing",
        pPr: {
          lineSpacing: { type: "pct", value: 150000 },
          spaceBefore: { type: "pts", value: 600 },
        },
        rPr: { fontSize: 2000, charSpacing: 50 },
      },
      {
        text: "All spacing types applied together",
        pPr: {
          lineSpacing: { type: "pct", value: 150000 },
          spaceBefore: { type: "pts", value: 600 },
          spaceAfter: { type: "pts", value: 600 },
        },
        rPr: { fontSize: 2000, charSpacing: 50, kerning: 1200 },
      },
      { text: "spc + lnSpc + spcBef + spcAft + kern", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/compound/all-spacing-combined.pptx`,
  );

  // 5.2 Japanese text spacing
  await generatePptx(
    createComparisonSlide([
      { text: SAMPLE_TEXT_JP, rPr: { fontSize: 2400 } },
      { text: SAMPLE_TEXT_JP, rPr: { fontSize: 2400, charSpacing: 100 } },
      { text: "日本語テキストの文字間隔テスト", rPr: { fontSize: 1200 } },
    ]),
    `${BASE_DIR}/compound/japanese-text-spacing.pptx`,
  );

  console.log("  Created 2 compound test files");
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("=== Generating Font Spacing Test PPTX Files ===\n");

  await generateCharacterSpacingTests();
  await generateLineSpacingTests();
  await generateParagraphSpacingTests();
  await generateKerningTests();
  await generateCompoundTests();

  console.log("\n=== Done ===");
  console.log(`Total: 16 test files generated in ${BASE_DIR}/`);
  console.log("\nNext steps:");
  console.log("1. Generate LibreOffice baselines: ./spec/visual-regression/scripts/generate-snapshots.sh");
  console.log("2. Run visual regression tests: bun run test:visual -- spec/font-spacing/");
}

main().catch(console.error);
