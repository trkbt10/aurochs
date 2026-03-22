/**
 * @file Inner shadow effect builder
 */

import type { Color } from "../types";
import type { ShadowEffectData } from "./types";
import {
  EFFECT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

/** Inner shadow builder instance */
export type InnerShadowBuilder = {
  color: (colorOrRgba: Color | { r: number; g?: number; b?: number; a?: number }) => InnerShadowBuilder;
  offset: (x: number, y: number) => InnerShadowBuilder;
  blur: (radius: number) => InnerShadowBuilder;
  spread: (radius: number) => InnerShadowBuilder;
  visible: (v: boolean) => InnerShadowBuilder;
  blendMode: (mode: BlendMode) => InnerShadowBuilder;
  build: () => ShadowEffectData;
};

/** Create an inner shadow builder */
function createInnerShadowBuilder(): InnerShadowBuilder {
  const state = {
    color: { r: 0, g: 0, b: 0, a: 0.25 } as Color,
    offsetX: 0,
    offsetY: 2,
    radius: 4,
    spread: 0,
    visible: true,
    blendMode: "NORMAL" as BlendMode,
  };

  const builder: InnerShadowBuilder = {
    /** Set shadow color (RGBA, 0-1) */
    color(colorOrRgba: Color | { r: number; g?: number; b?: number; a?: number }) {
      state.color = {
        r: colorOrRgba.r,
        g: colorOrRgba.g ?? 0,
        b: colorOrRgba.b ?? 0,
        a: colorOrRgba.a ?? 1,
      };
      return builder;
    },

    /** Set shadow offset */
    offset(x: number, y: number) {
      state.offsetX = x;
      state.offsetY = y;
      return builder;
    },

    /** Set blur radius */
    blur(radius: number) {
      state.radius = Math.max(0, radius);
      return builder;
    },

    /** Set spread radius */
    spread(radius: number) {
      state.spread = radius;
      return builder;
    },

    /** Set visibility */
    visible(v: boolean) {
      state.visible = v;
      return builder;
    },

    /** Set blend mode */
    blendMode(mode: BlendMode) {
      state.blendMode = mode;
      return builder;
    },

    build(): ShadowEffectData {
      return {
        type: { value: EFFECT_TYPE_VALUES.INNER_SHADOW, name: "INNER_SHADOW" },
        visible: state.visible,
        color: state.color,
        offset: { x: state.offsetX, y: state.offsetY },
        radius: state.radius,
        spread: state.spread !== 0 ? state.spread : undefined,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
      };
    },
  };

  return builder;
}

/**
 * Create an inner shadow effect
 */
export function innerShadow(): InnerShadowBuilder {
  return createInnerShadowBuilder();
}
