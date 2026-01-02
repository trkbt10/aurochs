import { PNG } from "pngjs";
import * as fs from "node:fs";

// Load images
const baseline = PNG.sync.read(fs.readFileSync("spec/visual-regression/snapshots/line-spacing-single/slide-1.png"));
const output = PNG.sync.read(fs.readFileSync("spec/visual-regression/__output__/line-spacing-single-slide-1.png"));

console.log("Image dimensions:", baseline.width, "x", baseline.height);

// Find first non-white pixel in each row (text start)
function findTextRows(png: PNG): { row: number; firstPixel: number; lastPixel: number }[] {
  const results: { row: number; firstPixel: number; lastPixel: number }[] = [];
  for (let y = 0; y < png.height; y++) {
    let firstPixel = -1;
    let lastPixel = -1;
    for (let x = 0; x < png.width; x++) {
      const idx = (y * png.width + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      // Check if pixel is not white (text pixel)
      if (r < 250 || g < 250 || b < 250) {
        if (firstPixel === -1) {firstPixel = x;}
        lastPixel = x;
      }
    }
    if (firstPixel !== -1) {
      results.push({ row: y, firstPixel, lastPixel });
    }
  }
  return results;
}

// Find text line boundaries (groups of consecutive rows with text)
function findTextLines(rows: { row: number; firstPixel: number; lastPixel: number }[]): { startRow: number; endRow: number; avgFirstPixel: number }[] {
  const lines: { startRow: number; endRow: number; avgFirstPixel: number }[] = [];
  let currentLine: typeof rows = [];

  for (let i = 0; i < rows.length; i++) {
    if (currentLine.length === 0 || rows[i].row - currentLine[currentLine.length - 1].row <= 2) {
      currentLine.push(rows[i]);
    } else {
      if (currentLine.length > 5) { // Filter noise
        const avgFirst = currentLine.reduce((sum, r) => sum + r.firstPixel, 0) / currentLine.length;
        lines.push({ startRow: currentLine[0].row, endRow: currentLine[currentLine.length - 1].row, avgFirstPixel: avgFirst });
      }
      currentLine = [rows[i]];
    }
  }
  if (currentLine.length > 5) {
    const avgFirst = currentLine.reduce((sum, r) => sum + r.firstPixel, 0) / currentLine.length;
    lines.push({ startRow: currentLine[0].row, endRow: currentLine[currentLine.length - 1].row, avgFirstPixel: avgFirst });
  }
  return lines;
}

const baselineRows = findTextRows(baseline);
const outputRows = findTextRows(output);

const baselineLines = findTextLines(baselineRows);
const outputLines = findTextLines(outputRows);

console.log("\n=== Baseline (LibreOffice) Text Lines ===");
baselineLines.forEach((line, i) => {
  console.log(`Line ${i + 1}: rows ${line.startRow}-${line.endRow}, x=${line.avgFirstPixel.toFixed(1)}`);
});

console.log("\n=== Our Output Text Lines ===");
outputLines.forEach((line, i) => {
  console.log(`Line ${i + 1}: rows ${line.startRow}-${line.endRow}, x=${line.avgFirstPixel.toFixed(1)}`);
});

console.log("\n=== Position Differences ===");
const minLines = Math.min(baselineLines.length, outputLines.length);
for (let i = 0; i < minLines; i++) {
  const bLine = baselineLines[i];
  const oLine = outputLines[i];
  const yDiff = oLine.startRow - bLine.startRow;
  const xDiff = oLine.avgFirstPixel - bLine.avgFirstPixel;
  console.log(`Line ${i + 1}: Y diff = ${yDiff}px, X diff = ${xDiff.toFixed(1)}px`);
}

// Calculate line spacing
console.log("\n=== Line Spacing Analysis ===");
for (let i = 1; i < baselineLines.length; i++) {
  const baselineSpacing = baselineLines[i].startRow - baselineLines[i-1].startRow;
  const outputSpacing = i < outputLines.length ? outputLines[i].startRow - outputLines[i-1].startRow : 0;
  console.log(`Between lines ${i} and ${i+1}: Baseline=${baselineSpacing}px, Output=${outputSpacing}px, Diff=${outputSpacing - baselineSpacing}px`);
}
