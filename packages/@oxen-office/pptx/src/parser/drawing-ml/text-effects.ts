/**
 * @file Text effects resolution
 *
 * Converts domain Effects objects to resolved text effect configurations for rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */

import type { Effects, ShadowEffect, GlowEffect, SoftEdgeEffect, ReflectionEffect } from "../../domain/effects";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type {
  TextEffectsConfig,
  TextShadowConfig,
  TextGlowConfig,
  TextSoftEdgeConfig,
  TextReflectionConfig,
} from "../../domain/drawing-ml/text-effects";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";

// =============================================================================
// Resolution Functions
// =============================================================================

/**
 * Resolve alpha value from color transform.
 */
function resolveAlpha(transform: Color["transform"] | undefined): number {
  if (transform?.alpha !== undefined) {
    return transform.alpha / 100;
  }
  return 1;
}

/**
 * Resolve a Color to a hex string with # prefix.
 */
function resolveColorToHex(
  color: Color | undefined,
  colorContext: ColorContext,
): string | undefined {
  if (color === undefined) {
    return undefined;
  }
  const resolved = resolveColor(color, colorContext);
  return resolved !== undefined ? `#${resolved}` : undefined;
}

/**
 * Convert shadow direction (60000ths of a degree) and distance to dx/dy offsets.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
function shadowToOffset(
  direction: number,
  distance: number,
): { dx: number; dy: number } {
  // Direction is in 60000ths of a degree
  const radians = (direction / 60000) * (Math.PI / 180);
  return {
    dx: Math.cos(radians) * distance,
    dy: Math.sin(radians) * distance,
  };
}

/**
 * Resolve ShadowEffect to TextShadowConfig.
 */
function resolveShadow(
  shadow: ShadowEffect,
  colorContext: ColorContext,
): TextShadowConfig | undefined {
  const hex = resolveColorToHex(shadow.color, colorContext);
  if (hex === undefined) {
    return undefined;
  }

  const alpha = resolveAlpha(shadow.color.transform);
  const { dx, dy } = shadowToOffset(
    shadow.direction as number,
    shadow.distance as number,
  );

  return {
    type: shadow.type,
    color: hex,
    opacity: alpha,
    blurRadius: shadow.blurRadius as number,
    dx,
    dy,
  };
}

/**
 * Resolve GlowEffect to TextGlowConfig.
 */
function resolveGlow(
  glow: GlowEffect,
  colorContext: ColorContext,
): TextGlowConfig | undefined {
  const hex = resolveColorToHex(glow.color, colorContext);
  if (hex === undefined) {
    return undefined;
  }

  const alpha = resolveAlpha(glow.color.transform);

  return {
    color: hex,
    opacity: alpha,
    radius: glow.radius as number,
  };
}

/**
 * Resolve SoftEdgeEffect to TextSoftEdgeConfig.
 */
function resolveSoftEdge(softEdge: SoftEdgeEffect): TextSoftEdgeConfig {
  return {
    radius: softEdge.radius as number,
  };
}

/**
 * Resolve ReflectionEffect to TextReflectionConfig.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
function resolveReflection(reflection: ReflectionEffect): TextReflectionConfig {
  return {
    blurRadius: reflection.blurRadius as number,
    startOpacity: reflection.startOpacity as number,
    startPosition: reflection.startPosition as number,
    endOpacity: reflection.endOpacity as number,
    endPosition: reflection.endPosition as number,
    distance: reflection.distance as number,
    direction: reflection.direction as number,
    fadeDirection: reflection.fadeDirection as number,
    scaleX: reflection.scaleX as number,
    scaleY: reflection.scaleY as number,
    skewX: reflection.skewX as number | undefined,
    skewY: reflection.skewY as number | undefined,
  };
}

/**
 * Convert Effects domain object to TextEffectsConfig for rendering.
 *
 * @param effects - Effects domain object
 * @param colorContext - Color resolution context
 * @returns Resolved text effects configuration
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */
export function resolveTextEffects(
  effects: Effects | undefined,
  colorContext: ColorContext,
): TextEffectsConfig | undefined {
  if (effects === undefined) {
    return undefined;
  }

  const shadow = effects.shadow ? resolveShadow(effects.shadow, colorContext) : undefined;
  const glow = effects.glow ? resolveGlow(effects.glow, colorContext) : undefined;
  const softEdge = effects.softEdge ? resolveSoftEdge(effects.softEdge) : undefined;
  const reflection = effects.reflection ? resolveReflection(effects.reflection) : undefined;

  // Only return config if at least one effect is present
  if (
    shadow === undefined &&
    glow === undefined &&
    softEdge === undefined &&
    reflection === undefined
  ) {
    return undefined;
  }

  return {
    shadow,
    glow,
    softEdge,
    reflection,
  };
}
