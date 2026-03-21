/**
 * @file Color and fill domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

import type { Brand } from "@aurochs-office/drawing-ml/domain/units";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";

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
 * Default ECMA-376 color mapping.
 *
 * Maps abstract color roles (bg1, tx1, etc.) to their conventional
 * scheme color targets. This is the standard mapping used by Office
 * when no explicit p:clrMap is specified.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.6 (p:clrMap)
 */
export const DEFAULT_COLOR_MAPPING: ColorMapping = {
  bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2",
  accent1: "accent1", accent2: "accent2", accent3: "accent3",
  accent4: "accent4", accent5: "accent5", accent6: "accent6",
  hlink: "hlink", folHlink: "folHlink",
};

/**
 * Color map override
 * @see ECMA-376 Part 1, Section 19.3.1.6 (clrMapOvr)
 */
export type ColorMapOverride =
  | { readonly type: "none" }
  | { readonly type: "override"; readonly mappings: ColorMapping };
