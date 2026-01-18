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
  LayoutTabStop,
} from "../types";
import type { DocxParagraph, DocxParagraphContent, DocxParagraphSpacing, DocxTabStops } from "../../docx/domain/paragraph";
import type { DocxRun, DocxRunProperties, DocxRunContent } from "../../docx/domain/run";
import type { DocxNumbering } from "../../docx/domain/numbering";
import type { DocxStyles } from "../../docx/domain/styles";
import type { ParagraphAlignment } from "../../ooxml/domain/text";
import {
  resolveBulletConfig,
  createNumberingContext,
  type NumberingContext,
} from "./numbering-resolver";
import {
  createStyleResolver,
  resolveRunPropertiesWithStyles,
  type ResolvedRunProperties,
} from "./docx-style-resolver";
import type { Pixels } from "../../ooxml/domain/units";
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
 * Default tab size in points.
 * Derived from SPEC_DEFAULT_TAB_STOP_TWIPS.
 */
const DEFAULT_TAB_SIZE_PT = SPEC_DEFAULT_TAB_STOP_TWIPS / TWIPS_PER_POINT;

// =============================================================================
// Run Content to Text
// =============================================================================

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
 * Get break type for layout span.
 *
 * @see ECMA-376-1:2016 Section 17.3.3.1 (br)
 */
function getBreakType(content: DocxRunContent): "none" | "page" | "column" | "line" {
  if (content.type !== "break") {
    return "none";
  }
  switch (content.breakType) {
    case "page":
      return "page";
    case "column":
      return "column";
    case "textWrapping":
    case undefined:
      return "line";
    default:
      return "none";
  }
}

/**
 * Convert a DOCX run to layout spans.
 */
/**
 * Options for run to span conversion.
 */
type RunToSpansOptions = {
  readonly run: DocxRun;
  readonly paragraphRPr: DocxRunProperties | undefined;
  readonly paragraphStyleId: string | undefined;
  readonly resolveStyle: (styleId: string | undefined) => ResolvedRunProperties;
  readonly linkId?: string;
  readonly linkTooltip?: string;
};

/**
 * Convert a DOCX run to layout spans with full style resolution.
 */
function runToSpans(options: RunToSpansOptions): LayoutSpan[] {
  const { run, paragraphRPr, paragraphStyleId, resolveStyle, linkId, linkTooltip } = options;

  // Resolve properties using the full style chain
  // rStyle on the run -> pStyle on the paragraph -> docDefaults
  const rStyleId = run.properties?.rStyle;
  const props = resolveRunPropertiesWithStyles(
    resolveStyle,
    rStyleId,
    paragraphStyleId,
    paragraphRPr,
    run.properties,
  );

  const spans: LayoutSpan[] = [];

  for (const content of run.content) {
    const text = runContentToText(content);
    const breakType = getBreakType(content);

    // Skip empty text unless it's a break
    if (text.length === 0 && breakType === "none") {
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
      breakType,
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
 * Options for paragraph content to spans conversion.
 */
type ParagraphContentToSpansOptions = {
  readonly content: readonly DocxParagraphContent[];
  readonly paragraphRPr: DocxRunProperties | undefined;
  readonly paragraphStyleId: string | undefined;
  readonly resolveStyle: (styleId: string | undefined) => ResolvedRunProperties;
};

/**
 * Convert DOCX paragraph content to layout spans.
 */
function paragraphContentToSpans(options: ParagraphContentToSpansOptions): LayoutSpan[] {
  const { content, paragraphRPr, paragraphStyleId, resolveStyle } = options;
  const spans: LayoutSpan[] = [];

  for (const item of content) {
    switch (item.type) {
      case "run":
        spans.push(
          ...runToSpans({
            run: item,
            paragraphRPr,
            paragraphStyleId,
            resolveStyle,
          }),
        );
        break;

      case "hyperlink":
        for (const run of item.content) {
          spans.push(
            ...runToSpans({
              run,
              paragraphRPr,
              paragraphStyleId,
              resolveStyle,
              linkId: item.rId ?? item.anchor,
              linkTooltip: item.tooltip,
            }),
          );
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
      return "justify";
    case "distribute":
      // Distribute alignment spreads text evenly including inter-character spacing
      // @see ECMA-376-1:2016 Section 17.3.1.13 (jc)
      return "distributed";
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
      // Line height is exactly the specified value (in twips -> points)
      return { type: "points", value: pt(spacing.line / TWIPS_PER_POINT) };
    case "atLeast":
      // Line height is at least the specified value, but can grow for larger fonts
      // @see ECMA-376-1:2016 Section 17.3.1.33 (spacing - atLeast)
      return { type: "atLeast", value: pt(spacing.line / TWIPS_PER_POINT) };
    case "auto":
    default: {
      // Line spacing multiplier: 240 = single (100%), 480 = double (200%)
      const percent = (spacing.line / 240) * 100;
      return { type: "percent", value: pct(percent) };
    }
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
 * Context for paragraph layout conversion.
 * Provides numbering definitions and maintains counter state.
 */
export type ParagraphLayoutContext = {
  /** Numbering definitions from the document */
  readonly numbering?: DocxNumbering;
  /** Numbering counter state (mutable for tracking) */
  readonly numberingContext: NumberingContext;
  /** Style definitions from the document */
  readonly styles?: DocxStyles;
  /** Style resolver function (memoized) */
  readonly resolveStyle: (styleId: string | undefined) => ResolvedRunProperties;
};

/**
 * Create a new paragraph layout context.
 */
export function createParagraphLayoutContext(
  numbering?: DocxNumbering,
  styles?: DocxStyles,
): ParagraphLayoutContext {
  return {
    numbering,
    numberingContext: createNumberingContext(),
    styles,
    resolveStyle: createStyleResolver(styles),
  };
}

/**
 * Convert a DOCX paragraph to a layout paragraph input.
 *
 * @param paragraph The DOCX paragraph to convert
 * @param context Optional context with numbering definitions
 */
export function paragraphToLayoutInput(
  paragraph: DocxParagraph,
  context?: ParagraphLayoutContext,
): LayoutParagraphInput {
  const props = paragraph.properties;

  // Get style resolver - use context if available, otherwise create a no-op resolver
  const resolveStyle = context?.resolveStyle ?? createStyleResolver(undefined);

  // Convert content to spans
  const spans = paragraphContentToSpans({
    content: paragraph.content,
    paragraphRPr: props?.rPr,
    paragraphStyleId: props?.pStyle,
    resolveStyle,
  });

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

  // Resolve bullet/numbering
  let bullet: BulletConfig | undefined;
  if (props?.numPr !== undefined && context?.numbering !== undefined) {
    bullet = resolveBulletConfig(props.numPr, context.numbering, context.numberingContext);
  }

  return {
    spans,
    alignment,
    marginLeft,
    indent,
    marginRight,
    spaceBefore,
    spaceAfter,
    lineSpacing,
    bullet,
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
 *
 * @param paragraphs The DOCX paragraphs to convert
 * @param numbering Optional numbering definitions for list rendering
 */
export function paragraphsToLayoutInputs(
  paragraphs: readonly DocxParagraph[],
  numbering?: DocxNumbering,
  styles?: DocxStyles,
): LayoutParagraphInput[] {
  const context = createParagraphLayoutContext(numbering, styles);
  return paragraphs.map((p) => paragraphToLayoutInput(p, context));
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
