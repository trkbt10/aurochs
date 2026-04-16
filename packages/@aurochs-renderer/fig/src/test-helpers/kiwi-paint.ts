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

import type { FigColor, FigPaintBase, FigPaint, FigGradientPaint, FigImagePaint, FigEffect } from "@aurochs/fig/types";

// =============================================================================
// KiwiEnumValue
// =============================================================================

type KiwiEnumValue = { readonly value: number; readonly name: string };

// =============================================================================
// Kiwi-format Paint Types
//
// These extend FigPaintBase so TypeScript knows they are structurally
// valid paint objects. The `type` field is KiwiEnumValue which is
// already part of FigPaintBase's `type` union.
// =============================================================================

/**
 * Kiwi-format gradient paint (as decoded from .fig binary).
 *
 * Structurally compatible with what `getGradientDirection()`,
 * `getGradientStops()`, etc. actually consume at runtime.
 */
export type KiwiGradientPaint = FigPaintBase & {
  readonly type: KiwiEnumValue;
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
export type KiwiSolidPaint = FigPaintBase & {
  readonly type: KiwiEnumValue;
  readonly color: FigColor;
  readonly blendMode?: KiwiEnumValue;
};

/**
 * Kiwi-format image paint.
 */
export type KiwiImagePaint = FigPaintBase & {
  readonly type: KiwiEnumValue;
  readonly imageRef?: string;
  readonly imageScaleMode?: KiwiEnumValue;
};

/**
 * Kiwi-format effect.
 * Extends the shape that FigEffect accepts (type as KiwiEnumValue is
 * part of the FigEffect union's base type field).
 */
export type KiwiEffect = {
  readonly type: KiwiEnumValue;
  readonly visible?: boolean;
  readonly offset?: { readonly x: number; readonly y: number };
  readonly radius?: number;
  readonly color?: FigColor;
};

// =============================================================================
// Type guard cast functions
//
// These are NOT arbitrary casts — they assert that the Kiwi runtime data
// is consumed by functions whose implementations handle both formats.
// The interpret SoT functions use `getPaintType()` / `getEffectTypeName()`
// which normalize KiwiEnumValue to string before matching.
//
// Since Kiwi types now extend FigPaintBase, KiwiGradientPaint IS-A
// FigPaintBase, and the type predicates narrow to the specific Fig subtypes.
// =============================================================================

/** Assert that a Kiwi gradient paint is treated as FigGradientPaint by SoT functions */
export function asGradientPaint(kiwi: KiwiGradientPaint): kiwi is KiwiGradientPaint & FigGradientPaint {
  return kiwi !== null;
}

/** Cast a Kiwi paint to FigPaint for use in SoT functions */
export function asPaint(kiwi: KiwiSolidPaint | KiwiGradientPaint | KiwiImagePaint): FigPaint {
  // Kiwi paint types extend FigPaintBase, which is part of the FigPaint union.
  // The interpret SoT functions normalize type via getPaintType() at runtime.
  return kiwi as FigPaintBase as FigPaint;
}

/** Assert that a Kiwi image paint is treated as FigImagePaint by SoT functions */
export function asImagePaint(kiwi: KiwiImagePaint): kiwi is KiwiImagePaint & FigImagePaint {
  return kiwi !== null;
}

/** Assert that a Kiwi effect is treated as FigEffect by SoT functions */
export function asEffect(kiwi: KiwiEffect): kiwi is KiwiEffect & FigEffect {
  return kiwi !== null;
}
