/**
 * @file Effects Editor types
 */

import type { ReactNode } from "react";
import type { Effects } from "@oxen/pptx/domain/types";

/** Keys of the Effects object */
export type EffectKey = keyof Effects;

/** Effect category for grouping in the UI */
export type EffectCategory = "visual" | "alpha" | "color" | "transform";

/** Configuration for a single effect type */
export type EffectConfig = {
  readonly key: EffectKey;
  readonly label: string;
  readonly category: EffectCategory;
  readonly create: () => Effects[EffectKey];
  readonly render: (
    value: NonNullable<Effects[EffectKey]>,
    onChange: (v: NonNullable<Effects[EffectKey]>) => void,
    disabled?: boolean
  ) => ReactNode;
};

/** Category metadata */
export type CategoryMeta = {
  readonly label: string;
  readonly order: number;
};

/** Map of category to its metadata */
export const EFFECT_CATEGORIES: Record<EffectCategory, CategoryMeta> = {
  visual: { label: "Visual", order: 0 },
  alpha: { label: "Alpha", order: 1 },
  color: { label: "Color", order: 2 },
  transform: { label: "Transform", order: 3 },
};
