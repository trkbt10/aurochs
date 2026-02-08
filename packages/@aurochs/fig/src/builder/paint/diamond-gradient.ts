/**
 * @file Diamond gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

export class DiamondGradientBuilder {
  private _stops: GradientStop[];
  private _centerX: number;
  private _centerY: number;
  private _size: number;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    this._stops = [
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 0 },
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 1 },
    ];
    this._centerX = 0.5;
    this._centerY = 0.5;
    this._size = 0.5;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  stops(stops: GradientStop[]): this {
    this._stops = stops;
    return this;
  }

  addStop(stop: GradientStop): this {
    this._stops.push(stop);
    this._stops.sort((a, b) => a.position - b.position);
    return this;
  }

  center(x: number, y: number): this {
    this._centerX = x;
    this._centerY = y;
    return this;
  }

  size(s: number): this {
    this._size = s;
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

  build(): GradientPaint {
    return {
      type: { value: PAINT_TYPE_VALUES.GRADIENT_DIAMOND, name: "GRADIENT_DIAMOND" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._centerX, y: this._centerY },
        { x: this._centerX + this._size, y: this._centerY },
        { x: this._centerX, y: this._centerY + this._size },
      ],
    };
  }
}

/**
 * Create a diamond gradient paint
 */
export function diamondGradient(): DiamondGradientBuilder {
  return new DiamondGradientBuilder();
}
