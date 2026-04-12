/**
 * @file Text node builder
 */

import { createTranslationMatrix } from "../../matrix";
import type { Color } from "../types";
import type { TextNodeData, DerivedTextNodeData } from "./types";
import {
  TEXT_ALIGN_H_VALUES,
  TEXT_ALIGN_V_VALUES,
  TEXT_AUTO_RESIZE_VALUES,
  TEXT_DECORATION_VALUES,
  TEXT_CASE_VALUES,
  NUMBER_UNITS_VALUES,
  toEnumValue,
  type TextAlignHorizontal,
  type TextAlignVertical,
  type TextAutoResize,
  type TextDecoration,
  type TextCase,
  type NumberUnits,
} from "../../constants";

/**
 * Default line height (100% = Figma's "Auto")
 */
export const DEFAULT_LINE_HEIGHT = {
  value: 100,
  units: { value: NUMBER_UNITS_VALUES.PERCENT, name: "PERCENT" as const },
};

/**
 * Default letter spacing (0% = no extra spacing)
 */
export const DEFAULT_LETTER_SPACING = {
  value: 0,
  units: { value: NUMBER_UNITS_VALUES.PERCENT, name: "PERCENT" as const },
};

/**
 * Default auto resize mode
 */
export const DEFAULT_AUTO_RESIZE = {
  value: TEXT_AUTO_RESIZE_VALUES.WIDTH_AND_HEIGHT,
  name: "WIDTH_AND_HEIGHT" as TextAutoResize,
};

/** Text node builder instance */
export type TextNodeBuilder = {
  name: (name: string) => TextNodeBuilder;
  text: (characters: string) => TextNodeBuilder;
  fontSize: (size: number) => TextNodeBuilder;
  font: (family: string, style?: string) => TextNodeBuilder;
  size: (width: number, height: number) => TextNodeBuilder;
  position: (x: number, y: number) => TextNodeBuilder;
  alignHorizontal: (align: TextAlignHorizontal) => TextNodeBuilder;
  alignVertical: (align: TextAlignVertical) => TextNodeBuilder;
  autoResize: (mode: TextAutoResize) => TextNodeBuilder;
  decoration: (deco: TextDecoration) => TextNodeBuilder;
  textCase: (tc: TextCase) => TextNodeBuilder;
  lineHeight: (value: number, unit?: NumberUnits) => TextNodeBuilder;
  letterSpacing: (value: number, unit?: NumberUnits) => TextNodeBuilder;
  color: (c: Color) => TextNodeBuilder;
  visible: (v: boolean) => TextNodeBuilder;
  opacity: (o: number) => TextNodeBuilder;
  derivedTextData: (data: DerivedTextNodeData) => TextNodeBuilder;
  build: () => TextNodeData;
};

/** Create a text node builder */
function createTextNodeBuilder(localID: number, parentID: number): TextNodeBuilder {
  const state = {
    name: "Text",
    characters: "",
    fontSize: 12,
    fontFamily: "Inter",
    fontStyle: "Regular",
    width: 100,
    height: 50,
    x: 0,
    y: 0,
    textAlignH: undefined as TextAlignHorizontal | undefined,
    textAlignV: undefined as TextAlignVertical | undefined,
    autoResize: "WIDTH_AND_HEIGHT" as TextAutoResize,
    decoration: undefined as TextDecoration | undefined,
    textCase: undefined as TextCase | undefined,
    lineHeight: { value: 100, unit: "PERCENT" as NumberUnits },
    letterSpacing: { value: 0, unit: "PERCENT" as NumberUnits },
    fillColor: { r: 0, g: 0, b: 0, a: 1 } as Color,
    visible: true,
    opacity: 1,
    derivedTextData: undefined as DerivedTextNodeData | undefined,
  };

  const builder: TextNodeBuilder = {
    name(n: string) { state.name = n; return builder; },
    text(characters: string) { state.characters = characters; return builder; },
    fontSize(size: number) { state.fontSize = size; return builder; },
    font(family: string, style: string = "Regular") { state.fontFamily = family; state.fontStyle = style; return builder; },
    size(width: number, height: number) { state.width = width; state.height = height; return builder; },
    position(x: number, y: number) { state.x = x; state.y = y; return builder; },
    alignHorizontal(align: TextAlignHorizontal) { state.textAlignH = align; return builder; },
    alignVertical(align: TextAlignVertical) { state.textAlignV = align; return builder; },
    autoResize(mode: TextAutoResize) { state.autoResize = mode; return builder; },
    decoration(deco: TextDecoration) { state.decoration = deco; return builder; },
    textCase(tc: TextCase) { state.textCase = tc; return builder; },
    lineHeight(value: number, unit: NumberUnits = "PIXELS") { state.lineHeight = { value, unit }; return builder; },
    letterSpacing(value: number, unit: NumberUnits = "PERCENT") { state.letterSpacing = { value, unit }; return builder; },
    color(c: Color) { state.fillColor = c; return builder; },
    visible(v: boolean) { state.visible = v; return builder; },
    opacity(o: number) { state.opacity = o; return builder; },
    derivedTextData(data: DerivedTextNodeData) { state.derivedTextData = data; return builder; },

    build(): TextNodeData {
      return {
        localID,
        parentID,
        name: state.name,
        characters: state.characters,
        fontSize: state.fontSize,
        fontName: {
          family: state.fontFamily,
          style: state.fontStyle,
          postscript: `${state.fontFamily}-${state.fontStyle}`.replace(/\s+/g, ""),
        },
        size: { x: state.width, y: state.height },
        transform: createTranslationMatrix(state.x, state.y),
        textAlignHorizontal: toEnumValue(state.textAlignH, TEXT_ALIGN_H_VALUES),
        textAlignVertical: toEnumValue(state.textAlignV, TEXT_ALIGN_V_VALUES),
        textAutoResize: { value: TEXT_AUTO_RESIZE_VALUES[state.autoResize], name: state.autoResize },
        textDecoration: toEnumValue(state.decoration, TEXT_DECORATION_VALUES),
        textCase: toEnumValue(state.textCase, TEXT_CASE_VALUES),
        lineHeight: {
          value: state.lineHeight.value,
          units: { value: NUMBER_UNITS_VALUES[state.lineHeight.unit], name: state.lineHeight.unit },
        },
        letterSpacing: {
          value: state.letterSpacing.value,
          units: { value: NUMBER_UNITS_VALUES[state.letterSpacing.unit], name: state.letterSpacing.unit },
        },
        fillPaints: [{
          type: { value: 0, name: "SOLID" },
          color: state.fillColor,
          opacity: 1,
          visible: true,
          blendMode: { value: 1, name: "NORMAL" },
        }],
        visible: state.visible,
        opacity: state.opacity,
        derivedTextData: state.derivedTextData,
      };
    },
  };

  return builder;
}

/**
 * Create a new Text node builder
 */
export function textNode(localID: number, parentID: number): TextNodeBuilder {
  return createTextNodeBuilder(localID, parentID);
}
