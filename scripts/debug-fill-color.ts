/**
 * Debug tool: Investigate fill="#" color issues
 *
 * Usage: bun run scripts/debug-fill-color.ts [pptx-file] [slide-number]
 */
import * as fs from "node:fs";
import { openPresentation } from "../src/pptx";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = process.argv[2] || "fixtures/poi-test-data/test-data/slideshow/60810.pptx";
  const slideNum = parseInt(process.argv[3] || "1", 10);

  console.log(`Debugging fill colors in: ${pptxPath} slide ${slideNum}\n`);

  const { cache, presentationFile } = await loadPptxFile(pptxPath);

  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(slideNum);

  // Generate SVG
  const svg = slide.renderSVG();

  // Find all fill="#" occurrences
  const fillPattern = /fill="([^"]*)"/g;
  let match;
  const fills: Record<string, number> = {};
  while ((match = fillPattern.exec(svg)) !== null) {
    const value = match[1];
    fills[value] = (fills[value] || 0) + 1;
  }

  console.log("=== Fill values found ===");
  for (const [value, count] of Object.entries(fills).sort((a, b) => b[1] - a[1])) {
    const display = value === "" ? '(empty)' : value === "#" ? '"#" (INVALID)' : value;
    console.log(`  ${display}: ${count} occurrences`);
  }

  // Find context around fill="#"
  const invalidFillPattern = /fill="#"[^>]*/g;
  const invalidMatches = svg.match(invalidFillPattern);
  if (invalidMatches) {
    console.log(`\n=== fill="#" contexts (${invalidMatches.length} found) ===`);
    invalidMatches.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i + 1}: ${m.slice(0, 100)}...`);
    });
  }

  // Also check the raw slide XML for color definitions
  const slideXml = cache.get(`ppt/slides/slide${slideNum}.xml`)?.text;
  if (slideXml) {
    console.log("\n=== Color definitions in slide XML ===");

    // Look for solidFill elements
    const solidFillPattern = /<a:solidFill[^>]*>[\s\S]*?<\/a:solidFill>/g;
    const solidFills = slideXml.match(solidFillPattern);
    if (solidFills) {
      console.log(`Found ${solidFills.length} a:solidFill elements`);
      solidFills.slice(0, 3).forEach((sf, i) => {
        console.log(`  ${i + 1}: ${sf}`);
      });
    }

    // Look for schemeClr
    const schemeClrPattern = /<a:schemeClr[^>]*val="([^"]*)"[^>]*\/?>/g;
    const schemeColors: string[] = [];
    let schemeMatch;
    while ((schemeMatch = schemeClrPattern.exec(slideXml)) !== null) {
      schemeColors.push(schemeMatch[1]);
    }
    if (schemeColors.length > 0) {
      console.log(`\nScheme colors used: ${[...new Set(schemeColors)].join(", ")}`);
    }
  }

  // Write SVG for inspection
  fs.writeFileSync("/tmp/debug-fill.svg", svg);
  console.log("\nSVG written to /tmp/debug-fill.svg");
}

main().catch(console.error);
