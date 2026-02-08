/**
 * @file Common DrawingML effect types
 *
 * DrawingML effect types intended for sharing across OOXML formats.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effect Properties)
 */

import type { Color } from "./color";
import type { Degrees, Percent, Pixels } from "./units";

export type ShadowEffect = {
  readonly type: "outer" | "inner";
  readonly color: Color;
  readonly blurRadius: Pixels;
  readonly distance: Pixels;
  readonly direction: Degrees;
  readonly scaleX?: Percent;
  readonly scaleY?: Percent;
  readonly skewX?: Degrees;
  readonly skewY?: Degrees;
  readonly alignment?: string;
  readonly rotateWithShape?: boolean;
};

export type GlowEffect = {
  readonly color: Color;
  readonly radius: Pixels;
};

export type ReflectionEffect = {
  readonly blurRadius: Pixels;
  readonly startOpacity: Percent;
  readonly startPosition: Percent;
  readonly endOpacity: Percent;
  readonly endPosition: Percent;
  readonly distance: Pixels;
  readonly direction: Degrees;
  readonly fadeDirection: Degrees;
  readonly scaleX: Percent;
  readonly scaleY: Percent;
  readonly skewX?: Degrees;
  readonly skewY?: Degrees;
  readonly alignment?: string;
  readonly rotateWithShape?: boolean;
};

export type SoftEdgeEffect = {
  readonly radius: Pixels;
};

export type Effects = {
  readonly shadow?: ShadowEffect;
  readonly glow?: GlowEffect;
  readonly reflection?: ReflectionEffect;
  readonly softEdge?: SoftEdgeEffect;
};
