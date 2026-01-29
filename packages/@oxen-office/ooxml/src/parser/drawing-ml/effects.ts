/**
 * @file DrawingML effects parser
 *
 * Parses common DrawingML effects from `a:effectLst` (and `a:effectDag` as a container).
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effect Properties)
 */

import type { Color } from "../../domain/color";
import type { Effects, GlowEffect, ReflectionEffect, ShadowEffect, SoftEdgeEffect } from "../../domain/effects";
import { px, deg, pct } from "../../domain/units";
import { getAttr, getChild, type XmlElement } from "@oxen/xml";
import { parseColorFromParent } from "./color";
import { getAngleAttr, getBoolAttrOr, getEmuAttr, getPercent100kAttr } from "../primitive";

function getEffectColor(element: XmlElement, overrideColor?: Color): Color | undefined {
  const color = parseColorFromParent(element);
  if (!color) {
    return overrideColor;
  }

  if (color.spec.type === "scheme" && color.spec.value === "phClr" && overrideColor) {
    return overrideColor;
  }

  return color;
}

export function parseOuterShadowEffect(element: XmlElement, overrideColor?: Color): ShadowEffect | undefined {
  const color = getEffectColor(element, overrideColor);
  if (!color) {return undefined;}

  return {
    type: "outer",
    color,
    blurRadius: getEmuAttr(element, "blurRad") ?? px(0),
    distance: getEmuAttr(element, "dist") ?? px(0),
    direction: getAngleAttr(element, "dir") ?? deg(0),
    scaleX: getPercent100kAttr(element, "sx"),
    scaleY: getPercent100kAttr(element, "sy"),
    skewX: getAngleAttr(element, "kx"),
    skewY: getAngleAttr(element, "ky"),
    alignment: getAttr(element, "algn"),
    rotateWithShape: getBoolAttrOr(element, "rotWithShape", true),
  };
}

export function parseInnerShadowEffect(element: XmlElement, overrideColor?: Color): ShadowEffect | undefined {
  const color = getEffectColor(element, overrideColor);
  if (!color) {return undefined;}

  return {
    type: "inner",
    color,
    blurRadius: getEmuAttr(element, "blurRad") ?? px(0),
    distance: getEmuAttr(element, "dist") ?? px(0),
    direction: getAngleAttr(element, "dir") ?? deg(0),
  };
}

export function parseGlowEffect(element: XmlElement, overrideColor?: Color): GlowEffect | undefined {
  const color = getEffectColor(element, overrideColor);
  if (!color) {return undefined;}

  return {
    color,
    radius: getEmuAttr(element, "rad") ?? px(0),
  };
}

export function parseReflectionEffect(element: XmlElement): ReflectionEffect | undefined {
  return {
    blurRadius: getEmuAttr(element, "blurRad") ?? px(0),
    startOpacity: getPercent100kAttr(element, "stA") ?? pct(100),
    startPosition: getPercent100kAttr(element, "stPos") ?? pct(0),
    endOpacity: getPercent100kAttr(element, "endA") ?? pct(0),
    endPosition: getPercent100kAttr(element, "endPos") ?? pct(100),
    distance: getEmuAttr(element, "dist") ?? px(0),
    direction: getAngleAttr(element, "dir") ?? deg(0),
    fadeDirection: getAngleAttr(element, "fadeDir") ?? deg(90),
    scaleX: getPercent100kAttr(element, "sx") ?? pct(100),
    scaleY: getPercent100kAttr(element, "sy") ?? pct(100),
    skewX: getAngleAttr(element, "kx"),
    skewY: getAngleAttr(element, "ky"),
    alignment: getAttr(element, "algn"),
    rotateWithShape: getBoolAttrOr(element, "rotWithShape", true),
  };
}

export function parseSoftEdgeEffect(element: XmlElement): SoftEdgeEffect | undefined {
  const radius = getEmuAttr(element, "rad");
  if (radius === undefined) {return undefined;}

  return { radius };
}

export function parseEffects(spPr: XmlElement | undefined, overrideColor?: Color): Effects | undefined {
  if (!spPr) {return undefined;}

  const effectLst = getChild(spPr, "a:effectLst") ?? getChild(spPr, "a:effectDag");
  if (!effectLst) {return undefined;}

  const shadow = parseShadow(effectLst, overrideColor);

  const glowEl = getChild(effectLst, "a:glow");
  const glow = glowEl ? parseGlowEffect(glowEl, overrideColor) : undefined;

  const reflectionEl = getChild(effectLst, "a:reflection");
  const reflection = reflectionEl ? parseReflectionEffect(reflectionEl) : undefined;

  const softEdgeEl = getChild(effectLst, "a:softEdge");
  const softEdge = softEdgeEl ? parseSoftEdgeEffect(softEdgeEl) : undefined;

  if (!shadow && !glow && !reflection && !softEdge) {return undefined;}
  return { shadow, glow, reflection, softEdge };
}

function parseShadow(effectLst: XmlElement, overrideColor?: Color): Effects["shadow"] | undefined {
  const outerShdw = getChild(effectLst, "a:outerShdw");
  if (outerShdw) {
    return parseOuterShadowEffect(outerShdw, overrideColor);
  }

  const innerShdw = getChild(effectLst, "a:innerShdw");
  if (innerShdw) {
    return parseInnerShadowEffect(innerShdw, overrideColor);
  }

  return undefined;
}
