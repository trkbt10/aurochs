/**
 * @file Drop shadow effect builder
 */

import type { Color } from "../types";
import type { ShadowEffectData } from "./types";
import {
  EFFECT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

/** Drop shadow builder instance */
export type DropShadowBuilder = {
  color: (colorOrRgba: Color | { r: number; g?: number; b?: number; a?: number }) => DropShadowBuilder;
  offset: (x: number, y: number) => DropShadowBuilder;
  blur: (radius: number) => DropShadowBuilder;
  spread: (radius: number) => DropShadowBuilder;
  visible: (v: boolean) => DropShadowBuilder;
  blendMode: (mode: BlendMode) => DropShadowBuilder;
  showBehindNode: (show?: boolean) => DropShadowBuilder;
  build: () => ShadowEffectData;
};

/** Create a drop shadow builder */
function createDropShadowBuilder(): DropShadowBuilder {
  const state = {
    color: { r: 0, g: 0, b: 0, a: 0.25 } as Color,
    offsetX: 0,
    offsetY: 4,
    radius: 4,
    spread: 0,
    visible: true,
    blendMode: "NORMAL" as BlendMode,
    showBehindNode: false,
  };

  const builder: DropShadowBuilder = {
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

    /** Set spread radius (expansion/contraction) */
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

    /** Show shadow behind transparent areas of the node */
    showBehindNode(show: boolean = true) {
      state.showBehindNode = show;
      return builder;
    },

    build(): ShadowEffectData {
      return {
        type: { value: EFFECT_TYPE_VALUES.DROP_SHADOW, name: "DROP_SHADOW" },
        visible: state.visible,
        color: state.color,
        offset: { x: state.offsetX, y: state.offsetY },
        radius: state.radius,
        spread: state.spread !== 0 ? state.spread : undefined,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
        showShadowBehindNode: state.showBehindNode || undefined,
      };
    },
  };

  return builder;
}

/**
 * Create a drop shadow effect
 */
export function dropShadow(): DropShadowBuilder {
  return createDropShadowBuilder();
}
