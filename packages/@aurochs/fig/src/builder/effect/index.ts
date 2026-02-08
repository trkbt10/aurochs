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
export { DropShadowBuilder, dropShadow } from "./drop-shadow";
export { InnerShadowBuilder, innerShadow } from "./inner-shadow";
export { LayerBlurBuilder, layerBlur } from "./layer-blur";
export { BackgroundBlurBuilder, backgroundBlur } from "./background-blur";

// Utility
import type { EffectData } from "./types";

/**
 * Combine multiple effects into an array
 */
export function effects(...builders: Array<{ build(): EffectData }>): readonly EffectData[] {
  return builders.map((b) => b.build());
}
