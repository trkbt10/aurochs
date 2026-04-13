/**
 * @file PPTX Effects → FigEffect[]
 *
 * outer shadow → DROP_SHADOW (direction+distance → offset x,y)
 * inner shadow → INNER_SHADOW
 * softEdge → LAYER_BLUR (approximate)
 * glow, reflection → no Fig equivalent (dropped)
 */

import type { Effects, ShadowEffect } from "@aurochs-office/pptx/domain/effects";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigEffect } from "@aurochs/fig/types";
import { dmlColorToFig } from "./color";

export function dmlEffectsToFig(
  effects: Effects | undefined,
  colorContext?: ColorContext,
): readonly FigEffect[] {
  if (!effects) return [];
  const result: FigEffect[] = [];

  if (effects.shadow) {
    result.push(convertShadow(effects.shadow, colorContext));
  }
  if (effects.softEdge) {
    result.push({
      type: "LAYER_BLUR",
      visible: true,
      radius: effects.softEdge.radius,
    });
  }

  return result;
}

function convertShadow(shadow: ShadowEffect, ctx?: ColorContext): FigEffect {
  const dist = shadow.distance;
  const dirDeg = shadow.direction;
  const dirRad = dirDeg * (Math.PI / 180);

  return {
    type: shadow.type === "inner" ? "INNER_SHADOW" : "DROP_SHADOW",
    visible: true,
    color: dmlColorToFig(shadow.color, ctx),
    offset: {
      x: dist * Math.cos(dirRad),
      y: dist * Math.sin(dirRad),
    },
    radius: shadow.blurRadius,
    spread: 0,
  };
}
