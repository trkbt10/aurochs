/**
 * @file High-level frame builder
 *
 * Provides a fluent API for building frame NodeSpecs with auto-layout.
 */

import type { FigPaint, FigEffect } from "@aurochs/fig/types";
import type { FrameNodeSpec } from "../types/spec-types";
import type { AutoLayoutProps } from "@aurochs/fig/domain";

type FrameSpecBuilder = {
  name(name: string): FrameSpecBuilder;
  position(x: number, y: number): FrameSpecBuilder;
  size(width: number, height: number): FrameSpecBuilder;
  rotation(degrees: number): FrameSpecBuilder;
  fill(paint: FigPaint): FrameSpecBuilder;
  fills(paints: readonly FigPaint[]): FrameSpecBuilder;
  stroke(paint: FigPaint): FrameSpecBuilder;
  strokeWeight(weight: number): FrameSpecBuilder;
  effect(effect: FigEffect): FrameSpecBuilder;
  opacity(opacity: number): FrameSpecBuilder;
  clipsContent(clips: boolean): FrameSpecBuilder;
  autoLayout(props: AutoLayoutProps): FrameSpecBuilder;
  build(): FrameNodeSpec;
};

type BuildFrameFromSpecOptions = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Create a frame spec builder with fluent API.
 */
export function buildFrameFromSpec(
  { x, y, width, height }: BuildFrameFromSpecOptions,
): FrameSpecBuilder {
  const state: FrameNodeSpec = {
    type: "FRAME",
    x,
    y,
    width,
    height,
  };

  function create(updates: Partial<FrameNodeSpec>): FrameSpecBuilder {
    return makeBuilder({ ...state, ...updates } as FrameNodeSpec);
  }

  function makeBuilder(current: FrameNodeSpec): FrameSpecBuilder {
    return {
      name: (n) => create({ name: n }),
      position: (px, py) => create({ x: px, y: py }),
      size: (w, h) => create({ width: w, height: h }),
      rotation: (d) => create({ rotation: d }),
      fill: (p) => create({ fills: [...(current.fills ?? []), p] }),
      fills: (ps) => create({ fills: ps }),
      stroke: (p) => create({ strokes: [...(current.strokes ?? []), p] }),
      strokeWeight: (w) => create({ strokeWeight: w }),
      effect: (e) => create({ effects: [...(current.effects ?? []), e] }),
      opacity: (o) => create({ opacity: o }),
      clipsContent: (c) => create({ clipsContent: c }),
      autoLayout: (a) => create({ autoLayout: a }),
      build: () => current,
    };
  }

  return makeBuilder(state);
}
