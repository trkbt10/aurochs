/**
 * @file Text node builder
 */

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

export class TextNodeBuilder {
  private _localID: number;
  private _parentID: number;
  private _name: string;
  private _characters: string;
  private _fontSize: number;
  private _fontFamily: string;
  private _fontStyle: string;
  private _width: number;
  private _height: number;
  private _x: number;
  private _y: number;
  private _textAlignH?: TextAlignHorizontal;
  private _textAlignV?: TextAlignVertical;
  private _autoResize: TextAutoResize;
  private _decoration?: TextDecoration;
  private _textCase?: TextCase;
  private _lineHeight: { value: number; unit: NumberUnits };
  private _letterSpacing: { value: number; unit: NumberUnits };
  private _fillColor: Color;
  private _visible: boolean;
  private _opacity: number;
  private _derivedTextData?: DerivedTextNodeData;

  constructor(localID: number, parentID: number) {
    this._localID = localID;
    this._parentID = parentID;
    this._name = "Text";
    this._characters = "";
    this._fontSize = 12;
    this._fontFamily = "Inter";
    this._fontStyle = "Regular";
    this._width = 100;
    this._height = 50;
    this._x = 0;
    this._y = 0;
    this._fillColor = { r: 0, g: 0, b: 0, a: 1 };
    this._visible = true;
    this._opacity = 1;
    // Figma defaults (Auto)
    this._lineHeight = { value: 100, unit: "PERCENT" };
    this._letterSpacing = { value: 0, unit: "PERCENT" };
    this._autoResize = "WIDTH_AND_HEIGHT";
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  text(characters: string): this {
    this._characters = characters;
    return this;
  }

  fontSize(size: number): this {
    this._fontSize = size;
    return this;
  }

  font(family: string, style: string = "Regular"): this {
    this._fontFamily = family;
    this._fontStyle = style;
    return this;
  }

  size(width: number, height: number): this {
    this._width = width;
    this._height = height;
    return this;
  }

  position(x: number, y: number): this {
    this._x = x;
    this._y = y;
    return this;
  }

  alignHorizontal(align: TextAlignHorizontal): this {
    this._textAlignH = align;
    return this;
  }

  alignVertical(align: TextAlignVertical): this {
    this._textAlignV = align;
    return this;
  }

  autoResize(mode: TextAutoResize): this {
    this._autoResize = mode;
    return this;
  }

  decoration(deco: TextDecoration): this {
    this._decoration = deco;
    return this;
  }

  textCase(tc: TextCase): this {
    this._textCase = tc;
    return this;
  }

  lineHeight(value: number, unit: NumberUnits = "PIXELS"): this {
    this._lineHeight = { value, unit };
    return this;
  }

  letterSpacing(value: number, unit: NumberUnits = "PERCENT"): this {
    this._letterSpacing = { value, unit };
    return this;
  }

  color(c: Color): this {
    this._fillColor = c;
    return this;
  }

  visible(v: boolean): this {
    this._visible = v;
    return this;
  }

  opacity(o: number): this {
    this._opacity = o;
    return this;
  }

  derivedTextData(data: DerivedTextNodeData): this {
    this._derivedTextData = data;
    return this;
  }

  build(): TextNodeData {
    return {
      localID: this._localID,
      parentID: this._parentID,
      name: this._name,
      characters: this._characters,
      fontSize: this._fontSize,
      fontName: {
        family: this._fontFamily,
        style: this._fontStyle,
        postscript: `${this._fontFamily}-${this._fontStyle}`.replace(/\s+/g, ""),
      },
      size: { x: this._width, y: this._height },
      transform: {
        m00: 1,
        m01: 0,
        m02: this._x,
        m10: 0,
        m11: 1,
        m12: this._y,
      },
      textAlignHorizontal: toEnumValue(this._textAlignH, TEXT_ALIGN_H_VALUES),
      textAlignVertical: toEnumValue(this._textAlignV, TEXT_ALIGN_V_VALUES),
      // Always include these with defaults (Figma's "Auto")
      textAutoResize: { value: TEXT_AUTO_RESIZE_VALUES[this._autoResize], name: this._autoResize },
      textDecoration: toEnumValue(this._decoration, TEXT_DECORATION_VALUES),
      textCase: toEnumValue(this._textCase, TEXT_CASE_VALUES),
      // Always include lineHeight and letterSpacing (defaults = Figma's "Auto")
      lineHeight: {
        value: this._lineHeight.value,
        units: {
          value: NUMBER_UNITS_VALUES[this._lineHeight.unit],
          name: this._lineHeight.unit,
        },
      },
      letterSpacing: {
        value: this._letterSpacing.value,
        units: {
          value: NUMBER_UNITS_VALUES[this._letterSpacing.unit],
          name: this._letterSpacing.unit,
        },
      },
      fillPaints: [
        {
          type: { value: 0, name: "SOLID" },
          color: this._fillColor,
          opacity: 1,
          visible: true,
          blendMode: { value: 1, name: "NORMAL" },
        },
      ],
      visible: this._visible,
      opacity: this._opacity,
      derivedTextData: this._derivedTextData,
    };
  }
}

/**
 * Create a new Text node builder
 */
export function textNode(localID: number, parentID: number): TextNodeBuilder {
  return new TextNodeBuilder(localID, parentID);
}
