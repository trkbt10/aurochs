/**
 * @file Solid color paint builder
 */

import type { Color, Paint } from "../types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

/** Solid paint builder instance */
export type SolidPaintBuilder = {
  opacity: (value: number) => SolidPaintBuilder;
  visible: (value: boolean) => SolidPaintBuilder;
  blendMode: (mode: BlendMode) => SolidPaintBuilder;
  build: () => Paint;
};

/** Create a solid paint builder with given color */
function createSolidPaintBuilder(color: Color): SolidPaintBuilder {
  const state = {
    color,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL" as BlendMode,
  };

  const builder: SolidPaintBuilder = {
    opacity(value: number) {
      state.opacity = Math.max(0, Math.min(1, value));
      return builder;
    },

    visible(value: boolean) {
      state.visible = value;
      return builder;
    },

    blendMode(mode: BlendMode) {
      state.blendMode = mode;
      return builder;
    },

    build(): Paint {
      return {
        type: { value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" },
        color: state.color,
        opacity: state.opacity,
        visible: state.visible,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
      };
    },
  };

  return builder;
}

/**
 * Create a solid color paint
 */
export function solidPaint(color: Color): SolidPaintBuilder {
  return createSolidPaintBuilder(color);
}

/**
 * Create a solid color paint from hex string
 */
export function solidPaintHex(hex: string): SolidPaintBuilder {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return createSolidPaintBuilder({ r: 0, g: 0, b: 0, a: 1 });
  }
  return createSolidPaintBuilder({
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: 1,
  });
}
