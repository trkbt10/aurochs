/**
 * @file Linear gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";
import { linearHandlesToTransform } from "./gradient-transform";

/** Linear gradient builder instance */
export type LinearGradientBuilder = {
  stops: (stops: GradientStop[]) => LinearGradientBuilder;
  addStop: (stop: GradientStop) => LinearGradientBuilder;
  angle: (degrees: number) => LinearGradientBuilder;
  direction: (points: { startX: number; startY: number; endX: number; endY: number }) => LinearGradientBuilder;
  opacity: (value: number) => LinearGradientBuilder;
  visible: (value: boolean) => LinearGradientBuilder;
  blendMode: (mode: BlendMode) => LinearGradientBuilder;
  build: () => GradientPaint;
};

type LinearGradientBuilderState = {
  stops: GradientStop[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  opacity: number;
  visible: boolean;
  blendMode: BlendMode;
};

/** Create a linear gradient builder */
function createLinearGradientBuilder(): LinearGradientBuilder {
  const state: LinearGradientBuilderState = {
    stops: [
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 },
    ],
    startX: 0,
    startY: 0.5,
    endX: 1,
    endY: 0.5,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  };

  const builder: LinearGradientBuilder = {
    /** Set gradient stops */
    stops(stops: GradientStop[]) {
      state.stops = stops;
      return builder;
    },

    /** Add a gradient stop */
    addStop(stop: GradientStop) {
      state.stops.push(stop);
      state.stops.sort((a, b) => a.position - b.position);
      return builder;
    },

    /** Set gradient angle in degrees (0 = right, 90 = down, 180 = left, 270 = up) */
    angle(degrees: number) {
      const rad = (degrees * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      state.startX = 0.5 - cos * 0.5;
      state.startY = 0.5 - sin * 0.5;
      state.endX = 0.5 + cos * 0.5;
      state.endY = 0.5 + sin * 0.5;
      return builder;
    },

    /** Set gradient direction from point to point (0-1 coordinates) */
    direction(points: { startX: number; startY: number; endX: number; endY: number }) {
      state.startX = points.startX;
      state.startY = points.startY;
      state.endX = points.endX;
      state.endY = points.endY;
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

    build(): GradientPaint {
      const start = { x: state.startX, y: state.startY };
      const end = { x: state.endX, y: state.endY };
      return {
        type: { value: PAINT_TYPE_VALUES.GRADIENT_LINEAR, name: "GRADIENT_LINEAR" },
        opacity: state.opacity,
        visible: state.visible,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
        stops: state.stops,
        transform: linearHandlesToTransform(start, end),
      };
    },
  };

  return builder;
}

/**
 * Create a linear gradient paint
 */
export function linearGradient(): LinearGradientBuilder {
  return createLinearGradientBuilder();
}
