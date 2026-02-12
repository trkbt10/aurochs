/**
 * @file Color and fill domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type { Brand } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Re-export fill types from drawing-ml
// =============================================================================

export type {
  NoFill,
  SolidFill,
  GradientFill,
  PatternFill,
  GroupFill,
  BlipFill,
  BlipEffects,
  StretchFill,
  TileFill,
  RectAlignment,
  TileFlipMode,
  BaseFill,
} from "@aurochs-office/drawing-ml/domain/fill";

// Import for use in this file
import type { BaseFill, BaseLine } from "@aurochs-office/drawing-ml";

// =============================================================================
// Re-export line types from drawing-ml
// =============================================================================

export type {
  LineEnd,
  CustomDash,
  LineCap,
  CompoundLine,
  LineJoin,
  BaseLine,
} from "@aurochs-office/drawing-ml/domain/line";

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

// =============================================================================
// PPTX Fill and Line Unions (same as Base types)
// =============================================================================

/**
 * Union of all fill types for PPTX
 * Uses BaseFill from drawing-ml directly
 */
export type Fill = BaseFill;

/**
 * Line properties for PPTX
 * Uses BaseLine from drawing-ml directly
 */
export type Line = BaseLine;

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
