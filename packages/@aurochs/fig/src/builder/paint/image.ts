/**
 * @file Image paint builder
 */

import type { ImagePaint } from "./types";
import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  SCALE_MODE_VALUES,
  type BlendMode,
  type ScaleMode,
} from "../../constants";

export class ImagePaintBuilder {
  private _imageRef: string;
  private _scaleMode: ScaleMode;
  private _opacity: number;
  private _visible: boolean;
  private _blendMode: BlendMode;
  private _rotation: number;
  private _scalingFactor: number;
  private _filters: ImagePaint["filters"];

  constructor(imageRef: string) {
    this._imageRef = imageRef;
    this._scaleMode = "FILL";
    this._opacity = 1;
    this._visible = true;
    this._blendMode = "NORMAL";
    this._rotation = 0;
    this._scalingFactor = 1;
  }

  scaleMode(mode: ScaleMode): this {
    this._scaleMode = mode;
    return this;
  }

  rotation(degrees: number): this {
    this._rotation = degrees;
    return this;
  }

  scale(factor: number): this {
    this._scalingFactor = factor;
    return this;
  }

  /**
   * Set image filters
   */
  filters(filters: NonNullable<ImagePaint["filters"]>): this {
    this._filters = filters;
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

  build(): ImagePaint {
    return {
      type: { value: PAINT_TYPE_VALUES.IMAGE, name: "IMAGE" },
      opacity: this._opacity,
      visible: this._visible,
      blendMode: { value: BLEND_MODE_VALUES[this._blendMode], name: this._blendMode },
      imageRef: this._imageRef,
      scaleMode: { value: SCALE_MODE_VALUES[this._scaleMode], name: this._scaleMode },
      rotation: this._rotation !== 0 ? this._rotation : undefined,
      scalingFactor: this._scalingFactor !== 1 ? this._scalingFactor : undefined,
      filters: this._filters,
    };
  }
}

/**
 * Create an image paint
 */
export function imagePaint(imageRef: string): ImagePaintBuilder {
  return new ImagePaintBuilder(imageRef);
}
