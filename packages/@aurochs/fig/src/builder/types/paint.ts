/**
 * @file Paint and Stroke type definitions
 *
 * Paint represents a Figma paint as encoded in the Kiwi schema.
 * All paint types (SOLID, GRADIENT_*, IMAGE) share the same message
 * type with optional fields for each variant.
 */

import type { Color } from "./color";

/**
 * ColorStop as encoded in the Kiwi Paint.stops field.
 * This is the wire format — not the Figma API's GradientStop.
 */
export type ColorStop = {
  readonly color: Color;
  readonly position: number;
};

/**
 * Paint — matches the Kiwi schema Paint message.
 *
 * SOLID paints use `color`.
 * GRADIENT_* paints use `stops` + `transform`.
 * IMAGE paints use `image`, `imageScaleMode`.
 */
export type Paint = {
  readonly type: { value: number; name: string };
  readonly color?: Color;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendMode: { value: number; name: string };
  /** Gradient color stops (Kiwi field: stops) */
  readonly stops?: readonly ColorStop[];
  /** Gradient 2x3 affine transform (Kiwi field: transform) */
  readonly transform?: {
    readonly m00: number;
    readonly m01: number;
    readonly m02: number;
    readonly m10: number;
    readonly m11: number;
    readonly m12: number;
  };
};

export type Stroke = {
  readonly type: { value: number; name: string };
  readonly color?: Color;
  readonly opacity: number;
  readonly visible: boolean;
  readonly blendMode: { value: number; name: string };
};
