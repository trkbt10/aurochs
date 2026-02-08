/**
 * @file Radial gradient paint builder
 */

import type { GradientStop, GradientPaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

export class RadialGradientBuilder {
  private _stops: GradientStop[];
  private _centerX: number;
  private _centerY: number;
  private _radiusX: number;
  private _radiusY: number;
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
    this._radiusX = 0.5;
    this._radiusY = 0.5;
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

  /**
   * Set center position (0-1 coordinates)
   */
  center(x: number, y: number): this {
    this._centerX = x;
    this._centerY = y;
    return this;
  }

  /**
   * Set radius (0-1, relative to element size)
   */
  radius(r: number): this {
    this._radiusX = r;
    this._radiusY = r;
    return this;
  }

  /**
   * Set elliptical radius
   */
  ellipticalRadius(rx: number, ry: number): this {
    this._radiusX = rx;
    this._radiusY = ry;
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
    // Figma uses 3 handle positions for radial gradients:
    // [0] = center, [1] = edge point 1, [2] = edge point 2 (for elliptical)
    return {
      type: { value: PAINT_TYPE_VALUES.GRADIENT_RADIAL, name: "GRADIENT_RADIAL" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      gradientStops: this._stops,
      gradientHandlePositions: [
        { x: this._centerX, y: this._centerY },
        { x: this._centerX + this._radiusX, y: this._centerY },
        { x: this._centerX, y: this._centerY + this._radiusY },
      ],
    };
  }
}

/**
 * Create a radial gradient paint
 */
export function radialGradient(): RadialGradientBuilder {
  return new RadialGradientBuilder();
}
