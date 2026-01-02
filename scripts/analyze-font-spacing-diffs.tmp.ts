#!/usr/bin/env bun
/**
 * Analyze diff percentages for all font-spacing test files
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS } from "../src/pptx";
import { compareSvgToSnapshot } from "../spec/visual-regression/compare";
import { loadPptxFile } from "./lib/pptx-loader";

const BASE_DIR = "fixtures/font-spacing";

type TestResult = {
  name: string;
  pptxPath: string;
  diffPercent: number;
  status: "pass" | "marginal" | "fail";
};

async function analyzeTest(pptxPath: string): Promise<TestResult | null> {
  const name = path.basename(pptxPath, ".pptx");

  if (!fs.existsSync(pptxPath)) {
    return null;
  }

  const snapshotDir = `spec/visual-regression/snapshots/${name}`;
  if (!fs.existsSync(snapshotDir)) {
    return null;
  }

  try {
    const presentationFile = await loadPptxFile(pptxPath);
    const presentation = openPresentation(presentationFile, {
      renderOptions: LIBREOFFICE_RENDER_OPTIONS,
    });
    const slide = presentation.getSlide(1);
    const svg = slide.renderSVG();

    const result = compareSvgToSnapshot(svg, name, 1, {
      maxDiffPercent: 100, // Allow all to see actual diff
    });

    const status = result.diffPercent < 2 ? "pass" :
                   result.diffPercent < 5 ? "marginal" : "fail";

    return {
      name,
      pptxPath,
      diffPercent: result.diffPercent,
      status,
    };
  } catch (e) {
    console.error(`Error analyzing ${name}:`, e);
    return null;
  }
}

async function main(): Promise<void> {
  console.log("=== Font Spacing Diff Analysis ===\n");

  const categories = [
    "character-spacing",
    "line-spacing",
    "paragraph-spacing",
    "kerning",
    "compound",
    "space-handling",
    "bullet-spacing",
    "text-box",
    "line-break",
  ];

  const allResults: TestResult[] = [];

  for (const category of categories) {
    const categoryDir = path.join(BASE_DIR, category);
    if (!fs.existsSync(categoryDir)) {continue;}

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith(".pptx"));

    console.log(`\n## ${category}`);
    console.log("| Test | Diff % | Status |");
    console.log("|------|--------|--------|");

    for (const file of files) {
      const pptxPath = path.join(categoryDir, file);
      const result = await analyzeTest(pptxPath);
      if (result) {
        allResults.push(result);
        const statusIcon = result.status === "pass" ? "✓" :
                          result.status === "marginal" ? "△" : "✗";
        console.log(`| ${result.name} | ${result.diffPercent.toFixed(2)}% | ${statusIcon} |`);
      }
    }
  }

  // Summary
  console.log("\n\n=== Summary ===");
  const sorted = allResults.sort((a, b) => b.diffPercent - a.diffPercent);

  console.log("\nTop 10 highest diffs:");
  for (const r of sorted.slice(0, 10)) {
    console.log(`  ${r.diffPercent.toFixed(2)}% - ${r.name}`);
  }

  const passCount = allResults.filter(r => r.status === "pass").length;
  const marginalCount = allResults.filter(r => r.status === "marginal").length;
  const failCount = allResults.filter(r => r.status === "fail").length;

  console.log(`\nPass (<2%): ${passCount}`);
  console.log(`Marginal (2-5%): ${marginalCount}`);
  console.log(`Fail (>5%): ${failCount}`);
}

main().catch(console.error);
