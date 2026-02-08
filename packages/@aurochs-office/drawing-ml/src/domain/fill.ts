/**
 * @file Common DrawingML Fill Types
 *
 * These types represent DrawingML fill concepts that are shared across
 * Office Open XML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type { Color } from "./color";
import type { Degrees, Percent } from "./units";

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
// Base Fill Union (without BlipFill)
// =============================================================================

/**
 * Union of basic fill types shared across OOXML formats.
 * Does not include BlipFill as it requires format-specific resource handling.
 *
 * For PPTX-specific Fill type that includes BlipFill, use the Fill type from
 * src/pptx/domain/color/types.ts
 */
export type BaseFill =
  | NoFill
  | SolidFill
  | GradientFill
  | PatternFill
  | GroupFill;
