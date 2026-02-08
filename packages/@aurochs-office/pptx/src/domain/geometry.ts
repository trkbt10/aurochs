/**
 * @file Geometry domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.7 - Transform
 */

import type { Degrees, Pixels } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Geometry Types
// =============================================================================

/**
 * 2D point
 */
export type Point = {
  readonly x: Pixels;
  readonly y: Pixels;
};

/**
 * 2D size
 */
export type Size = {
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * Bounding box (position + size)
 */
export type Bounds = Point & Size;

/**
 * Effect extent (object extents including effects)
 * @see ECMA-376 Part 1, Section 20.4.2.6 (effectExtent)
 */
export type EffectExtent = {
  readonly left: Pixels;
  readonly top: Pixels;
  readonly right: Pixels;
  readonly bottom: Pixels;
};

/**
 * Transform properties for shapes
 * @see ECMA-376 Part 1, Section 20.1.7.6 (xfrm)
 */
export type Transform = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
  readonly rotation: Degrees;
  readonly flipH: boolean;
  readonly flipV: boolean;
};

/**
 * Group transform for nested positioning
 * @see ECMA-376 Part 1, Section 20.1.7.5 (chOff, chExt)
 */
export type GroupTransform = Transform & {
  readonly childOffsetX: Pixels;
  readonly childOffsetY: Pixels;
  readonly childExtentWidth: Pixels;
  readonly childExtentHeight: Pixels;
};
