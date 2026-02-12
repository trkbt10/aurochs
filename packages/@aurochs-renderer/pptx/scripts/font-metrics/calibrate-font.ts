#!/usr/bin/env bun
/**
 * @file Calibrate font metrics by measuring baseline vs output
 *
 * This script:
 * 1. Measures text width differences for a given font
 * 2. Calculates the adjustment factor needed
 * 3. Suggests the correct latinAverage value
 *
 * Usage:
 *   bun run scripts/font-metrics/calibrate-font.ts <font-name> [snapshot-pattern]
 *
 * Example:
 *   bun run scripts/font-metrics/calibrate-font.ts calibri line-spacing
 *   bun run scripts/font-metrics/calibrate-font.ts arial char-spacing
 */

import { PNG } from "pngjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { getFontMetrics } from "../../src/text/fonts";

const SNAPSHOT_DIR = "spec/visual-regression/snapshots";
const OUTPUT_DIR = "spec/visual-regression/__output__";

type LineData = {
  baselineWidth: number;
  outputWidth: number;
  widthRatio: number;
};

function findTextWidth(png: PNG, row: number): { startX: number; endX: number; width: number } {
  let startX = -1;
  let endX = -1;

  for (let x = 0; x < png.width; x++) {
    const idx = (row * png.width + x) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];

    if (r < 250 || g < 250 || b < 250) {
      if (startX === -1) {startX = x;}
      endX = x;
    }
  }

  return { startX, endX, width: endX - startX };
}

function findTextRows(png: PNG): number[] {
  const rows: number[] = [];
  let inText = false;
  let textRows: number[] = [];

  for (let y = 0; y < png.height; y++) {
    let hasText = false;

    for (let x = 0; x < png.width; x++) {
      const idx = (y * png.width + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];

      if (r < 250 || g < 250 || b < 250) {
        hasText = true;
        break;
      }
    }

    if (hasText && !inText) {
      inText = true;
      textRows = [y];
    } else if (hasText && inText) {
      textRows.push(y);
    } else if (!hasText && inText) {
      if (textRows.length > 5) {
        rows.push(textRows[Math.floor(textRows.length / 2)]);
      }
      inText = false;
    }
  }

  return rows;
}

function analyzeSnapshot(name: string): LineData[] {
  const baselinePath = path.join(SNAPSHOT_DIR, name, "slide-1.png");
  const outputPath = path.join(OUTPUT_DIR, `${name}-slide-1.png`);

  if (!fs.existsSync(baselinePath) || !fs.existsSync(outputPath)) {
    return [];
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const output = PNG.sync.read(fs.readFileSync(outputPath));

  const baselineRows = findTextRows(baseline);
  const outputRows = findTextRows(output);

  const results: LineData[] = [];
  const minLen = Math.min(baselineRows.length, outputRows.length);

  for (let i = 0; i < minLen; i++) {
    const baselineData = findTextWidth(baseline, baselineRows[i]);
    const outputData = findTextWidth(output, outputRows[i]);

    if (baselineData.width > 0 && outputData.width > 0) {
      results.push({
        baselineWidth: baselineData.width,
        outputWidth: outputData.width,
        widthRatio: baselineData.width / outputData.width,
      });
    }
  }

  return results;
}

function listSnapshots(pattern?: string): string[] {
  if (!fs.existsSync(SNAPSHOT_DIR)) {return [];}

  const dirs = fs.readdirSync(SNAPSHOT_DIR).filter((f) => {
    const stat = fs.statSync(path.join(SNAPSHOT_DIR, f));
    return stat.isDirectory();
  });

  if (pattern) {
    return dirs.filter((d) => d.includes(pattern));
  }

  return dirs;
}

// Main
const args = process.argv.slice(2);

if (args.length < 1 || args[0] === "--help") {
  console.log("Usage:");
  console.log("  bun run scripts/font-metrics/calibrate-font.ts <font-name> [snapshot-pattern]");
  console.log("");
  console.log("Example:");
  console.log("  bun run scripts/font-metrics/calibrate-font.ts calibri line-spacing");
  console.log("  bun run scripts/font-metrics/calibrate-font.ts calibri");
  process.exit(0);
}

const fontName = args[0].toLowerCase();
const pattern = args[1];

// Get current metrics
const currentMetrics = getFontMetrics(fontName);
console.log(`\n=== Font: ${fontName} ===`);
console.log(`Current latinAverage: ${currentMetrics.latinAverage}`);

// Analyze snapshots
const snapshots = listSnapshots(pattern);
console.log(`\nAnalyzing ${snapshots.length} snapshots${pattern ? ` matching "${pattern}"` : ""}...`);

const allData: LineData[] = [];

for (const snapshot of snapshots) {
  const data = analyzeSnapshot(snapshot);
  if (data.length > 0) {
    allData.push(...data);
    console.log(`  ${snapshot}: ${data.length} lines`);
  }
}

if (allData.length === 0) {
  console.log("\nNo data found. Make sure to run tests first to generate output images.");
  process.exit(1);
}

// Calculate statistics
const ratios = allData.map((d) => d.widthRatio);
const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
const minRatio = Math.min(...ratios);
const maxRatio = Math.max(...ratios);

// Calculate suggested latinAverage
const suggestedLatinAverage = currentMetrics.latinAverage * avgRatio;

console.log(`\n=== Results ===`);
console.log(`Lines analyzed: ${allData.length}`);
console.log(`Width ratio (baseline/output):`);
console.log(`  Average: ${avgRatio.toFixed(3)}`);
console.log(`  Min: ${minRatio.toFixed(3)}`);
console.log(`  Max: ${maxRatio.toFixed(3)}`);

console.log(`\n=== Recommendation ===`);
console.log(`Current latinAverage: ${currentMetrics.latinAverage.toFixed(2)}`);
console.log(`Suggested latinAverage: ${suggestedLatinAverage.toFixed(2)}`);
console.log(`Adjustment: ${((avgRatio - 1) * 100).toFixed(1)}%`);

if (Math.abs(avgRatio - 1) > 0.02) {
  console.log(`\nTo generate updated metrics:`);
  console.log(`  bun run scripts/font-metrics/generate-font-metrics.ts ${fontName} ${suggestedLatinAverage.toFixed(2)} --ascender 0.75`);
} else {
  console.log(`\nFont metrics are within acceptable range (±2%).`);
}
