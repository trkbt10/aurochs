/**
 * @file Render PDF page text items as Markdown output
 *
 * PDF text elements have precise positional information (x, y, width, height, fontSize).
 * This renderer groups text items into visual lines based on Y-coordinate proximity,
 * sorts items within each line by X coordinate, and produces Markdown text.
 *
 * ## Line grouping strategy
 *
 * PDF text items on the same visual line share similar Y coordinates but rarely
 * have the exact same value due to font metrics, subscripts, and rendering variations.
 * Two items are considered on the same line if their Y coordinates are within
 * half the font height of each other.
 *
 * ## Heading detection
 *
 * Font size relative to the page's body text size is used to infer heading levels.
 * The most common font size is treated as body text; larger sizes become headings.
 *
 * ## Bold/italic formatting
 *
 * Text items with isBold or isItalic produce Markdown **bold** or *italic* markup.
 */

import type { MermaidPdfPage, MermaidPdfTextItem } from "./types";

// ---------------------------------------------------------------------------
// Line grouping
// ---------------------------------------------------------------------------

type TextLine = {
  /** Representative Y coordinate for this line (average of item Ys). */
  readonly y: number;
  /** Items sorted left-to-right by X coordinate. */
  readonly items: MermaidPdfTextItem[];
};

/**
 * Group text items into visual lines by Y-coordinate proximity.
 *
 * Items are sorted top-to-bottom (descending Y in PDF coordinates, since PDF Y
 * increases upward) and then clustered. A new line starts when the Y gap
 * exceeds half the current item's height.
 */
function groupIntoLines(items: readonly MermaidPdfTextItem[], pageHeight: number): TextLine[] {
  if (items.length === 0) return [];

  // Sort top-to-bottom: higher Y first (PDF coordinate: Y increases upward)
  const sorted = [...items].sort((a, b) => {
    const topA = a.y + a.height;
    const topB = b.y + b.height;
    if (Math.abs(topA - topB) > Math.min(a.height, b.height) * 0.5) {
      return topB - topA; // higher top = earlier in document
    }
    return a.x - b.x; // same line: left to right
  });

  const lines: TextLine[] = [];
  let currentLine: MermaidPdfTextItem[] = [sorted[0]!];
  let currentTop = sorted[0]!.y + sorted[0]!.height;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]!;
    const itemTop = item.y + item.height;
    const threshold = Math.min(item.height, currentLine[0]!.height) * 0.5;

    if (Math.abs(currentTop - itemTop) <= threshold) {
      // Same visual line
      currentLine.push(item);
    } else {
      // Finalize previous line and start new one
      currentLine.sort((a, b) => a.x - b.x);
      const avgY = currentLine.reduce((sum, it) => sum + it.y, 0) / currentLine.length;
      lines.push({ y: avgY, items: currentLine });
      currentLine = [item];
      currentTop = itemTop;
    }
  }

  // Finalize last line
  currentLine.sort((a, b) => a.x - b.x);
  const avgY = currentLine.reduce((sum, it) => sum + it.y, 0) / currentLine.length;
  lines.push({ y: avgY, items: currentLine });

  return lines;
}

// ---------------------------------------------------------------------------
// Font size analysis
// ---------------------------------------------------------------------------

/**
 * Determine the most common (body) font size from a set of text items.
 * Returns undefined if there are no items.
 */
function detectBodyFontSize(items: readonly MermaidPdfTextItem[]): number | undefined {
  if (items.length === 0) return undefined;

  // Count total text length per font size (rounded to 0.5pt) to weight by content amount
  const sizeWeights = new Map<number, number>();
  for (const item of items) {
    const rounded = Math.round(item.fontSize * 2) / 2;
    sizeWeights.set(rounded, (sizeWeights.get(rounded) ?? 0) + item.text.length);
  }

  let maxWeight = 0;
  let bodySize = items[0]!.fontSize;
  for (const [size, weight] of sizeWeights) {
    if (weight > maxWeight) {
      maxWeight = weight;
      bodySize = size;
    }
  }

  return bodySize;
}

/**
 * Map a font size ratio (relative to body) to a Markdown heading level.
 * Returns undefined for body-sized or smaller text.
 *
 * Thresholds are based on typical document heading size ratios:
 * - h1: >= 1.8x body (e.g. 22pt vs 12pt body)
 * - h2: >= 1.4x body (e.g. 17pt vs 12pt body)
 * - h3: >= 1.15x body (e.g. 14pt vs 12pt body)
 */
function fontSizeToHeadingLevel(fontSize: number, bodyFontSize: number): number | undefined {
  const ratio = fontSize / bodyFontSize;
  if (ratio >= 1.8) return 1;
  if (ratio >= 1.4) return 2;
  if (ratio >= 1.15) return 3;
  return undefined;
}

// ---------------------------------------------------------------------------
// Text formatting
// ---------------------------------------------------------------------------

/** Join text items on a line into a single string with appropriate spacing. */
function joinLineItems(items: readonly MermaidPdfTextItem[]): string {
  if (items.length === 0) return "";

  const parts: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const text = item.text.trim();
    if (!text) continue;

    // Detect gap between this item and the previous one to insert space
    if (i > 0) {
      const prev = items[i - 1]!;
      const gap = item.x - (prev.x + prev.width);
      // Insert space if gap is wider than ~0.25 of the current font size
      // (typical character spacing is much smaller than this)
      if (gap > item.fontSize * 0.25) {
        parts.push(" ");
      }
    }

    // Apply inline formatting
    let formatted = text;
    if (item.isBold && item.isItalic) {
      formatted = `***${text}***`;
    } else if (item.isBold) {
      formatted = `**${text}**`;
    } else if (item.isItalic) {
      formatted = `*${text}*`;
    }

    parts.push(formatted);
  }

  return parts.join("");
}

// ---------------------------------------------------------------------------
// Page rendering
// ---------------------------------------------------------------------------

/** Render a single PDF page's text items as Markdown. */
export function renderPdfPageMermaid(page: MermaidPdfPage): string {
  if (page.textItems.length === 0) return "";

  const lines = groupIntoLines(page.textItems, page.height);
  const bodyFontSize = detectBodyFontSize(page.textItems);
  const sections: string[] = [];

  for (const line of lines) {
    const text = joinLineItems(line.items);
    if (!text.trim()) continue;

    // Detect heading from font size
    if (bodyFontSize !== undefined) {
      // Use the maximum font size in the line to determine heading level
      const maxFontSize = Math.max(...line.items.map((it) => it.fontSize));
      const headingLevel = fontSizeToHeadingLevel(maxFontSize, bodyFontSize);
      if (headingLevel !== undefined) {
        const hashes = "#".repeat(headingLevel);
        // Strip bold markers from headings (headings are inherently prominent)
        const cleaned = text.replace(/\*{2,3}([^*]+)\*{2,3}/g, "$1");
        sections.push(`${hashes} ${cleaned}`);
        continue;
      }
    }

    sections.push(text);
  }

  return sections.join("\n\n");
}
