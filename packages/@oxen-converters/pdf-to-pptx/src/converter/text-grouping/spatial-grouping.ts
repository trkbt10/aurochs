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

import type { PdfText } from "@oxen/pdf/domain";
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

  /**
   * Enable page-level column detection using `context.pageWidth`.
   *
   * This improves robustness for multi-column layouts where line-level
   * splitting may be unreliable due to slightly varying baselines or
   * overly-wide text bounding boxes that spill into the gutter.
   * (default: true)
   */
  readonly enablePageColumnDetection?: boolean;

  /**
   * Maximum number of columns to infer when page-level column detection is enabled.
   * (default: 3)
   */
  readonly maxPageColumns?: number;

  /**
   * Treat paragraphs wider than this ratio of page width as "full width"
   * (headers/footers/title) and exclude them from gutter detection.
   * (default: 0.85)
   */
  readonly fullWidthRatio?: number;
};

const DEFAULT_OPTIONS: Required<SpatialGroupingOptions> = {
  lineToleranceRatio: 0.1,
  horizontalGapRatio: 1.5,
  verticalGapRatio: 1.2,
  colorMatching: "none",
  fontSizeToleranceRatio: 0.1,
  enableColumnSeparation: true,
  columnGapRatio: 3.0,
  enablePageColumnDetection: true,
  maxPageColumns: 3,
  fullWidthRatio: 0.85,
};

/** Default character width in 1/1000 em units for fallback */
const DEFAULT_CHAR_WIDTH_EM = 500;

// =============================================================================
// Pure Helper Functions
// =============================================================================

function median(xs: readonly number[]): number {
  if (xs.length === 0) {return 0;}
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {return sorted[mid]!;}
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) {return 0;}
  const sorted = [...xs].sort((a, b) => a - b);
  const qq = Math.max(0, Math.min(1, q));
  const pos = (sorted.length - 1) * qq;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next === undefined) {return sorted[base]!;}
  return sorted[base]! + rest * (next - sorted[base]!);
}

/**
 * Estimate character width for a text element.
 *
 * Uses fontMetrics.defaultWidth when available, otherwise calculates
 * from the text's width and length with a minimum bound.
 */
function estimateCharWidth(text: PdfText): number {
  // Estimate from actual text box width. This is the most reliable signal we have
  // across PDFs because `fontMetrics` does not carry per-glyph width data here.
  const length = Math.max(text.text.length, 1);
  const estimatedWidth = text.width / length;

  // Fallback: assume 0.5em when width is unavailable/unreliable.
  const fallback = (DEFAULT_CHAR_WIDTH_EM * text.fontSize) / 1000;
  const minWidth = text.fontSize * 0.3; // Minimum 30% of font size

  if (!Number.isFinite(estimatedWidth) || estimatedWidth <= 0) {
    return Math.max(fallback, minWidth);
  }

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

function getBaselineY(text: PdfText): number {
  const descender = text.fontMetrics?.descender ?? -200;
  return text.y - (descender * text.fontSize) / 1000;
}

function overlap1D(args: { readonly a0: number; readonly a1: number; readonly b0: number; readonly b1: number }): number {
  const { a0, a1, b0, b1 } = args;
  const lo = Math.max(Math.min(a0, a1), Math.min(b0, b1));
  const hi = Math.min(Math.max(a0, a1), Math.max(b0, b1));
  return Math.max(0, hi - lo);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

type Gutter = { x0: number; x1: number; score: number; xMid: number };

function detectGuttersFromXRanges(
  ranges: readonly { x0: number; x1: number; weight: number }[],
  pageWidth: number,
  options: Required<SpatialGroupingOptions>
): Gutter[] {
  const gutterOccThreshold = 0.08;
  const minGutterWidthRatio = 0.018;
  const gutterMaxCrossingRatio = 0.18;
  const columnEdgeMarginRatio = 0.06;

  const usable = ranges.filter((r) => (r.x1 - r.x0) < pageWidth * options.fullWidthRatio);
  if (usable.length < 8) {return [];}

  // Some PDFs report overly-wide text boxes that bleed into gutters.
  // To make gutter detection more robust, cap the contributed span using
  // the typical range width of the page (ignore upper outliers).
  const widths = usable
    .map((r) => r.x1 - r.x0)
    .filter((w) => Number.isFinite(w) && w > 0);
  const widthCap = widths.length > 0 ? Math.max(1, quantile(widths, 0.9) * 1.15) : pageWidth;

  const bins = clamp(Math.round(pageWidth / 2), 200, 600);
  const binSize = pageWidth / bins;
  const occ = new Array<number>(bins).fill(0);

  for (const r of usable) {
    const x0 = clamp(r.x0, 0, pageWidth);
    const x1 = clamp(Math.min(r.x1, r.x0 + widthCap), 0, pageWidth);
    const b0 = clamp(Math.floor(x0 / binSize), 0, bins - 1);
    const b1 = clamp(Math.ceil(x1 / binSize), 0, bins);
    const w = Math.max(1, r.weight);
    for (let i = b0; i < b1; i++) {occ[i] += w;}
  }

  const maxOcc = Math.max(...occ, 1);
  const occN = occ.map((x) => x / maxOcc);

  const edgeMarginBins = Math.round(bins * columnEdgeMarginRatio);
  const minGutterBins = Math.max(2, Math.round((pageWidth * minGutterWidthRatio) / binSize));

  const segments: { s: number; e: number; meanOcc: number }[] = [];
  // eslint-disable-next-line no-restricted-syntax
  let s = -1;
  // eslint-disable-next-line no-restricted-syntax
  let sum = 0;
  // eslint-disable-next-line no-restricted-syntax
  let cnt = 0;

  for (let i = edgeMarginBins; i < bins - edgeMarginBins; i++) {
    const low = occN[i]! <= gutterOccThreshold;
    if (low) {
      if (s < 0) {s = i; sum = occN[i]!; cnt = 1;}
      else {sum += occN[i]!; cnt++;}
    } else if (s >= 0) {
      const e = i;
      if (e - s >= minGutterBins) {segments.push({ s, e, meanOcc: sum / Math.max(1, cnt) });}
      s = -1;
    }
  }

  if (s >= 0) {
    const e = bins - edgeMarginBins;
    if (e - s >= minGutterBins) {segments.push({ s, e, meanOcc: sum / Math.max(1, cnt) });}
  }

  if (segments.length === 0) {return [];}

  const gutters: Gutter[] = [];
  for (const seg of segments) {
    const x0 = seg.s * binSize;
    const x1 = seg.e * binSize;
    const xMid = (x0 + x1) / 2;

    const crossing = usable.filter((r) => r.x0 <= xMid && xMid <= r.x1).length;
    const crossingRatio = crossing / usable.length;
    if (crossingRatio > gutterMaxCrossingRatio) {continue;}

    const width = x1 - x0;
    const depth = 1 - seg.meanOcc;
    gutters.push({ x0, x1, xMid, score: width * depth });
  }

  gutters.sort((a, b) => b.score - a.score);
  const picked = gutters.slice(0, Math.max(0, options.maxPageColumns - 1));
  picked.sort((a, b) => a.x0 - b.x0);
  return picked;
}

function buildColumnIntervals(pageWidth: number, gutters: readonly Gutter[]): { x0: number; x1: number }[] {
  if (gutters.length === 0) {return [{ x0: 0, x1: pageWidth }];}
  const intervals: { x0: number; x1: number }[] = [];
  // eslint-disable-next-line no-restricted-syntax
  let cur = 0;
  for (const g of gutters) {
    const leftEnd = Math.max(cur, g.x0);
    if (leftEnd - cur > 1) {intervals.push({ x0: cur, x1: leftEnd });}
    cur = Math.min(pageWidth, g.x1);
  }
  if (pageWidth - cur > 1) {intervals.push({ x0: cur, x1: pageWidth });}
  return intervals.filter((iv) => (iv.x1 - iv.x0) > pageWidth * 0.08);
}

function assignXRangeToColumn(
  args: {
    readonly x0: number;
    readonly x1: number;
    readonly intervals: readonly { x0: number; x1: number }[];
    readonly pageWidth: number;
    readonly options: Required<SpatialGroupingOptions>;
  }
): number {
  const { x0, x1, intervals, pageWidth, options } = args;
  const w = x1 - x0;
  if (w >= pageWidth * options.fullWidthRatio) {return -1;}

  // eslint-disable-next-line no-restricted-syntax
  let best = 0;
  // eslint-disable-next-line no-restricted-syntax
  let bestOv = -1;
  for (let i = 0; i < intervals.length; i++) {
    const iv = intervals[i]!;
    const ov =
      overlap1D({ a0: x0, a1: x1, b0: iv.x0, b1: iv.x1 }) / Math.max(1e-6, Math.min(w, iv.x1 - iv.x0));
    if (ov > bestOv) {bestOv = ov; best = i;}
  }
  return best;
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
 * Merge horizontally adjacent texts into fewer runs.
 *
 * This function does NOT concatenate PdfText runs.
 * It only orders and filters/group-safety checks happen before paragraph creation.
 */
function mergeHorizontallyAdjacent(
  texts: readonly PdfText[],
  _options: Required<SpatialGroupingOptions>
): PdfText[] {
  // Preserve original PdfText boundaries; order by X for stable PPTX run order.
  // `options.horizontalGapRatio` is applied during line segmentation.
  return [...texts].sort((a, b) => a.x - b.x);
}

/**
 * Create a paragraph from texts on the same line.
 */
function createParagraph(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>
): GroupedParagraph {
  if (texts.length === 0) {
    throw new Error("createParagraph requires at least one PdfText");
  }

  const runs = mergeHorizontallyAdjacent(texts, options);
  const first = runs[0];
  if (!first) {
    throw new Error("createParagraph requires at least one PdfText");
  }
  const baseline = getBaselineY(first);

  return {
    runs,
    baselineY: baseline,
  };
}

/**
 * Group texts into lines based on Y proximity.
 */
function clusterIntoLines(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>
): PdfText[][] {
  if (texts.length === 0) {return [];}

  const items = texts
    .map((t) => ({ t, baseline: getBaselineY(t) }))
    .sort((a, b) => b.baseline - a.baseline);

  const clusters: PdfText[][] = [];
  // eslint-disable-next-line no-restricted-syntax
  let current: {
    texts: PdfText[];
    meanBaseline: number;
    meanFontSize: number;
    meanBottom: number;
    meanTop: number;
  } | null = null;

  for (const it of items) {
    const bottom = it.t.y;
    const top = it.t.y + it.t.height;

    if (!current) {
      current = {
        texts: [it.t],
        meanBaseline: it.baseline,
        meanFontSize: it.t.fontSize,
        meanBottom: bottom,
        meanTop: top,
      };
      continue;
    }

    const refSize = Math.max(current.meanFontSize, it.t.fontSize);
    const tolerance = Math.max(0.5, refSize * options.lineToleranceRatio);
    const baselineNear = Math.abs(it.baseline - current.meanBaseline) <= tolerance;

    // Additional guard: require meaningful vertical overlap between text boxes.
    //
    // Baseline-only clustering is prone to merging nearby-but-distinct lines,
    // especially in diagrams where multiple text blocks share similar font sizes.
    // This overlap check prevents catastrophic "interleaving" (e.g. Latin letters
    // alternating with CJK text) when two separate lines are clustered as one.
    const overlap = overlap1D({ a0: bottom, a1: top, b0: current.meanBottom, b1: current.meanTop });
    const denom = Math.min(
      Math.max(1e-6, top - bottom),
      Math.max(1e-6, current.meanTop - current.meanBottom),
    );
    const overlapRatio = overlap / denom;
    const verticallyAligned = overlapRatio >= 0.15;

    const sameLine = baselineNear && verticallyAligned;

    if (!sameLine) {
      clusters.push(current.texts);
      current = {
        texts: [it.t],
        meanBaseline: it.baseline,
        meanFontSize: it.t.fontSize,
        meanBottom: bottom,
        meanTop: top,
      };
      continue;
    }

    current.texts.push(it.t);
    current.meanBaseline = current.meanBaseline + (it.baseline - current.meanBaseline) / current.texts.length;
    current.meanFontSize = current.meanFontSize + (it.t.fontSize - current.meanFontSize) / current.texts.length;
    current.meanBottom = current.meanBottom + (bottom - current.meanBottom) / current.texts.length;
    current.meanTop = current.meanTop + (top - current.meanTop) / current.texts.length;
  }

  if (current) {
    clusters.push(current.texts);
  }
  return clusters;
}

/**
 * Estimate a "space-like" gap threshold from a line's positive gap distribution.
 *
 * This is used to derive an adaptive column boundary threshold for table-like
 * structures, without hard-coding absolute point distances.
 */
function estimateSpaceGapThreshold(gaps: readonly number[], fontSize: number): number {
  const pos = gaps.filter((g) => g > 0);
  if (pos.length < 3) {return fontSize * 0.33;}

  const q25 = quantile(pos, 0.25);
  const q50 = quantile(pos, 0.50);
  const q75 = quantile(pos, 0.75);

  if (q75 > q25 * 2.5) {return (q25 + q75) / 2;}

  return Math.max(q50 * 1.7, q75 * 0.9, fontSize * 0.33);
}

function splitIntoAdjacentGroups(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): PdfText[][] {
  if (texts.length === 0) {return [];}
  if (texts.length === 1) {return [[texts[0]]];}

  const sorted = [...texts].sort((a, b) => a.x - b.x);
  const groups: PdfText[][] = [];
  // eslint-disable-next-line no-restricted-syntax
  let current: PdfText[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1]!;
    const curr = sorted[i]!;

    const gap = curr.x - (prev.x + prev.width);
    const expectedGap = calculateExpectedGap(prev, curr);
    const maxGap = expectedGap * options.horizontalGapRatio;

    const blocked = hasBlockingZoneBetween(prev, curr, blockingZones);
    // Within a physical line, style changes (font/size/color) are common and should
    // not force segmentation. Keep segments primarily as spatial groupings so that
    // later text reconstruction can insert spaces based on gaps instead of using tabs.
    const sameSegment = !blocked && gap <= maxGap;

    if (!sameSegment) {
      groups.push(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }

  groups.push(current);
  return groups;
}

/**
 * Split a line of texts into column groups based on horizontal gaps.
 *
 * Uses a hybrid threshold:
 * - Fixed: avgCharWidth * columnGapRatio
 * - Adaptive: inferred "space-like" gap * multiplier
 *
 * The adaptive component helps when font metrics are unreliable, or when
 * the PDF generates unusually wide glyph boxes that distort char width estimates.
 */
function splitIntoColumnGroups(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): PdfText[][] {
  if (texts.length === 0) {return [];}
  if (texts.length === 1) {return [[texts[0]]];}

  const sorted = [...texts].sort((a, b) => a.x - b.x);
  const fontSize = median(sorted.map((t) => t.fontSize)) || 12;

  const gaps: number[] = [];
  const charWidths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    gaps.push(curr.x - (prev.x + prev.width));
    charWidths.push((estimateCharWidth(prev) + estimateCharWidth(curr)) / 2);
  }

  const avgCharWidth = median(charWidths) || (fontSize * 0.5);
  const fixedTh = avgCharWidth * options.columnGapRatio;
  const spaceTh = estimateSpaceGapThreshold(gaps, fontSize);
  const adaptiveTh = spaceTh * 3.5;
  const columnGapThreshold = Math.max(fixedTh, adaptiveTh);

  // Avoid splitting simple "two-item lines" into columns unless the gap is clearly a
  // column gutter. Many PDFs split sentences into multiple text runs with modest gaps,
  // which should stay on the same line (handled later via synthetic spaces).
  if (sorted.length === 2) {
    const prev = sorted[0]!;
    const curr = sorted[1]!;
    const gap = curr.x - (prev.x + prev.width);
    const hasBlocker = hasBlockingZoneBetween(prev, curr, blockingZones);
    const strongGutter = gap > Math.max(columnGapThreshold * 1.8, fontSize * 6.0);
    if (!hasBlocker && !strongGutter) {
      return [sorted];
    }
  }

  const groups: PdfText[][] = [];
  const currentGroup: PdfText[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;

    const gap = curr.x - (prev.x + prev.width);
    const hasBlocker = hasBlockingZoneBetween(prev, curr, blockingZones);

    if (gap > columnGapThreshold || hasBlocker) {
      groups.push([...currentGroup]);
      currentGroup.length = 0;
      currentGroup.push(curr);
    } else {
      currentGroup.push(curr);
    }
  }

  if (currentGroup.length > 0) {groups.push(currentGroup);}
  return groups;
}

/**
 * Group texts into lines with column separation.
 */
function groupIntoLinesWithColumns(
  args: {
    readonly texts: readonly PdfText[];
    readonly options: Required<SpatialGroupingOptions>;
    readonly blockingZones: readonly BlockingZone[] | undefined;
    readonly pageWidth: number | undefined;
  }
): GroupedParagraph[] {
  const { texts, options, blockingZones, pageWidth } = args;
  const lineClusters = clusterIntoLines(texts, options);
  const paragraphs: GroupedParagraph[] = [];

  const usePageColumns = options.enablePageColumnDetection && pageWidth !== undefined && pageWidth > 0;
  const pageIntervals = (() => {
    if (!usePageColumns) {return undefined;}
    const ranges = texts.map((t) => ({ x0: t.x, x1: t.x + t.width, weight: t.height }));
    const gutters = detectGuttersFromXRanges(ranges, pageWidth, options);
    const intervals = buildColumnIntervals(pageWidth, gutters);
    return intervals.length >= 2 ? intervals : undefined;
  })();

  for (const lineTexts of lineClusters) {
    // Page-level column assignment can be too aggressive for diagram-like PDFs:
    // small labels that happen to cross an inferred gutter can get split into
    // separate "column" segments (e.g. "ベ" | "クトル生成"). Avoid applying
    // page columns for narrow lines.
    const shouldUsePageIntervalsForLine = (() => {
      if (!pageIntervals) {return false;}
      if (!pageWidth) {return false;}
      const minX = Math.min(...lineTexts.map((t) => t.x));
      const maxX = Math.max(...lineTexts.map((t) => t.x + t.width));
      const lineWidth = maxX - minX;
      return lineWidth >= pageWidth * 0.25;
    })();

    if (!shouldUsePageIntervalsForLine) {
      const columnGroups = splitIntoColumnGroups(lineTexts, options, blockingZones);
      for (const group of columnGroups) {
        paragraphs.push(createParagraph(group, options));
      }
      continue;
    }

    const intervals = pageIntervals;
    if (!intervals) {
      throw new Error("groupIntoLinesWithColumns: pageIntervals is required when using page-level columns");
    }

    const byCol = new Map<number, PdfText[]>();
    for (const t of lineTexts) {
      const x0 = t.x;
      const x1 = t.x + t.width;
      const c = assignXRangeToColumn({ x0, x1, intervals, pageWidth: pageWidth!, options });
      const arr = byCol.get(c) ?? [];
      arr.push(t);
      byCol.set(c, arr);
    }

    const colKeys = [...byCol.keys()].sort((a, b) => a - b);
    for (const key of colKeys) {
      const ts = byCol.get(key);
      if (!ts || ts.length === 0) {continue;}
      const columnGroups = splitIntoColumnGroups(ts, options, blockingZones);
      for (const group of columnGroups) {
        const adjacentGroups = splitIntoAdjacentGroups(group, options, blockingZones);
        for (const seg of adjacentGroups) {
          paragraphs.push(createParagraph(seg, options));
        }
      }
    }
  }

  return paragraphs;
}

/**
 * Group texts into lines based on baseline clustering.
 *
 * This mode does not split by large horizontal gaps (i.e. does not infer columns),
 * but it still respects blocking zones as hard separators within the line.
 */
function groupIntoLines(
  texts: readonly PdfText[],
  options: Required<SpatialGroupingOptions>,
  blockingZones: readonly BlockingZone[] | undefined
): GroupedParagraph[] {
  const lineClusters = clusterIntoLines(texts, options);
  const paragraphs: GroupedParagraph[] = [];

  for (const lineTexts of lineClusters) {
    const segments = splitIntoAdjacentGroups(lineTexts, options, blockingZones);
    for (const group of segments) {
      paragraphs.push(createParagraph(group, options));
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

  // This function assumes input is ordered top-to-bottom (descending baselineY).
  // Never merge items on the same line or above.
  const baselineDelta = line1.baselineY - line2.baselineY;
  if (baselineDelta <= 0) {return false;}

  // Check font match
  if (!hasSameStyle(text1, text2, options)) {return false;}

  if (options.enableColumnSeparation) {
    const minX1 = Math.min(...line1.runs.map((r) => r.x));
    const maxX1 = Math.max(...line1.runs.map((r) => r.x + r.width));
    const minX2 = Math.min(...line2.runs.map((r) => r.x));
    const maxX2 = Math.max(...line2.runs.map((r) => r.x + r.width));

    const w1 = Math.max(1e-6, maxX1 - minX1);
    const w2 = Math.max(1e-6, maxX2 - minX2);
    const ov = overlap1D({ a0: minX1, a1: maxX1, b0: minX2, b1: maxX2 });
    const ovRatio = ov / Math.min(w1, w2);

    // No meaningful horizontal overlap → likely different column / unrelated block.
    if (ovRatio < 0.05) {return false;}
  }

  // Check vertical distance
  const lineHeight = Math.max(text1.height, text2.height);
  const verticalGap = baselineDelta - lineHeight;
  const maxGap = lineHeight * options.verticalGapRatio;

  return verticalGap <= maxGap;
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
  const sorted = [...lines].sort((a, b) => b.baselineY - a.baselineY);
  const currentParagraphs: GroupedParagraph[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const prevLine = sorted[i - 1]!;
    const currLine = sorted[i]!;

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
  args: {
    readonly paragraphs: readonly GroupedParagraph[];
    readonly options: Required<SpatialGroupingOptions>;
    readonly blockingZones: readonly BlockingZone[] | undefined;
    readonly pageWidthFromContext: number | undefined;
  }
): GroupedText[] {
  const { paragraphs, options, blockingZones, pageWidthFromContext } = args;
  if (paragraphs.length === 0) {return [];}

  const getParagraphBounds = (p: GroupedParagraph): { minX: number; maxX: number; minY: number; maxY: number } => {
    const runs = p.runs;
    const minX = Math.min(...runs.map((r) => r.x));
    const maxX = Math.max(...runs.map((r) => r.x + r.width));
    const minY = Math.min(...runs.map((r) => r.y));
    const maxY = Math.max(...runs.map((r) => r.y + r.height));
    return { minX, maxX, minY, maxY };
  };

  const allBounds = paragraphs.map(getParagraphBounds);
  const pageWidth = pageWidthFromContext;

  // Without a known page width, page-level column inference is unreliable and can
  // misclassify "full width" content. Fall back to simple sequential merging.
  if (!pageWidth || pageWidth <= 0 || !options.enablePageColumnDetection) {
    const sorted = [...paragraphs].sort((a, b) => {
      const yDiff = b.baselineY - a.baselineY;
      if (Math.abs(yDiff) > 1) {return yDiff;}
      const aX = a.runs[0]?.x ?? 0;
      const bX = b.runs[0]?.x ?? 0;
      return aX - bX;
    });

    const blocks: GroupedText[] = [];
    // eslint-disable-next-line no-restricted-syntax
    let current: GroupedParagraph[] = [];

    for (const p of sorted) {
      if (current.length === 0) {
        current = [p];
        continue;
      }
      const prev = current[current.length - 1]!;
      const hasBlocker = hasBlockingZoneBetweenLines(prev, p, blockingZones);
      if (!hasBlocker && shouldMergeLines(prev, p, options)) {
        current.push(p);
      } else {
        blocks.push(createGroupedText(current));
        current = [p];
      }
    }

    if (current.length > 0) {blocks.push(createGroupedText(current));}
    return blocks;
  }

  const ranges = allBounds.map((b) => ({ x0: b.minX, x1: b.maxX, weight: Math.max(1, b.maxY - b.minY) }));
  const gutters = detectGuttersFromXRanges(ranges, pageWidth, options);
  const intervals = buildColumnIntervals(pageWidth, gutters);

  const withColumn = paragraphs.map((p) => {
    const b = getParagraphBounds(p);
    const column = assignXRangeToColumn({ x0: b.minX, x1: b.maxX, intervals, pageWidth, options });
    return { p, column, b };
  });
  const columns = new Map<number, { p: GroupedParagraph; b: { minX: number; maxX: number; minY: number; maxY: number } }[]>();

  for (const it of withColumn) {
    const arr = columns.get(it.column) ?? [];
    arr.push({ p: it.p, b: it.b });
    columns.set(it.column, arr);
  }

  const blocks: GroupedText[] = [];

  const mergeColumn = (items: readonly { p: GroupedParagraph; b: { minX: number; maxX: number; minY: number; maxY: number } }[]): void => {
    const sorted = [...items].sort((a, b) => {
      const yDiff = b.p.baselineY - a.p.baselineY;
      if (Math.abs(yDiff) > 1) {return yDiff;}
      return a.b.minX - b.b.minX;
    });

    // eslint-disable-next-line no-restricted-syntax
    let current: GroupedParagraph[] = [];
    for (const it of sorted) {
      if (current.length === 0) {
        current = [it.p];
        continue;
      }
      const prev = current[current.length - 1]!;
      const hasBlocker = hasBlockingZoneBetweenLines(prev, it.p, blockingZones);
      if (!hasBlocker && shouldMergeLines(prev, it.p, options)) {
        current.push(it.p);
      } else {
        blocks.push(createGroupedText(current));
        current = [it.p];
      }
    }
    if (current.length > 0) {blocks.push(createGroupedText(current));}
  };

  // Merge detected columns (0..N-1) and full-width (-1) separately.
  const columnKeys = [...columns.keys()].sort((a, b) => a - b);
  for (const key of columnKeys) {
    const items = columns.get(key);
    if (!items || items.length === 0) {continue;}
    mergeColumn(items);
  }

  // Stable-ish output order: top-to-bottom, then left-to-right.
  blocks.sort((a, b) => {
    const aTop = a.bounds.y + a.bounds.height;
    const bTop = b.bounds.y + b.bounds.height;
    const yDiff = bTop - aTop;
    if (Math.abs(yDiff) > 1) {return yDiff;}
    return a.bounds.x - b.bounds.x;
  });

  return blocks;
}

// =============================================================================
// Dispatch Functions (for cleaner main entry point)
// =============================================================================

/**
 * Group texts into lines based on options.
 */
function groupTextsIntoLines(
  args: {
    readonly sorted: readonly PdfText[];
    readonly options: Required<SpatialGroupingOptions>;
    readonly blockingZones: readonly BlockingZone[] | undefined;
    readonly pageWidth: number | undefined;
  }
): GroupedParagraph[] {
  const { sorted, options, blockingZones, pageWidth } = args;
  if (options.enableColumnSeparation) {
    return groupIntoLinesWithColumns({ texts: sorted, options, blockingZones, pageWidth });
  }
  return groupIntoLines(sorted, options, blockingZones);
}

/**
 * Merge lines into blocks based on options.
 */
function mergeLinesToBlocks(
  args: {
    readonly lines: readonly GroupedParagraph[];
    readonly options: Required<SpatialGroupingOptions>;
    readonly blockingZones: readonly BlockingZone[] | undefined;
    readonly pageWidth: number | undefined;
  }
): GroupedText[] {
  const { lines, options, blockingZones, pageWidth } = args;
  if (options.enableColumnSeparation) {
    return mergeAdjacentLinesWithColumns({ paragraphs: lines, options, blockingZones, pageWidthFromContext: pageWidth });
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
    const pageWidth = context?.pageWidth;

    // Step 2: Group into lines, with column separation if enabled
    const lines = groupTextsIntoLines({ sorted, options, blockingZones, pageWidth });

    // Step 3: Merge adjacent lines into blocks
    const blocks = mergeLinesToBlocks({ lines, options, blockingZones, pageWidth });

    return blocks;
  };
}

/**
 * Default spatial grouping function with default options.
 */
export const spatialGrouping: TextGroupingFn = createSpatialGrouping();
