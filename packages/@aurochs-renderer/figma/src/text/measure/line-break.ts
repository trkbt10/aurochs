/**
 * @file Line breaking logic for text wrapping
 */

import type {
  MeasurementProvider,
  FontSpec,
  LineMeasurement,
  WordSegment,
  LineBreakMode,
} from "./types";

/**
 * Unicode line break opportunities
 */
const LINE_BREAK_CHARS = new Set([
  "\n", // Line feed
  "\r", // Carriage return
  " ", // Space
  "\t", // Tab
  "-", // Hyphen
  "\u200B", // Zero-width space
  "\u2028", // Line separator
  "\u2029", // Paragraph separator
]);

/**
 * Characters that should not start a line (CJK punctuation)
 */
const NO_LINE_START = new Set([
  "、",
  "。",
  "，",
  "．",
  "！",
  "？",
  "：",
  "；",
  "」",
  "』",
  "）",
  "】",
  "〉",
  "》",
  "〕",
  "〗",
  "〙",
  "〛",
]);

/**
 * Characters that should not end a line (CJK opening brackets)
 */
const NO_LINE_END = new Set(["「", "『", "（", "【", "〈", "《", "〔", "〖", "〘", "〚"]);

/**
 * Check if a character is CJK (Chinese, Japanese, Korean)
 */
function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3000 && code <= 0x303f) || // CJK Punctuation
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) || // Katakana
    (code >= 0xac00 && code <= 0xd7af) || // Hangul
    (code >= 0xff00 && code <= 0xffef) // Fullwidth forms
  );
}

/**
 * Check if there's a line break opportunity at the given position
 */
function isBreakOpportunity(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) {
    return false;
  }

  const prevChar = text[index - 1];
  const currChar = text[index];

  // Hard line breaks
  if (prevChar === "\n" || prevChar === "\r") {
    return true;
  }

  // Don't break before no-line-start characters
  if (NO_LINE_START.has(currChar)) {
    return false;
  }

  // Don't break after no-line-end characters
  if (NO_LINE_END.has(prevChar)) {
    return false;
  }

  // Break after line break characters
  if (LINE_BREAK_CHARS.has(prevChar)) {
    return true;
  }

  // Break before/after CJK characters (except when adjacent to punctuation)
  if (isCJK(prevChar) || isCJK(currChar)) {
    return true;
  }

  return false;
}

/**
 * Find the last break opportunity within a given width
 */
function findLastBreakOpportunity(
  text: string,
  charWidths: readonly number[],
  startIndex: number,
  maxWidth: number
): { index: number; width: number } | null {
  let currentWidth = 0;
  let lastBreakIndex = -1;
  let lastBreakWidth = 0;

  for (let i = startIndex; i < text.length; i++) {
    const charWidth = charWidths[i];

    // Check if adding this character would exceed max width
    if (currentWidth + charWidth > maxWidth && lastBreakIndex >= 0) {
      return { index: lastBreakIndex, width: lastBreakWidth };
    }

    currentWidth += charWidth;

    // Check for break opportunity after this character
    if (isBreakOpportunity(text, i + 1)) {
      lastBreakIndex = i + 1;
      lastBreakWidth = currentWidth;
    }
  }

  // All text fits within max width
  return null;
}

/**
 * Segment text into words and whitespace
 */
export function segmentText(
  text: string,
  charWidths: readonly number[]
): readonly WordSegment[] {
  const segments: WordSegment[] = [];
  let currentStart = 0;
  let currentWidth = 0;
  let inWhitespace = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isSpace = char === " " || char === "\t";
    const isNewline = char === "\n" || char === "\r";

    if (isNewline) {
      // Flush current segment
      if (i > currentStart) {
        segments.push({
          text: text.slice(currentStart, i),
          width: currentWidth,
          startIndex: currentStart,
          endIndex: i,
          isWhitespace: inWhitespace,
        });
      }
      // Add newline as separate segment
      segments.push({
        text: char,
        width: 0, // Newlines have no width
        startIndex: i,
        endIndex: i + 1,
        isWhitespace: true,
      });
      currentStart = i + 1;
      currentWidth = 0;
      inWhitespace = false;
    } else if (isSpace !== inWhitespace && i > currentStart) {
      // Transition between word and whitespace
      segments.push({
        text: text.slice(currentStart, i),
        width: currentWidth,
        startIndex: currentStart,
        endIndex: i,
        isWhitespace: inWhitespace,
      });
      currentStart = i;
      currentWidth = charWidths[i];
      inWhitespace = isSpace;
    } else {
      currentWidth += charWidths[i];
      if (i === currentStart) {
        inWhitespace = isSpace;
      }
    }
  }

  // Flush final segment
  if (currentStart < text.length) {
    segments.push({
      text: text.slice(currentStart),
      width: currentWidth,
      startIndex: currentStart,
      endIndex: text.length,
      isWhitespace: inWhitespace,
    });
  }

  return segments;
}

/**
 * Break text into lines based on word boundaries
 */
export function breakLinesWord(
  text: string,
  charWidths: readonly number[],
  maxWidth: number,
  maxLines: number = 0
): readonly LineMeasurement[] {
  const segments = segmentText(text, charWidths);
  const lines: LineMeasurement[] = [];

  let currentLine: WordSegment[] = [];
  let currentWidth = 0;

  for (const segment of segments) {
    // Handle explicit line breaks
    if (segment.text === "\n" || segment.text === "\r") {
      const lineText = currentLine.map((s) => s.text).join("");
      if (currentLine.length > 0 || lines.length === 0) {
        lines.push({
          text: lineText,
          width: currentWidth,
          startIndex: currentLine.length > 0 ? currentLine[0].startIndex : segment.startIndex,
          endIndex: segment.startIndex,
        });
      }
      currentLine = [];
      currentWidth = 0;
      continue;
    }

    // Check if segment fits on current line
    if (currentWidth + segment.width <= maxWidth) {
      currentLine.push(segment);
      currentWidth += segment.width;
    } else {
      // Doesn't fit - start new line
      if (currentLine.length > 0) {
        // Remove trailing whitespace from current line
        while (
          currentLine.length > 0 &&
          currentLine[currentLine.length - 1].isWhitespace
        ) {
          const removed = currentLine.pop()!;
          currentWidth -= removed.width;
        }

        const lineText = currentLine.map((s) => s.text).join("");
        lines.push({
          text: lineText,
          width: currentWidth,
          startIndex: currentLine[0].startIndex,
          endIndex: currentLine[currentLine.length - 1].endIndex,
        });
      }

      // Start new line with current segment (skip leading whitespace)
      if (!segment.isWhitespace) {
        currentLine = [segment];
        currentWidth = segment.width;
      } else {
        currentLine = [];
        currentWidth = 0;
      }
    }

    // Check max lines limit
    if (maxLines > 0 && lines.length >= maxLines) {
      break;
    }
  }

  // Flush remaining content
  if (currentLine.length > 0 && (maxLines === 0 || lines.length < maxLines)) {
    // Remove trailing whitespace
    while (
      currentLine.length > 0 &&
      currentLine[currentLine.length - 1].isWhitespace
    ) {
      const removed = currentLine.pop()!;
      currentWidth -= removed.width;
    }

    if (currentLine.length > 0) {
      const lineText = currentLine.map((s) => s.text).join("");
      lines.push({
        text: lineText,
        width: currentWidth,
        startIndex: currentLine[0].startIndex,
        endIndex: currentLine[currentLine.length - 1].endIndex,
      });
    }
  }

  // Handle empty text
  if (lines.length === 0) {
    lines.push({
      text: "",
      width: 0,
      startIndex: 0,
      endIndex: 0,
    });
  }

  return lines;
}

/**
 * Break text into lines based on character boundaries
 */
export function breakLinesChar(
  text: string,
  charWidths: readonly number[],
  maxWidth: number,
  maxLines: number = 0
): readonly LineMeasurement[] {
  const lines: LineMeasurement[] = [];
  let lineStart = 0;
  let lineWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charWidth = charWidths[i];

    // Handle explicit line breaks
    if (char === "\n" || char === "\r") {
      lines.push({
        text: text.slice(lineStart, i),
        width: lineWidth,
        startIndex: lineStart,
        endIndex: i,
      });
      lineStart = i + 1;
      lineWidth = 0;

      // Check max lines
      if (maxLines > 0 && lines.length >= maxLines) {
        break;
      }
      continue;
    }

    // Check if character fits
    if (lineWidth + charWidth > maxWidth && lineWidth > 0) {
      // Line is full, start new line
      lines.push({
        text: text.slice(lineStart, i),
        width: lineWidth,
        startIndex: lineStart,
        endIndex: i,
      });
      lineStart = i;
      lineWidth = charWidth;

      // Check max lines
      if (maxLines > 0 && lines.length >= maxLines) {
        break;
      }
    } else {
      lineWidth += charWidth;
    }
  }

  // Flush remaining content
  if (lineStart < text.length && (maxLines === 0 || lines.length < maxLines)) {
    lines.push({
      text: text.slice(lineStart),
      width: lineWidth,
      startIndex: lineStart,
      endIndex: text.length,
    });
  }

  // Handle empty text
  if (lines.length === 0) {
    lines.push({
      text: "",
      width: 0,
      startIndex: 0,
      endIndex: 0,
    });
  }

  return lines;
}

/**
 * Break text into lines using auto mode (word first, then char)
 */
export function breakLinesAuto(
  text: string,
  charWidths: readonly number[],
  maxWidth: number,
  maxLines: number = 0
): readonly LineMeasurement[] {
  // First try word-based breaking
  const wordLines = breakLinesWord(text, charWidths, maxWidth, maxLines);

  // Check if any word is wider than maxWidth
  const results: LineMeasurement[] = [];

  for (const line of wordLines) {
    if (line.width <= maxWidth) {
      results.push(line);
    } else {
      // Word is too long, break by character
      const lineCharWidths = charWidths.slice(line.startIndex, line.endIndex);
      const charLines = breakLinesChar(
        line.text,
        lineCharWidths,
        maxWidth,
        maxLines > 0 ? maxLines - results.length : 0
      );

      // Adjust indices
      for (const charLine of charLines) {
        results.push({
          text: charLine.text,
          width: charLine.width,
          startIndex: line.startIndex + charLine.startIndex,
          endIndex: line.startIndex + charLine.endIndex,
        });

        if (maxLines > 0 && results.length >= maxLines) {
          break;
        }
      }
    }

    if (maxLines > 0 && results.length >= maxLines) {
      break;
    }
  }

  return results;
}

/**
 * Break text into lines
 */
export function breakLines(
  text: string,
  charWidths: readonly number[],
  maxWidth: number,
  mode: LineBreakMode = "auto",
  maxLines: number = 0
): readonly LineMeasurement[] {
  if (mode === "none" || !maxWidth || maxWidth <= 0) {
    // No line breaking, just split on explicit line breaks
    const lines: LineMeasurement[] = [];
    const textLines = text.split(/\r?\n/);
    let currentIndex = 0;

    for (const lineText of textLines) {
      let width = 0;
      for (let i = 0; i < lineText.length; i++) {
        width += charWidths[currentIndex + i];
      }
      lines.push({
        text: lineText,
        width,
        startIndex: currentIndex,
        endIndex: currentIndex + lineText.length,
      });
      currentIndex += lineText.length + 1; // +1 for the newline
    }

    return lines;
  }

  switch (mode) {
    case "word":
      return breakLinesWord(text, charWidths, maxWidth, maxLines);
    case "char":
      return breakLinesChar(text, charWidths, maxWidth, maxLines);
    case "auto":
    default:
      return breakLinesAuto(text, charWidths, maxWidth, maxLines);
  }
}
