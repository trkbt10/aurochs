/**
 * @file Radial gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";
import { radialParamsToTransform } from "./gradient-transform";

/** Radial gradient builder instance */
export type RadialGradientBuilder = {
  stops: (stops: GradientStop[]) => RadialGradientBuilder;
  addStop: (stop: GradientStop) => RadialGradientBuilder;
  center: (x: number, y: number) => RadialGradientBuilder;
  radius: (r: number) => RadialGradientBuilder;
  ellipticalRadius: (rx: number, ry: number) => RadialGradientBuilder;
  opacity: (value: number) => RadialGradientBuilder;
  visible: (value: boolean) => RadialGradientBuilder;
  blendMode: (mode: BlendMode) => RadialGradientBuilder;
  build: () => GradientPaint;
};

type RadialGradientBuilderState = {
  stops: GradientStop[];
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  opacity: number;
  visible: boolean;
  blendMode: BlendMode;
};

/** Create a radial gradient builder */
function createRadialGradientBuilder(): RadialGradientBuilder {
  const state: RadialGradientBuilderState = {
    stops: [
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 },
    ],
    centerX: 0.5,
    centerY: 0.5,
    radiusX: 0.5,
    radiusY: 0.5,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  };

  const builder: RadialGradientBuilder = {
    stops(stops: GradientStop[]) {
      state.stops = stops;
      return builder;
    },

    addStop(stop: GradientStop) {
      state.stops.push(stop);
      state.stops.sort((a, b) => a.position - b.position);
      return builder;
    },

    /** Set center position (0-1 coordinates) */
    center(x: number, y: number) {
      state.centerX = x;
      state.centerY = y;
      return builder;
    },

    /** Set radius (0-1, relative to element size) */
    radius(r: number) {
      state.radiusX = r;
      state.radiusY = r;
      return builder;
    },

    /** Set elliptical radius */
    ellipticalRadius(rx: number, ry: number) {
      state.radiusX = rx;
      state.radiusY = ry;
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
      return {
        type: { value: PAINT_TYPE_VALUES.GRADIENT_RADIAL, name: "GRADIENT_RADIAL" },
        opacity: state.opacity,
        visible: state.visible,
        blendMode: { value: BLEND_MODE_VALUES[state.blendMode], name: state.blendMode },
        stops: state.stops,
        transform: radialParamsToTransform(center, state.radiusX, state.radiusY),
      };
    },
  };

  return builder;
}

/**
 * Create a radial gradient paint
 */
export function radialGradient(): RadialGradientBuilder {
  return createRadialGradientBuilder();
}
