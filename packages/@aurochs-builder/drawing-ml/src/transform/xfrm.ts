/**
 * @file Transform builder for DrawingML
 *
 * Builds transform (position, size, rotation) structures.
 */

import type { Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";

/**
 * Transform domain type
 */
export type Transform2D = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
  readonly rotation: Degrees;
  readonly flipH: boolean;
  readonly flipV: boolean;
};

/**
 * Transform specification
 */
export type TransformSpec = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
};

/**
 * Build a transform object from spec
 */
export function buildTransform(spec: TransformSpec): Transform2D {
  return {
    x: spec.x as Pixels,
    y: spec.y as Pixels,
    width: spec.width as Pixels,
    height: spec.height as Pixels,
    rotation: (spec.rotation ?? 0) as Degrees,
    flipH: spec.flipH ?? false,
    flipV: spec.flipV ?? false,
  };
}

/**
 * Group transform domain type (includes child offset/extent)
 */
export type GroupTransform = Transform2D & {
  readonly childOffsetX: Pixels;
  readonly childOffsetY: Pixels;
  readonly childExtentWidth: Pixels;
  readonly childExtentHeight: Pixels;
};

/**
 * Group transform specification
 */
export type GroupTransformSpec = TransformSpec & {
  readonly childOffsetX?: number;
  readonly childOffsetY?: number;
  readonly childExtentWidth?: number;
  readonly childExtentHeight?: number;
};

/**
 * Build a group transform object from spec
 */
export function buildGroupTransform(spec: GroupTransformSpec): GroupTransform {
  return {
    ...buildTransform(spec),
    childOffsetX: (spec.childOffsetX ?? 0) as Pixels,
    childOffsetY: (spec.childOffsetY ?? 0) as Pixels,
    childExtentWidth: (spec.childExtentWidth ?? spec.width) as Pixels,
    childExtentHeight: (spec.childExtentHeight ?? spec.height) as Pixels,
  };
}
