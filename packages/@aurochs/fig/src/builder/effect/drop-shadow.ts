/**
 * @file Drop shadow effect builder
 */

import type { Color } from "../types";
import type { ShadowEffectData } from "./types";
import {
  EFFECT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type BlendMode,
} from "../../constants";

export class DropShadowBuilder {
  private _color: Color;
  private _offsetX: number;
  private _offsetY: number;
  private _radius: number;
  private _spread: number;
  private _visible: boolean;
  private _blendMode: BlendMode;
  private _showBehindNode: boolean;

  constructor() {
    this._color = { r: 0, g: 0, b: 0, a: 0.25 };
    this._offsetX = 0;
    this._offsetY = 4;
    this._radius = 4;
    this._spread = 0;
    this._visible = true;
    this._blendMode = "NORMAL";
    this._showBehindNode = false;
  }

  /**
   * Set shadow color (RGBA, 0-1)
   * @param rOrColor - Red value (0-1) or Color object
   * @param g - Green value (0-1)
   * @param b - Blue value (0-1)
   * @param a - Alpha value (0-1)
   */
  color(rOrColor: number | Color, g?: number, b?: number, a?: number): this {
    if (typeof rOrColor === "number") {
      this._color = { r: rOrColor, g: g ?? 0, b: b ?? 0, a: a ?? 1 };
    } else {
      this._color = rOrColor;
    }
    return this;
  }

  /**
   * Set shadow offset
   */
  offset(x: number, y: number): this {
    this._offsetX = x;
    this._offsetY = y;
    return this;
  }

  /**
   * Set blur radius
   */
  blur(radius: number): this {
    this._radius = Math.max(0, radius);
    return this;
  }

  /**
   * Set spread radius (expansion/contraction)
   */
  spread(radius: number): this {
    this._spread = radius;
    return this;
  }

  /**
   * Set visibility
   */
  visible(v: boolean): this {
    this._visible = v;
    return this;
  }

  /**
   * Set blend mode
   */
  blendMode(mode: BlendMode): this {
    this._blendMode = mode;
    return this;
  }

  /**
   * Show shadow behind transparent areas of the node
   */
  showBehindNode(show: boolean = true): this {
    this._showBehindNode = show;
    return this;
  }

  build(): ShadowEffectData {
    return {
      type: { value: EFFECT_TYPE_VALUES.DROP_SHADOW, name: "DROP_SHADOW" },
      visible: this._visible,
      color: this._color,
      offset: { x: this._offsetX, y: this._offsetY },
      radius: this._radius,
      spread: this._spread !== 0 ? this._spread : undefined,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      showShadowBehindNode: this._showBehindNode || undefined,
    };
  }
}

/**
 * Create a drop shadow effect
 */
export function dropShadow(): DropShadowBuilder {
  return new DropShadowBuilder();
}
