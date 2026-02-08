/**
 * @file Effects builders for DrawingML
 */

import type { Effects, ReflectionEffect, ShadowEffect, GlowEffect, SoftEdgeEffect } from "@oxen-office/drawing-ml/domain/effects";
import { px, deg, pct } from "@oxen-office/drawing-ml/domain/units";
import type { EffectsSpec, ReflectionEffectSpec } from "../types";

/**
 * Build reflection effect from spec
 */
function buildReflection(spec: ReflectionEffectSpec): ReflectionEffect {
  return {
    blurRadius: px(spec.blurRadius ?? 0),
    startOpacity: pct((spec.startOpacity ?? 100) * 1000),
    startPosition: pct(0),
    endOpacity: pct((spec.endOpacity ?? 0) * 1000),
    endPosition: pct(100000),
    distance: px(spec.distance ?? 0),
    direction: deg(spec.direction ?? 0),
    fadeDirection: deg(spec.fadeDirection ?? 90),
    scaleX: pct((spec.scaleX ?? 100) * 1000),
    scaleY: pct((spec.scaleY ?? -100) * 1000),
  };
}

/**
 * Build effects object from spec
 */
export function buildEffects(spec: EffectsSpec): Effects {
  return {
    ...(spec.shadow && {
      shadow: {
        type: "outer" as const,
        color: { spec: { type: "srgb" as const, value: spec.shadow.color } },
        blurRadius: px(spec.shadow.blur ?? 4),
        distance: px(spec.shadow.distance ?? 3),
        direction: deg(spec.shadow.direction ?? 45),
      } satisfies ShadowEffect,
    }),
    ...(spec.glow && {
      glow: {
        color: { spec: { type: "srgb" as const, value: spec.glow.color } },
        radius: px(spec.glow.radius),
      } satisfies GlowEffect,
    }),
    ...(spec.softEdge && {
      softEdge: {
        radius: px(spec.softEdge.radius),
      } satisfies SoftEdgeEffect,
    }),
    ...(spec.reflection && { reflection: buildReflection(spec.reflection) }),
  };
}
