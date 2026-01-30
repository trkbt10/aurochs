/**
 * @file Common utilities for building PPTX elements
 */

import type { SpShape } from "@oxen-office/pptx/domain/shape";
import type { Fill, Line } from "@oxen-office/pptx/domain/color/types";
import type { TextBody, Paragraph, TextRun, RunProperties } from "@oxen-office/pptx/domain/text";
import type { Effects } from "@oxen-office/pptx/domain/effects";
import type { GradientFill, PatternFill } from "@oxen-office/ooxml/domain/fill";
import type { Pixels, Percent, Degrees } from "@oxen-office/ooxml/domain/units";
import type {
  FillSpec,
  GradientFillSpec,
  PatternFillSpec,
  LineDashStyle,
  LineCapStyle,
  LineJoinStyle,
  LineCompoundStyle,
  LineEndSpec,
  TextSpec,
  TextRunSpec,
  TextParagraphSpec,
  RichTextSpec,
  EffectsSpec,
  Shape3dSpec,
  BevelSpec,
  TextBodyPropertiesSpec,
} from "./types";
import type { BodyProperties } from "@oxen-office/pptx/domain/text";
import type { Shape3d, Bevel3d } from "@oxen-office/pptx/domain/three-d";

/**
 * Generate a unique shape ID
 */
export function generateShapeId(existingIds: readonly string[]): string {
  const maxId = existingIds.reduce((max, id) => {
    const num = parseInt(id, 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return String(maxId + 1);
}

/**
 * Build a solid fill object
 */
export function buildSolidFill(hexColor: string): Fill {
  return {
    type: "solidFill",
    color: { spec: { type: "srgb", value: hexColor } },
  };
}

/**
 * Build a gradient fill object
 */
export function buildGradientFill(spec: GradientFillSpec): GradientFill {
  const stops = spec.stops.map((stop) => ({
    position: (stop.position * 1000) as Percent, // Convert 0-100 to 0-100000
    color: { spec: { type: "srgb" as const, value: stop.color } },
  }));

  if (spec.gradientType === "linear") {
    return {
      type: "gradientFill",
      stops,
      linear: {
        angle: (spec.angle ?? 0) as Degrees,
        scaled: false,
      },
      rotWithShape: true,
    };
  }
  if (spec.gradientType === "radial") {
    return {
      type: "gradientFill",
      stops,
      path: {
        path: "circle",
      },
      rotWithShape: true,
    };
  }
  // path type
  return {
    type: "gradientFill",
    stops,
    path: {
      path: "rect",
    },
    rotWithShape: true,
  };
}

/**
 * Build a pattern fill object
 */
export function buildPatternFill(spec: PatternFillSpec): PatternFill {
  return {
    type: "patternFill",
    preset: spec.preset,
    foregroundColor: { spec: { type: "srgb", value: spec.fgColor } },
    backgroundColor: { spec: { type: "srgb", value: spec.bgColor } },
  };
}

/**
 * Build a fill object from FillSpec
 */
export function buildFill(fillSpec: FillSpec): Fill | undefined {
  if (typeof fillSpec === "string") {
    return buildSolidFill(fillSpec);
  }
  switch (fillSpec.type) {
    case "solid":
      return buildSolidFill(fillSpec.color);
    case "gradient":
      return buildGradientFill(fillSpec);
    case "pattern":
      return buildPatternFill(fillSpec);
    default:
      return undefined;
  }
}

/**
 * Line end type mapping
 */
const LINE_END_TYPE_MAP: Record<string, string> = {
  none: "none",
  triangle: "triangle",
  stealth: "stealth",
  diamond: "diamond",
  oval: "oval",
  arrow: "arrow",
};

/**
 * Line end size mapping
 */
const LINE_END_SIZE_MAP: Record<string, string> = {
  sm: "sm",
  med: "med",
  lg: "lg",
};

/**
 * Build a line end object
 */
function buildLineEnd(spec: LineEndSpec): Line["headEnd"] {
  return {
    type: LINE_END_TYPE_MAP[spec.type] ?? "none",
    width: LINE_END_SIZE_MAP[spec.width ?? "med"] ?? "med",
    length: LINE_END_SIZE_MAP[spec.length ?? "med"] ?? "med",
  } as Line["headEnd"];
}

/**
 * Map compound style from user-friendly names to OOXML values
 */
const COMPOUND_MAP: Record<LineCompoundStyle, string> = {
  single: "sng",
  double: "dbl",
  thickThin: "thickThin",
  thinThick: "thinThick",
  triple: "tri",
};

/**
 * Build a line object with extended properties
 */
export function buildLine(
  lineColor: string,
  lineWidth: number,
  options?: {
    dash?: LineDashStyle;
    cap?: LineCapStyle;
    join?: LineJoinStyle;
    compound?: LineCompoundStyle;
    headEnd?: LineEndSpec;
    tailEnd?: LineEndSpec;
  },
): Line {
  const compound = options?.compound ? COMPOUND_MAP[options.compound] : "sng";
  return {
    width: lineWidth as Pixels,
    cap: (options?.cap ?? "flat") as Line["cap"],
    compound: compound as Line["compound"],
    alignment: "ctr",
    fill: { type: "solidFill", color: { spec: { type: "srgb", value: lineColor } } },
    dash: (options?.dash ?? "solid") as Line["dash"],
    join: (options?.join ?? "round") as Line["join"],
    headEnd: options?.headEnd ? buildLineEnd(options.headEnd) : undefined,
    tailEnd: options?.tailEnd ? buildLineEnd(options.tailEnd) : undefined,
  };
}

/**
 * Map underline style to OOXML values
 * Based on ECMA-376 Part 1: §21.1.2.3.40 ST_TextUnderlineType
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
 * Superscript: +30%, Subscript: -25%
 */
const VERTICAL_POSITION_MAP: Record<string, number> = {
  normal: 0,
  superscript: 30,
  subscript: -25,
};

/**
 * Build run properties from spec
 */
function buildRunProperties(spec: TextRunSpec): RunProperties | undefined {
  // Build run properties if any formatting is specified
  if (spec.bold !== undefined || spec.italic !== undefined || spec.underline !== undefined ||
      spec.strikethrough !== undefined || spec.caps !== undefined || spec.verticalPosition !== undefined ||
      spec.letterSpacing !== undefined || spec.fontSize !== undefined || spec.fontFamily !== undefined ||
      spec.color !== undefined || spec.outline !== undefined || spec.effects !== undefined) {
    const properties: RunProperties = {};

    if (spec.bold !== undefined) (properties as { bold?: boolean }).bold = spec.bold;
    if (spec.italic !== undefined) (properties as { italic?: boolean }).italic = spec.italic;
    if (spec.underline && spec.underline !== "none") {
      (properties as { underline?: string }).underline = UNDERLINE_MAP[spec.underline] ?? spec.underline;
    }
    if (spec.strikethrough && spec.strikethrough !== "none") {
      (properties as { strike?: string }).strike = STRIKE_MAP[spec.strikethrough];
    }
    if (spec.caps && spec.caps !== "none") {
      (properties as { caps?: string }).caps = spec.caps;
    }
    if (spec.verticalPosition && spec.verticalPosition !== "normal") {
      (properties as { baseline?: number }).baseline = VERTICAL_POSITION_MAP[spec.verticalPosition];
    }
    if (spec.letterSpacing !== undefined) {
      (properties as { spacing?: Pixels }).spacing = spec.letterSpacing as Pixels;
    }
    if (spec.fontSize !== undefined) (properties as { fontSize?: number }).fontSize = spec.fontSize;
    if (spec.fontFamily !== undefined) (properties as { fontFamily?: string }).fontFamily = spec.fontFamily;
    if (spec.color !== undefined) {
      (properties as { solidFill?: Fill }).solidFill = buildSolidFill(spec.color);
    }
    if (spec.outline !== undefined) {
      (properties as { textOutline?: Line }).textOutline = buildLine(spec.outline.color, spec.outline.width ?? 1);
    }
    if (spec.effects !== undefined) {
      (properties as { effects?: Effects }).effects = buildEffects(spec.effects);
    }

    return properties;
  }

  return undefined;
}

/**
 * Build a text run from spec
 */
function buildTextRun(spec: TextRunSpec): TextRun {
  const properties = buildRunProperties(spec);
  return {
    type: "text",
    text: spec.text,
    properties,
  };
}

/**
 * Build a paragraph from spec
 */
function buildParagraph(spec: TextParagraphSpec): Paragraph {
  const runs = spec.runs.map(buildTextRun);

  const properties: Paragraph["properties"] = {};

  if (spec.level !== undefined) (properties as { level?: number }).level = spec.level;
  if (spec.alignment !== undefined) {
    // Domain type uses full names, not OOXML short forms
    (properties as { alignment?: string }).alignment = spec.alignment;
  }
  if (spec.bullet !== undefined && spec.bullet.type !== "none") {
    if (spec.bullet.type === "char") {
      (properties as { bulletStyle?: object }).bulletStyle = {
        bullet: { type: "char", char: spec.bullet.char ?? "•" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
    } else if (spec.bullet.type === "autoNum") {
      (properties as { bulletStyle?: object }).bulletStyle = {
        bullet: { type: "auto", scheme: spec.bullet.autoNumType ?? "arabicPeriod" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
    }
  }

  // Paragraph spacing
  if (spec.lineSpacing !== undefined) {
    if (spec.lineSpacing.type === "percent") {
      // Percent is stored as percentage * 1000 (e.g., 150% = 150000)
      (properties as { lineSpacing?: object }).lineSpacing = {
        type: "percent",
        value: spec.lineSpacing.value * 1000,
      };
    } else {
      // Points stored as points * 100 (centipoints)
      (properties as { lineSpacing?: object }).lineSpacing = {
        type: "points",
        value: spec.lineSpacing.value * 100,
      };
    }
  }
  if (spec.spaceBefore !== undefined) {
    // Points stored as points * 100 (centipoints)
    (properties as { spaceBefore?: number }).spaceBefore = spec.spaceBefore * 100;
  }
  if (spec.spaceAfter !== undefined) {
    // Points stored as points * 100 (centipoints)
    (properties as { spaceAfter?: number }).spaceAfter = spec.spaceAfter * 100;
  }
  if (spec.indent !== undefined) {
    (properties as { indent?: Pixels }).indent = spec.indent as Pixels;
  }
  if (spec.marginLeft !== undefined) {
    (properties as { marginLeft?: Pixels }).marginLeft = spec.marginLeft as Pixels;
  }

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

  const props: BodyProperties = {};

  if (spec.anchor !== undefined) {
    (props as { anchor?: string }).anchor = spec.anchor;
  }
  if (spec.verticalType !== undefined) {
    (props as { verticalType?: string }).verticalType = spec.verticalType;
  }
  if (spec.wrapping !== undefined) {
    (props as { wrapping?: string }).wrapping = spec.wrapping;
  }
  if (spec.anchorCenter !== undefined) {
    (props as { anchorCenter?: boolean }).anchorCenter = spec.anchorCenter;
  }
  if (spec.insetLeft !== undefined || spec.insetTop !== undefined ||
      spec.insetRight !== undefined || spec.insetBottom !== undefined) {
    (props as { insets?: object }).insets = {
      left: (spec.insetLeft ?? 0) as Pixels,
      top: (spec.insetTop ?? 0) as Pixels,
      right: (spec.insetRight ?? 0) as Pixels,
      bottom: (spec.insetBottom ?? 0) as Pixels,
    };
  }

  return props;
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
 * Build effects object from spec
 */
export function buildEffects(spec: EffectsSpec): Effects {
  const effects: Effects = {};

  if (spec.shadow) {
    (effects as { shadow?: Effects["shadow"] }).shadow = {
      type: "outer",
      color: { spec: { type: "srgb", value: spec.shadow.color } },
      blurRadius: (spec.shadow.blur ?? 4) as Pixels,
      distance: (spec.shadow.distance ?? 3) as Pixels,
      direction: (spec.shadow.direction ?? 45) as Degrees,
    };
  }

  if (spec.glow) {
    (effects as { glow?: Effects["glow"] }).glow = {
      color: { spec: { type: "srgb", value: spec.glow.color } },
      radius: spec.glow.radius as Pixels,
    };
  }

  if (spec.softEdge) {
    (effects as { softEdge?: Effects["softEdge"] }).softEdge = {
      radius: spec.softEdge.radius as Pixels,
    };
  }

  return effects;
}

/**
 * Build 3D bevel from spec
 */
function buildBevel(spec: BevelSpec): Bevel3d {
  return {
    preset: spec.preset ?? "circle",
    width: (spec.width ?? 8) as Pixels,
    height: (spec.height ?? 8) as Pixels,
  };
}

/**
 * Build 3D shape properties from spec
 */
export function buildShape3d(spec: Shape3dSpec): Shape3d {
  const shape3d: Shape3d = {};

  if (spec.bevelTop) {
    (shape3d as { bevelTop?: Bevel3d }).bevelTop = buildBevel(spec.bevelTop);
  }

  if (spec.bevelBottom) {
    (shape3d as { bevelBottom?: Bevel3d }).bevelBottom = buildBevel(spec.bevelBottom);
  }

  if (spec.material) {
    (shape3d as { preset?: string }).preset = spec.material;
  }

  if (spec.extrusionHeight !== undefined) {
    (shape3d as { extrusionHeight?: Pixels }).extrusionHeight = spec.extrusionHeight as Pixels;
  }

  return shape3d;
}
