/**
 * @file FigEffect[] → PPTX Effects
 *
 * Figma shadows use offset (x, y).
 * DrawingML shadows use direction (angle) + distance (hypotenuse).
 *
 * DROP_SHADOW → outer shadow
 * INNER_SHADOW → inner shadow
 * LAYER_BLUR → soft edge (approximate — DrawingML has no layer blur)
 * BACKGROUND_BLUR → no DrawingML equivalent (dropped)
 */

import type { FigEffect } from "@aurochs/fig/types";
import type { Effects, ShadowEffect } from "@aurochs-office/pptx/domain/effects";
import type { Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { figColorToColor } from "./color";

/**
 * Convert Fig effects to PPTX Effects.
 * DrawingML effectLst supports at most one shadow and one soft edge.
 * Returns undefined if nothing to convert.
 */
export function figEffectsToDml(figEffects: readonly FigEffect[]): Effects | undefined {
  let shadow: ShadowEffect | undefined;
  let softEdgeRadius: number | undefined;

  for (const effect of figEffects) {
    if (effect.visible === false) continue;
    const typeName = resolveEffectType(effect);

    if (!shadow && (typeName === "DROP_SHADOW" || typeName === "INNER_SHADOW")) {
      shadow = convertShadow(effect, typeName);
    }

    if (softEdgeRadius === undefined && typeName === "LAYER_BLUR") {
      softEdgeRadius = effect.radius ?? 0;
    }
  }

  if (!shadow && softEdgeRadius === undefined) return undefined;

  const result: Effects = {};
  if (shadow) (result as { shadow: ShadowEffect }).shadow = shadow;
  if (softEdgeRadius !== undefined && softEdgeRadius > 0) {
    (result as { softEdge: { radius: Pixels } }).softEdge = {
      radius: px(softEdgeRadius) as Pixels,
    };
  }
  return result;
}

function resolveEffectType(effect: FigEffect): string {
  const t = effect.type;
  return typeof t === "string" ? t : t.name;
}

function convertShadow(effect: FigEffect, typeName: string): ShadowEffect {
  const ox = effect.offset?.x ?? 0;
  const oy = effect.offset?.y ?? 0;
  const distance = Math.sqrt(ox * ox + oy * oy);
  const directionDeg = Math.atan2(oy, ox) * (180 / Math.PI);
  const color = effect.color ?? { r: 0, g: 0, b: 0, a: 0.25 };

  return {
    type: typeName === "DROP_SHADOW" ? "outer" : "inner",
    color: figColorToColor(color),
    blurRadius: px(effect.radius ?? 0) as Pixels,
    distance: px(distance) as Pixels,
    direction: deg(normalizeAngle(directionDeg)) as Degrees,
    rotateWithShape: true,
  };
}

function normalizeAngle(d: number): number {
  let a = d % 360;
  if (a < 0) a += 360;
  return a;
}
