/**
 * @file Background blur effect builder
 */

import type { BlurEffectData } from "./types";
import { EFFECT_TYPE_VALUES } from "../../constants";

export class BackgroundBlurBuilder {
  private _radius: number;
  private _visible: boolean;

  constructor() {
    this._radius = 10;
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
      type: { value: EFFECT_TYPE_VALUES.BACKGROUND_BLUR, name: "BACKGROUND_BLUR" },
      visible: this._visible,
      radius: this._radius,
    };
  }
}

/**
 * Create a background blur effect
 */
export function backgroundBlur(): BackgroundBlurBuilder {
  return new BackgroundBlurBuilder();
}
