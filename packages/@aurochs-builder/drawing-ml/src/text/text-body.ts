/**
 * @file Text body builder for DrawingML
 *
 * Builds text body structures that are common across PPTX, DOCX, and XLSX.
 * The output is compatible with @aurochs-office/pptx text domain types.
 */

import { px, type Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { Effects } from "@aurochs-office/drawing-ml/domain/effects";
import type {
  TextSpec,
  TextParagraphSpec,
  TextRunSpec,
  TextBodyPropertiesSpec,
  HyperlinkSpec,
  RichTextSpec,
} from "../types";
import { buildSolidFill } from "../fill/solid-fill";
import { buildLine } from "../line/line-properties";
import { buildEffects } from "../effect/effects";

// =============================================================================
// Domain Types (compatible with @aurochs-office/pptx)
// =============================================================================

/**
 * Text body domain type
 */
export type TextBody = {
  readonly bodyProperties: BodyProperties;
  readonly paragraphs: readonly Paragraph[];
};

/**
 * Body properties domain type
 */
export type BodyProperties = {
  readonly anchor?: string;
  readonly verticalType?: string;
  readonly wrapping?: string;
  readonly anchorCenter?: boolean;
  readonly insets?: {
    readonly left: Pixels;
    readonly top: Pixels;
    readonly right: Pixels;
    readonly bottom: Pixels;
  };
};

/**
 * Paragraph domain type
 */
export type Paragraph = {
  readonly properties: ParagraphProperties;
  readonly runs: readonly TextRun[];
};

/**
 * Paragraph properties domain type
 */
export type ParagraphProperties = {
  readonly level?: number;
  readonly alignment?: string;
  readonly bulletStyle?: BulletStyle;
  readonly lineSpacing?: LineSpacing;
  readonly spaceBefore?: LineSpacing;
  readonly spaceAfter?: LineSpacing;
  readonly indent?: Pixels;
  readonly marginLeft?: Pixels;
  readonly defaultRunProperties?: RunProperties;
};

/**
 * Bullet style domain type
 */
export type BulletStyle = {
  readonly bullet: Bullet;
  readonly colorFollowText: boolean;
  readonly sizeFollowText: boolean;
  readonly fontFollowText: boolean;
};

/**
 * Bullet domain type
 */
export type Bullet =
  | { readonly type: "none" }
  | { readonly type: "char"; readonly char: string }
  | { readonly type: "auto"; readonly scheme: string };

/**
 * Line spacing domain type
 */
export type LineSpacing =
  | { readonly type: "percent"; readonly value: number }
  | { readonly type: "points"; readonly value: number };

/**
 * Text run domain type
 */
export type TextRun = {
  readonly type: "text";
  readonly text: string;
  readonly properties?: RunProperties;
};

/**
 * Run properties domain type
 */
export type RunProperties = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: string;
  readonly strike?: string;
  readonly caps?: string;
  readonly baseline?: number;
  readonly spacing?: Pixels;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fill?: SolidFill;
  readonly textOutline?: BaseLine;
  readonly effects?: Effects;
  readonly hyperlink?: Hyperlink;
};

/**
 * Hyperlink domain type
 */
export type Hyperlink = {
  readonly id: string;
  readonly tooltip?: string;
};

// =============================================================================
// Mapping Constants
// =============================================================================

/**
 * Map underline style to OOXML values
 */
const UNDERLINE_MAP: Record<string, string> = {
  none: "none",
  single: "sng",
  double: "dbl",
  heavy: "heavy",
  dotted: "dotted",
  dashed: "dash",
  wavy: "wavy",
};

/**
 * Map strikethrough style to OOXML values
 */
const STRIKE_MAP: Record<string, string> = {
  none: "noStrike",
  single: "sngStrike",
  double: "dblStrike",
};

/**
 * Map vertical position to baseline percentage
 */
const VERTICAL_POSITION_MAP: Record<string, number> = {
  normal: 0,
  superscript: 30,
  subscript: -25,
};

// =============================================================================
// Hyperlink Info Type
// =============================================================================

/**
 * Hyperlink info collected during text building
 */
export type HyperlinkInfo = {
  readonly url: string;
  readonly tooltip?: string;
};

// =============================================================================
// Builder Functions
// =============================================================================

/**
 * Build hyperlink domain object from spec using placeholder ID
 */
function buildHyperlink(spec: HyperlinkSpec): Hyperlink {
  return {
    id: spec.url, // Placeholder - URL stored here, will be replaced with rId
    tooltip: spec.tooltip,
  };
}

/**
 * Build run properties from spec
 */
function buildRunProperties(spec: TextRunSpec): RunProperties | undefined {
  const underline =
    spec.underline && spec.underline !== "none" ? (UNDERLINE_MAP[spec.underline] ?? spec.underline) : undefined;
  const strike = spec.strikethrough && spec.strikethrough !== "noStrike" ? STRIKE_MAP[spec.strikethrough] : undefined;
  const caps = spec.caps && spec.caps !== "none" ? spec.caps : undefined;
  const baseline =
    spec.verticalPosition && spec.verticalPosition !== "normal"
      ? VERTICAL_POSITION_MAP[spec.verticalPosition]
      : undefined;

  const properties: RunProperties = {
    ...(spec.bold !== undefined && { bold: spec.bold }),
    ...(spec.italic !== undefined && { italic: spec.italic }),
    ...(underline !== undefined && { underline }),
    ...(strike !== undefined && { strike }),
    ...(caps !== undefined && { caps }),
    ...(baseline !== undefined && { baseline }),
    ...(spec.letterSpacing !== undefined && { spacing: px(spec.letterSpacing) }),
    ...(spec.fontSize !== undefined && { fontSize: spec.fontSize }),
    ...(spec.fontFamily !== undefined && { fontFamily: spec.fontFamily }),
    ...(spec.color !== undefined && { fill: buildSolidFill(spec.color) }),
    ...(spec.outline !== undefined && { textOutline: buildLine(spec.outline.color, spec.outline.width ?? 1) }),
    ...(spec.effects !== undefined && { effects: buildEffects(spec.effects) }),
    ...(spec.hyperlink !== undefined && { hyperlink: buildHyperlink(spec.hyperlink) }),
  };

  return Object.keys(properties).length > 0 ? properties : undefined;
}

/**
 * Build a text run from spec
 */
export function buildTextRun(spec: TextRunSpec): TextRun {
  const properties = buildRunProperties(spec);
  return {
    type: "text",
    text: spec.text,
    properties,
  };
}

/**
 * Build bullet style from spec
 */
function buildBulletStyle(spec: TextParagraphSpec["bullet"]): BulletStyle | undefined {
  if (spec === undefined || spec.type === "none") return undefined;
  if (spec.type === "char") {
    return {
      bullet: { type: "char", char: spec.char ?? "•" },
      colorFollowText: true,
      sizeFollowText: true,
      fontFollowText: true,
    };
  }
  if (spec.type === "autoNum") {
    return {
      bullet: { type: "auto", scheme: spec.autoNumType ?? "arabicPeriod" },
      colorFollowText: true,
      sizeFollowText: true,
      fontFollowText: true,
    };
  }
  return undefined;
}

/**
 * Build line spacing from spec.
 * Percent values are stored as thousandths (150% → 150000).
 * Point values are stored in actual points (the serializer converts to centipoints).
 */
function buildLineSpacing(spec: TextParagraphSpec["lineSpacing"]): LineSpacing | undefined {
  if (spec === undefined) return undefined;
  return spec.type === "percent"
    ? { type: "percent", value: spec.value * 1000 }
    : { type: "points", value: spec.value };
}

/**
 * Build a paragraph from spec
 */
export function buildParagraph(spec: TextParagraphSpec): Paragraph {
  const runs = spec.runs.map(buildTextRun);
  const bulletStyle = buildBulletStyle(spec.bullet);
  const lineSpacing = buildLineSpacing(spec.lineSpacing);

  const properties: ParagraphProperties = {
    ...(spec.level !== undefined && { level: spec.level }),
    ...(spec.alignment !== undefined && { alignment: spec.alignment }),
    ...(bulletStyle !== undefined && { bulletStyle }),
    ...(lineSpacing !== undefined && { lineSpacing }),
    ...(spec.spaceBefore !== undefined && { spaceBefore: { type: "points" as const, value: spec.spaceBefore } }),
    ...(spec.spaceAfter !== undefined && { spaceAfter: { type: "points" as const, value: spec.spaceAfter } }),
    ...(spec.indent !== undefined && { indent: px(spec.indent) }),
    ...(spec.marginLeft !== undefined && { marginLeft: px(spec.marginLeft) }),
  };

  return { properties, runs };
}

/**
 * Check if text spec is rich text (array of paragraphs)
 */
function isRichText(text: TextSpec): text is RichTextSpec {
  return Array.isArray(text);
}

/**
 * Build body properties from spec
 */
function buildBodyProperties(spec?: TextBodyPropertiesSpec): BodyProperties {
  if (!spec) return {};

  const hasInsets =
    spec.insetLeft !== undefined ||
    spec.insetTop !== undefined ||
    spec.insetRight !== undefined ||
    spec.insetBottom !== undefined;

  return {
    ...(spec.anchor !== undefined && { anchor: spec.anchor }),
    ...(spec.verticalType !== undefined && { verticalType: spec.verticalType }),
    ...(spec.wrapping !== undefined && { wrapping: spec.wrapping }),
    ...(spec.anchorCenter !== undefined && { anchorCenter: spec.anchorCenter }),
    ...(hasInsets && {
      insets: {
        left: px(spec.insetLeft ?? 0),
        top: px(spec.insetTop ?? 0),
        right: px(spec.insetRight ?? 0),
        bottom: px(spec.insetBottom ?? 0),
      },
    }),
  };
}

/**
 * Build a text body object from simple string or rich text spec
 */
export function buildTextBody(text: TextSpec, bodyPropertiesSpec?: TextBodyPropertiesSpec): TextBody {
  const bodyProperties = buildBodyProperties(bodyPropertiesSpec);

  if (isRichText(text)) {
    return {
      bodyProperties,
      paragraphs: text.map(buildParagraph),
    };
  }

  // Simple string - single paragraph with single run
  return {
    bodyProperties,
    paragraphs: [{ properties: {}, runs: [{ type: "text", text }] }],
  };
}

/**
 * Collect all hyperlink URLs from a TextSpec
 */
export function collectHyperlinks(text: TextSpec): HyperlinkInfo[] {
  const hyperlinks: HyperlinkInfo[] = [];

  if (!isRichText(text)) {
    return hyperlinks;
  }

  for (const paragraph of text) {
    for (const run of paragraph.runs) {
      if (run.hyperlink) {
        hyperlinks.push({
          url: run.hyperlink.url,
          tooltip: run.hyperlink.tooltip,
        });
      }
    }
  }

  return hyperlinks;
}
