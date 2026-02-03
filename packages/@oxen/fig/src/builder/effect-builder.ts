/**
 * @file Effect builders with fluent API
 *
 * Provides builders for:
 * - Drop shadow
 * - Inner shadow
 * - Layer blur
 * - Background blur
 */

import type { Color } from "./text-builder";
import {
  EFFECT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  type EffectType,
  type BlendMode,
} from "../constants";

// =============================================================================
// Effect Data Types
// =============================================================================

export type BaseEffectData = {
  readonly type: { value: number; name: EffectType };
  readonly visible: boolean;
};

export type ShadowEffectData = BaseEffectData & {
  readonly color: Color;
  readonly offset: { x: number; y: number };
  readonly radius: number;
  readonly spread?: number;
  readonly blendMode?: { value: number; name: BlendMode };
  readonly showShadowBehindNode?: boolean;
};

export type BlurEffectData = BaseEffectData & {
  readonly radius: number;
};

export type EffectData = ShadowEffectData | BlurEffectData;

// =============================================================================
// Drop Shadow Builder
// =============================================================================

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
   */
  color(c: Color): this {
    this._color = c;
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

// =============================================================================
// Inner Shadow Builder
// =============================================================================

export class InnerShadowBuilder {
  private _color: Color;
  private _offsetX: number;
  private _offsetY: number;
  private _radius: number;
  private _spread: number;
  private _visible: boolean;
  private _blendMode: BlendMode;

  constructor() {
    this._color = { r: 0, g: 0, b: 0, a: 0.25 };
    this._offsetX = 0;
    this._offsetY = 2;
    this._radius = 4;
    this._spread = 0;
    this._visible = true;
    this._blendMode = "NORMAL";
  }

  /**
   * Set shadow color (RGBA, 0-1)
   */
  color(c: Color): this {
    this._color = c;
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
   * Set spread radius
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

  build(): ShadowEffectData {
    return {
      type: { value: EFFECT_TYPE_VALUES.INNER_SHADOW, name: "INNER_SHADOW" },
      visible: this._visible,
      color: this._color,
      offset: { x: this._offsetX, y: this._offsetY },
      radius: this._radius,
      spread: this._spread !== 0 ? this._spread : undefined,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
    };
  }
}

// =============================================================================
// Layer Blur Builder
// =============================================================================

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
      type: { value: EFFECT_TYPE_VALUES.LAYER_BLUR, name: "LAYER_BLUR" },
      visible: this._visible,
      radius: this._radius,
    };
  }
}

// =============================================================================
// Background Blur Builder
// =============================================================================

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

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a drop shadow effect
 */
export function dropShadow(): DropShadowBuilder {
  return new DropShadowBuilder();
}

/**
 * Create an inner shadow effect
 */
export function innerShadow(): InnerShadowBuilder {
  return new InnerShadowBuilder();
}

/**
 * Create a layer blur effect
 */
export function layerBlur(): LayerBlurBuilder {
  return new LayerBlurBuilder();
}

/**
 * Create a background blur effect
 */
export function backgroundBlur(): BackgroundBlurBuilder {
  return new BackgroundBlurBuilder();
}

// =============================================================================
// Utility: Create effects array
// =============================================================================

/**
 * Combine multiple effects into an array
 */
export function effects(...builders: Array<{ build(): EffectData }>): readonly EffectData[] {
  return builders.map((b) => b.build());
}
