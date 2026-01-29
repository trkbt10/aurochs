/**
 * Visual regression analysis for PPTX rendering
 *
 * Usage: bun run scripts/analyze/analyze-visual-regression.ts <pptx-path> <snapshot-name>
 *
 * Analyzes visual differences between our SVG output and LibreOffice baseline.
 * Generates detailed report of what's different and why.
 */
import { openPresentation } from "@oxen-office/pptx";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";
import { compareWithDetails, generateCompareReport, printCompareReport } from "../../spec/visual-regression/compare";
import { requireFileExists, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function analyzeVisualRegression(pptxPath: string, snapshotName: string) {
  const { presentationFile } = await loadPptxFile(pptxPath);
  const presentation = openPresentation(presentationFile);
  const slideCount = presentation.count;

  console.log("=".repeat(70));
  console.log("Visual Regression Analysis");
  console.log(`PPTX: ${pptxPath}`);
  console.log(`Snapshot: ${snapshotName}`);
  console.log(`Slides: ${slideCount}`);
  console.log("=".repeat(70));
  console.log();

  const results = [];

  for (let i = 1; i <= slideCount; i++) {
    try {
      const slide = presentation.getSlide(i);
      const { svg } = renderSlideToSvg(slide);

      const result = compareWithDetails(svg, snapshotName, i, {
        threshold: 0.1,
        maxDiffPercent: 100, // Don't limit for analysis
      });

      results.push(result);

      // Categorize diff percentage
      let category: string;
      if (result.diffPercent < 1) {
        category = "✓ Excellent (<1%)";
      } else if (result.diffPercent < 5) {
        category = "○ Good (1-5%)";
      } else if (result.diffPercent < 20) {
        category = "△ Minor issues (5-20%)";
      } else if (result.diffPercent < 50) {
        category = "▲ Significant (20-50%)";
      } else {
        category = "✗ Major issues (>50%)";
      }

      console.log(`Slide ${i.toString().padStart(2)}: ${result.diffPercent.toFixed(2).padStart(6)}% - ${category}`);

      // Analyze SVG content for clues
      const hasGradient = svg.includes("Gradient");
      const hasImage = svg.includes("data:image/");
      const textCount = (svg.match(/<text/g) ?? []).length;

      if (result.diffPercent > 20) {
        console.log(`         Features: gradient=${hasGradient} image=${hasImage} text=${textCount}`);
      }

    } catch (err) {
      console.log(`Slide ${i.toString().padStart(2)}: ERROR - ${err instanceof Error ? err.message : err}`);
    }
  }

  // Generate summary report
  console.log();
  const report = generateCompareReport(results);
  printCompareReport(report);

  // Categorized summary
  console.log("Analysis by Category:");
  console.log("-".repeat(40));

  const excellent = results.filter(r => r.diffPercent < 1);
  const good = results.filter(r => r.diffPercent >= 1 && r.diffPercent < 5);
  const minor = results.filter(r => r.diffPercent >= 5 && r.diffPercent < 20);
  const significant = results.filter(r => r.diffPercent >= 20 && r.diffPercent < 50);
  const major = results.filter(r => r.diffPercent >= 50);

  console.log(`Excellent (<1%):     ${excellent.length} slides`);
  console.log(`Good (1-5%):         ${good.length} slides`);
  console.log(`Minor (5-20%):       ${minor.length} slides`);
  console.log(`Significant (20-50%): ${significant.length} slides`);
  console.log(`Major (>50%):        ${major.length} slides`);

  if (major.length > 0) {
    console.log();
    console.log("Major issues (>50% diff) - needs investigation:");
    for (const r of major) {
      console.log(`  Slide ${r.slideNumber}: ${r.diffPercent.toFixed(2)}%`);
      console.log(`    Diff image: ${r.diffImagePath}`);
    }
  }

  if (significant.length > 0) {
    console.log();
    console.log("Significant issues (20-50% diff):");
    for (const r of significant) {
      console.log(`  Slide ${r.slideNumber}: ${r.diffPercent.toFixed(2)}%`);
    }
  }

  console.log();
}

// Main
const usage = "bun run scripts/analyze/analyze-visual-regression.ts <pptx-path> <snapshot-name>";
const args = process.argv.slice(2);
const pptxPath = requirePositionalArg(args, 0, "pptx-path", usage);
const snapshotName = requirePositionalArg(args, 1, "snapshot-name", usage);
requireFileExists(pptxPath, usage);

analyzeVisualRegression(pptxPath, snapshotName).catch((err) => {
  console.error(err);
  process.exit(1);
});
