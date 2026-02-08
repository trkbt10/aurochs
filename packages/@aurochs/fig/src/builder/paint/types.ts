/**
 * @file Paint type definitions
 */

import type { Color, Paint, Stroke } from "../types";
import type { ScaleMode, StrokeCap, StrokeJoin, StrokeAlign } from "../../constants";

export type GradientStop = {
  readonly color: Color;
  readonly position: number; // 0-1
};

export type GradientHandles = {
  readonly start: { x: number; y: number }; // 0-1 normalized coordinates
  readonly end: { x: number; y: number };
  readonly width?: number; // For radial/angular gradients
};

export type GradientPaint = Paint & {
  readonly gradientStops: readonly GradientStop[];
  readonly gradientHandlePositions?: readonly { x: number; y: number }[];
};

export type ImagePaint = Paint & {
  readonly imageRef?: string;
  readonly scaleMode?: { value: number; name: ScaleMode };
  readonly imageTransform?: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly scalingFactor?: number;
  readonly rotation?: number;
  readonly filters?: {
    exposure?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    tint?: number;
    highlights?: number;
    shadows?: number;
  };
};

export type StrokeData = {
  readonly paints: readonly Stroke[];
  readonly weight: number;
  readonly cap?: { value: number; name: StrokeCap };
  readonly join?: { value: number; name: StrokeJoin };
  readonly align?: { value: number; name: StrokeAlign };
  readonly dashPattern?: readonly number[];
  readonly miterLimit?: number;
};
