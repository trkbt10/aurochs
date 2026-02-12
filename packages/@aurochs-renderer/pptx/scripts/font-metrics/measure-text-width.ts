#!/usr/bin/env bun
/**
 * @file Measure text width differences between baseline and output
 *
 * Usage:
 *   bun run scripts/font-metrics/measure-text-width.ts [snapshot-name]
 *   bun run scripts/font-metrics/measure-text-width.ts line-spacing-single
 *   bun run scripts/font-metrics/measure-text-width.ts --all
 */

import { PNG } from "pngjs";
import * as fs from "node:fs";
import * as path from "node:path";

const SNAPSHOT_DIR = "spec/visual-regression/snapshots";
const OUTPUT_DIR = "spec/visual-regression/__output__";

type TextLine = {
  row: number;
  startX: number;
  endX: number;
  width: number;
};

type TextAnalysis = {
  name: string;
  lines: {
    baseline: TextLine;
    output: TextLine;
    widthDiff: number;
    widthDiffPercent: number;
    yDiff: number;
  }[];
};

function findTextLines(png: PNG): TextLine[] {
  const lines: TextLine[] = [];
  let inText = false;
  let currentLine: { rows: number[]; startXs: number[]; endXs: number[] } = {
    rows: [],
    startXs: [],
    endXs: [],
  };

  for (let y = 0; y < png.height; y++) {
    let firstX = -1;
    let lastX = -1;

    for (let x = 0; x < png.width; x++) {
      const idx = (y * png.width + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];

      if (r < 250 || g < 250 || b < 250) {
        if (firstX === -1) {firstX = x;}
        lastX = x;
      }
    }

    const hasText = firstX !== -1;

    if (hasText && !inText) {
      inText = true;
      currentLine = { rows: [y], startXs: [firstX], endXs: [lastX] };
    } else if (hasText && inText) {
      currentLine.rows.push(y);
      currentLine.startXs.push(firstX);
      currentLine.endXs.push(lastX);
    } else if (!hasText && inText) {
      if (currentLine.rows.length > 5) {
        const midIdx = Math.floor(currentLine.rows.length / 2);
        lines.push({
          row: currentLine.rows[midIdx],
          startX: currentLine.startXs[midIdx],
          endX: currentLine.endXs[midIdx],
          width: currentLine.endXs[midIdx] - currentLine.startXs[midIdx],
        });
      }
      inText = false;
    }
  }

  return lines;
}

function analyzeSnapshot(name: string): TextAnalysis | null {
  const baselinePath = path.join(SNAPSHOT_DIR, name, "slide-1.png");
  const outputPath = path.join(OUTPUT_DIR, `${name}-slide-1.png`);

  if (!fs.existsSync(baselinePath)) {
    console.error(`Baseline not found: ${baselinePath}`);
    return null;
  }

  if (!fs.existsSync(outputPath)) {
    console.error(`Output not found: ${outputPath}`);
    return null;
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const output = PNG.sync.read(fs.readFileSync(outputPath));

  const baselineLines = findTextLines(baseline);
  const outputLines = findTextLines(output);

  const minLen = Math.min(baselineLines.length, outputLines.length);
  const lines: TextAnalysis["lines"] = [];

  for (let i = 0; i < minLen; i++) {
    const bl = baselineLines[i];
    const ol = outputLines[i];
    const widthDiff = ol.width - bl.width;
    const widthDiffPercent = (widthDiff / bl.width) * 100;
    const yDiff = ol.row - bl.row;

    lines.push({
      baseline: bl,
      output: ol,
      widthDiff,
      widthDiffPercent,
      yDiff,
    });
  }

  return { name, lines };
}

function printAnalysis(analysis: TextAnalysis): void {
  console.log(`\n=== ${analysis.name} ===`);
  console.log(
    "Line | Baseline Width | Output Width | Diff (px) | Diff (%) | Y Diff",
  );
  console.log("-----|----------------|--------------|-----------|----------|-------");

  let totalWidthDiffPct = 0;

  for (let i = 0; i < analysis.lines.length; i++) {
    const line = analysis.lines[i];
    totalWidthDiffPct += line.widthDiffPercent;

    console.log(
      `  ${i + 1}  |      ${line.baseline.width.toString().padStart(4)}      |     ${line.output.width.toString().padStart(4)}     |   ${line.widthDiff.toString().padStart(4)}    |  ${line.widthDiffPercent.toFixed(1).padStart(5)}%  |  ${line.yDiff.toString().padStart(3)}`,
    );
  }

  const avgWidthDiffPct = totalWidthDiffPct / analysis.lines.length;
  console.log("-----|----------------|--------------|-----------|----------|-------");
  console.log(
    `Average width diff: ${avgWidthDiffPct.toFixed(1)}%`,
  );
}

function listSnapshots(): string[] {
  if (!fs.existsSync(SNAPSHOT_DIR)) {return [];}
  return fs.readdirSync(SNAPSHOT_DIR).filter((f) => {
    const stat = fs.statSync(path.join(SNAPSHOT_DIR, f));
    return stat.isDirectory();
  });
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log("Usage:");
  console.log("  bun run scripts/font-metrics/measure-text-width.ts [snapshot-name]");
  console.log("  bun run scripts/font-metrics/measure-text-width.ts --all");
  console.log("  bun run scripts/font-metrics/measure-text-width.ts --list");
  process.exit(0);
}

if (args[0] === "--list") {
  console.log("Available snapshots:");
  listSnapshots().forEach((s) => console.log(`  ${s}`));
  process.exit(0);
}

if (args[0] === "--all") {
  const snapshots = listSnapshots();
  const results: TextAnalysis[] = [];

  for (const name of snapshots) {
    const analysis = analyzeSnapshot(name);
    if (analysis && analysis.lines.length > 0) {
      results.push(analysis);
      printAnalysis(analysis);
    }
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  const allDiffs = results.flatMap((r) => r.lines.map((l) => l.widthDiffPercent));
  if (allDiffs.length > 0) {
    const avgDiff = allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length;
    console.log(`Total snapshots analyzed: ${results.length}`);
    console.log(`Total lines analyzed: ${allDiffs.length}`);
    console.log(`Average width diff: ${avgDiff.toFixed(1)}%`);
  }
} else {
  const analysis = analyzeSnapshot(args[0]);
  if (analysis) {
    printAnalysis(analysis);
  }
}
