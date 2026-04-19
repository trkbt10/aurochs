/**
 * @file Angular (conic) gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";
import { axialHandlesToTransform } from "./gradient-transform";

/** Angular gradient builder instance */
export type AngularGradientBuilder = {
  stops: (stops: GradientStop[]) => AngularGradientBuilder;
  addStop: (stop: GradientStop) => AngularGradientBuilder;
  center: (x: number, y: number) => AngularGradientBuilder;
  rotation: (degrees: number) => AngularGradientBuilder;
  opacity: (value: number) => AngularGradientBuilder;
  visible: (value: boolean) => AngularGradientBuilder;
  blendMode: (mode: BlendMode) => AngularGradientBuilder;
  build: () => GradientPaint;
};

type AngularGradientBuilderState = {
  stops: GradientStop[];
  centerX: number;
  centerY: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  blendMode: BlendMode;
};

/** Create an angular gradient builder */
function createAngularGradientBuilder(): AngularGradientBuilder {
  const state: AngularGradientBuilderState = {
    stops: [
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 0, a: 1 }, position: 0.17 },
      { color: { r: 0, g: 1, b: 0, a: 1 }, position: 0.33 },
      { color: { r: 0, g: 1, b: 1, a: 1 }, position: 0.5 },
      { color: { r: 0, g: 0, b: 1, a: 1 }, position: 0.67 },
      { color: { r: 1, g: 0, b: 1, a: 1 }, position: 0.83 },
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 1 },
    ],
    centerX: 0.5,
    centerY: 0.5,
    rotation: 0,
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  };

  const builder: AngularGradientBuilder = {
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

    /** Set rotation in degrees */
    rotation(degrees: number) {
      state.rotation = degrees;
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
      const rad = (state.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const radius = 0.5;

      const center = { x: state.centerX, y: state.centerY };
      const xAxisEnd = { x: state.centerX + cos * radius, y: state.centerY + sin * radius };
      const yAxisEnd = { x: state.centerX - sin * radius, y: state.centerY + cos * radius };

      return {
        type: { value: PAINT_TYPE_VALUES.GRADIENT_ANGULAR, name: "GRADIENT_ANGULAR" },
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
 * Create an angular (conic) gradient paint
 */
export function angularGradient(): AngularGradientBuilder {
  return createAngularGradientBuilder();
}
