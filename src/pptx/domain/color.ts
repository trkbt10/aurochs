/**
 * @file Color and fill domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type {
  BlipCompression,
  Brand,
  Degrees,
  Percent,
  Pixels,
  RectAlignment,
  ResourceId,
  SchemeColorValue,
} from "./types";

// =============================================================================
// Color Types
// =============================================================================

/**
 * Resolved color value (hex without #) - branded type
 * All color types are resolved to this during parsing
 *
 * @example
 * const color = "FF0000" as ResolvedColor; // Red
 */
export type ResolvedColor = Brand<string, 'ResolvedColor'>;

/**
 * Create a ResolvedColor from a hex string.
 */
export const color = (value: string): ResolvedColor => value as ResolvedColor;

/**
 * sRGB color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.32 (srgbClr)
 */
export type SrgbColor = {
  readonly type: "srgb";
  readonly value: string; // 6-digit hex (e.g., "FF0000")
};

/**
 * Scheme color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.29 (schemeClr)
 */
export type SchemeColor = {
  readonly type: "scheme";
  readonly value: SchemeColorValue;
};

/**
 * System color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.33 (sysClr)
 */
export type SystemColor = {
  readonly type: "system";
  readonly value: string; // e.g., "windowText", "window"
  readonly lastColor?: string; // Cached color value
};

/**
 * Preset color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.22 (prstClr)
 */
export type PresetColor = {
  readonly type: "preset";
  readonly value: string; // e.g., "red", "blue", "green"
};

/**
 * HSL color specification
 * @see ECMA-376 Part 1, Section 20.1.2.3.13 (hslClr)
 */
export type HslColor = {
  readonly type: "hsl";
  readonly hue: Degrees;
  readonly saturation: Percent;
  readonly luminance: Percent;
};

/**
 * Color transform modifications
 * @see ECMA-376 Part 1, Section 20.1.2.3 (color transforms)
 */
export type ColorTransform = {
  readonly alpha?: Percent;
  readonly alphaMod?: Percent;
  readonly alphaOff?: Percent;
  readonly hue?: Degrees;
  readonly hueMod?: Percent;
  readonly hueOff?: Degrees;
  readonly sat?: Percent;
  readonly satMod?: Percent;
  readonly satOff?: Percent;
  readonly lum?: Percent;
  readonly lumMod?: Percent;
  readonly lumOff?: Percent;
  readonly gamma?: boolean;
  readonly invGamma?: boolean;
  readonly blueMod?: Percent;
  readonly blueOff?: Percent;
  readonly green?: Percent;
  readonly greenMod?: Percent;
  readonly greenOff?: Percent;
  readonly redMod?: Percent;
  readonly redOff?: Percent;
  readonly shade?: Percent;
  readonly tint?: Percent;
  readonly comp?: boolean; // Complement
  readonly inv?: boolean; // Inverse
  readonly gray?: boolean; // Grayscale
};

/**
 * Union of all color specifications
 */
export type ColorSpec =
  | SrgbColor
  | SchemeColor
  | SystemColor
  | PresetColor
  | HslColor;

/**
 * Color with optional transforms
 */
export type Color = {
  readonly spec: ColorSpec;
  readonly transform?: ColorTransform;
};

// =============================================================================
// Fill Types
// =============================================================================

/**
 * No fill
 * @see ECMA-376 Part 1, Section 20.1.8.44 (noFill)
 */
export type NoFill = {
  readonly type: "noFill";
};

/**
 * Solid fill
 * @see ECMA-376 Part 1, Section 20.1.8.54 (solidFill)
 */
export type SolidFill = {
  readonly type: "solidFill";
  readonly color: Color;
};

/**
 * Gradient stop
 * @see ECMA-376 Part 1, Section 20.1.8.36 (gs)
 */
export type GradientStop = {
  readonly position: Percent;
  readonly color: Color;
};

/**
 * Linear gradient properties
 * @see ECMA-376 Part 1, Section 20.1.8.41 (lin)
 */
export type LinearGradient = {
  readonly angle: Degrees;
  readonly scaled: boolean;
};

/**
 * Path gradient properties
 * @see ECMA-376 Part 1, Section 20.1.8.46 (path)
 */
export type PathGradient = {
  readonly path: "circle" | "rect" | "shape";
  readonly fillToRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
};

/**
 * Gradient fill
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 */
export type GradientFill = {
  readonly type: "gradientFill";
  readonly stops: readonly GradientStop[];
  readonly linear?: LinearGradient;
  readonly path?: PathGradient;
  readonly tileRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
  readonly rotWithShape: boolean;
};

/**
 * Tile mode for picture fills
 * @see ECMA-376 Part 1, Section 20.1.10.66 (ST_TileFlipMode)
 */
export type TileFlipMode = "none" | "x" | "y" | "xy";

/**
 * Stretch fill mode
 * @see ECMA-376 Part 1, Section 20.1.8.56 (stretch)
 */
export type StretchFill = {
  readonly fillRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
};

/**
 * Tile fill mode
 * @see ECMA-376 Part 1, Section 20.1.8.58 (tile)
 */
export type TileFill = {
  readonly tx: Pixels;
  readonly ty: Pixels;
  readonly sx: Percent;
  readonly sy: Percent;
  readonly flip: TileFlipMode;
  readonly alignment: RectAlignment;
};

/**
 * Picture/Blip fill
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type BlipFill = {
  readonly type: "blipFill";
  readonly resourceId: ResourceId;
  readonly compressionState?: BlipCompression;
  readonly stretch?: StretchFill;
  readonly tile?: TileFill;
  readonly sourceRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
  readonly rotWithShape: boolean;
};

/**
 * Pattern preset values
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
export const PATTERN_PRESETS = [
  "pct5", "pct10", "pct20", "pct25", "pct30", "pct40", "pct50",
  "pct60", "pct70", "pct75", "pct80", "pct90",
  "horz", "vert", "ltHorz", "ltVert", "dkHorz", "dkVert",
  "narHorz", "narVert", "dashHorz", "dashVert", "cross",
  "dnDiag", "upDiag", "ltDnDiag", "ltUpDiag", "dkDnDiag", "dkUpDiag",
  "wdDnDiag", "wdUpDiag", "dashDnDiag", "dashUpDiag", "diagCross",
  "smCheck", "lgCheck", "smGrid", "lgGrid", "dotGrid",
  "smConfetti", "lgConfetti", "horzBrick", "diagBrick",
  "solidDmnd", "openDmnd", "dotDmnd", "plaid", "sphere",
  "weave", "divot", "shingle", "wave", "trellis", "zigZag",
] as const;

/**
 * Pattern fill type
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
export type PatternType = typeof PATTERN_PRESETS[number];

/**
 * Pattern fill
 * @see ECMA-376 Part 1, Section 20.1.8.47 (pattFill)
 */
export type PatternFill = {
  readonly type: "patternFill";
  readonly preset: PatternType;
  readonly foregroundColor: Color;
  readonly backgroundColor: Color;
};

/**
 * Group fill (inherit from group)
 * @see ECMA-376 Part 1, Section 20.1.8.35 (grpFill)
 */
export type GroupFill = {
  readonly type: "groupFill";
};

/**
 * Union of all fill types
 */
export type Fill =
  | NoFill
  | SolidFill
  | GradientFill
  | BlipFill
  | PatternFill
  | GroupFill;

// =============================================================================
// Line (Stroke) Types
// =============================================================================

/**
 * Line end specification
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd/tailEnd)
 */
export type LineEnd = {
  readonly type: "none" | "triangle" | "stealth" | "diamond" | "oval" | "arrow";
  readonly width: "sm" | "med" | "lg";
  readonly length: "sm" | "med" | "lg";
};

/**
 * Custom dash specification
 * @see ECMA-376 Part 1, Section 20.1.8.21 (custDash)
 */
export type CustomDash = {
  readonly dashes: readonly {
    readonly dashLength: Percent;
    readonly spaceLength: Percent;
  }[];
};

/**
 * Line properties
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */
export type Line = {
  readonly width: Pixels;
  readonly cap: "flat" | "round" | "square";
  readonly compound: "sng" | "dbl" | "thickThin" | "thinThick" | "tri";
  readonly alignment: "ctr" | "in";
  readonly fill: Fill;
  readonly dash: string | CustomDash; // Preset name or custom
  readonly headEnd?: LineEnd;
  readonly tailEnd?: LineEnd;
  readonly join: "bevel" | "miter" | "round";
  readonly miterLimit?: number;
};
