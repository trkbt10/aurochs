/**
 * @file Common DrawingML Fill Types
 *
 * These types represent DrawingML fill concepts that are shared across
 * Office Open XML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type { Color } from "./color";
import type { Degrees, Percent, Pixels } from "./units";

// =============================================================================
// Basic Fill Types
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
 * Group fill (inherit from group)
 * @see ECMA-376 Part 1, Section 20.1.8.35 (grpFill)
 */
export type GroupFill = {
  readonly type: "groupFill";
};

// =============================================================================
// Gradient Fill Types
// =============================================================================

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

// =============================================================================
// Pattern Fill Types
// =============================================================================

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

// =============================================================================
// Blip Fill Types
// =============================================================================

/** Rectangle alignment values */
export type RectAlignment = "tl" | "t" | "tr" | "l" | "ctr" | "r" | "bl" | "b" | "br";

/** Tile flip mode values */
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
 * Blip effects (color transform effects applied to the blip image)
 * These are child elements of a:blip that modify the image appearance.
 * @see ECMA-376 Part 1, Section 20.1.8.13 (CT_Blip)
 */
export type BlipEffects = {
  readonly alphaBiLevel?: { readonly threshold: Percent };
  readonly alphaCeiling?: boolean;
  readonly alphaFloor?: boolean;
  readonly alphaInv?: boolean;
  readonly alphaMod?: boolean;
  readonly alphaModFix?: { readonly amount: Percent };
  readonly alphaRepl?: { readonly alpha: Percent };
  readonly biLevel?: { readonly threshold: Percent };
  readonly blur?: { readonly radius: Pixels; readonly grow: boolean };
  readonly colorChange?: { readonly from: Color; readonly to: Color; readonly useAlpha: boolean };
  readonly colorReplace?: { readonly color: Color };
  readonly duotone?: { readonly colors: readonly [Color, Color] };
  readonly grayscale?: boolean;
  readonly hsl?: { readonly hue: Degrees; readonly saturation: Percent; readonly luminance: Percent };
  readonly luminance?: { readonly brightness: Percent; readonly contrast: Percent };
  readonly tint?: { readonly hue: Degrees; readonly amount: Percent };
};

/**
 * Blip fill for image-based fills
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type BlipFill = {
  readonly type: "blipFill";
  /** Relationship ID for the image resource */
  readonly resourceId: string;
  /**
   * Whether the underlying relationship was referenced via r:embed or r:link.
   * Optional for format-agnostic contexts (e.g., chart-editor).
   */
  readonly relationshipType?: "embed" | "link";
  /** Compression state */
  readonly compressionState?: "none" | "print" | "screen" | "email" | "hqprint";
  /** DPI for the image */
  readonly dpi?: number;
  /**
   * Effects applied to the blip image (color transforms).
   * @see ECMA-376 Part 1, Section 20.1.8.13 (CT_Blip)
   */
  readonly blipEffects?: BlipEffects;
  /** Stretch fill mode */
  readonly stretch?: StretchFill;
  /** Tile fill mode */
  readonly tile?: TileFill;
  /** Source rectangle for cropping (percentages) */
  readonly sourceRect?: {
    readonly left: Percent;
    readonly top: Percent;
    readonly right: Percent;
    readonly bottom: Percent;
  };
  /** Whether to rotate with shape */
  readonly rotWithShape?: boolean;
};

// =============================================================================
// Base Fill Union
// =============================================================================

/**
 * Union of basic fill types shared across OOXML formats.
 */
export type BaseFill =
  | NoFill
  | SolidFill
  | GradientFill
  | PatternFill
  | GroupFill
  | BlipFill;
