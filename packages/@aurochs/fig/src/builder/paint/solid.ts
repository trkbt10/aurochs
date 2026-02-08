/**
 * @file Solid color paint builder
 */

import type { Color, Paint } from "../types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

export class SolidPaintBuilder {
  private _color: Color;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor(color: Color) {
    this._color = color;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  opacity(value: number): this {
    this._opacity = Math.max(0, Math.min(1, value));
    return this;
  }

  visible(value: boolean): this {
    this._visible = value;
    return this;
  }

  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  build(): Paint {
    return {
      type: { value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" },
      color: this._color,
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
    };
  }
}

/**
 * Create a solid color paint
 */
export function solidPaint(color: Color): SolidPaintBuilder {
  return new SolidPaintBuilder(color);
}

/**
 * Create a solid color paint from hex string
 */
export function solidPaintHex(hex: string): SolidPaintBuilder {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return new SolidPaintBuilder({ r: 0, g: 0, b: 0, a: 1 });
  }
  return new SolidPaintBuilder({
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: 1,
  });
}
