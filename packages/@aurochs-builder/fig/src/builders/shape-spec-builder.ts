/**
 * @file High-level shape builder
 *
 * Provides a fluent API for building shape NodeSpecs (rectangle, ellipse, etc.).
 */

import type { FigPaint, FigEffect } from "@aurochs/fig/types";
import type { NodeSpec, BaseNodeSpec, RectNodeSpec, EllipseNodeSpec, RoundedRectNodeSpec, StarNodeSpec, PolygonNodeSpec, LineNodeSpec } from "../types/spec-types";

type ShapeType = "RECTANGLE" | "ROUNDED_RECTANGLE" | "ELLIPSE" | "LINE" | "STAR" | "REGULAR_POLYGON";

type ShapeSpecBuilder = {
  name(name: string): ShapeSpecBuilder;
  position(x: number, y: number): ShapeSpecBuilder;
  size(width: number, height: number): ShapeSpecBuilder;
  rotation(degrees: number): ShapeSpecBuilder;
  fill(paint: FigPaint): ShapeSpecBuilder;
  fills(paints: readonly FigPaint[]): ShapeSpecBuilder;
  stroke(paint: FigPaint): ShapeSpecBuilder;
  strokeWeight(weight: number): ShapeSpecBuilder;
  effect(effect: FigEffect): ShapeSpecBuilder;
  opacity(opacity: number): ShapeSpecBuilder;
  cornerRadius(radius: number): ShapeSpecBuilder;
  pointCount(count: number): ShapeSpecBuilder;
  starInnerRadius(ratio: number): ShapeSpecBuilder;
  build(): NodeSpec;
};

/**
 * Create a shape spec builder with fluent API.
 *
 * @param shapeType - The shape type to build
 * @param x - X position
 * @param y - Y position
 * @param width - Width
 * @param height - Height
 */
export function buildShapeFromSpec(
  shapeType: ShapeType,
  x: number,
  y: number,
  width: number,
  height: number,
): ShapeSpecBuilder {
  let state: Record<string, unknown> = {
    type: shapeType,
    x,
    y,
    width,
    height,
  };

  function makeBuilder(): ShapeSpecBuilder {
    return {
      name: (n) => { state = { ...state, name: n }; return makeBuilder(); },
      position: (px, py) => { state = { ...state, x: px, y: py }; return makeBuilder(); },
      size: (w, h) => { state = { ...state, width: w, height: h }; return makeBuilder(); },
      rotation: (d) => { state = { ...state, rotation: d }; return makeBuilder(); },
      fill: (p) => { state = { ...state, fills: [...((state.fills as FigPaint[]) ?? []), p] }; return makeBuilder(); },
      fills: (ps) => { state = { ...state, fills: ps }; return makeBuilder(); },
      stroke: (p) => { state = { ...state, strokes: [...((state.strokes as FigPaint[]) ?? []), p] }; return makeBuilder(); },
      strokeWeight: (w) => { state = { ...state, strokeWeight: w }; return makeBuilder(); },
      effect: (e) => { state = { ...state, effects: [...((state.effects as FigEffect[]) ?? []), e] }; return makeBuilder(); },
      opacity: (o) => { state = { ...state, opacity: o }; return makeBuilder(); },
      cornerRadius: (r) => { state = { ...state, cornerRadius: r }; return makeBuilder(); },
      pointCount: (c) => { state = { ...state, pointCount: c }; return makeBuilder(); },
      starInnerRadius: (r) => { state = { ...state, starInnerRadius: r }; return makeBuilder(); },
      build: () => state as unknown as NodeSpec,
    };
  }

  return makeBuilder();
}
