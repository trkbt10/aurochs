/**
 * @file Diamond gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";
import { axialHandlesToTransform } from "./gradient-transform";

/** Diamond gradient builder instance */
export type DiamondGradientBuilder = {
  stops: (stops: GradientStop[]) => DiamondGradientBuilder;
  addStop: (stop: GradientStop) => DiamondGradientBuilder;
  center: (x: number, y: number) => DiamondGradientBuilder;
  size: (s: number) => DiamondGradientBuilder;
  opacity: (value: number) => DiamondGradientBuilder;
  visible: (value: boolean) => DiamondGradientBuilder;
  blendMode: (mode: BlendMode) => DiamondGradientBuilder;
  build: () => GradientPaint;
};

type DiamondGradientBuilderState = {
  stops: GradientStop[];
  centerX: number;
  centerY: number;
  size: number;
  opacity: number;
  visible: boolean;
  blendMode: BlendMode;
};

/** Create a diamond gradient builder */
function createDiamondGradientBuilder(): DiamondGradientBuilder {
  const state: DiamondGradientBuilderState = {
    stops: [
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 },
    ],
    centerX: 0.5,
    centerY: 0.5,
    size: 0.5,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  };

  const builder: DiamondGradientBuilder = {
    stops(stops: GradientStop[]) {
      state.stops = stops;
      return builder;
    },

    addStop(stop: GradientStop) {
      state.stops.push(stop);
      state.stops.sort((a, b) => a.position - b.position);
      return builder;
    },

    center(x: number, y: number) {
      state.centerX = x;
      state.centerY = y;
      return builder;
    },

    size(s: number) {
      state.size = s;
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
      const center = { x: state.centerX, y: state.centerY };
      const xAxisEnd = { x: state.centerX + state.size, y: state.centerY };
      const yAxisEnd = { x: state.centerX, y: state.centerY + state.size };

      return {
        type: { value: PAINT_TYPE_VALUES.GRADIENT_DIAMOND, name: "GRADIENT_DIAMOND" },
        opacity: state.opacity,
        visible: state.visible,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
        stops: state.stops,
        transform: axialHandlesToTransform(center, xAxisEnd, yAxisEnd),
      };
    },
  };

  return builder;
}

/**
 * Create a diamond gradient paint
 */
export function diamondGradient(): DiamondGradientBuilder {
  return createDiamondGradientBuilder();
}
