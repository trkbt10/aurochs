/**
 * @file Analyze visual differences between editor output and LibreOffice baseline
 *
 * Identifies specific regions and categories of visual differences.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
const baselineDir = path.join(fixturesDir, "baseline");
const outputDir = path.join(fixturesDir, "__output__");
const diffDir = path.join(fixturesDir, "__diff__");

type DiffAnalysis = {
  name: string;
  totalPixels: number;
  diffPixels: number;
  diffPercent: number;
  // Regional analysis
  regions: {
    topHeader: { diffPixels: number; totalPixels: number; percent: number };
    leftHeader: { diffPixels: number; totalPixels: number; percent: number };
    content: { diffPixels: number; totalPixels: number; percent: number };
    corner: { diffPixels: number; totalPixels: number; percent: number };
  };
  // Color analysis
  colors: {
    backgroundDiff: number;
    textDiff: number;
    borderDiff: number;
  };
};

function analyzeRegion(
  imgA: PNG,
  imgB: PNG,
  x: number,
  y: number,
  w: number,
  h: number
): { diffPixels: number; totalPixels: number; percent: number } {
  let diffPixels = 0;
  const totalPixels = w * h;

  for (let py = y; py < y + h && py < imgA.height; py++) {
    for (let px = x; px < x + w && px < imgA.width; px++) {
      const idx = (py * imgA.width + px) * 4;
      const r1 = imgA.data[idx], g1 = imgA.data[idx + 1], b1 = imgA.data[idx + 2];
      const r2 = imgB.data[idx], g2 = imgB.data[idx + 1], b2 = imgB.data[idx + 2];

      // Simple color distance
      const dist = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (dist > 30) { // Threshold for "different"
        diffPixels++;
      }
    }
  }

  return {
    diffPixels,
    totalPixels,
    percent: (diffPixels / totalPixels) * 100,
  };
}

function analyzeColors(imgA: PNG, imgB: PNG): { backgroundDiff: number; textDiff: number; borderDiff: number } {
  let backgroundDiff = 0;
  let textDiff = 0;
  let borderDiff = 0;

  for (let y = 0; y < imgA.height; y++) {
    for (let x = 0; x < imgA.width; x++) {
      const idx = (y * imgA.width + x) * 4;
      const r1 = imgA.data[idx], g1 = imgA.data[idx + 1], b1 = imgA.data[idx + 2];
      const r2 = imgB.data[idx], g2 = imgB.data[idx + 1], b2 = imgB.data[idx + 2];

      const dist = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (dist < 10) continue; // Skip matching pixels

      // Categorize by color
      const avgA = (r1 + g1 + b1) / 3;
      const avgB = (r2 + g2 + b2) / 3;

      if (avgA > 240 || avgB > 240) {
        // Near white - background
        backgroundDiff++;
      } else if (avgA < 50 || avgB < 50) {
        // Near black - text
        textDiff++;
      } else {
        // Mid-tones - likely borders/gridlines
        borderDiff++;
      }
    }
  }

  return { backgroundDiff, textDiff, borderDiff };
}

function analyzeDiff(name: string): DiffAnalysis | null {
  const baselinePath = path.join(baselineDir, `${name}.png`);
  const outputPath = path.join(outputDir, `${name}.png`);

  if (!fs.existsSync(baselinePath) || !fs.existsSync(outputPath)) {
    return null;
  }

  const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
  const outputImg = PNG.sync.read(fs.readFileSync(outputPath));

  // Ensure same size
  if (baselineImg.width !== outputImg.width || baselineImg.height !== outputImg.height) {
    console.warn(`Size mismatch for ${name}`);
    return null;
  }

  const w = baselineImg.width;
  const h = baselineImg.height;
  const totalPixels = w * h;

  // Calculate overall diff
  const diff = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(
    outputImg.data,
    baselineImg.data,
    diff.data,
    w,
    h,
    { threshold: 0.1, includeAA: false }
  );

  // Define regions (assuming header sizes)
  const headerHeight = 22; // Column header
  const headerWidth = 56;  // Row header

  const regions = {
    topHeader: analyzeRegion(outputImg, baselineImg, headerWidth, 0, w - headerWidth, headerHeight),
    leftHeader: analyzeRegion(outputImg, baselineImg, 0, headerHeight, headerWidth, h - headerHeight),
    content: analyzeRegion(outputImg, baselineImg, headerWidth, headerHeight, w - headerWidth, h - headerHeight),
    corner: analyzeRegion(outputImg, baselineImg, 0, 0, headerWidth, headerHeight),
  };

  const colors = analyzeColors(outputImg, baselineImg);

  return {
    name,
    totalPixels,
    diffPixels,
    diffPercent: (diffPixels / totalPixels) * 100,
    regions,
    colors,
  };
}

function main() {
  const testCases = [
    "frozen-panes",
    "frozen-rows",
    "frozen-cols",
    "row-col-sizes",
    "hidden-rowcol",
    "cell-formatting",
    "merge-cells",
    "number-formats",
    "text-alignment",
  ];

  console.log("=".repeat(80));
  console.log("XLSX Visual Regression - Detailed Diff Analysis");
  console.log("=".repeat(80));
  console.log("");

  const results: DiffAnalysis[] = [];

  for (const name of testCases) {
    const analysis = analyzeDiff(name);
    if (analysis) {
      results.push(analysis);
    }
  }

  // Print summary table
  console.log("## Summary Table");
  console.log("");
  console.log("| Test Case | Total Diff | Content | Headers | Colors (BG/Text/Border) |");
  console.log("|-----------|------------|---------|---------|-------------------------|");

  for (const r of results) {
    const headersDiff = ((r.regions.topHeader.diffPixels + r.regions.leftHeader.diffPixels + r.regions.corner.diffPixels) /
      (r.regions.topHeader.totalPixels + r.regions.leftHeader.totalPixels + r.regions.corner.totalPixels) * 100).toFixed(1);
    console.log(
      `| ${r.name.padEnd(17)} | ${r.diffPercent.toFixed(1).padStart(5)}% | ${r.regions.content.percent.toFixed(1).padStart(5)}% | ${headersDiff.padStart(5)}% | ${r.colors.backgroundDiff}/${r.colors.textDiff}/${r.colors.borderDiff} |`
    );
  }

  console.log("");
  console.log("## Regional Analysis");
  console.log("");

  for (const r of results) {
    console.log(`### ${r.name}`);
    console.log(`- Total: ${r.diffPercent.toFixed(2)}% (${r.diffPixels.toLocaleString()} / ${r.totalPixels.toLocaleString()} pixels)`);
    console.log(`- Content area: ${r.regions.content.percent.toFixed(2)}%`);
    console.log(`- Top header: ${r.regions.topHeader.percent.toFixed(2)}%`);
    console.log(`- Left header: ${r.regions.leftHeader.percent.toFixed(2)}%`);
    console.log(`- Corner: ${r.regions.corner.percent.toFixed(2)}%`);
    console.log(`- Color categories: BG=${r.colors.backgroundDiff}, Text=${r.colors.textDiff}, Border=${r.colors.borderDiff}`);
    console.log("");
  }

  // Identify issues
  console.log("## Identified Issues");
  console.log("");

  const issues: { id: number; category: string; description: string; affectedTests: string[]; impact: string }[] = [];
  let issueId = 1;

  // Check for header-related issues
  const headerIssues = results.filter(r =>
    r.regions.topHeader.percent > 1 || r.regions.leftHeader.percent > 1 || r.regions.corner.percent > 1
  );
  if (headerIssues.length > 0) {
    issues.push({
      id: issueId++,
      category: "Headers",
      description: "Row/column headers differ from LibreOffice (LibreOffice PDF doesn't include headers)",
      affectedTests: headerIssues.map(r => r.name),
      impact: "High - fundamental difference in baseline generation method",
    });
  }

  // Check for content issues
  const contentIssues = results.filter(r => r.regions.content.percent > 0.5);
  if (contentIssues.length > 0) {
    issues.push({
      id: issueId++,
      category: "Cell Content",
      description: "Cell content rendering differs (fonts, spacing, alignment)",
      affectedTests: contentIssues.map(r => r.name),
      impact: "Medium - font rendering and text positioning",
    });
  }

  // Check for background issues
  const bgIssues = results.filter(r => r.colors.backgroundDiff > 1000);
  if (bgIssues.length > 0) {
    issues.push({
      id: issueId++,
      category: "Background",
      description: "Background color or gridlines differ",
      affectedTests: bgIssues.map(r => r.name),
      impact: "Low - can be adjusted via styling",
    });
  }

  for (const issue of issues) {
    console.log(`### Issue #${issue.id}: ${issue.category}`);
    console.log(`- **Description**: ${issue.description}`);
    console.log(`- **Affected**: ${issue.affectedTests.join(", ")}`);
    console.log(`- **Impact**: ${issue.impact}`);
    console.log("");
  }
}

main();
