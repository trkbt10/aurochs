/**
 * @file Angular (conic) gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

export class AngularGradientBuilder {
  private _stops: GradientStop[];
  private _centerX: number;
  private _centerY: number;
  private _rotation: number; // degrees
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    this._stops = [
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
      { color: { r: 1, g: 1, b: 0, a: 1 }, position: 0.17 },
      { color: { r: 0, g: 1, b: 0, a: 1 }, position: 0.33 },
      { color: { r: 0, g: 1, b: 1, a: 1 }, position: 0.5 },
      { color: { r: 0, g: 0, b: 1, a: 1 }, position: 0.67 },
      { color: { r: 1, g: 0, b: 1, a: 1 }, position: 0.83 },
      { color: { r: 1, g: 0, b: 0, a: 1 }, position: 1 },
    ];
    this._centerX = 0.5;
    this._centerY = 0.5;
    this._rotation = 0;
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

  /**
   * Set rotation in degrees
   */
  rotation(degrees: number): this {
    this._rotation = degrees;
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
    const rad = (this._rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const radius = 0.5;

    return {
      type: { value: PAINT_TYPE_VALUES.GRADIENT_ANGULAR, name: "GRADIENT_ANGULAR" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._centerX, y: this._centerY },
        { x: this._centerX + cos * radius, y: this._centerY + sin * radius },
        { x: this._centerX - sin * radius, y: this._centerY + cos * radius },
      ],
    };
  }
}

/**
 * Create an angular (conic) gradient paint
 */
export function angularGradient(): AngularGradientBuilder {
  return new AngularGradientBuilder();
}
