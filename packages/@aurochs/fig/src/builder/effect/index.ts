/**
 * @file Effect builders
 *
 * Provides builders for:
 * - Drop shadow
 * - Inner shadow
 * - Layer blur
 * - Background blur
 */

// Types
export type {
  BaseEffectData,
  ShadowEffectData,
  BlurEffectData,
  EffectData,
} from "./types";

// Builders
export { type DropShadowBuilder, dropShadow } from "./drop-shadow";
export { type InnerShadowBuilder, innerShadow } from "./inner-shadow";
export { type LayerBlurBuilder, layerBlur } from "./layer-blur";
export { type BackgroundBlurBuilder, backgroundBlur } from "./background-blur";

// Utility
import type { EffectData } from "./types";

/**
 * Combine multiple effects into an array
 */
export function effects(...builders: Array<{ build(): EffectData }>): readonly EffectData[] {
  return builders.map((b) => b.build());
}
