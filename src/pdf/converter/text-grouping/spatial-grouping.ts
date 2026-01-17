/**
 * @file Spatial grouping strategy for combining adjacent text elements.
 *
 * Groups PDF text elements based on spatial proximity, font properties,
 * and layout characteristics to create logical text blocks.
 *
 * ## Grouping Algorithm
 *
 * 1. **Line Detection**: Group texts by Y proximity using reference font size
 * 2. **Horizontal Merging**: Merge adjacent texts on the same line
 * 3. **Block Formation**: Combine related lines into text blocks
 *
 * ## Coordinate System (PDF)
 *
 * - Origin: bottom-left
 * - Y increases upward
 * - PdfText.y: bottom edge of text bounding box
 * - PdfText.height: full height (ascender - descender) * fontSize / 1000
 */

import type { PdfText } from "../../domain";
import type { BlockingZone, GroupedText, GroupedParagraph, GroupingContext, TextGroupingFn } from "./types";

/**
 * Color matching mode for style comparison.
 *
 * - "strict": Colors must match exactly
 * - "loose": Allow similar colors (useful for slight rendering differences)
 * - "none": Ignore color in style matching
 */
export type ColorMatchingMode = "strict" | "loose" | "none";

/**
 * Options for spatial grouping behavior.
 */
export type SpatialGroupingOptions = {
  /**
   * Tolerance for considering texts on the same line.
   * Ratio of font size (default: 0.3 = 30% of fontSize).
   * Applied to the line's reference font size for consistency.
   */
  readonly lineToleranceRatio?: number;

  /**
   * Maximum horizontal gap between texts to group.
   * Ratio of average character width (default: 1.5).
   */
  readonly horizontalGapRatio?: number;

  /**
   * Maximum vertical gap between lines to group.
   * Ratio of line height (default: 1.2).
   */
  readonly verticalGapRatio?: number;

  /**
   * Color matching mode for determining if texts have the same style.
   * (default: "none" - ignore color differences)
   */
  readonly colorMatching?: ColorMatchingMode;

  /**
   * Font size tolerance ratio for style matching.
   * (default: 0.1 = 10% tolerance)
   */
  readonly fontSizeToleranceRatio?: number;

  /**
   * Enable column-based separation for table-like structures.
   * When enabled, texts on the same line with large horizontal gaps
   * are split into separate groups (columns).
   * (default: true)
   */
  readonly enableColumnSeparation?: boolean;

  /**
   * Minimum horizontal gap to consider as column boundary.
   * Ratio of average character width (default: 3.0).
   * Gaps larger than this are considered column boundaries.
   */
  readonly columnGapRatio?: number;
};

const DEFAULT_OPTIONS: Required<SpatialGroupingOptions> = {
  lineToleranceRatio: 0.3,
  horizontalGapRatio: 1.5,
  verticalGapRatio: 1.2,
  colorMatching: "none",
  fontSizeToleranceRatio: 0.1,
  enableColumnSeparation: true,
  columnGapRatio: 3.0,
};

/** Default character width in 1/1000 em units for fallback */
const DEFAULT_CHAR_WIDTH_EM = 500;

// =============================================================================
// Pure Helper Functions
// =============================================================================

/**
 * Estimate character width for a text element.
 *
 * Uses fontMetrics.defaultWidth when available, otherwise calculates
 * from the text's width and length with a minimum bound.
 */
function estimateCharWidth(text: PdfText): number {
  // Use font metrics if available (in 1/1000 em units -> convert to points)
  if (text.fontMetrics) {
    const metricsWidth = DEFAULT_CHAR_WIDTH_EM; // 500 em units
    return (metricsWidth * text.fontSize) / 1000;
  }

  // Fallback: estimate from text width
  // Ensure minimum width to avoid division issues with short texts
  const estimatedWidth = text.width / Math.max(text.text.length, 1);
  const minWidth = text.fontSize * 0.3; // Minimum 30% of font size
  return Math.max(estimatedWidth, minWidth);
}

/**
 * Calculate expected gap between two adjacent texts.
 *
 * Takes into account:
 * - Character width (base spacing)
 * - charSpacing (PDF Tc operator)
 * - wordSpacing (PDF Tw operator, if previous text ends with space)
 * - horizontalScaling (PDF Tz operator)
 */
function calculateExpectedGap(prev: PdfText, curr: PdfText): number {
  const baseCharWidth = (estimateCharWidth(prev) + estimateCharWidth(curr)) / 2;

  // Get spacing properties with defaults
  const charSpacing = prev.charSpacing ?? 0;
  const hScale = (prev.horizontalScaling ?? 100) / 100;

  // Add wordSpacing if previous text ends with space
  const endsWithSpace = prev.text.endsWith(" ");
  const wordSpacing = endsWithSpace ? (prev.wordSpacing ?? 0) : 0;

  // Apply horizontal scaling to spacing values
  return (baseCharWidth + charSpacing + wordSpacing) * hScale;
}

/**
 * Normalize font name by removing subset prefix.
 */
function normalizeFontName(name: string): string {
  const plusIndex = name.indexOf("+");
  return plusIndex > 0 ? name.slice(plusIndex + 1) : name;
}

/**
 * Check if two texts have the same fill color.
 */
function hasSameColor(t1: PdfText, t2: PdfText, mode: ColorMatchingMode): boolean {
  const c1 = t1.graphicsState.fillColor;
  const c2 = t2.graphicsState.fillColor;

  // Different color spaces
  if (c1.colorSpace !== c2.colorSpace) {return false;}

  // Compare components
  if (c1.components.length !== c2.components.length) {return false;}

  if (mode === "strict") {
    // Exact match
    return c1.components.every((v, i) => v === c2.components[i]);
  }

  // Loose match (allow small differences)
  const tolerance = 0.05; // 5% tolerance for each component
  return c1.components.every((v, i) => {
    const diff = Math.abs(v - c2.components[i]);
    return diff <= tolerance;
  });
}

/**
 * Check if two texts have the same font style.
 */
function hasSameStyle(t1: PdfText, t2: PdfText, options: Required<SpatialGroupingOptions>): boolean {
  // Font name (ignore subset prefix)
  const name1 = normalizeFontName(t1.fontName);
  const name2 = normalizeFontName(t2.fontName);
  if (name1 !== name2) {return false;}

  // Font size (configurable tolerance, default 10%)
  const sizeDiff = Math.abs(t1.fontSize - t2.fontSize);
  if (sizeDiff > t1.fontSize * options.fontSizeToleranceRatio) {return false;}

  // Color matching (if enabled)
  if (options.colorMatching !== "none") {
    if (!hasSameColor(t1, t2, options.colorMatching)) {return false;}
  }

  return true;
}

/**
 * Check if there's a blocking zone between two texts (horizontally).
 * Used to prevent grouping texts that have shapes/images between them.
 *
 * ## Important: Container vs Separator Zones
 *
 * A zone that CONTAINS both texts (e.g., a background rectangle they're
 * both sitting on) should NOT block grouping. Only zones that are truly
 * BETWEEN the texts (separating them) should block.
 */
function hasBlockingZoneBetween(
  text1: PdfText,
  text2: PdfText,
  blockingZones: readonly BlockingZone[] | undefined
): boolean {
  if (!blockingZones || blockingZones.length === 0) {
    return false;
  }

  // Ensure text1 is to the left of text2
  const [leftText, rightText] = text1.x < text2.x ? [text1, text2] : [text2, text1];

  // Calculate the gap region between texts
  const gapLeft = leftText.x + leftText.width;
  const gapRight = rightText.x;
  const gapY = Math.min(leftText.y, rightText.y);
  const gapHeight = Math.max(leftText.y + leftText.height, rightText.y + rightText.height) - gapY;

  // Skip if texts are overlapping (no gap to check)
  if (gapLeft >= gapRight) {
    return false;
  }

  // Check if any blocking zone is BETWEEN the texts (not containing them)
  for (const zone of blockingZones) {
    const zoneRight = zone.x + zone.width;
    const zoneTop = zone.y + zone.height;

    // Check horizontal overlap with gap
    const horizontalOverlap = zone.x < gapRight && zoneRight > gapLeft;

    // Check vertical overlap (zone should be at similar Y level)
    const verticalOverlap = zone.y < gapY + gapHeight && zoneTop > gapY;

    if (horizontalOverlap && verticalOverlap) {
      // Check if this zone CONTAINS both texts (is a background/container)
      const containsLeftText = zone.x <= leftText.x && zoneRight >= gapLeft;
      const containsRightText = zone.x <= gapRight && zoneRight >= rightText.x + rightText.width;
      const isContainerZone = containsLeftText && containsRightText;

      if (isContainerZone) {
        // This is a background shape both texts are on - don't block
        continue;
      }

      // Zone is truly between the texts - block grouping
      return true;
    }
  }

  return false;
}

/**
 * Check if there's a blocking zone between two lines (vertically).
 */
function hasBlockingZoneBetweenLines(
  line1: GroupedParagraph,
  line2: GroupedParagraph,
  blockingZones: readonly BlockingZone[] | undefined
): boolean {
  if (!blockingZones || blockingZones.length === 0) {
    return false;
  }

  // Calculate bounds of each line
  const line1Runs = line1.runs;
  const line2Runs = line2.runs;

  const line1MinX = Math.min(...line1Runs.map((r) => r.x));
  const line1MaxX = Math.max(...line1Runs.map((r) => r.x + r.width));
  const line1MinY = Math.min(...line1Runs.map((r) => r.y));
  const line1MaxY = Math.max(...line1Runs.map((r) => r.y + r.height));
  const line1Y = line1.baselineY;

  const line2MinX = Math.min(...line2Runs.map((r) => r.x));
  const line2MaxX = Math.max(...line2Runs.map((r) => r.x + r.width));
  const line2MinY = Math.min(...line2Runs.map((r) => r.y));
  const line2MaxY = Math.max(...line2Runs.map((r) => r.y + r.height));
  const line2Y = line2.baselineY;

  // Ensure line1 is above line2 (higher Y in PDF coords)
  const line1Bounds = { minX: line1MinX, maxX: line1MaxX, y: line1Y, minY: line1MinY, maxY: line1MaxY };
  const line2Bounds = { minX: line2MinX, maxX: line2MaxX, y: line2Y, minY: line2MinY, maxY: line2MaxY };
  const [upperLine, lowerLine] = line1Y > line2Y ? [line1Bounds, line2Bounds] : [line2Bounds, line1Bounds];

  // Check if any blocking zone is between the lines
  for (const zone of blockingZones) {
    const zoneTop = zone.y + zone.height;
    const zoneRight = zone.x + zone.width;

    // Zone is vertically between lines
    const verticalBetween = zone.y < upperLine.y && zoneTop > lowerLine.y;

    // Zone has horizontal overlap with line X range
    const lineMinX = Math.min(upperLine.minX, lowerLine.minX);
    const lineMaxX = Math.max(upperLine.maxX, lowerLine.maxX);
    const horizontalOverlap = zone.x < lineMaxX && zoneRight > lineMinX;

    if (verticalBetween && horizontalOverlap) {
      // Check if this zone CONTAINS both lines (is a background/container)
      const containsUpperLine = zone.y <= upperLine.minY && zoneTop >= upperLine.maxY &&
                                zone.x <= upperLine.minX && zoneRight >= upperLine.maxX;
      const containsLowerLine = zone.y <= lowerLine.minY && zoneTop >= lowerLine.maxY &&
                                zone.x <= lowerLine.minX && zoneRight >= lowerLine.maxX;
      const isContainerZone = containsUpperLine && containsLowerLine;

      if (isContainerZone) {
        // This is a background shape both lines are on - don't block
        continue;
      }

      return true;
    }
  }

  return false;
}

/**
 * Create a paragraph from texts.
 */
function createParagraphFromTexts(texts: readonly PdfText[]): GroupedParagraph {
  const firstText = texts[0];
  const descender = firstText?.fontMetrics?.descender ?? -200;
  const fontSize = firstText?.fontSize ?? 12;
  const baseline = (firstText?.y ?? 0) - (descender * fontSize) / 1000;

  return {
    runs: texts,
    baselineY: baseline,
  };
}

/**
 * Width buffer ratio for TextBox bounds.
 *
 * PDF text width includes charSpacing/wordSpacing effects from the original rendering.
 * However, when PPTX applies the `spacing` property, it may add additional space
 * that causes the effective text width to exceed the TextBox bounds.
 *
 * Additionally, font substitution (PDF font → PPTX font) may result in
 * slightly different character widths.
 *
 * This buffer ensures the TextBox is wide enough to prevent unintended line breaks.
 */
const WIDTH_BUFFER_RATIO = 0.05; // 5% buffer


/**
 * Calculate spacing-based width adjustment.
 *
 * When texts have charSpacing, the PPTX spacing property may cause
 * additional width expansion. Calculate the extra width needed.
 */
function calculateSpacingWidthAdjustment(runs: readonly PdfText[]): number {
  const maxAdjustment = { value: 0 };

  for (const run of runs) {
    if (run.charSpacing && run.charSpacing > 0) {
      // Each character gets extra spacing, so total adjustment = charSpacing × (charCount - 1)
      const charCount = Math.max(run.text.length - 1, 0);
      const adjustment = run.charSpacing * charCount * ((run.horizontalScaling ?? 100) / 100);
      maxAdjustment.value = Math.max(maxAdjustment.value, adjustment);
    }
  }

  return maxAdjustment.value;
}


/**
 * Add line spacing information to paragraphs.
 *
 * Calculates the baseline distance between consecutive paragraphs
 * and stores it with the current line's font size for PPTX line spacing conversion.
 *
 * The font size is taken from the current line because:
 * - lineSpacing = baselineDistance / fontSize gives the spacing ratio
 * - The ratio is relative to the font size of the line that "owns" this spacing
 */
function addLineSpacingToParagraphs(paragraphs: readonly GroupedParagraph[]): GroupedParagraph[] {
  if (paragraphs.length <= 1) {
    return [...paragraphs];
  }

  const result: GroupedParagraph[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const current = paragraphs[i];
    const next = paragraphs[i + 1];

    if (next) {
      // Baseline distance from current line to next line
      // In PDF coordinates, Y increases upward, so current.baselineY > next.baselineY
      const baselineDistance = current.baselineY - next.baselineY;
      const fontSize = current.runs[0]?.fontSize;

      if (baselineDistance > 0 && fontSize !== undefined && fontSize > 0) {
        result.push({
          ...current,
          lineSpacing: { baselineDistance, fontSize },
        });
      } else {
        result.push(current);
      }
    } else {
      // Last paragraph has no line spacing
      result.push(current);
    }
  }

  return result;
}


/**
 * Create GroupedText from paragraphs.
 *
 * Adds width buffer to account for:
 * 1. PPTX spacing property potentially adding extra character spacing
 * 2. Font substitution causing slightly different character widths
 */
function createGroupedText(paragraphs: readonly GroupedParagraph[]): GroupedText {
  const allRuns = paragraphs.flatMap((p) => p.runs);

  const minX = Math.min(...allRuns.map((r) => r.x));
  const maxX = Math.max(...allRuns.map((r) => r.x + r.width));
  const minY = Math.min(...allRuns.map((r) => r.y));
  const maxY = Math.max(...allRuns.map((r) => r.y + r.height));

  const baseWidth = maxX - minX;

  // Add width buffer to prevent unintended line breaks
  const spacingAdjustment = calculateSpacingWidthAdjustment(allRuns);
  const percentageBuffer = baseWidth * WIDTH_BUFFER_RATIO;
  const totalBuffer = Math.max(spacingAdjustment, percentageBuffer);

  // Add line spacing information
  const paragraphsWithSpacing = addLineSpacingToParagraphs(paragraphs);

  return {
    bounds: {
      x: minX,
      y: minY,
      width: baseWidth + totalBuffer,
      height: maxY - minY,
    },
    paragraphs: paragraphsWithSpacing,
  };
}

// =============================================================================
// Line Grouping Functions
// =============================================================================

/**
 * Merge horizontally adjacent texts into runs.
 */
function mergeHorizontallyAdjacent(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>
): PdfText[] {
  if (texts.length <= 1) {return [...texts];}

  const result: PdfText[] = [texts[0]];

  for (let i = 1; i < texts.length; i++) {
    const prev = texts[i - 1];
    const curr = texts[i];

    // Calculate actual gap
    const gap = curr.x - (prev.x + prev.width);

    // Calculate expected gap based on character width and spacing
    const expectedGap = calculateExpectedGap(prev, curr);
    const maxGap = expectedGap * options.horizontalGapRatio;

    if (gap <= maxGap && hasSameStyle(prev, curr, options)) {
      result.push(curr);
    }
  }

  return result;
}

/**
 * Create a paragraph from texts on the same line.
 */
function createParagraph(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>
): GroupedParagraph {
  // Sort by X (left to right)
  const sorted = [...texts].sort((a, b) => a.x - b.x);

  // Filter out texts that are too far apart horizontally
  const merged = mergeHorizontallyAdjacent(sorted, options);

  // Calculate baseline from font metrics
  const firstText = merged[0];
  const descender = firstText?.fontMetrics?.descender ?? -200;
  const fontSize = firstText?.fontSize ?? 12;
  const baseline = (firstText?.y ?? 0) - (descender * fontSize) / 1000;

  return {
    runs: merged,
    baselineY: baseline,
  };
}

/**
 * Group texts into lines based on Y proximity.
 */
function groupIntoLines(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): GroupedParagraph[] {
  const lines: GroupedParagraph[] = [];
  const currentLine: PdfText[] = [];
  const state = { currentY: texts[0]?.y ?? 0, referenceFontSize: texts[0]?.fontSize ?? 12 };

  for (const text of texts) {
    const tolerance = state.referenceFontSize * options.lineToleranceRatio;
    const sameY = Math.abs(text.y - state.currentY) <= tolerance;

    // Check if there's a blocking zone between the last text in current line and this text
    const lastText = currentLine[currentLine.length - 1];
    const blockedHorizontally = lastText !== undefined && hasBlockingZoneBetween(lastText, text, blockingZones);

    if (sameY && !blockedHorizontally) {
      currentLine.push(text);
    } else {
      if (currentLine.length > 0) {
        lines.push(createParagraph(currentLine, options));
      }
      currentLine.length = 0;
      currentLine.push(text);
      state.currentY = text.y;
      state.referenceFontSize = text.fontSize;
    }
  }

  if (currentLine.length > 0) {
    lines.push(createParagraph(currentLine, options));
  }

  return lines;
}

/**
 * Split a line of texts into column groups based on horizontal gaps.
 */
function splitIntoColumnGroups(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): PdfText[][] {
  if (texts.length === 0) {return [];}
  if (texts.length === 1) {return [[texts[0]]];}

  // Sort by X position
  const sorted = [...texts].sort((a, b) => a.x - b.x);

  const groups: PdfText[][] = [];
  const currentGroup: PdfText[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Calculate gap
    const gap = curr.x - (prev.x + prev.width);
    const avgCharWidth = (estimateCharWidth(prev) + estimateCharWidth(curr)) / 2;
    const columnGapThreshold = avgCharWidth * options.columnGapRatio;

    // Check if there's a blocking zone between texts
    const hasBlocker = hasBlockingZoneBetween(prev, curr, blockingZones);

    if (gap > columnGapThreshold || hasBlocker) {
      groups.push([...currentGroup]);
      currentGroup.length = 0;
      currentGroup.push(curr);
    } else {
      currentGroup.push(curr);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Group texts into lines with column separation.
 */
function groupIntoLinesWithColumns(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): GroupedParagraph[] {
  const paragraphs: GroupedParagraph[] = [];
  const currentLine: PdfText[] = [];
  const state = { currentY: texts[0]?.y ?? 0, referenceFontSize: texts[0]?.fontSize ?? 12 };

  for (const text of texts) {
    const tolerance = state.referenceFontSize * options.lineToleranceRatio;

    if (Math.abs(text.y - state.currentY) <= tolerance) {
      currentLine.push(text);
    } else {
      // Process current line and split into columns
      if (currentLine.length > 0) {
        const columnGroups = splitIntoColumnGroups(currentLine, options, blockingZones);
        for (const group of columnGroups) {
          paragraphs.push(createParagraphFromTexts(group));
        }
      }
      currentLine.length = 0;
      currentLine.push(text);
      state.currentY = text.y;
      state.referenceFontSize = text.fontSize;
    }
  }

  if (currentLine.length > 0) {
    const columnGroups = splitIntoColumnGroups(currentLine, options, blockingZones);
    for (const group of columnGroups) {
      paragraphs.push(createParagraphFromTexts(group));
    }
  }

  return paragraphs;
}

// =============================================================================
// Block Merging Functions
// =============================================================================

/**
 * Check if two lines should be merged into same block.
 */
function shouldMergeLines(
  line1: GroupedParagraph,
  line2: GroupedParagraph,
  options: Required<SpatialGroupingOptions>
): boolean {
  const text1 = line1.runs[0];
  const text2 = line2.runs[0];
  if (!text1 || !text2) {return false;}

  // Check font match
  if (!hasSameStyle(text1, text2, options)) {return false;}

  // Check vertical distance
  const lineHeight = Math.max(text1.height, text2.height);
  const verticalGap = Math.abs(line1.baselineY - line2.baselineY) - lineHeight;
  const maxGap = lineHeight * options.verticalGapRatio;

  return verticalGap <= maxGap;
}

/**
 * Check if two paragraphs should merge, considering column boundaries.
 */
function shouldMergeLinesWithColumns(
  para1: GroupedParagraph,
  para2: GroupedParagraph,
  options: Required<SpatialGroupingOptions>
): boolean {
  const text1 = para1.runs[0];
  const text2 = para2.runs[0];
  if (!text1 || !text2) {return false;}

  // Check font match
  if (!hasSameStyle(text1, text2, options)) {return false;}

  // Check vertical distance
  const lineHeight = Math.max(text1.height, text2.height);
  const verticalGap = Math.abs(para1.baselineY - para2.baselineY) - lineHeight;
  const maxVerticalGap = lineHeight * options.verticalGapRatio;

  if (verticalGap > maxVerticalGap) {return false;}

  // Check horizontal overlap (column alignment)
  const para1MinX = Math.min(...para1.runs.map((r) => r.x));
  const para1MaxX = Math.max(...para1.runs.map((r) => r.x + r.width));
  const para2MinX = Math.min(...para2.runs.map((r) => r.x));
  const para2MaxX = Math.max(...para2.runs.map((r) => r.x + r.width));

  // Check if there's horizontal overlap
  const hasOverlap = para1MinX < para2MaxX && para2MinX < para1MaxX;

  return hasOverlap;
}

/**
 * Merge adjacent lines into blocks.
 */
function mergeAdjacentLines(
  lines: readonly GroupedParagraph[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): GroupedText[] {
  if (lines.length === 0) {return [];}

  const blocks: GroupedText[] = [];
  const currentParagraphs: GroupedParagraph[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1];
    const currLine = lines[i];

    // Check if there's a blocking zone between lines
    const hasBlocker = hasBlockingZoneBetweenLines(prevLine, currLine, blockingZones);

    if (shouldMergeLines(prevLine, currLine, options) && !hasBlocker) {
      currentParagraphs.push(currLine);
    } else {
      blocks.push(createGroupedText(currentParagraphs));
      currentParagraphs.length = 0;
      currentParagraphs.push(currLine);
    }
  }

  if (currentParagraphs.length > 0) {
    blocks.push(createGroupedText(currentParagraphs));
  }

  return blocks;
}

/**
 * Merge adjacent lines into blocks, respecting column boundaries.
 */
function mergeAdjacentLinesWithColumns(
  paragraphs: readonly GroupedParagraph[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): GroupedText[] {
  if (paragraphs.length === 0) {return [];}

  // Sort paragraphs by Y (top to bottom), then by X
  const sorted = [...paragraphs].sort((a, b) => {
    const yDiff = b.baselineY - a.baselineY; // Descending Y (top first)
    if (Math.abs(yDiff) > 1) {return yDiff;}
    // Same line - sort by X
    const aX = a.runs[0]?.x ?? 0;
    const bX = b.runs[0]?.x ?? 0;
    return aX - bX;
  });

  const blocks: GroupedText[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) {continue;}

    const block: GroupedParagraph[] = [sorted[i]];
    used.add(i);

    // Find paragraphs that should merge with this one
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) {continue;}

      const lastPara = block[block.length - 1];
      const candidate = sorted[j];

      // Check for blocking zones between paragraphs
      const hasBlocker = hasBlockingZoneBetweenLines(lastPara, candidate, blockingZones);

      if (shouldMergeLinesWithColumns(lastPara, candidate, options) && !hasBlocker) {
        block.push(candidate);
        used.add(j);
      }
    }

    blocks.push(createGroupedText(block));
  }

  return blocks;
}

// =============================================================================
// Dispatch Functions (for cleaner main entry point)
// =============================================================================

/**
 * Group texts into lines based on options.
 */
function groupTextsIntoLines(
  sorted: readonly PdfText[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): GroupedParagraph[] {
  if (options.enableColumnSeparation) {
    return groupIntoLinesWithColumns(sorted, options, blockingZones);
  }
  return groupIntoLines(sorted, options, blockingZones);
}

/**
 * Merge lines into blocks based on options.
 */
function mergeLinesToBlocks(
  lines: readonly GroupedParagraph[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): GroupedText[] {
  if (options.enableColumnSeparation) {
    return mergeAdjacentLinesWithColumns(lines, options, blockingZones);
  }
  return mergeAdjacentLines(lines, options, blockingZones);
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Create a spatial grouping function with the given options.
 *
 * Groups text elements based on spatial proximity:
 * 1. Same line: Y difference < fontSize * lineToleranceRatio
 * 2. Same horizontal group: X gap < avgCharWidth * horizontalGapRatio
 * 3. Same vertical block: Y gap < lineHeight * verticalGapRatio
 *    AND matching font name/size
 *
 * @param userOptions - Options to customize grouping behavior
 * @returns A TextGroupingFn that groups PdfText elements
 */
export function createSpatialGrouping(userOptions: SpatialGroupingOptions = {}): TextGroupingFn {
  const options: Required<SpatialGroupingOptions> = { ...DEFAULT_OPTIONS, ...userOptions };

  return (texts: readonly PdfText[], context?: GroupingContext): readonly GroupedText[] => {
    if (texts.length === 0) {
      return [];
    }

    // Step 1: Sort by Y (top to bottom in PDF coords = descending)
    const sorted = [...texts].sort((a, b) => b.y - a.y);
    const blockingZones = context?.blockingZones;

    // Step 2: Group into lines, with column separation if enabled
    const lines = groupTextsIntoLines(sorted, options, blockingZones);

    // Step 3: Merge adjacent lines into blocks
    const blocks = mergeLinesToBlocks(lines, options, blockingZones);

    return blocks;
  };
}

/**
 * Default spatial grouping function with default options.
 */
export const spatialGrouping: TextGroupingFn = createSpatialGrouping();
