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
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { figColorToColor } from "./color";

/**
 * Convert Fig effects to PPTX Effects.
 * DrawingML effectLst supports at most one shadow and one soft edge.
 * Returns undefined if nothing to convert.
 */
export function figEffectsToDml(figEffects: readonly FigEffect[]): Effects | undefined {
  const visibleEffects = figEffects.filter((e) => e.visible !== false);
  const shadow = findFirstShadow(visibleEffects);
  const softEdgeRadius = findFirstSoftEdgeRadius(visibleEffects);

  if (!shadow && softEdgeRadius === undefined) {return undefined;}

  return {
    ...(shadow ? { shadow } : {}),
    ...(softEdgeRadius !== undefined && softEdgeRadius > 0 ? { softEdge: { radius: px(softEdgeRadius) } } : {}),
  };
}

function findFirstShadow(effects: readonly FigEffect[]): ShadowEffect | undefined {
  for (const effect of effects) {
    const typeName = resolveEffectType(effect);
    if (typeName === "DROP_SHADOW" || typeName === "INNER_SHADOW") {
      return convertShadow(effect, typeName);
    }
  }
  return undefined;
}

function findFirstSoftEdgeRadius(effects: readonly FigEffect[]): number | undefined {
  for (const effect of effects) {
    const typeName = resolveEffectType(effect);
    if (typeName === "LAYER_BLUR") {
      return effect.radius ?? 0;
    }
  }
  return undefined;
}

function resolveEffectType(effect: FigEffect): string {
  const t = effect.type;
  return typeof t === "string" ? t : t.name;
}

function convertShadow(effect: FigEffect, typeName: string): ShadowEffect {
  // offset is optional — no offset means the shadow sits directly behind the shape
  const ox = effect.offset?.x ?? 0;
  const oy = effect.offset?.y ?? 0;
  const distance = Math.sqrt(ox * ox + oy * oy);
  const directionDeg = Math.atan2(oy, ox) * (180 / Math.PI);

  if (!effect.color) {
    console.warn(
      `[fig-to-dml] Shadow effect of type "${typeName}" has no color. Using opaque black.`,
    );
  }
  // Figma always sets color on shadow effects. If absent, the effect data
  // is malformed. Use opaque black so the shadow is at least visible.
  const color = effect.color ?? { r: 0, g: 0, b: 0, a: 1 };

  return {
    type: typeName === "DROP_SHADOW" ? "outer" : "inner",
    color: figColorToColor(color),
    blurRadius: px(effect.radius ?? 0) ,
    distance: px(distance) ,
    direction: deg(normalizeAngle(directionDeg)) ,
    rotateWithShape: true,
  };
}

function normalizeAngle(d: number): number {
  const a = d % 360;
  return a < 0 ? a + 360 : a;
}
