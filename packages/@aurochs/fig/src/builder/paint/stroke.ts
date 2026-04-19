/**
 * @file Stroke builder
 */

import type { Color, Stroke } from "../types";
import type { StrokeData } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  STROKE_CAP_VALUES,
  STROKE_JOIN_VALUES,
  STROKE_ALIGN_VALUES,
  type BlendMode,
  type StrokeCap,
  type StrokeJoin,
  type StrokeAlign,
} from "../../constants";

/** Stroke builder instance */
export type StrokeBuilder = {
  color: (c: Color) => StrokeBuilder;
  weight: (w: number) => StrokeBuilder;
  cap: (c: StrokeCap) => StrokeBuilder;
  join: (j: StrokeJoin) => StrokeBuilder;
  align: (a: StrokeAlign) => StrokeBuilder;
  dash: (pattern: number[]) => StrokeBuilder;
  miterLimit: (limit: number) => StrokeBuilder;
  opacity: (value: number) => StrokeBuilder;
  visible: (value: boolean) => StrokeBuilder;
  blendMode: (mode: BlendMode) => StrokeBuilder;
  build: () => StrokeData;
};

type StrokeBuilderState = {
  color: Color;
  weight: number;
  cap: StrokeCap;
  join: StrokeJoin;
  align: StrokeAlign;
  dashPattern: number[] | undefined;
  miterLimit: number;
  opacity: number;
  visible: boolean;
  blendMode: BlendMode;
};

/** Create a stroke builder */
function createStrokeBuilder(color: Color = { r: 0, g: 0, b: 0, a: 1 }): StrokeBuilder {
  const state: StrokeBuilderState = {
    color,
    weight: 1,
    cap: "NONE",
    join: "MITER",
    align: "CENTER",
    dashPattern: undefined,
    miterLimit: 4,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  };

  const builder: StrokeBuilder = {
    color(c: Color) {
      state.color = c;
      return builder;
    },

    weight(w: number) {
      state.weight = w;
      return builder;
    },

    cap(c: StrokeCap) {
      state.cap = c;
      return builder;
    },

    join(j: StrokeJoin) {
      state.join = j;
      return builder;
    },

    align(a: StrokeAlign) {
      state.align = a;
      return builder;
    },

    dash(pattern: number[]) {
      state.dashPattern = pattern;
      return builder;
    },

    miterLimit(limit: number) {
      state.miterLimit = limit;
      return builder;
    },

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

    build(): StrokeData {
      const paint: Stroke = {
        type: { value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" },
        color: state.color,
        opacity: state.opacity,
        visible: state.visible,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
      };

      return {
        paints: [paint],
        weight: state.weight,
        cap: { value: STROKE_CAP_VALUES[state.cap], name: state.cap },
        join: { value: STROKE_JOIN_VALUES[state.join], name: state.join },
        align: { value: STROKE_ALIGN_VALUES[state.align], name: state.align },
        dashPattern: state.dashPattern,
        miterLimit: state.miterLimit !== 4 ? state.miterLimit : undefined,
      };
    },
  };

  return builder;
}

/**
 * Create a stroke
 */
export function stroke(color?: Color): StrokeBuilder {
  return createStrokeBuilder(color);
}
