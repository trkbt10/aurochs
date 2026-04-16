/**
 * @file Convert Figma effects to scene graph Effects
 *
 * Consumes shared effect interpretation from effects/interpret.ts (the SoT).
 */

import type { FigEffect } from "@aurochs/fig/types";
import { getEffectTypeName, isEffectVisible, extractShadowParams } from "../../effects";
import type { Effect } from "../types";
import { convertFigmaBlendMode } from "./blend-mode";

/**
 * Convert Figma effects array to scene graph Effects.
 * Only converts visible effects.
 */
export function convertEffectsToScene(effects: readonly FigEffect[] | undefined): Effect[] {
  if (!effects || effects.length === 0) {
    return [];
  }

  const result: Effect[] = [];

  for (const effect of effects) {
    if (!isEffectVisible(effect)) {continue;}

    const typeName = getEffectTypeName(effect);
    const blendMode = convertFigmaBlendMode(effect.blendMode);

    switch (typeName) {
      case "DROP_SHADOW": {
        const p = extractShadowParams(effect);
        result.push({
          type: "drop-shadow",
          offset: { x: p.offsetX, y: p.offsetY },
          radius: p.radius,
          color: p.color,
          spread: effect.spread ?? undefined,
          blendMode,
        });
        break;
      }

      case "INNER_SHADOW": {
        const p = extractShadowParams(effect);
        result.push({
          type: "inner-shadow",
          offset: { x: p.offsetX, y: p.offsetY },
          radius: p.radius,
          color: p.color,
          spread: effect.spread ?? undefined,
          blendMode,
        });
        break;
      }

      case "FOREGROUND_BLUR":
        result.push({ type: "layer-blur", radius: effect.radius ?? 0 });
        break;

      case "BACKGROUND_BLUR":
        result.push({ type: "background-blur", radius: effect.radius ?? 0 });
        break;
    }
  }

  return result;
}
