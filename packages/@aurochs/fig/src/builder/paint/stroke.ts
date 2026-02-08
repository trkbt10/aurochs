/**
 * @file Stroke builder
 */

import type { Color, Stroke } from "../types";
import type { StrokeData } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  STROKE_CAP_VALUES,
  STROKE_JOIN_VALUES,
  STROKE_ALIGN_VALUES,
  type BlendMode,
  type StrokeCap,
  type StrokeJoin,
  type StrokeAlign,
} from "../../constants";

export class StrokeBuilder {
  private _color: Color;
  private _weight: number;
  private _cap: StrokeCap;
  private _join: StrokeJoin;
  private _align: StrokeAlign;
  private _dashPattern?: number[];
  private _miterLimit: number;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor(color: Color = { r: 0, g: 0, b: 0, a: 1 }) {
    this._color = color;
    this._weight = 1;
    this._cap = "NONE";
    this._join = "MITER";
    this._align = "CENTER";
    this._miterLimit = 4;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  color(c: Color): this {
    this._color = c;
    return this;
  }

  weight(w: number): this {
    this._weight = w;
    return this;
  }

  cap(c: StrokeCap): this {
    this._cap = c;
    return this;
  }

  join(j: StrokeJoin): this {
    this._join = j;
    return this;
  }

  align(a: StrokeAlign): this {
    this._align = a;
    return this;
  }

  dash(pattern: number[]): this {
    this._dashPattern = pattern;
    return this;
  }

  miterLimit(limit: number): this {
    this._miterLimit = limit;
    return this;
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

  build(): StrokeData {
    const paint: Stroke = {
      type: { value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" },
      color: this._color,
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
    };

    return {
      paints: [paint],
      weight: this._weight,
      cap: { value: STROKE_CAP_VALUES[this._cap], name: this._cap },
      join: { value: STROKE_JOIN_VALUES[this._join], name: this._join },
      align: { value: STROKE_ALIGN_VALUES[this._align], name: this._align },
      dashPattern: this._dashPattern,
      miterLimit: this._miterLimit !== 4 ? this._miterLimit : undefined,
    };
  }
}

/**
 * Create a stroke
 */
export function stroke(color?: Color): StrokeBuilder {
  return new StrokeBuilder(color);
}
