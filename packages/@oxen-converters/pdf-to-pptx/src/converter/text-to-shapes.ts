/**
 * @file PdfText → SpShape (textbox) converter
 */

import type { PdfText } from "@oxen/pdf/domain";
import type { SpShape } from "@oxen-office/pptx/domain/shape";
import type { Paragraph, TextBody, TextRun } from "@oxen-office/pptx/domain/text";
import type { Pixels, Points } from "@oxen-office/ooxml/domain/units";
import { deg, pt, px } from "@oxen-office/ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertPoint, convertSize } from "./transform-converter";
import { convertFill } from "./color-converter";
import type { CIDOrdering } from "@oxen/pdf/domain/font";
import { normalizeFontFamily, isBoldFont, isItalicFont, normalizeFontName } from "@oxen/pdf/domain/font";
import { PT_TO_PX } from "@oxen/pdf/domain/constants";
import type { GroupedText, GroupedParagraph } from "./text-grouping/types";
import { detectScriptFromText, type ScriptType } from "./unicode-script";

/**
 * Convert PDF text position to PPTX shape position.
 *
 * ## Coordinate Pipeline
 *
 * 1. **PDF Parser** (`pdf-parser.ts:convertText`):
 *    - run.y = baseline position (from text matrix + CTM)
 *    - minY = run.y + (descender * effectiveSize / 1000) = bottom edge
 *    - PdfText.y = minY (bottom edge in PDF coordinates)
 *
 * 2. **Transform Converter** (`convertPoint`):
 *    - Flips Y axis: pptxY = (pdfHeight - pdfY) * scale
 *    - After conversion, Y represents bottom edge in PPTX coord space
 *
 * 3. **This Function**:
 *    - Subtracts height to get top edge (PPTX shapes use top-left origin)
 *
 * ## Coordinate Systems
 *
 * PDF (origin: bottom-left):
 * - y: bottom edge of text bounding box
 * - Text grows upward from y
 *
 * PPTX (origin: top-left):
 * - y: top edge of shape from top
 * - Shape grows downward from y
 */
function convertTextPosition(
  position: Readonly<{ x: number; y: number }>,
  size: Readonly<{ width: Pixels; height: Pixels }>,
  context: ConversionContext
): { readonly x: Pixels; readonly y: Pixels } {
  const converted = convertPoint(position, context);

  // position.y is the bottom edge of the text box in PDF coordinates
  // After convertPoint(), it's the bottom edge in PPTX coordinates
  // Subtract height to get the top edge (PPTX shapes position from top-left)
  return {
    x: converted.x,
    y: px((converted.y as number) - (size.height as number)),
  };
}

/**
 * PdfTextをSpShape（テキストボックス）に変換
 */
export function convertTextToShape(
  pdfText: PdfText,
  context: ConversionContext,
  shapeId: string
): SpShape {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }
  if (!Number.isFinite(pdfText.x) || !Number.isFinite(pdfText.y)) {
    throw new Error(`Invalid PdfText position: (${pdfText.x}, ${pdfText.y})`);
  }
  if (!Number.isFinite(pdfText.width) || pdfText.width < 0) {
    throw new Error(`Invalid PdfText width: ${pdfText.width}`);
  }
  if (!Number.isFinite(pdfText.height) || pdfText.height < 0) {
    throw new Error(`Invalid PdfText height: ${pdfText.height}`);
  }

  const size = convertSize(pdfText.width, pdfText.height, context);
  const position = convertTextPosition(
    { x: pdfText.x, y: pdfText.y },
    size,
    context
  );
  const textBody = createTextBody(pdfText, context);

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `TextBox ${shapeId}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
      fill: { type: "noFill" },
    },
    textBody,
  };
}

/**
 * TextBodyを構築
 *
 * Sets insets to 0 for precise text positioning.
 */
function createTextBody(pdfText: PdfText, context: ConversionContext): TextBody {
  const paragraph = createParagraph(pdfText, context);

  return {
    bodyProperties: {
      wrapping: "none",
      anchor: "top",
      anchorCenter: false,
      forceAntiAlias: true,
      // Set all insets to 0 for precise positioning
      insets: {
        left: px(0),
        top: px(0),
        right: px(0),
        bottom: px(0),
      },
    },
    paragraphs: [paragraph],
  };
}

/**
 * Paragraphを構築
 */
function createParagraph(pdfText: PdfText, context: ConversionContext): Paragraph {
  const textRun = createPptxTextRunFromPdfText(pdfText, context);

  return {
    properties: {
      alignment: "left",
    },
    runs: [textRun],
    endProperties: {},
  };
}

// ScriptType is imported from unicode-script.ts

/**
 * Detect script type from CID ordering.
 *
 * This is the most accurate method based on PDF specification.
 * CIDSystemInfo Ordering identifies the character collection.
 *
 * - Adobe character collections (Japan1, GB1, CNS1, Korea1): Provides script type
 * - Identity: No script type info, returns null to trigger font name fallback
 *
 * @see ISO 32000-1:2008 Section 9.7.3 - CIDSystemInfo Dictionaries
 * @see ISO 32000-1:2008 Section 9.7.5 - Identity-H/V encodings
 */
function detectScriptTypeFromCIDOrdering(ordering: CIDOrdering | undefined): ScriptType | null {
  if (!ordering) {
    return null;
  }

  // Adobe character collections provide script type info
  // Japan1, GB1, CNS1, Korea1 are all CJK character collections
  switch (ordering) {
    case "Japan1":
    case "GB1":
    case "CNS1":
    case "Korea1":
      return "eastAsian";
    case "Identity":
      // Identity encoding doesn't provide script type info
      // Fall back to font name pattern detection
      return null;
    default:
      return null;
  }
}


/**
 * TextRunを構築
 *
 * ## Font Element Mapping (ECMA-376 Part 1, Section 21.1.2.3.3)
 *
 * PPTX uses script-specific font elements:
 * - a:latin (fontFamily): Latin/Western script
 * - a:ea (fontFamilyEastAsian): East Asian script (CJK)
 * - a:cs (fontFamilyComplexScript): Complex script (RTL, Indic)
 *
 * ## Script Type Detection (Spec-based)
 *
 * 1. CIDOrdering from CIDSystemInfo (ISO 32000-1 Section 9.7.3)
 *    - Japan1, GB1, CNS1, Korea1: Adobe character collections → eastAsian
 *    - Identity: No script info (ISO 32000-1 Section 9.7.5) → fallback
 *
 * 2. Unicode Script Property (UAX #24)
 *    - Analyzes text content to determine script type
 *    - Based on Unicode Standard character classifications
 */
export function createPptxTextRunFromPdfText(pdfText: PdfText, context: ConversionContext): TextRun {
  // Use BaseFont when available so embedded fonts can be matched correctly.
  // PdfText.fontName is the *resource identifier* (e.g. "F1"), while BaseFont
  // is the actual font name (often subset-tagged).
  const effectiveFontName = pdfText.baseFont ?? pdfText.fontName;
  const normalizedName = normalizeFontName(effectiveFontName);
  const spacing = convertSpacing(
    pdfText.charSpacing,
    pdfText.horizontalScaling,
    context
  );

  // Use isBold/isItalic from PdfText if available (from FontDescriptor),
  // otherwise fall back to font name detection
  const bold = pdfText.isBold ?? isBoldFont(normalizedName);
  const italic = pdfText.isItalic ?? isItalicFont(normalizedName);

  const mappedFontName = normalizeFontFamily(effectiveFontName);

  // Script type detection (spec-based):
  // 1. CIDOrdering from CIDSystemInfo (ISO 32000-1 Section 9.7.3)
  //    - Japan1, GB1, CNS1, Korea1 → eastAsian
  //    - Identity → no script info, fall back to text analysis
  // 2. Unicode Script Property (UAX #24) based on text content
  const cidScriptType = detectScriptTypeFromCIDOrdering(pdfText.cidOrdering);
  const textScriptType = detectScriptFromText(pdfText.text);
  const effectiveScriptType = cidScriptType ?? textScriptType;

  return {
    type: "text",
    text: pdfText.text,
    properties: {
      fontSize: convertFontSize(pdfText.fontSize, context),
      // Always set a:latin as base font
      fontFamily: mappedFontName,
      // Set a:ea for East Asian fonts (ECMA-376 21.1.2.3.3)
      ...(effectiveScriptType === "eastAsian" && { fontFamilyEastAsian: mappedFontName }),
      // Set a:cs for Complex Script fonts (ECMA-376 21.1.2.3.3)
      ...(effectiveScriptType === "complexScript" && { fontFamilyComplexScript: mappedFontName }),
      fill: convertFill(
        pdfText.graphicsState.fillColor,
        pdfText.graphicsState.fillAlpha * (pdfText.graphicsState.softMaskAlpha ?? 1),
      ),
      bold,
      italic,
      underline: "none",
      // Add spacing if present
      ...(spacing !== undefined && { spacing }),
    },
  };
}

/**
 * PDFフォントサイズをPPTXフォントサイズに変換
 * PDFとPPTXは共にポイント単位
 * 内部のPoints型は実際のポイント値を保持する
 */
function convertFontSize(pdfFontSize: number, context: ConversionContext): Points {
  if (!Number.isFinite(pdfFontSize) || pdfFontSize <= 0) {
    throw new Error(`Invalid pdfFontSize: ${pdfFontSize}`);
  }
  const scaled = pdfFontSize * context.fontSizeScale;
  if (!Number.isFinite(scaled) || scaled <= 0) {
    throw new Error(`Invalid scaled font size: ${scaled} (pdf=${pdfFontSize}, scale=${context.fontSizeScale})`);
  }
  return pt(scaled);
}

/**
 * PPTX spacing limits in pixels.
 * OOXML ST_TextPointUnqualified has practical limits around ±4000 points (±400000 centipoints).
 * Converted to pixels: ±4000pt × 1.333px/pt ≈ ±5333px
 * We use more conservative limits for practical text rendering.
 */
const SPACING_MIN_PX = -1000 * PT_TO_PX;
const SPACING_MAX_PX = 1000 * PT_TO_PX;

/**
 * Convert PDF spacing properties to PPTX spacing.
 *
 * ## PDF Spacing Properties (ISO 32000-1)
 *
 * - **charSpacing (Tc)**: Added to every character displacement (in points)
 * - **wordSpacing (Tw)**: Added only to space characters (0x20) - not mapped to PPTX
 * - **horizontalScaling (Tz)**: Scales all spacing (percentage, default 100)
 *
 * ## PPTX Spacing (ECMA-376)
 *
 * PPTX has a single spacing value per TextRun (RunProperties.spacing).
 * This maps directly to PDF's charSpacing (Tc) operator.
 *
 * Note: wordSpacing (Tw) is intentionally not included because PPTX's spacing
 * applies uniformly to all characters, while PDF's Tw only affects spaces.
 * Attempting to average Tw across all gaps produces inaccurate results.
 *
 * @param charSpacing - PDF Tc value in points
 * @param horizontalScaling - PDF Tz value as percentage (default 100)
 * @returns PPTX spacing value in pixels, or undefined if no significant spacing
 */
function convertSpacing(
  charSpacing: number | undefined,
  horizontalScaling: number | undefined,
  context: ConversionContext,
): Pixels | undefined {
  // Early return if no charSpacing
  if (charSpacing === undefined || charSpacing === 0) {
    return undefined;
  }

  // Apply horizontal scaling to charSpacing
  const scale = (horizontalScaling ?? 100) / 100;
  const spacingPts = charSpacing * scale;

  // Skip negligible spacing (less than 0.01pt)
  if (Math.abs(spacingPts) < 0.01) {
    return undefined;
  }

  // Convert from PDF points to slide pixels
  // (spacing is a horizontal property, so use the X scale factor)
  const spacingPx = spacingPts * context.scaleX;

  return validateAndClampSpacing(spacingPx);
}

/**
 * Validate and clamp spacing value to PPTX limits.
 *
 * @param spacingPx - Spacing value in pixels
 * @returns Clamped spacing value in pixels, or undefined if too small to matter
 */
function validateAndClampSpacing(spacingPx: number): Pixels | undefined {
  // Skip small spacing: PDF charSpacing is frequently used as a subtle
  // justification/hinting aid and does not round-trip well to PPTX/SVG.
  // Keeping only clearly-visible spacing improves visual fidelity.
  if (Math.abs(spacingPx) < 0.5) {
    return undefined;
  }

  // Clamp to PPTX limits
  if (spacingPx < SPACING_MIN_PX || spacingPx > SPACING_MAX_PX) {
    console.warn(
      `[PDF] Spacing ${spacingPx.toFixed(2)}px exceeds limits, clamping to [${SPACING_MIN_PX.toFixed(0)}, ${SPACING_MAX_PX.toFixed(0)}]`
    );
    return px(Math.max(SPACING_MIN_PX, Math.min(SPACING_MAX_PX, spacingPx)));
  }

  return px(spacingPx);
}

// =============================================================================
// Grouped Text Conversion
// =============================================================================

/**
 * Convert grouped text position from PDF to PPTX coordinates.
 *
 * Same coordinate pipeline as {@link convertTextPosition}.
 * bounds.y is the bottom edge in PDF coordinates.
 */
function convertGroupedTextPosition(
  bounds: { x: number; y: number; width: number; height: number },
  size: { width: Pixels; height: Pixels },
  context: ConversionContext
): { readonly x: Pixels; readonly y: Pixels } {
  const converted = convertPoint({ x: bounds.x, y: bounds.y }, context);
  return {
    x: converted.x,
    y: px((converted.y as number) - (size.height as number)),
  };
}

/**
 * Create TextBody from grouped paragraphs.
 *
 * Sets insets to 0 to ensure text is positioned exactly at the TextBox origin.
 * PPTX default insets are 0.1 inch (~9.6px), which would cause visible offset.
 *
 * ## Text Layout Strategy
 *
 * PDF text is absolute-positioned, while PPTX text flows within a TextBox.
 * To keep the layout stable (including after manual resize), we preserve PDF
 * line breaks as explicit DrawingML breaks (a:br) rather than relying on PPTX
 * auto-wrapping.
 *
 * Logical paragraph breaks are detected by extra vertical space:
 * - extraSpace > fontSize * PARAGRAPH_BREAK_THRESHOLD_RATIO
 *
 * ## Alignment Strategy
 *
 * All text uses "left" alignment. The TextBox position itself handles
 * visual alignment - if text appears centered on the page, it's because
 * the TextBox is centered. PDF uses absolute coordinates, so we don't
 * need to detect/apply alignment.
 *
 * ## Coordinate System
 *
 * PDF baselineY is in page coordinates (Y increases upward), so:
 * - First paragraph has highest baselineY
 * - Subsequent paragraphs have lower baselineY values
 * - baselineDistance = prevBaselineY - currentBaselineY
 */
function createTextBodyFromGroup(group: GroupedText, context: ConversionContext): TextBody {
  // Preserve PDF line placement as paragraph geometry (margins, tabs, spacing),
  // rather than relying on PPTX auto-wrapping/reflow.
  const logicalParagraphs = buildParagraphsFromSegmentedLines(group.paragraphs, group.bounds, context);

  return {
    bodyProperties: {
      wrapping: "none",
      autoFit: { type: "none" },
      anchor: "top",
      anchorCenter: false,
      // Set all insets to 0 for precise positioning
      // Default PPTX insets are 91440 EMU = 0.1 inch = ~9.6px
      insets: {
        left: px(0),
        top: px(0),
        right: px(0),
        bottom: px(0),
      },
    },
    paragraphs: logicalParagraphs,
  };
}

/**
 * Build PPTX paragraphs from PDF lines/segments.
 *
 * Strategy:
 * - Reconstruct physical lines by clustering `baselineY`
 * - Within a line, treat multiple segments (e.g. table columns) as tab-separated
 * - Use paragraph `marL` for per-line x-offset, and `tabStops` for segment alignment
 * - Use paragraph `spaceBefore` to preserve extra vertical gaps between baselines
 */
function buildParagraphsFromSegmentedLines(
  groupedParas: readonly GroupedParagraph[],
  bounds: { x: number; y: number; width: number; height: number },
  context: ConversionContext,
): Paragraph[] {
  if (groupedParas.length === 0) {return [];}

  const firstRun = groupedParas[0].runs[0];
  if (!firstRun) {return [];}

  type Segment = { readonly paragraph: GroupedParagraph; readonly minX: number };
  type LogicalLine = {
    readonly baselineY: number;
    readonly segments: readonly Segment[];
    readonly minX: number;
    readonly fontSize: number;
  };

  const estimateLineEps = (paras: readonly GroupedParagraph[]): number => {
    const sizes: number[] = [];
    for (const p of paras) {
      const fs = p.runs[0]?.fontSize;
      if (fs !== undefined && fs > 0) {sizes.push(fs);}
    }
    sizes.sort((a, b) => a - b);
    const med = sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)]! : 12;
    // `GroupedParagraph.baselineY` is already clustered into lines by the text-grouping phase.
    // Here we only want to merge paragraphs that are truly on the *same* physical line
    // (e.g. table columns), so the tolerance must be tight.
    return Math.max(0.5, med * 0.1);
  };

  const lineEps = estimateLineEps(groupedParas);

  const sorted = [...groupedParas].sort((a, b) => b.baselineY - a.baselineY);

  const lines: LogicalLine[] = [];
  // eslint-disable-next-line no-restricted-syntax
  let current: { baselineY: number; segments: Segment[] } | null = null;

  for (const p of sorted) {
    const minX = Math.min(...p.runs.map((r) => r.x));
    if (!current) {
      current = { baselineY: p.baselineY, segments: [{ paragraph: p, minX }] };
      continue;
    }
    if (Math.abs(p.baselineY - current.baselineY) <= lineEps) {
      current.segments.push({ paragraph: p, minX });
      continue;
    }
    // flush
    const segs = [...current.segments].sort((a, b) => a.minX - b.minX);
    const lineMinX = segs[0]?.minX ?? 0;
    const lineFontSize = segs[0]?.paragraph.runs[0]?.fontSize ?? 12;
    lines.push({ baselineY: current.baselineY, segments: segs, minX: lineMinX, fontSize: lineFontSize });
    current = { baselineY: p.baselineY, segments: [{ paragraph: p, minX }] };
  }
  if (current) {
    const segs = [...current.segments].sort((a, b) => a.minX - b.minX);
    const lineMinX = segs[0]?.minX ?? 0;
    const lineFontSize = segs[0]?.paragraph.runs[0]?.fontSize ?? 12;
    lines.push({ baselineY: current.baselineY, segments: segs, minX: lineMinX, fontSize: lineFontSize });
  }

  const result: Paragraph[] = [];

  const buildTabStopsForLine = (line: LogicalLine): Paragraph["properties"]["tabStops"] => {
    if (line.segments.length <= 1) {return undefined;}

    const positionsPx = line.segments
      .slice(1)
      .map((s) => convertSize(s.minX - line.minX, 0, context).width)
      .filter((p) => (p as number) >= 0);

    // De-dupe close positions (within 1px)
    const sortedPx = [...positionsPx].sort((a, b) => (a as number) - (b as number));
    const out: { position: Pixels; alignment: "left" }[] = [];
    for (const pos of sortedPx) {
      const prev = out[out.length - 1]?.position;
      if (prev !== undefined && Math.abs((pos as number) - (prev as number)) < 1) {
        continue;
      }
      out.push({ position: pos, alignment: "left" });
    }
    return out.length > 0 ? out : undefined;
  };

  const buildRunsForLine = (line: LogicalLine): TextRun[] => {
    const out: TextRun[] = [];

    for (let si = 0; si < line.segments.length; si++) {
      const seg = line.segments[si]!;

      if (si > 0) {
        const ref = line.segments[si - 1]!.paragraph.runs.at(-1) ?? seg.paragraph.runs[0]!;
        const tabText: PdfText = { ...ref, text: "\t", width: 0 };
        out.push(createPptxTextRunFromPdfText(tabText, context));
      }

      const runs = [...seg.paragraph.runs].sort((a, b) => a.x - b.x);
      for (let ri = 0; ri < runs.length; ri++) {
        const run = runs[ri]!;
        const prev = runs[ri - 1];
        if (prev && shouldInsertSyntheticSpace(prev, run)) {
          const spaceText: PdfText = { ...prev, text: " ", width: 0 };
          out.push(createPptxTextRunFromPdfText(spaceText, context));
        }
        out.push(createPptxTextRunFromPdfText(run, context));
      }
    }

    return mergeAdjacentTextRuns(out);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const prev = lines[i - 1];

    const baselineDistance = prev ? (prev.baselineY - line.baselineY) : undefined;
    const extraSpace = (baselineDistance !== undefined) ? (baselineDistance - prev!.fontSize) : undefined;

    const marginLeft = convertSize(line.minX - bounds.x, 0, context).width;

        result.push({
          properties: {
            alignment: "left",
            ...(marginLeft as number > 0 ? { marginLeft } : {}),
            ...getExtraSpaceBeforeProperties(extraSpace, context),
            tabStops: buildTabStopsForLine(line),
          },
          runs: buildRunsForLine(line),
          endProperties: {},
        });
  }

  return result;
}

function shouldInsertSyntheticSpace(prev: PdfText, cur: PdfText): boolean {
  if (prev.text.length === 0 || cur.text.length === 0) {return false;}
  if (/\s$/.test(prev.text) || /^\s/.test(cur.text)) {return false;}

  const prevEnd = prev.x + prev.width;
  const gap = cur.x - prevEnd;
  if (!(gap > 0)) {return false;}

  const prevCharWidth = prev.width / Math.max(1, prev.text.length);
  const curCharWidth = cur.width / Math.max(1, cur.text.length);
  const avgCharWidth = (prevCharWidth + curCharWidth) / 2;
  const fontSize = Math.max(prev.fontSize, cur.fontSize, 1);

  // Conservative space threshold:
  // - relative to font size (PDF point units)
  // - and relative to the typical character width of the line
  const threshold = Math.max(fontSize * 0.2, avgCharWidth * 0.8);
  return gap >= threshold;
}

function getExtraSpaceBeforeProperties(
  extraSpace: number | undefined,
  context: ConversionContext,
): Partial<NonNullable<Paragraph["properties"]>> {
  if (extraSpace === undefined || !(extraSpace > 0)) {
    return {};
  }
  return { spaceBefore: { type: "points", value: pt(extraSpace * context.fontSizeScale) } };
}

function mergeAdjacentTextRuns(runs: readonly TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const run of runs) {
    const prev = out[out.length - 1];
    if (!prev || prev.type !== "text" || run.type !== "text") {
      out.push(run);
      continue;
    }

    if (!areTextRunPropsEquivalent(prev.properties, run.properties)) {
      out.push(run);
      continue;
    }

    out[out.length - 1] = { ...prev, text: prev.text + run.text };
  }
  return out;
}

function areTextRunPropsEquivalent(a: TextRun["properties"] | undefined, b: TextRun["properties"] | undefined): boolean {
  if (a === undefined || b === undefined) {return a === b;}
  return (
    a.fontSize === b.fontSize &&
    a.fontFamily === b.fontFamily &&
    a.fontFamilyEastAsian === b.fontFamilyEastAsian &&
    a.fontFamilyComplexScript === b.fontFamilyComplexScript &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.spacing === b.spacing &&
    JSON.stringify(a.fill) === JSON.stringify(b.fill)
  );
}


/**
 * Convert a GroupedText to a PPTX SpShape (TextBox).
 *
 * This handles the case where multiple PdfText elements are
 * combined into a single TextBox with multiple paragraphs/runs.
 */
export function convertGroupedTextToShape(
  group: GroupedText,
  context: ConversionContext,
  shapeId: string
): SpShape {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const size = convertSize(group.bounds.width, group.bounds.height, context);
  const position = convertGroupedTextPosition(
    group.bounds,
    size,
    context
  );
  const textBody = createTextBodyFromGroup(group, context);

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `TextBox ${shapeId}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
      fill: { type: "noFill" },
    },
    textBody,
  };
}
