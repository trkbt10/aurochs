/**
 * @file Color and fill domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type { Brand, Degrees, Percent, Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { BlipCompression, TileFlipMode } from "@aurochs-office/ooxml/domain/drawing";
import type { RectAlignment, ResourceId } from "../types";

// =============================================================================
// OOXML types - DO NOT RE-EXPORT
// =============================================================================
// Color types: import directly from "@/ooxml/domain/color"
// Fill types: import directly from "@/ooxml/domain/fill"
// =============================================================================

// Import OOXML types for internal use in this file only
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { NoFill, SolidFill, GradientFill, PatternFill, GroupFill } from "@aurochs-office/drawing-ml/domain/fill";

// =============================================================================
// PPTX-specific Color Types
// =============================================================================

/**
 * Resolved color value (hex without #) - branded type
 * All color types are resolved to this during parsing
 *
 * @example
 * const color = "FF0000" as ResolvedColor; // Red
 */
export type ResolvedColor = Brand<string, "ResolvedColor">;

/**
 * Create a ResolvedColor from a hex string.
 */
export const color = (value: string): ResolvedColor => value as ResolvedColor;

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
 * Picture/Blip fill
 * @see ECMA-376 Part 1, Section 20.1.8.14 (blipFill)
 */
export type BlipFill = {
  readonly type: "blipFill";
  /**
   * Resource ID (relationship ID, e.g., "rId2") or pre-resolved data URL.
   * When resolved at parse time, resolvedResource will also be populated.
   */
  readonly resourceId: ResourceId;
  /**
   * Whether the underlying relationship was referenced via r:embed or r:link.
   *
   * Note: When resourceId is a data URL, this value is not semantically meaningful
   * for OOXML export and is typically set to "embed".
   */
  readonly relationshipType: "embed" | "link";
  readonly compressionState?: BlipCompression;
  /**
   * DPI for rendering the blip.
   * @see ECMA-376 Part 1, Section 20.1.8.14 (dpi attribute)
   */
  readonly dpi?: number;
  /**
   * Effects applied to the blip image (color transforms).
   * @see ECMA-376 Part 1, Section 20.1.8.13 (CT_Blip)
   */
  readonly blipEffects?: BlipEffects;
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

// =============================================================================
// PPTX-specific Fill Union (includes BlipFill)
// =============================================================================

/**
 * Union of all fill types for PPTX
 * Extends OOXML BaseFill with PPTX-specific BlipFill
 */
export type Fill = NoFill | SolidFill | GradientFill | BlipFill | PatternFill | GroupFill;

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

// =============================================================================
// Color Mapping Types
// =============================================================================

/**
 * Color mapping scheme
 * @see ECMA-376 Part 1, Section 20.1.6.3 (clrMap)
 */
export type ColorMapping = {
  readonly bg1?: string;
  readonly tx1?: string;
  readonly bg2?: string;
  readonly tx2?: string;
  readonly accent1?: string;
  readonly accent2?: string;
  readonly accent3?: string;
  readonly accent4?: string;
  readonly accent5?: string;
  readonly accent6?: string;
  readonly hlink?: string;
  readonly folHlink?: string;
};

/**
 * Color map override
 * @see ECMA-376 Part 1, Section 19.3.1.6 (clrMapOvr)
 */
export type ColorMapOverride =
  | { readonly type: "none" }
  | { readonly type: "override"; readonly mappings: ColorMapping };
