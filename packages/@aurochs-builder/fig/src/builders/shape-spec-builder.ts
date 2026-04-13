/**
 * @file High-level shape builder
 *
 * Provides a fluent API for building shape NodeSpecs (rectangle, ellipse, etc.).
 */

import type { FigPaint, FigEffect } from "@aurochs/fig/types";
import type { NodeSpec } from "../types/spec-types";

type ShapeType = "RECTANGLE" | "ROUNDED_RECTANGLE" | "ELLIPSE" | "LINE" | "STAR" | "REGULAR_POLYGON";

/**
 * Internal mutable state for the shape builder.
 *
 * This is the superset of all shape spec fields. The `build()` method
 * produces the correctly typed NodeSpec discriminated by `type`.
 */
type ShapeBuilderState = {
  type: ShapeType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fills?: FigPaint[];
  strokes?: FigPaint[];
  strokeWeight?: number;
  effects?: FigEffect[];
  opacity?: number;
  cornerRadius?: number;
  pointCount?: number;
  starInnerRadius?: number;
};

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
 * Build a NodeSpec from the builder state.
 *
 * Constructs the appropriate discriminated union variant based on `state.type`.
 * This replaces the previous `state as unknown as NodeSpec` cast with
 * an explicit construction that TypeScript can verify.
 */
function buildNodeSpec(state: ShapeBuilderState): NodeSpec {
  const base = {
    name: state.name,
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    rotation: state.rotation,
    fills: state.fills,
    strokes: state.strokes,
    strokeWeight: state.strokeWeight,
    effects: state.effects,
    opacity: state.opacity,
  };

  switch (state.type) {
    case "RECTANGLE":
      return { ...base, type: "RECTANGLE" };
    case "ROUNDED_RECTANGLE":
      return { ...base, type: "ROUNDED_RECTANGLE", cornerRadius: state.cornerRadius };
    case "ELLIPSE":
      return { ...base, type: "ELLIPSE" };
    case "LINE":
      return { ...base, type: "LINE" };
    case "STAR":
      return { ...base, type: "STAR", pointCount: state.pointCount, starInnerRadius: state.starInnerRadius };
    case "REGULAR_POLYGON":
      return { ...base, type: "REGULAR_POLYGON", pointCount: state.pointCount };
  }
}

type BuildShapeFromSpecOptions = {
  readonly shapeType: ShapeType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Create a shape spec builder with fluent API.
 */
export function buildShapeFromSpec(
  { shapeType, x, y, width, height }: BuildShapeFromSpecOptions,
): ShapeSpecBuilder {
  const state: ShapeBuilderState = {
    type: shapeType,
    x,
    y,
    width,
    height,
  };

  const builder: ShapeSpecBuilder = {
    name: (n) => { state.name = n; return builder; },
    position: (px, py) => { state.x = px; state.y = py; return builder; },
    size: (w, h) => { state.width = w; state.height = h; return builder; },
    rotation: (d) => { state.rotation = d; return builder; },
    fill: (p) => { state.fills = [...(state.fills ?? []), p]; return builder; },
    fills: (ps) => { state.fills = [...ps]; return builder; },
    stroke: (p) => { state.strokes = [...(state.strokes ?? []), p]; return builder; },
    strokeWeight: (w) => { state.strokeWeight = w; return builder; },
    effect: (e) => { state.effects = [...(state.effects ?? []), e]; return builder; },
    opacity: (o) => { state.opacity = o; return builder; },
    cornerRadius: (r) => { state.cornerRadius = r; return builder; },
    pointCount: (c) => { state.pointCount = c; return builder; },
    starInnerRadius: (r) => { state.starInnerRadius = r; return builder; },
    build: () => buildNodeSpec(state),
  };

  return builder;
}
