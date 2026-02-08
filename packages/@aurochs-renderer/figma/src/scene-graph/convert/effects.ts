/**
 * @file Convert Figma effects to scene graph Effects
 */

import type { FigEffect } from "@aurochs/fig/types";
import type { Effect } from "../types";
import { figColorToSceneColor } from "./fill";

/**
 * Get effect type name from Figma's enum format
 */
function getEffectTypeName(effect: FigEffect): string {
  const type = effect.type;
  if (typeof type === "string") return type;
  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }
  return "";
}

/**
 * Convert Figma effects array to scene graph Effects
 *
 * Only converts visible effects.
 */
export function convertEffectsToScene(effects: readonly FigEffect[] | undefined): Effect[] {
  if (!effects || effects.length === 0) {
    return [];
  }

  const result: Effect[] = [];

  for (const effect of effects) {
    if (effect.visible === false) continue;

    const typeName = getEffectTypeName(effect);

    switch (typeName) {
      case "DROP_SHADOW": {
        const color = effect.color ? figColorToSceneColor(effect.color) : { r: 0, g: 0, b: 0, a: 0.25 };
        result.push({
          type: "drop-shadow",
          offset: {
            x: effect.offset?.x ?? 0,
            y: effect.offset?.y ?? 0,
          },
          radius: effect.radius ?? 0,
          color,
        });
        break;
      }

      case "INNER_SHADOW": {
        const color = effect.color ? figColorToSceneColor(effect.color) : { r: 0, g: 0, b: 0, a: 0.25 };
        result.push({
          type: "inner-shadow",
          offset: {
            x: effect.offset?.x ?? 0,
            y: effect.offset?.y ?? 0,
          },
          radius: effect.radius ?? 0,
          color,
        });
        break;
      }

      case "LAYER_BLUR":
        result.push({
          type: "layer-blur",
          radius: effect.radius ?? 0,
        });
        break;

      case "BACKGROUND_BLUR":
        result.push({
          type: "background-blur",
          radius: effect.radius ?? 0,
        });
        break;
    }
  }

  return result;
}
