/**
 * @file Layer blur effect builder
 */

import type { BlurEffectData } from "./types";
import { EFFECT_TYPE_VALUES } from "../../constants";

export class LayerBlurBuilder {
  private _radius: number;
  private _visible: boolean;

  constructor() {
    this._radius = 4;
    this._visible = true;
  }

  /**
   * Set blur radius
   */
  radius(r: number): this {
    this._radius = Math.max(0, r);
    return this;
  }

  /**
   * Set visibility
   */
  visible(v: boolean): this {
    this._visible = v;
    return this;
  }

  build(): BlurEffectData {
    return {
      type: { value: EFFECT_TYPE_VALUES.FOREGROUND_BLUR, name: "FOREGROUND_BLUR" },
      visible: this._visible,
      radius: this._radius,
    };
  }
}

/**
 * Create a layer blur effect
 */
export function layerBlur(): LayerBlurBuilder {
  return new LayerBlurBuilder();
}
