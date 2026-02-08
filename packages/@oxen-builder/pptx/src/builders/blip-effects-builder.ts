/**
 * @file Build BlipEffects domain object from BlipEffectSpec
 */

import type { BlipEffects } from "@oxen-office/pptx/domain/color/types";
import { deg, pct, px } from "@oxen-office/drawing-ml/domain/units";
import { buildColor } from "@oxen-builder/drawing-ml/fill";
import type { BlipEffectSpec } from "../types";

/**
 * Convert a CLI BlipEffectSpec into the domain BlipEffects object.
 *
 * Percent values in the spec are expressed as 0-100, and converted to 0-100000.
 */
export function buildBlipEffectsFromSpec(spec: BlipEffectSpec): BlipEffects {
  return {
    ...(spec.alphaBiLevel && { alphaBiLevel: { threshold: pct(spec.alphaBiLevel.threshold * 1000) } }),
    ...(spec.alphaCeiling && { alphaCeiling: true }),
    ...(spec.alphaFloor && { alphaFloor: true }),
    ...(spec.alphaInv && { alphaInv: true }),
    ...(spec.alphaMod && { alphaMod: true }),
    ...(spec.alphaRepl && { alphaRepl: { alpha: pct(spec.alphaRepl.alpha * 1000) } }),
    ...(spec.biLevel && { biLevel: { threshold: pct(spec.biLevel.threshold * 1000) } }),
    ...(spec.blur && { blur: { radius: px(spec.blur.radius), grow: false } }),
    ...(spec.colorChange && {
      colorChange: {
        from: buildColor(spec.colorChange.from),
        to: buildColor(spec.colorChange.to),
        useAlpha: spec.colorChange.useAlpha ?? false,
      },
    }),
    ...(spec.colorReplace && { colorReplace: { color: buildColor(spec.colorReplace.color) } }),
    ...(spec.duotone && {
      duotone: {
        colors: [buildColor(spec.duotone.colors[0]), buildColor(spec.duotone.colors[1])] as const,
      },
    }),
    ...(spec.grayscale && { grayscale: true }),
    ...(spec.hsl && {
      hsl: {
        hue: deg(spec.hsl.hue),
        saturation: pct(spec.hsl.saturation * 1000),
        luminance: pct(spec.hsl.luminance * 1000),
      },
    }),
    ...(spec.luminance && {
      luminance: {
        brightness: pct(spec.luminance.brightness * 1000),
        contrast: pct(spec.luminance.contrast * 1000),
      },
    }),
    ...(spec.tint && {
      tint: {
        hue: deg(spec.tint.hue),
        amount: pct(spec.tint.amount * 1000),
      },
    }),
    ...(spec.alphaModFix !== undefined && { alphaModFix: { amount: pct(spec.alphaModFix * 1000) } }),
  };
}
