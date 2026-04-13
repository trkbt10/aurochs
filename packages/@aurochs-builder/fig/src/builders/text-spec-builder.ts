/**
 * @file High-level text builder
 *
 * Provides a fluent API for building text NodeSpecs.
 */

import type { FigPaint, KiwiEnumValue } from "@aurochs/fig/types";
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

type BuildTextFromSpecOptions = {
  readonly characters: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Create a text spec builder with fluent API.
 */
export function buildTextFromSpec(
  { characters, x, y, width, height }: BuildTextFromSpecOptions,
): TextSpecBuilder {
  // eslint-disable-next-line no-restricted-syntax -- mutable builder state cannot be expressed as a return value
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
