/**
 * @file Test helper types for Kiwi-format paint data
 *
 * Real .fig files store paints in Kiwi binary format where:
 * - `type` is KiwiEnumValue `{ value: number, name: string }`
 * - Gradient stops are in `stops` (not `gradientStops`)
 * - Gradient transform is in `transform` (not `gradientHandlePositions`)
 *
 * The SoT interpret functions (paint/interpret.ts) accept both Kiwi and
 * Figma API formats. These types let tests construct Kiwi-format data
 * without `as unknown as FigPaint` casts.
 *
 * These types represent the ACTUAL runtime shape of parsed .fig data.
 * FigPaint/FigGradientPaint represent the Figma REST API shape.
 * Both are valid inputs to the interpret functions.
 */

import type { FigColor, FigPaint, FigGradientPaint, FigImagePaint, FigEffect } from "@aurochs/fig/types";

// =============================================================================
// KiwiEnumValue
// =============================================================================

type KiwiEnumValue = { readonly value: number; readonly name: string };

// =============================================================================
// Kiwi-format Paint Types
// =============================================================================

/**
 * Kiwi-format gradient paint (as decoded from .fig binary).
 *
 * Structurally compatible with what `getGradientDirection()`,
 * `getGradientStops()`, etc. actually consume at runtime.
 */
export type KiwiGradientPaint = {
  readonly type: KiwiEnumValue;
  readonly opacity?: number;
  readonly visible?: boolean;
  readonly blendMode?: KiwiEnumValue;
  readonly stops: readonly { readonly color: FigColor; readonly position: number }[];
  readonly transform?: {
    readonly m00?: number;
    readonly m01?: number;
    readonly m02?: number;
    readonly m10?: number;
    readonly m11?: number;
    readonly m12?: number;
  };
};

/**
 * Kiwi-format solid paint.
 */
export type KiwiSolidPaint = {
  readonly type: KiwiEnumValue;
  readonly color: FigColor;
  readonly opacity?: number;
  readonly visible?: boolean;
  readonly blendMode?: KiwiEnumValue;
};

/**
 * Kiwi-format image paint.
 */
export type KiwiImagePaint = {
  readonly type: KiwiEnumValue;
  readonly opacity?: number;
  readonly visible?: boolean;
  readonly imageRef?: string;
  readonly imageScaleMode?: KiwiEnumValue;
};

/**
 * Kiwi-format effect.
 */
export type KiwiEffect = {
  readonly type: KiwiEnumValue;
  readonly visible?: boolean;
  readonly offset?: { readonly x: number; readonly y: number };
  readonly radius?: number;
  readonly color?: FigColor;
};

// =============================================================================
// Type-safe cast functions
//
// These are NOT arbitrary casts — they assert that the Kiwi runtime data
// is consumed by functions whose implementations handle both formats.
// The interpret SoT functions use `getPaintType()` / `getEffectTypeName()`
// which normalize KiwiEnumValue to string before matching.
// =============================================================================

/** Cast Kiwi gradient paint to FigGradientPaint for SoT interpret functions */
export function asGradientPaint(kiwi: KiwiGradientPaint): FigGradientPaint {
  return kiwi as unknown as FigGradientPaint;
}

/** Cast Kiwi paint to FigPaint for SoT interpret functions */
export function asPaint(kiwi: KiwiSolidPaint | KiwiGradientPaint | KiwiImagePaint): FigPaint {
  return kiwi as unknown as FigPaint;
}

/** Cast Kiwi image paint to FigImagePaint for SoT interpret functions */
export function asImagePaint(kiwi: KiwiImagePaint): FigImagePaint {
  return kiwi as unknown as FigImagePaint;
}

/** Cast Kiwi effect to FigEffect for SoT interpret functions */
export function asEffect(kiwi: KiwiEffect): FigEffect {
  return kiwi as unknown as FigEffect;
}
