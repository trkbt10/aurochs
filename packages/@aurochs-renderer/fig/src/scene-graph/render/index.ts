/**
 * @file Scene graph render utilities — shared SoT for SVG attribute resolution
 *
 * This module is the SINGLE source of truth for converting SceneGraph types
 * to SVG rendering attributes. Both the SVG string renderer and the React
 * renderer MUST consume these functions. Duplicating conversion logic in
 * a renderer is a parity violation.
 *
 * ## Architecture
 *
 * ```
 * FigDesignNode / FigNode
 *       ↓
 * scene-graph/builder (or convert/)
 *       ↓
 * SceneGraph types (Fill, Stroke, Effect, PathContour, etc.)
 *       ↓
 * scene-graph/render/ ← THIS MODULE (SoT for attribute resolution)
 *       ↓
 * ResolvedFill, ResolvedStrokeAttrs, ResolvedFilter, etc.
 *       ↓
 * ┌─────────────────────┬─────────────────────┐
 * │ SVG string renderer │ React renderer      │
 * │ (format to strings) │ (format to JSX)     │
 * └─────────────────────┴─────────────────────┘
 * ```
 *
 * ## Adding a new Fill/Effect/Node type
 *
 * 1. Add the type to scene-graph/types.ts
 * 2. Handle it in the resolve function here (compile error if omitted)
 * 3. Both renderers automatically get it via the resolved types
 */

export { colorToHex, uint8ArrayToBase64 } from "./color";
export { matrixToSvgTransform } from "./transform";
export { contourToSvgD } from "./path";

export {
  resolveFill,
  resolveTopFill,
  type ResolvedFill,
  type ResolvedFillAttrs,
  type ResolvedFillDef,
  type ResolvedGradientStop,
  type ResolvedLinearGradient,
  type ResolvedRadialGradient,
  type ResolvedImagePattern,
  type IdGenerator,
} from "./fill";

export {
  resolveStroke,
  type ResolvedStrokeAttrs,
} from "./stroke";

export {
  resolveEffects,
  type ResolvedFilter,
  type ResolvedFilterPrimitive,
} from "./effects";
