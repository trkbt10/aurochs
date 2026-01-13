/**
 * @file Temporary debug script for PDF text metrics verification
 *
 * Purpose: Verify that PDF text width calculation is accurate
 * by comparing computed values with PDF internal metrics.
 */

import { parsePdf } from "../parser/pdf-parser";
import type { PdfText, PdfPage } from "../domain";

type TextMetricsDebugInfo = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly fontName: string;
  readonly charSpacing: number | undefined;
  readonly wordSpacing: number | undefined;
  readonly horizontalScaling: number | undefined;
  // Calculated values for verification
  readonly widthPerChar: number;
  readonly expectedWidthFromMetrics: number;
};

/**
 * Extract text metrics from a PDF page for debugging
 */
export function extractTextMetricsForDebug(page: PdfPage): TextMetricsDebugInfo[] {
  const results: TextMetricsDebugInfo[] = [];

  for (const elem of page.elements) {
    if (elem.type !== "text") continue;

    const text = elem as PdfText;
    const charCount = text.text.length;

    results.push({
      text: text.text,
      x: text.x,
      y: text.y,
      width: text.width,
      height: text.height,
      fontSize: text.fontSize,
      fontName: text.fontName,
      charSpacing: text.charSpacing,
      wordSpacing: text.wordSpacing,
      horizontalScaling: text.horizontalScaling,
      widthPerChar: charCount > 0 ? text.width / charCount : 0,
      expectedWidthFromMetrics: calculateExpectedWidth(text),
    });
  }

  return results;
}

/**
 * Calculate expected text width based on font metrics and spacing
 *
 * Formula from PDF Reference 9.4.4:
 * tx = sum of ((w0 × Tfs / 1000) + Tc + (isSpace ? Tw : 0)) × Th
 */
function calculateExpectedWidth(text: PdfText): number {
  const Tfs = text.fontSize;
  const Tc = text.charSpacing ?? 0;
  const Tw = text.wordSpacing ?? 0;
  const Th = (text.horizontalScaling ?? 100) / 100;

  // Without font metrics, we can only estimate
  // Assume average glyph width of 500 (1/1000 em)
  const assumedGlyphWidth = 500;

  let totalWidth = 0;
  for (const char of text.text) {
    const isSpace = char === " ";
    const glyphWidth = (assumedGlyphWidth * Tfs) / 1000;
    const charDisplacement = (glyphWidth + Tc + (isSpace ? Tw : 0)) * Th;
    totalWidth += charDisplacement;
  }

  return totalWidth;
}

/**
 * Analyze centering of text within a page
 * Returns estimated alignment based on text position relative to page width
 */
export type TextAlignment = "left" | "center" | "right" | "unknown";

export function detectTextAlignment(
  text: PdfText,
  pageWidth: number,
  tolerance: number = 5 // points
): TextAlignment {
  const textLeft = text.x;
  const textRight = text.x + text.width;
  const textCenter = text.x + text.width / 2;
  const pageCenter = pageWidth / 2;

  // Check if centered
  if (Math.abs(textCenter - pageCenter) < tolerance) {
    return "center";
  }

  // Check if right-aligned (text right edge near page right)
  const rightMargin = pageWidth - textRight;
  const leftMargin = textLeft;
  if (rightMargin < tolerance && leftMargin > tolerance * 2) {
    return "right";
  }

  // Check if left-aligned (text left edge near page left or has small left margin)
  if (leftMargin < tolerance * 3 || leftMargin < rightMargin * 0.5) {
    return "left";
  }

  return "unknown";
}

/**
 * Group-level centering detection
 * Analyzes a group of texts to determine overall alignment
 */
export function detectGroupAlignment(
  texts: readonly PdfText[],
  pageWidth: number
): TextAlignment {
  if (texts.length === 0) return "unknown";

  // Find group bounds
  const minX = Math.min(...texts.map((t) => t.x));
  const maxX = Math.max(...texts.map((t) => t.x + t.width));
  const groupCenter = (minX + maxX) / 2;
  const pageCenter = pageWidth / 2;

  const tolerance = 10; // points

  if (Math.abs(groupCenter - pageCenter) < tolerance) {
    return "center";
  }

  const leftMargin = minX;
  const rightMargin = pageWidth - maxX;

  if (Math.abs(leftMargin - rightMargin) < tolerance) {
    return "center";
  }

  if (leftMargin < rightMargin * 0.5) {
    return "left";
  }

  if (rightMargin < leftMargin * 0.5) {
    return "right";
  }

  return "unknown";
}

/**
 * Print debug information for all texts on a page
 */
export function printPageTextMetrics(page: PdfPage): void {
  console.log(`\n=== Page ${page.pageNumber} (${page.width} x ${page.height}) ===\n`);

  const metrics = extractTextMetricsForDebug(page);

  for (const m of metrics) {
    const alignment = detectTextAlignment(
      { x: m.x, width: m.width } as PdfText,
      page.width
    );

    console.log(`Text: "${m.text.slice(0, 30)}${m.text.length > 30 ? "..." : ""}"`);
    console.log(`  Position: (${m.x.toFixed(2)}, ${m.y.toFixed(2)})`);
    console.log(`  Size: ${m.width.toFixed(2)} x ${m.height.toFixed(2)}`);
    console.log(`  Font: ${m.fontName} @ ${m.fontSize.toFixed(2)}pt`);
    console.log(`  Spacing: char=${m.charSpacing ?? 0}, word=${m.wordSpacing ?? 0}, hScale=${m.horizontalScaling ?? 100}%`);
    console.log(`  Width/char: ${m.widthPerChar.toFixed(2)}`);
    console.log(`  Detected alignment: ${alignment}`);
    console.log("");
  }
}

/**
 * Main debug function - run on a PDF file
 */
export async function debugPdfTextMetrics(pdfData: Uint8Array): Promise<void> {
  const doc = await parsePdf(pdfData);

  for (const page of doc.pages) {
    printPageTextMetrics(page);
  }
}
