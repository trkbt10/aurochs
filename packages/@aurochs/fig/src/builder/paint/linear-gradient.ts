/**
 * @file Linear gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

export class LinearGradientBuilder {
  private _stops: GradientStop[];
  private _startX: number;
  private _startY: number;
  private _endX: number;
  private _endY: number;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    // Default: horizontal left to right
    this._stops = [
      { color: { r: 0, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 1, a: 1 }, position: 1 },
    ];
    this._startX = 0;
    this._startY = 0.5;
    this._endX = 1;
    this._endY = 0.5;
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  /**
   * Set gradient stops
   */
  stops(stops: GradientStop[]): this {
    this._stops = stops;
    return this;
  }

  /**
   * Add a gradient stop
   */
  addStop(stop: GradientStop): this {
    this._stops.push(stop);
    this._stops.sort((a, b) => a.position - b.position);
    return this;
  }

  /**
   * Set gradient angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
   */
  angle(degrees: number): this {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Center at 0.5, 0.5, extend by 0.5 in each direction
    this._startX = 0.5 - cos * 0.5;
    this._startY = 0.5 - sin * 0.5;
    this._endX = 0.5 + cos * 0.5;
    this._endY = 0.5 + sin * 0.5;
    return this;
  }

  /**
   * Set gradient direction from point to point (0-1 coordinates)
   */
  direction(points: { startX: number; startY: number; endX: number; endY: number }): this {
    this._startX = points.startX;
    this._startY = points.startY;
    this._endX = points.endX;
    this._endY = points.endY;
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
      type: { value: PAINT_TYPE_VALUES.GRADIENT_LINEAR, name: "GRADIENT_LINEAR" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._startX, y: this._startY },
        { x: this._endX, y: this._endY },
      ],
    };
  }
}

/**
 * Create a linear gradient paint
 */
export function linearGradient(): LinearGradientBuilder {
  return new LinearGradientBuilder();
}
