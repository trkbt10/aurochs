/**
 * @file Kiwi → domain normalization
 *
 * The Kiwi decoder represents enums as `{ value, name }` objects
 * (KiwiEnumValue). The domain types in `../types` declare several
 * enum-valued fields as string unions (SSoT) — `FigPaintBase.type`,
 * `FigPaintBase.blendMode`, `FigImagePaint.scaleMode`, stroke enums on
 * FigNode, etc.
 *
 * This module walks the raw decoded message once and rewrites every
 * such field from the `{ value, name }` shape to its `name` string.
 * After normalisation, the downstream consumer types line up with the
 * real runtime shape — no `as FigPaint` casts needed at call sites.
 */
import type { KiwiEnumValue, FigNode } from "../types";
import type { FigBlob } from "./blob-decoder";

function isKiwiEnumValue(value: unknown): value is KiwiEnumValue {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as { readonly name?: unknown; readonly value?: unknown };
  return typeof obj.name === "string" && typeof obj.value === "number";
}

/** Extract the name string from a possibly-enum value, or return the input unchanged. */
function enumNameOrValue(value: unknown): unknown {
  return isKiwiEnumValue(value) ? value.name : value;
}

/**
 * Fields on any FigPaint variant whose raw Kiwi shape is KiwiEnumValue
 * but whose SSoT domain type is a string union. Listing them here
 * centralises the kiwi → domain mapping.
 */
const PAINT_ENUM_FIELDS = ["type", "blendMode", "scaleMode", "imageScaleMode"] as const;

/**
 * Fields on FigNode whose raw Kiwi shape is KiwiEnumValue but whose
 * SSoT domain type is a string union.
 */
const NODE_ENUM_FIELDS = ["strokeAlign", "strokeJoin", "strokeCap", "blendMode"] as const;

function normalizePaintInPlace(paint: Record<string, unknown>): void {
  for (const field of PAINT_ENUM_FIELDS) {
    if (field in paint) {
      paint[field] = enumNameOrValue(paint[field]);
    }
  }
}

function normalizeEffectInPlace(effect: Record<string, unknown>): void {
  if ("type" in effect) effect.type = enumNameOrValue(effect.type);
  if ("blendMode" in effect) effect.blendMode = enumNameOrValue(effect.blendMode);
}

function normalizePaintList(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const paint of list) {
    if (paint && typeof paint === "object") {
      normalizePaintInPlace(paint as Record<string, unknown>);
    }
  }
}

function normalizeEffectList(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const effect of list) {
    if (effect && typeof effect === "object") {
      normalizeEffectInPlace(effect as Record<string, unknown>);
    }
  }
}

function normalizeOverrideInPlace(override: Record<string, unknown>): void {
  // symbolOverrides entries carry the same paint/effect/enum shape as
  // nodes (fillPaints, strokePaints, effects, blendMode, stroke enums).
  // Without this pass, override.fillPaints stays in kiwi `{value,name}`
  // form and the renderer's `paint.type === "SOLID"` discriminator
  // mismatches, silently dropping the override fill (Bento Cron 4×2
  // Brand INSTANCE "Brand=Cron" orange override was the canary bug).
  for (const field of NODE_ENUM_FIELDS) {
    if (field in override) {
      override[field] = enumNameOrValue(override[field]);
    }
  }
  normalizePaintList(override.fillPaints);
  normalizePaintList(override.strokePaints);
  normalizePaintList(override.backgroundPaints);
  normalizeEffectList(override.effects);
}

function normalizeOverrideList(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const entry of list) {
    if (entry && typeof entry === "object") {
      normalizeOverrideInPlace(entry as Record<string, unknown>);
    }
  }
}

function normalizeNodeInPlace(node: Record<string, unknown>): void {
  // Node-level enum fields
  for (const field of NODE_ENUM_FIELDS) {
    if (field in node) {
      node[field] = enumNameOrValue(node[field]);
    }
  }
  // Paint lists
  normalizePaintList(node.fillPaints);
  normalizePaintList(node.strokePaints);
  normalizePaintList(node.backgroundPaints);
  // Effects
  normalizeEffectList(node.effects);
  // symbolOverrides carry the same shape as nodes — recurse.
  //
  // Two layout variants exist in the wild:
  //   • Builder-generated files put `symbolOverrides` at the node's
  //     top level.
  //   • Real Figma exports put them inside `symbolData.symbolOverrides`
  //     alongside `derivedSymbolData`.
  // `getInstanceSymbolOverrides` inspects both, so our normalisation
  // must also reach both. Missing either path leaves paint.type in
  // kiwi form and drops the override silently at render time (this was
  // the Bento Cron 4×2 Brand INSTANCE "Brand=Cron" orange bug).
  normalizeOverrideList(node.symbolOverrides);
  const symbolData = node.symbolData;
  if (symbolData && typeof symbolData === "object") {
    normalizeOverrideList((symbolData as Record<string, unknown>).symbolOverrides);
  }
}

/**
 * Walk an array of decoded FigNode-shaped objects and normalise every
 * KiwiEnumValue-valued field whose SSoT type is a string union.
 *
 * This is the kiwi→domain boundary for the parser. After this runs
 * the tree is structurally assignable to `FigNode` without casts.
 */
export function normaliseNodeChanges(rawNodes: readonly unknown[]): readonly FigNode[] {
  for (const node of rawNodes) {
    if (node && typeof node === "object") {
      normalizeNodeInPlace(node as Record<string, unknown>);
    }
  }
  // After mutation every node carries domain-shape enum fields, so the
  // shape matches FigNode. The array cast below is *not* an SSoT
  // escape hatch: the shape is proven by the normalisation above.
  return rawNodes as readonly FigNode[];
}

/** Coerce raw decoded blobs to the typed array (no normalisation required). */
export function asBlobArray(raw: unknown): readonly FigBlob[] {
  if (!Array.isArray(raw)) return [];
  return raw as readonly FigBlob[];
}

// =============================================================================
// Denormalization (domain string → Kiwi `{ value, name }`)
// =============================================================================
//
// The fig Kiwi encoder emits enum fields as `{ value, name }` objects.
// After the parser normalisation pass, enum fields in memory are bare
// SSoT strings. Saving back to .fig therefore requires the inverse
// mapping. These helpers use the same constants the builder uses to
// emit fresh files, so there is exactly one kiwi ↔ domain dictionary
// per enum.

import {
  PAINT_TYPE_VALUES,
  BLEND_MODE_VALUES,
  STROKE_CAP_VALUES,
  STROKE_JOIN_VALUES,
  STROKE_ALIGN_VALUES,
} from "../constants";

function lookupEnum(values: Readonly<Record<string, number>>, name: unknown): KiwiEnumValue | unknown {
  if (typeof name !== "string") return name;
  if (!(name in values)) return name;
  return { value: values[name], name };
}

// Image scale mode constants live on the kiwi schema but not as a
// plain VALUES dictionary in constants/. Mirror the builder's mapping.
const IMAGE_SCALE_MODE_VALUES: Readonly<Record<string, number>> = {
  FILL: 0,
  FIT: 1,
  STRETCH: 2,
  TILE: 3,
  CROP: 4,
};

function denormalizePaintInPlace(paint: Record<string, unknown>): void {
  if (typeof paint.type === "string") paint.type = lookupEnum(PAINT_TYPE_VALUES, paint.type);
  if (typeof paint.blendMode === "string") paint.blendMode = lookupEnum(BLEND_MODE_VALUES, paint.blendMode);
  if (typeof paint.scaleMode === "string") paint.scaleMode = lookupEnum(IMAGE_SCALE_MODE_VALUES, paint.scaleMode);
  if (typeof paint.imageScaleMode === "string") paint.imageScaleMode = lookupEnum(IMAGE_SCALE_MODE_VALUES, paint.imageScaleMode);
}

function denormalizeEffectInPlace(effect: Record<string, unknown>): void {
  // Effect type lookup table is internal to the builder's effect
  // constants. We use a local minimal map — effects are currently the
  // only place the domain ↔ kiwi effect type mapping lives outside
  // the builder. If that grows, consolidate into constants/.
  if (typeof effect.type === "string") {
    const EFFECT_VALUES: Readonly<Record<string, number>> = {
      INNER_SHADOW: 0,
      DROP_SHADOW: 1,
      LAYER_BLUR: 2,
      BACKGROUND_BLUR: 3,
    };
    effect.type = lookupEnum(EFFECT_VALUES, effect.type);
  }
  if (typeof effect.blendMode === "string") effect.blendMode = lookupEnum(BLEND_MODE_VALUES, effect.blendMode);
}

function denormalizePaintList(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const paint of list) {
    if (paint && typeof paint === "object") denormalizePaintInPlace(paint as Record<string, unknown>);
  }
}

function denormalizeEffectList(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const effect of list) {
    if (effect && typeof effect === "object") denormalizeEffectInPlace(effect as Record<string, unknown>);
  }
}

function denormalizeOverrideInPlace(override: Record<string, unknown>): void {
  if (typeof override.strokeAlign === "string") override.strokeAlign = lookupEnum(STROKE_ALIGN_VALUES, override.strokeAlign);
  if (typeof override.strokeJoin === "string") override.strokeJoin = lookupEnum(STROKE_JOIN_VALUES, override.strokeJoin);
  if (typeof override.strokeCap === "string") override.strokeCap = lookupEnum(STROKE_CAP_VALUES, override.strokeCap);
  if (typeof override.blendMode === "string") override.blendMode = lookupEnum(BLEND_MODE_VALUES, override.blendMode);
  denormalizePaintList(override.fillPaints);
  denormalizePaintList(override.strokePaints);
  denormalizePaintList(override.backgroundPaints);
  denormalizeEffectList(override.effects);
}

function denormalizeOverrideList(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const entry of list) {
    if (entry && typeof entry === "object") denormalizeOverrideInPlace(entry as Record<string, unknown>);
  }
}

function denormalizeNodeInPlace(node: Record<string, unknown>): void {
  if (typeof node.strokeAlign === "string") node.strokeAlign = lookupEnum(STROKE_ALIGN_VALUES, node.strokeAlign);
  if (typeof node.strokeJoin === "string") node.strokeJoin = lookupEnum(STROKE_JOIN_VALUES, node.strokeJoin);
  if (typeof node.strokeCap === "string") node.strokeCap = lookupEnum(STROKE_CAP_VALUES, node.strokeCap);
  if (typeof node.blendMode === "string") node.blendMode = lookupEnum(BLEND_MODE_VALUES, node.blendMode);
  denormalizePaintList(node.fillPaints);
  denormalizePaintList(node.strokePaints);
  denormalizePaintList(node.backgroundPaints);
  denormalizeEffectList(node.effects);
  // Override entries mirror the node paint shape; reverse them too.
  denormalizeOverrideList(node.symbolOverrides);
  const symbolData = node.symbolData;
  if (symbolData && typeof symbolData === "object") {
    denormalizeOverrideList((symbolData as Record<string, unknown>).symbolOverrides);
  }
}

/**
 * Materialise a node suitable for Kiwi encoding: deep-clone the input
 * and replace every domain-string enum with its `{ value, name }` form
 * using the canonical constants.
 *
 * The clone is necessary because the encoder calls may be invoked in
 * parallel with active readers of the domain object (React renders,
 * cached FigDesignDocument); mutating-in-place would break them.
 */
export function denormaliseNodeForEncode(node: FigNode): Record<string, unknown> {
  const clone = structuredClone(node) as unknown as Record<string, unknown>;
  denormalizeNodeInPlace(clone);
  return clone;
}
