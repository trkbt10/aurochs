/**
 * @file DOCX to Layout Adapter
 *
 * Converts DOCX paragraph/run domain types to layout input types.
 * This adapter bridges the DOCX-specific types with the unified layout engine.
 */

import type {
  LayoutParagraphInput,
  LayoutSpan,
  BulletConfig,
  TextAlign,
  LineSpacing,
  FontAlignment,
  LayoutTabStop,
} from "../types";
import type { DocxParagraph, DocxParagraphContent, DocxHyperlink, DocxParagraphSpacing, DocxTabStops } from "../../docx/domain/paragraph";
import type { DocxRun, DocxRunProperties, DocxRunContent, DocxHighlightColor } from "../../docx/domain/run";
import type { ParagraphAlignment } from "../../ooxml/domain/text";
import type { Pixels, Points } from "../../ooxml/domain/units";
import { px, pt, pct } from "../../ooxml/domain/units";
import {
  SPEC_DEFAULT_FONT_SIZE_PT,
  SPEC_DEFAULT_TAB_STOP_TWIPS,
  SPEC_DEFAULT_PAGE_WIDTH_TWIPS,
  SPEC_DEFAULT_PAGE_HEIGHT_TWIPS,
  SPEC_DEFAULT_MARGIN_TWIPS,
  TWIPS_PER_POINT,
  PT_TO_PX,
  twipsToPx,
} from "../../docx/domain/ecma376-defaults";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default font family when none specified.
 * NOTE: ECMA-376 does not specify a default font family.
 * This is an application-level default (sans-serif for consistent rendering).
 */
const DEFAULT_FONT_FAMILY = "sans-serif";

/**
 * Default tab size in points.
 * Derived from SPEC_DEFAULT_TAB_STOP_TWIPS.
 */
const DEFAULT_TAB_SIZE_PT = SPEC_DEFAULT_TAB_STOP_TWIPS / TWIPS_PER_POINT;

// =============================================================================
// Highlight Color Mapping
// =============================================================================

/**
 * Map DOCX highlight color names to hex values.
 */
const HIGHLIGHT_COLOR_MAP: Record<DocxHighlightColor, string | undefined> = {
  black: "#000000",
  blue: "#0000FF",
  cyan: "#00FFFF",
  green: "#00FF00",
  magenta: "#FF00FF",
  red: "#FF0000",
  yellow: "#FFFF00",
  white: "#FFFFFF",
  darkBlue: "#00008B",
  darkCyan: "#008B8B",
  darkGreen: "#006400",
  darkMagenta: "#8B008B",
  darkRed: "#8B0000",
  darkYellow: "#808000",
  darkGray: "#A9A9A9",
  lightGray: "#D3D3D3",
  none: undefined,
};

// =============================================================================
// Run Properties to Layout Span
// =============================================================================

/**
 * Convert DOCX run properties to layout span properties.
 */
function resolveRunProperties(
  properties: DocxRunProperties | undefined,
  paragraphDefaults: DocxRunProperties | undefined,
): {
  fontSize: Points;
  fontFamily: string;
  fontFamilyEastAsian: string | undefined;
  fontFamilyComplexScript: string | undefined;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textDecoration: string | undefined;
  color: string;
  verticalAlign: "baseline" | "superscript" | "subscript";
  letterSpacing: Pixels;
  direction: "ltr" | "rtl";
  highlightColor: string | undefined;
  textTransform: "none" | "uppercase" | "lowercase" | undefined;
} {
  // Merge run properties with paragraph defaults
  const props = properties ?? {};
  const defaults = paragraphDefaults ?? {};

  // Font size (in half-points)
  const szHalfPoints = props.sz ?? defaults.sz;
  const fontSize = szHalfPoints !== undefined ? pt(szHalfPoints / 2) : pt(SPEC_DEFAULT_FONT_SIZE_PT);

  // Font families
  const fonts = props.rFonts ?? defaults.rFonts;
  const fontFamily = fonts?.ascii ?? fonts?.hAnsi ?? DEFAULT_FONT_FAMILY;
  const fontFamilyEastAsian = fonts?.eastAsia;
  const fontFamilyComplexScript = fonts?.cs;

  // Bold
  const isBold = props.b ?? defaults.b ?? false;
  const fontWeight = isBold ? 700 : 400;

  // Italic
  const isItalic = props.i ?? defaults.i ?? false;
  const fontStyle = isItalic ? "italic" : "normal";

  // Text decoration
  const underline = props.u ?? defaults.u;
  const strike = props.strike ?? defaults.strike ?? false;
  const dstrike = props.dstrike ?? defaults.dstrike ?? false;
  const decorations: string[] = [];
  if (underline !== undefined && underline.val !== "none") {
    decorations.push("underline");
  }
  if (strike || dstrike) {
    decorations.push("line-through");
  }
  const textDecoration = decorations.length > 0 ? decorations.join(" ") : undefined;

  // Color
  const colorProp = props.color ?? defaults.color;
  const color = colorProp?.val !== undefined ? `#${colorProp.val}` : "#000000";

  // Vertical alignment
  const vertAlignProp = props.vertAlign ?? defaults.vertAlign;
  const verticalAlign = vertAlignProp ?? "baseline";

  // Letter spacing (in twips)
  const spacingTwips = props.spacing ?? defaults.spacing;
  const letterSpacing =
    spacingTwips !== undefined ? px((spacingTwips / TWIPS_PER_POINT) * PT_TO_PX) : px(0);

  // Direction
  const isRtl = props.rtl ?? defaults.rtl ?? false;
  const direction = isRtl ? "rtl" : "ltr";

  // Highlight color
  const highlight = props.highlight ?? defaults.highlight;
  const highlightColor = highlight !== undefined ? HIGHLIGHT_COLOR_MAP[highlight] : undefined;

  // Text transform
  const caps = props.caps ?? defaults.caps ?? false;
  const smallCaps = props.smallCaps ?? defaults.smallCaps ?? false;
  const textTransform = caps ? "uppercase" : smallCaps ? "lowercase" : "none";

  return {
    fontSize,
    fontFamily,
    fontFamilyEastAsian,
    fontFamilyComplexScript,
    fontWeight,
    fontStyle,
    textDecoration,
    color,
    verticalAlign,
    letterSpacing,
    direction,
    highlightColor,
    textTransform,
  };
}

/**
 * Convert a DOCX run content to text.
 */
function runContentToText(content: DocxRunContent): string {
  switch (content.type) {
    case "text":
      return content.value;
    case "tab":
      return "\t";
    case "break":
      return content.breakType === "textWrapping" ? "\n" : "";
    case "symbol":
      // Convert hex char code to character
      return String.fromCharCode(parseInt(content.char, 16));
  }
}

/**
 * Check if run content is a line break.
 */
function isLineBreak(content: DocxRunContent): boolean {
  return content.type === "break" && content.breakType !== "textWrapping";
}

/**
 * Convert a DOCX run to layout spans.
 */
function runToSpans(
  run: DocxRun,
  paragraphDefaults: DocxRunProperties | undefined,
  linkId?: string,
  linkTooltip?: string,
): LayoutSpan[] {
  const props = resolveRunProperties(run.properties, paragraphDefaults);
  const spans: LayoutSpan[] = [];

  for (const content of run.content) {
    const text = runContentToText(content);
    if (text.length === 0 && !isLineBreak(content)) {
      continue;
    }

    spans.push({
      text,
      fontSize: props.fontSize,
      fontFamily: props.fontFamily,
      fontFamilyEastAsian: props.fontFamilyEastAsian,
      fontFamilyComplexScript: props.fontFamilyComplexScript,
      fontWeight: props.fontWeight,
      fontStyle: props.fontStyle,
      textDecoration: props.textDecoration,
      color: props.color,
      verticalAlign: props.verticalAlign,
      letterSpacing: props.letterSpacing,
      isBreak: content.type === "break" && content.breakType !== "textWrapping",
      direction: props.direction,
      highlightColor: props.highlightColor,
      textTransform: props.textTransform,
      linkId,
      linkTooltip,
      textOutline: undefined,
      textFill: undefined,
      kerning: undefined,
    });
  }

  return spans;
}

/**
 * Convert DOCX paragraph content to layout spans.
 */
function paragraphContentToSpans(
  content: readonly DocxParagraphContent[],
  paragraphDefaults: DocxRunProperties | undefined,
): LayoutSpan[] {
  const spans: LayoutSpan[] = [];

  for (const item of content) {
    switch (item.type) {
      case "run":
        spans.push(...runToSpans(item, paragraphDefaults));
        break;

      case "hyperlink":
        for (const run of item.content) {
          spans.push(...runToSpans(run, paragraphDefaults, item.rId ?? item.anchor, item.tooltip));
        }
        break;

      case "bookmarkStart":
      case "bookmarkEnd":
      case "commentRangeStart":
      case "commentRangeEnd":
        // Skip markers
        break;
    }
  }

  return spans;
}

// =============================================================================
// Paragraph Properties to Layout Input
// =============================================================================

/**
 * Convert DOCX paragraph alignment to layout text align.
 */
function convertAlignment(jc: ParagraphAlignment | undefined): TextAlign {
  switch (jc) {
    case "left":
    case "start":
      return "left";
    case "center":
      return "center";
    case "right":
    case "end":
      return "right";
    case "both":
    case "distribute":
      return "justify";
    default:
      return "left";
  }
}

/**
 * Convert DOCX line spacing to layout line spacing.
 */
function convertLineSpacing(spacing: DocxParagraphSpacing | undefined): LineSpacing | undefined {
  if (spacing === undefined) {
    return undefined;
  }

  if (spacing.line === undefined) {
    return undefined;
  }

  const lineRule = spacing.lineRule ?? "auto";

  switch (lineRule) {
    case "exact":
    case "atLeast":
      // Line height in twips -> points
      return { type: "points", value: pt(spacing.line / TWIPS_PER_POINT) };
    case "auto":
    default:
      // Line spacing multiplier: 240 = single (100%), 480 = double (200%)
      const percent = (spacing.line / 240) * 100;
      return { type: "percent", value: pct(percent) };
  }
}

/**
 * Convert DOCX tab stops to layout tab stops.
 */
function convertTabStops(tabs: DocxTabStops | undefined): readonly LayoutTabStop[] {
  if (tabs === undefined || tabs.tabs.length === 0) {
    return [];
  }

  return tabs.tabs.map((tab) => ({
    position: px((tab.pos / TWIPS_PER_POINT) * PT_TO_PX),
    alignment: tab.val === "center" ? "center" : tab.val === "right" ? "right" : tab.val === "decimal" ? "decimal" : "left",
  }));
}

/**
 * Convert a DOCX paragraph to a layout paragraph input.
 */
export function paragraphToLayoutInput(paragraph: DocxParagraph): LayoutParagraphInput {
  const props = paragraph.properties;

  // Convert content to spans
  const spans = paragraphContentToSpans(paragraph.content, props?.rPr);

  // Alignment
  const alignment = convertAlignment(props?.jc);

  // Margins and indentation (in twips)
  const ind = props?.ind;
  const marginLeft = ind?.left !== undefined ? px((ind.left / TWIPS_PER_POINT) * PT_TO_PX) : px(0);
  const marginRight = ind?.right !== undefined ? px((ind.right / TWIPS_PER_POINT) * PT_TO_PX) : px(0);

  // First line indent (positive) or hanging indent (negative)
  let indent = px(0);
  if (ind?.firstLine !== undefined) {
    indent = px((ind.firstLine / TWIPS_PER_POINT) * PT_TO_PX);
  } else if (ind?.hanging !== undefined) {
    indent = px((-ind.hanging / TWIPS_PER_POINT) * PT_TO_PX);
  }

  // Spacing
  const spacing = props?.spacing;
  const spaceBefore = spacing?.before !== undefined ? pt(spacing.before / TWIPS_PER_POINT) : pt(0);
  const spaceAfter = spacing?.after !== undefined ? pt(spacing.after / TWIPS_PER_POINT) : pt(0);

  // Line spacing
  const lineSpacing = convertLineSpacing(spacing);

  // Tab stops
  const tabStops = convertTabStops(props?.tabs);

  // Font size for empty paragraphs
  const endParaFontSize =
    props?.rPr?.sz !== undefined ? pt(props.rPr.sz / 2) : pt(SPEC_DEFAULT_FONT_SIZE_PT);

  return {
    spans,
    alignment,
    marginLeft,
    indent,
    marginRight,
    spaceBefore,
    spaceAfter,
    lineSpacing,
    bullet: undefined, // TODO: Implement bullet/numbering
    fontAlignment: "auto",
    defaultTabSize: px(DEFAULT_TAB_SIZE_PT * PT_TO_PX),
    tabStops,
    eaLineBreak: true,
    latinLineBreak: false,
    hangingPunctuation: false,
    endParaFontSize,
  };
}

/**
 * Convert an array of DOCX paragraphs to layout paragraph inputs.
 */
export function paragraphsToLayoutInputs(paragraphs: readonly DocxParagraph[]): LayoutParagraphInput[] {
  return paragraphs.map(paragraphToLayoutInput);
}

// =============================================================================
// Plain Text Extraction
// =============================================================================

/**
 * Get plain text from a DOCX paragraph.
 */
export function getParagraphPlainText(paragraph: DocxParagraph): string {
  const texts: string[] = [];

  for (const content of paragraph.content) {
    switch (content.type) {
      case "run":
        for (const rc of content.content) {
          texts.push(runContentToText(rc));
        }
        break;

      case "hyperlink":
        for (const run of content.content) {
          for (const rc of run.content) {
            texts.push(runContentToText(rc));
          }
        }
        break;
    }
  }

  return texts.join("");
}

/**
 * Get plain text from an array of DOCX paragraphs.
 * Paragraphs are separated by newlines.
 */
export function getDocumentPlainText(paragraphs: readonly DocxParagraph[]): string {
  return paragraphs.map(getParagraphPlainText).join("\n");
}

// =============================================================================
// Document Layout Configuration
// =============================================================================

/**
 * DOCX page configuration.
 */
export type DocxPageConfig = {
  /** Page width in pixels */
  readonly width: Pixels;
  /** Page height in pixels */
  readonly height: Pixels;
  /** Left margin in pixels */
  readonly marginLeft: Pixels;
  /** Right margin in pixels */
  readonly marginRight: Pixels;
  /** Top margin in pixels */
  readonly marginTop: Pixels;
  /** Bottom margin in pixels */
  readonly marginBottom: Pixels;
};

/**
 * Default page configuration using ECMA-376 specification defaults.
 * Letter size: 8.5in x 11in = 816px x 1056px at 96 DPI
 * Default margins: 1 inch = 96px
 *
 * @see ECMA-376-1:2016 Section 17.6.13 (pgSz)
 * @see ECMA-376-1:2016 Section 17.6.11 (pgMar)
 *
 * @deprecated Use sectionPropertiesToPageConfig from docx-section-adapter.ts
 *             to derive page configuration from sectPr.
 */
export const DEFAULT_PAGE_CONFIG: DocxPageConfig = {
  width: twipsToPx(SPEC_DEFAULT_PAGE_WIDTH_TWIPS),
  height: twipsToPx(SPEC_DEFAULT_PAGE_HEIGHT_TWIPS),
  marginLeft: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
  marginRight: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
  marginTop: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
  marginBottom: twipsToPx(SPEC_DEFAULT_MARGIN_TWIPS),
};

/**
 * Get content width from page configuration.
 */
export function getContentWidth(config: DocxPageConfig): Pixels {
  return px((config.width as number) - (config.marginLeft as number) - (config.marginRight as number));
}

/**
 * Get content height from page configuration.
 */
export function getContentHeight(config: DocxPageConfig): Pixels {
  return px((config.height as number) - (config.marginTop as number) - (config.marginBottom as number));
}
