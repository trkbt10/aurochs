/**
 * @file Effects parser
 *
 * Parses DrawingML effect elements to Effects domain objects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Effect Properties
 */

import type {
  Color,
  Effects,
  AlphaBiLevelEffect,
  AlphaCeilingEffect,
  AlphaFloorEffect,
  AlphaInverseEffect,
  AlphaModulateEffect,
  AlphaModulateFixedEffect,
  AlphaOutsetEffect,
  AlphaReplaceEffect,
  BiLevelEffect,
  BlendEffect,
  BlendMode,
  ColorChangeEffect,
  ColorReplaceEffect,
  DuotoneEffect,
  EffectContainer,
  FillEffectType,
  FillOverlayEffect,
  GrayscaleEffect,
  PresetShadowEffect,
  PresetShadowValue,
  RelativeOffsetEffect,
  GlowEffect,
  ReflectionEffect,
  ShadowEffect,
  SoftEdgeEffect,
  StyleReference,
} from "../../domain/index";
import { px, deg, pct } from "../../domain/types";
import { getAttr, getChild, type XmlElement } from "../../../xml/index";
import { parseColor, parseColorFromParent } from "./color-parser";
import {
  getAngleAttr,
  getBoolAttrOr,
  getEmuAttr,
  getPercent100kAttr,
  parseFixedPercentage,
  parsePositivePercentage,
  getPercentAttr,
} from "../primitive";

// =============================================================================
// Shadow Parsing
// =============================================================================

/**
 * Get effect color, applying phClr override when provided.
 *
 * Per ECMA-376, phClr (placeholder color) is replaced with the actual color
 * from the style reference during rendering.
 */
function getEffectColor(element: XmlElement, overrideColor?: Color): Color | undefined {
  const color = parseColorFromParent(element);
  if (!color) {
    return overrideColor;
  }

  // phClr (placeholder color) should be replaced with the override color
  if (color.spec.type === "scheme" && color.spec.value === "phClr" && overrideColor) {
    return overrideColor;
  }

  return color;
}

/**
 * Parse outer shadow effect
 * @see ECMA-376 Part 1, Section 20.1.8.49
 */
function parseOuterShadow(element: XmlElement, overrideColor?: Color): ShadowEffect | undefined {
  const color = getEffectColor(element, overrideColor);

  if (!color) {return undefined;}

  return {
    type: "outer",
    color,
    blurRadius: getEmuAttr(element, "blurRad") ?? px(0),
    distance: getEmuAttr(element, "dist") ?? px(0),
    direction: getAngleAttr(element, "dir") ?? deg(0),
    alignment: undefined, // Parsed from algn attribute if needed
  };
}

/**
 * Parse inner shadow effect
 * @see ECMA-376 Part 1, Section 20.1.8.40
 */
function parseInnerShadow(element: XmlElement, overrideColor?: Color): ShadowEffect | undefined {
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

// =============================================================================
// Glow Parsing
// =============================================================================

/**
 * Parse glow effect
 * @see ECMA-376 Part 1, Section 20.1.8.32
 */
function parseGlow(element: XmlElement, overrideColor?: Color): GlowEffect | undefined {
  const color = getEffectColor(element, overrideColor);

  if (!color) {return undefined;}

  return {
    color,
    radius: getEmuAttr(element, "rad") ?? px(0),
  };
}

// =============================================================================
// Reflection Parsing
// =============================================================================

/**
 * Parse reflection effect
 * @see ECMA-376 Part 1, Section 20.1.8.50
 */
function parseReflection(element: XmlElement): ReflectionEffect | undefined {
  return {
    blurRadius: getEmuAttr(element, "blurRad") ?? px(0),
    startOpacity: getPercent100kAttr(element, "stA") ?? pct(100),
    endOpacity: getPercent100kAttr(element, "endA") ?? pct(0),
    distance: getEmuAttr(element, "dist") ?? px(0),
    direction: getAngleAttr(element, "dir") ?? deg(0),
    fadeDirection: getAngleAttr(element, "fadeDir") ?? deg(0),
    scaleX: getPercent100kAttr(element, "sx") ?? pct(100),
    scaleY: getPercent100kAttr(element, "sy") ?? pct(100),
  };
}

// =============================================================================
// Soft Edge Parsing
// =============================================================================

/**
 * Parse soft edge effect
 * @see ECMA-376 Part 1, Section 20.1.8.53
 */
function parseSoftEdge(element: XmlElement): SoftEdgeEffect | undefined {
  const radius = getEmuAttr(element, "rad");
  if (radius === undefined) {return undefined;}

  return { radius };
}

// =============================================================================
// Alpha Effect Parsing
// =============================================================================

/**
 * Parse alpha bi-level effect
 * @see ECMA-376 Part 1, Section 20.1.8.1
 */
function parseAlphaBiLevel(element: XmlElement): AlphaBiLevelEffect | undefined {
  const threshold = parseFixedPercentage(getAttr(element, "thresh"));
  if (threshold === undefined) {return undefined;}
  return { threshold };
}

/**
 * Parse alpha ceiling effect
 * @see ECMA-376 Part 1, Section 20.1.8.2
 */
function parseAlphaCeiling(element: XmlElement): AlphaCeilingEffect {
  void element;
  return { type: "alphaCeiling" };
}

/**
 * Parse alpha floor effect
 * @see ECMA-376 Part 1, Section 20.1.8.3
 */
function parseAlphaFloor(element: XmlElement): AlphaFloorEffect {
  void element;
  return { type: "alphaFloor" };
}

/**
 * Parse alpha inverse effect
 * @see ECMA-376 Part 1, Section 20.1.8.4
 */
function parseAlphaInverse(element: XmlElement): AlphaInverseEffect {
  void element;
  return { type: "alphaInv" };
}

/**
 * Parse alpha modulate effect
 * @see ECMA-376 Part 1, Section 20.1.8.5
 */
function parseAlphaModulate(element: XmlElement): AlphaModulateEffect | undefined {
  const cont = getChild(element, "a:cont");
  if (!cont) {return undefined;}

  const container = parseEffectContainer(cont);
  return {
    type: "alphaMod",
    containerType: resolveContainerType(container),
    name: getAttr(cont, "name"),
    container,
  };
}

/**
 * Parse alpha modulate fixed effect
 * @see ECMA-376 Part 1, Section 20.1.8.6
 */
function parseAlphaModulateFixed(element: XmlElement): AlphaModulateFixedEffect {
  const amount = parsePositivePercentage(getAttr(element, "amt")) ?? pct(100);
  return { amount };
}

/**
 * Parse alpha outset effect
 * @see ECMA-376 Part 1, Section 20.1.8.7
 */
function parseAlphaOutset(element: XmlElement): AlphaOutsetEffect | undefined {
  const radius = getEmuAttr(element, "rad");
  if (radius === undefined) {return undefined;}
  return { radius };
}

/**
 * Parse alpha replace effect
 * @see ECMA-376 Part 1, Section 20.1.8.8
 */
function parseAlphaReplace(element: XmlElement): AlphaReplaceEffect | undefined {
  const alpha = parseFixedPercentage(getAttr(element, "a"));
  if (alpha === undefined) {return undefined;}
  return { alpha };
}

/**
 * Parse bi-level effect
 * @see ECMA-376 Part 1, Section 20.1.8.11
 */
function parseBiLevel(element: XmlElement): BiLevelEffect | undefined {
  const threshold = parseFixedPercentage(getAttr(element, "thresh"));
  if (threshold === undefined) {return undefined;}
  return { threshold };
}

/**
 * Parse blend effect
 * @see ECMA-376 Part 1, Section 20.1.8.12
 */
function parseBlend(element: XmlElement): BlendEffect | undefined {
  const cont = getChild(element, "a:cont");
  if (!cont) {return undefined;}

  const blendAttr = getAttr(element, "blend");
  if (blendAttr === undefined) {return undefined;}

  if (
    blendAttr !== "over" &&
    blendAttr !== "mult" &&
    blendAttr !== "screen" &&
    blendAttr !== "darken" &&
    blendAttr !== "lighten"
  ) {
    return undefined;
  }

  const container = parseEffectContainer(cont);
  return {
    type: "blend",
    blend: blendAttr as BlendMode,
    containerType: resolveContainerType(container),
    name: getAttr(cont, "name"),
    container,
  };
}

function resolveContainerType(
  container: ReturnType<typeof parseEffectContainer>,
): "sib" | "tree" | undefined {
  if (container?.type === "sib" || container?.type === "tree") {
    return container.type;
  }
  return undefined;
}

/**
 * Parse color change effect
 * @see ECMA-376 Part 1, Section 20.1.8.16
 */
function parseColorChange(element: XmlElement): ColorChangeEffect | undefined {
  const clrFrom = getChild(element, "a:clrFrom");
  const clrTo = getChild(element, "a:clrTo");
  if (!clrFrom || !clrTo) {return undefined;}

  const from = parseColorFromParent(clrFrom);
  const to = parseColorFromParent(clrTo);
  if (!from || !to) {return undefined;}

  return {
    from,
    to,
    useAlpha: getBoolAttrOr(element, "useA", true),
  };
}

/**
 * Parse color replace effect
 * @see ECMA-376 Part 1, Section 20.1.8.18
 */
function parseColorReplace(element: XmlElement): ColorReplaceEffect | undefined {
  const color = parseColorFromParent(element);
  if (!color) {return undefined;}
  return { color };
}

/**
 * Parse duotone effect
 * @see ECMA-376 Part 1, Section 20.1.8.23
 */
function parseDuotone(element: XmlElement): DuotoneEffect | undefined {
  const colors: Color[] = [];
  for (const child of element.children) {
    if (typeof child !== "object" || !("name" in child)) {continue;}
    const parsed = parseColor(child as XmlElement);
    if (parsed) {colors.push(parsed);}
  }

  if (colors.length !== 2) {return undefined;}
  return { colors: [colors[0], colors[1]] };
}

/**
 * Parse fill overlay effect
 * @see ECMA-376 Part 1, Section 20.1.8.29
 */
function parseFillOverlay(element: XmlElement): FillOverlayEffect | undefined {
  const blendAttr = getAttr(element, "blend");
  if (blendAttr === undefined) {return undefined;}

  if (
    blendAttr !== "over" &&
    blendAttr !== "mult" &&
    blendAttr !== "screen" &&
    blendAttr !== "darken" &&
    blendAttr !== "lighten"
  ) {
    return undefined;
  }

  const fillType = getFillOverlayType(element);
  if (!fillType) {return undefined;}

  return {
    blend: blendAttr as BlendMode,
    fillType,
  };
}

function getFillOverlayType(element: XmlElement): FillEffectType | undefined {
  for (const child of element.children) {
    if (typeof child !== "object" || !("name" in child)) {continue;}
    switch (child.name) {
      case "a:solidFill":
        return "solidFill";
      case "a:gradFill":
        return "gradFill";
      case "a:blipFill":
        return "blipFill";
      case "a:pattFill":
        return "pattFill";
      case "a:grpFill":
        return "grpFill";
      default:
        break;
    }
  }
  return undefined;
}

/**
 * Parse grayscale effect
 * @see ECMA-376 Part 1, Section 20.1.8.34
 */
function parseGrayscale(element: XmlElement): GrayscaleEffect {
  void element;
  return { type: "grayscl" };
}

/**
 * Parse preset shadow effect
 * @see ECMA-376 Part 1, Section 20.1.8.49
 */
function parsePresetShadow(element: XmlElement): PresetShadowEffect | undefined {
  const prst = getAttr(element, "prst");
  if (!isPresetShadowValue(prst)) {return undefined;}

  const color = parseColorFromParent(element);
  if (!color) {return undefined;}

  return {
    type: "preset",
    preset: prst,
    color,
    direction: getAngleAttr(element, "dir") ?? deg(0),
    distance: getEmuAttr(element, "dist") ?? px(0),
  };
}

function isPresetShadowValue(value: string | undefined): value is PresetShadowValue {
  return (
    value === "shdw1" ||
    value === "shdw2" ||
    value === "shdw3" ||
    value === "shdw4" ||
    value === "shdw5" ||
    value === "shdw6" ||
    value === "shdw7" ||
    value === "shdw8" ||
    value === "shdw9" ||
    value === "shdw10" ||
    value === "shdw11" ||
    value === "shdw12" ||
    value === "shdw13" ||
    value === "shdw14" ||
    value === "shdw15" ||
    value === "shdw16" ||
    value === "shdw17" ||
    value === "shdw18" ||
    value === "shdw19" ||
    value === "shdw20"
  );
}

/**
 * Parse relative offset effect
 * @see ECMA-376 Part 1, Section 20.1.8.51
 */
function parseRelativeOffset(element: XmlElement): RelativeOffsetEffect | undefined {
  const offsetX = getPercentAttr(element, "tx");
  const offsetY = getPercentAttr(element, "ty");
  if (offsetX === undefined || offsetY === undefined) {return undefined;}
  return { offsetX, offsetY };
}

/**
 * Parse effect container (a:cont)
 * @see ECMA-376 Part 1, Section 20.1.8.20
 */
function parseEffectContainer(element: XmlElement): EffectContainer {
  const typeAttr = getAttr(element, "type");
  const type = typeAttr === "sib" || typeAttr === "tree" ? typeAttr : undefined;
  return {
    name: getAttr(element, "name"),
    type,
  };
}

// =============================================================================
// Main Effects Parsing
// =============================================================================

/** Mutable builder type for Effects */
type EffectsBuilder = {
  -readonly [K in keyof Effects]?: Effects[K];
};

/**
 * Parse effects from shape properties (effectLst or effectDag)
 */
export function parseEffects(spPr: XmlElement | undefined): Effects | undefined {
  if (!spPr) {return undefined;}

  // Check for effect list
  const effectLst = getChild(spPr, "a:effectLst");
  if (effectLst) {
    return parseEffectList(effectLst);
  }

  // Effect DAG is more complex - simplified handling
  const effectDag = getChild(spPr, "a:effectDag");
  if (effectDag) {
    // For DAG, we just look for common effects
    return parseEffectList(effectDag);
  }

  return undefined;
}

/**
 * Parse effects with optional phClr override.
 */
function parseEffectsWithOverride(
  spPr: XmlElement | undefined,
  overrideColor?: Color,
): Effects | undefined {
  if (!spPr) {return undefined;}

  const effectLst = getChild(spPr, "a:effectLst");
  if (effectLst) {
    return parseEffectList(effectLst, overrideColor);
  }

  const effectDag = getChild(spPr, "a:effectDag");
  if (effectDag) {
    return parseEffectList(effectDag, overrideColor);
  }

  return undefined;
}

/**
 * Parse effect list
 */
function parseEffectList(effectLst: XmlElement, overrideColor?: Color): Effects | undefined {
  const effects: EffectsBuilder = {};

  // Outer shadow
  const outerShdw = getChild(effectLst, "a:outerShdw");
  if (outerShdw) {
    effects.shadow = parseOuterShadow(outerShdw, overrideColor);
  }

  // Inner shadow (overwrites outer if both present - unusual case)
  const innerShdw = getChild(effectLst, "a:innerShdw");
  if (innerShdw && !effects.shadow) {
    effects.shadow = parseInnerShadow(innerShdw, overrideColor);
  }

  // Glow
  const glow = getChild(effectLst, "a:glow");
  if (glow) {
    effects.glow = parseGlow(glow, overrideColor);
  }

  // Reflection
  const reflection = getChild(effectLst, "a:reflection");
  if (reflection) {
    effects.reflection = parseReflection(reflection);
  }

  // Soft edge
  const softEdge = getChild(effectLst, "a:softEdge");
  if (softEdge) {
    effects.softEdge = parseSoftEdge(softEdge);
  }

  // Alpha bi-level
  const alphaBiLevel = getChild(effectLst, "a:alphaBiLevel");
  if (alphaBiLevel) {
    effects.alphaBiLevel = parseAlphaBiLevel(alphaBiLevel);
  }

  // Alpha ceiling
  const alphaCeiling = getChild(effectLst, "a:alphaCeiling");
  if (alphaCeiling) {
    effects.alphaCeiling = parseAlphaCeiling(alphaCeiling);
  }

  // Alpha floor
  const alphaFloor = getChild(effectLst, "a:alphaFloor");
  if (alphaFloor) {
    effects.alphaFloor = parseAlphaFloor(alphaFloor);
  }

  // Alpha inverse
  const alphaInv = getChild(effectLst, "a:alphaInv");
  if (alphaInv) {
    effects.alphaInv = parseAlphaInverse(alphaInv);
  }

  // Alpha modulate
  const alphaMod = getChild(effectLst, "a:alphaMod");
  if (alphaMod) {
    effects.alphaMod = parseAlphaModulate(alphaMod);
  }

  // Alpha modulate fixed
  const alphaModFix = getChild(effectLst, "a:alphaModFix");
  if (alphaModFix) {
    effects.alphaModFix = parseAlphaModulateFixed(alphaModFix);
  }

  // Alpha outset
  const alphaOutset = getChild(effectLst, "a:alphaOutset");
  if (alphaOutset) {
    effects.alphaOutset = parseAlphaOutset(alphaOutset);
  }

  // Alpha replace
  const alphaRepl = getChild(effectLst, "a:alphaRepl");
  if (alphaRepl) {
    effects.alphaRepl = parseAlphaReplace(alphaRepl);
  }

  // Bi-level
  const biLevel = getChild(effectLst, "a:biLevel");
  if (biLevel) {
    effects.biLevel = parseBiLevel(biLevel);
  }

  // Blend
  const blend = getChild(effectLst, "a:blend");
  if (blend) {
    effects.blend = parseBlend(blend);
  }

  // Color change
  const clrChange = getChild(effectLst, "a:clrChange");
  if (clrChange) {
    effects.colorChange = parseColorChange(clrChange);
  }

  // Color replace
  const clrRepl = getChild(effectLst, "a:clrRepl");
  if (clrRepl) {
    effects.colorReplace = parseColorReplace(clrRepl);
  }

  // Duotone
  const duotone = getChild(effectLst, "a:duotone");
  if (duotone) {
    effects.duotone = parseDuotone(duotone);
  }

  // Fill overlay
  const fillOverlay = getChild(effectLst, "a:fillOverlay");
  if (fillOverlay) {
    effects.fillOverlay = parseFillOverlay(fillOverlay);
  }

  // Grayscale
  const grayscl = getChild(effectLst, "a:grayscl");
  if (grayscl) {
    effects.grayscale = parseGrayscale(grayscl);
  }

  // Preset shadow
  const prstShdw = getChild(effectLst, "a:prstShdw");
  if (prstShdw) {
    effects.presetShadow = parsePresetShadow(prstShdw);
  }

  // Relative offset
  const relOff = getChild(effectLst, "a:relOff");
  if (relOff) {
    effects.relativeOffset = parseRelativeOffset(relOff);
  }

  const hasEffect = Object.values(effects).some((effect) => effect !== undefined);
  return hasEffect ? (effects as Effects) : undefined;
}

/**
 * Resolve effects from style reference (a:effectRef).
 *
 * @see ECMA-376 Part 1, Section 20.1.4.2.8 (a:effectRef)
 */
export function resolveEffectsFromStyleReference(
  effectRef: StyleReference | undefined,
  effectStyles: readonly XmlElement[],
): Effects | undefined {
  if (!effectRef || effectRef.index === 0) {return undefined;}

  const styleIndex = effectRef.index - 1;
  if (styleIndex < 0 || styleIndex >= effectStyles.length) {
    return undefined;
  }

  const overrideColor =
    effectRef.color?.type === "solidFill" ? effectRef.color.color : undefined;

  return parseEffectsWithOverride(effectStyles[styleIndex], overrideColor);
}
