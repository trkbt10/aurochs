/**
 * @file High-level text builder
 *
 * Provides a fluent API for building text NodeSpecs.
 */

import type { FigPaint, FigEffect, KiwiEnumValue } from "@aurochs/fig/types";
import type { TextNodeSpec } from "../types/spec-types";

type TextSpecBuilder = {
  name(name: string): TextSpecBuilder;
  position(x: number, y: number): TextSpecBuilder;
  size(width: number, height: number): TextSpecBuilder;
  rotation(degrees: number): TextSpecBuilder;
  fill(paint: FigPaint): TextSpecBuilder;
  fills(paints: readonly FigPaint[]): TextSpecBuilder;
  opacity(opacity: number): TextSpecBuilder;
  fontSize(size: number): TextSpecBuilder;
  fontFamily(family: string): TextSpecBuilder;
  fontStyle(style: string): TextSpecBuilder;
  textAlignHorizontal(align: KiwiEnumValue): TextSpecBuilder;
  textAlignVertical(align: KiwiEnumValue): TextSpecBuilder;
  build(): TextNodeSpec;
};

/**
 * Create a text spec builder with fluent API.
 *
 * @param characters - The text content
 * @param x - X position
 * @param y - Y position
 * @param width - Text box width
 * @param height - Text box height
 */
export function buildTextFromSpec(
  characters: string,
  x: number,
  y: number,
  width: number,
  height: number,
): TextSpecBuilder {
  let state: TextNodeSpec = {
    type: "TEXT",
    characters,
    x,
    y,
    width,
    height,
  };

  function makeBuilder(): TextSpecBuilder {
    return {
      name: (n) => { state = { ...state, name: n }; return makeBuilder(); },
      position: (px, py) => { state = { ...state, x: px, y: py }; return makeBuilder(); },
      size: (w, h) => { state = { ...state, width: w, height: h }; return makeBuilder(); },
      rotation: (d) => { state = { ...state, rotation: d }; return makeBuilder(); },
      fill: (p) => { state = { ...state, fills: [...(state.fills ?? []), p] }; return makeBuilder(); },
      fills: (ps) => { state = { ...state, fills: ps }; return makeBuilder(); },
      opacity: (o) => { state = { ...state, opacity: o }; return makeBuilder(); },
      fontSize: (s) => { state = { ...state, fontSize: s }; return makeBuilder(); },
      fontFamily: (f) => { state = { ...state, fontFamily: f }; return makeBuilder(); },
      fontStyle: (s) => { state = { ...state, fontStyle: s }; return makeBuilder(); },
      textAlignHorizontal: (a) => { state = { ...state, textAlignHorizontal: a }; return makeBuilder(); },
      textAlignVertical: (a) => { state = { ...state, textAlignVertical: a }; return makeBuilder(); },
      build: () => state,
    };
  }

  return makeBuilder();
}
