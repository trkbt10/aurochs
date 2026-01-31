/**
 * @file Effects serializer
 */

import { createElement, type XmlElement } from "@oxen/xml";
import type { AlphaBiLevelEffect, AlphaCeilingEffect, AlphaFloorEffect, AlphaInverseEffect, AlphaModulateEffect, AlphaModulateFixedEffect, AlphaOutsetEffect, AlphaReplaceEffect, BiLevelEffect, BlendEffect, ColorChangeEffect, ColorReplaceEffect, DuotoneEffect, EffectContainer, Effects, FillOverlayEffect, GlowEffect, GrayscaleEffect, PresetShadowEffect, ReflectionEffect, RelativeOffsetEffect, ShadowEffect, SoftEdgeEffect } from "../../domain";
import { serializeColor } from "./color";
import { serializeFill } from "./fill";
import { ooxmlAngleUnits, ooxmlBool, ooxmlEmu, ooxmlPercent1000, ooxmlPercent100k } from "@oxen-office/ooxml/serializer/units";

/**
 * Serialize effects to XML element.
 *
 * Note: Currently always outputs as a:effectLst even if the original was a:effectDag.
 * The containerKind is recorded in the domain for future reference, but full DAG
 * serialization would require preserving the original DAG structure (node connections).
 * The patcher avoids this issue by not replacing effects elements that haven't changed.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.25 (effectDag)
 * @see ECMA-376 Part 1, Section 20.1.8.26 (effectLst)
 */
export function serializeEffects(effects: Effects): XmlElement | null {
  const children: XmlElement[] = [];

  if (effects.shadow) {
    children.push(serializeShadow(effects.shadow));
  }
  if (effects.glow) {
    children.push(serializeGlow(effects.glow));
  }
  if (effects.reflection) {
    children.push(serializeReflection(effects.reflection));
  }
  if (effects.softEdge) {
    children.push(serializeSoftEdge(effects.softEdge));
  }
  if (effects.alphaBiLevel) {
    children.push(serializeAlphaBiLevel(effects.alphaBiLevel));
  }
  if (effects.alphaCeiling) {
    children.push(serializeAlphaCeiling(effects.alphaCeiling));
  }
  if (effects.alphaFloor) {
    children.push(serializeAlphaFloor(effects.alphaFloor));
  }
  if (effects.alphaInv) {
    children.push(serializeAlphaInv(effects.alphaInv));
  }
  if (effects.alphaMod) {
    children.push(serializeAlphaMod(effects.alphaMod));
  }
  if (effects.alphaModFix) {
    children.push(serializeAlphaModFix(effects.alphaModFix));
  }
  if (effects.alphaOutset) {
    children.push(serializeAlphaOutset(effects.alphaOutset));
  }
  if (effects.alphaRepl) {
    children.push(serializeAlphaRepl(effects.alphaRepl));
  }
  if (effects.biLevel) {
    children.push(serializeBiLevel(effects.biLevel));
  }
  if (effects.blend) {
    children.push(serializeBlend(effects.blend));
  }
  if (effects.colorChange) {
    children.push(serializeColorChange(effects.colorChange));
  }
  if (effects.colorReplace) {
    children.push(serializeColorReplace(effects.colorReplace));
  }
  if (effects.duotone) {
    children.push(serializeDuotone(effects.duotone));
  }
  if (effects.fillOverlay) {
    children.push(serializeFillOverlay(effects.fillOverlay));
  }
  if (effects.grayscale) {
    children.push(serializeGrayscale(effects.grayscale));
  }
  if (effects.presetShadow) {
    children.push(serializePresetShadow(effects.presetShadow));
  }
  if (effects.relativeOffset) {
    children.push(serializeRelativeOffset(effects.relativeOffset));
  }

  if (children.length === 0) {
    return null;
  }

  // Use containerKind to determine output element name
  // Note: Even for effectDag, we output as effectLst since we don't preserve DAG structure
  // The containerKind is available for future enhancements or for callers to make decisions
  const containerName = effects.containerKind === "effectDag" ? "a:effectDag" : "a:effectLst";
  return createElement(containerName, {}, children);
}































/** Serialize a shadow effect (outer or inner) */
export function serializeShadow(shadow: ShadowEffect): XmlElement {
  const name = shadow.type === "outer" ? "a:outerShdw" : "a:innerShdw";

  const attrs: Record<string, string> = {
    blurRad: ooxmlEmu(shadow.blurRadius),
    dist: ooxmlEmu(shadow.distance),
    dir: ooxmlAngleUnits(shadow.direction),
  };

  if (shadow.type === "outer") {
    if (shadow.scaleX !== undefined) {
      attrs.sx = ooxmlPercent100k(shadow.scaleX);
    }
    if (shadow.scaleY !== undefined) {
      attrs.sy = ooxmlPercent100k(shadow.scaleY);
    }
    if (shadow.skewX !== undefined) {
      attrs.kx = ooxmlAngleUnits(shadow.skewX);
    }
    if (shadow.skewY !== undefined) {
      attrs.ky = ooxmlAngleUnits(shadow.skewY);
    }
    if (shadow.alignment !== undefined) {
      attrs.algn = shadow.alignment;
    }
    if (shadow.rotateWithShape !== undefined) {
      attrs.rotWithShape = ooxmlBool(shadow.rotateWithShape);
    }
  }

  return createElement(name, attrs, [serializeColor(shadow.color)]);
}































/** Serialize a glow effect */
export function serializeGlow(glow: GlowEffect): XmlElement {
  return createElement(
    "a:glow",
    { rad: ooxmlEmu(glow.radius) },
    [serializeColor(glow.color)],
  );
}































/** Serialize a reflection effect */
export function serializeReflection(reflection: ReflectionEffect): XmlElement {
  const attrs: Record<string, string> = {
    blurRad: ooxmlEmu(reflection.blurRadius),
    stA: ooxmlPercent100k(reflection.startOpacity),
    stPos: ooxmlPercent100k(reflection.startPosition),
    endA: ooxmlPercent100k(reflection.endOpacity),
    endPos: ooxmlPercent100k(reflection.endPosition),
    dist: ooxmlEmu(reflection.distance),
    dir: ooxmlAngleUnits(reflection.direction),
    fadeDir: ooxmlAngleUnits(reflection.fadeDirection),
    sx: ooxmlPercent100k(reflection.scaleX),
    sy: ooxmlPercent100k(reflection.scaleY),
  };

  if (reflection.skewX !== undefined) {
    attrs.kx = ooxmlAngleUnits(reflection.skewX);
  }
  if (reflection.skewY !== undefined) {
    attrs.ky = ooxmlAngleUnits(reflection.skewY);
  }
  if (reflection.alignment !== undefined) {
    attrs.algn = reflection.alignment;
  }
  if (reflection.rotateWithShape !== undefined) {
    attrs.rotWithShape = ooxmlBool(reflection.rotateWithShape);
  }

  return createElement("a:reflection", attrs);
}































/** Serialize a soft edge effect */
export function serializeSoftEdge(softEdge: SoftEdgeEffect): XmlElement {
  return createElement("a:softEdge", { rad: ooxmlEmu(softEdge.radius) });
}































/** Serialize an alpha bi-level effect */
export function serializeAlphaBiLevel(effect: AlphaBiLevelEffect): XmlElement {
  return createElement("a:alphaBiLevel", { thresh: ooxmlPercent100k(effect.threshold) });
}































/** Serialize an alpha ceiling effect */
export function serializeAlphaCeiling(effect: AlphaCeilingEffect): XmlElement {
  void effect;
  return createElement("a:alphaCeiling");
}































/** Serialize an alpha floor effect */
export function serializeAlphaFloor(effect: AlphaFloorEffect): XmlElement {
  void effect;
  return createElement("a:alphaFloor");
}































/** Serialize an alpha inverse effect */
export function serializeAlphaInv(effect: AlphaInverseEffect): XmlElement {
  void effect;
  return createElement("a:alphaInv");
}































/** Serialize an alpha modulate effect */
export function serializeAlphaMod(effect: AlphaModulateEffect): XmlElement {
  return createElement("a:alphaMod", {}, [serializeEffectContainer(effect.container, effect)]);
}































/** Serialize an alpha modulate fixed effect */
export function serializeAlphaModFix(effect: AlphaModulateFixedEffect): XmlElement {
  return createElement("a:alphaModFix", { amt: ooxmlPercent1000(effect.amount) });
}































/** Serialize an alpha outset effect */
export function serializeAlphaOutset(effect: AlphaOutsetEffect): XmlElement {
  return createElement("a:alphaOutset", { rad: ooxmlEmu(effect.radius) });
}































/** Serialize an alpha replace effect */
export function serializeAlphaRepl(effect: AlphaReplaceEffect): XmlElement {
  return createElement("a:alphaRepl", { a: ooxmlPercent100k(effect.alpha) });
}































/** Serialize a bi-level effect */
export function serializeBiLevel(effect: BiLevelEffect): XmlElement {
  return createElement("a:biLevel", { thresh: ooxmlPercent100k(effect.threshold) });
}































/** Serialize a blend effect */
export function serializeBlend(effect: BlendEffect): XmlElement {
  return createElement("a:blend", { blend: effect.blend }, [serializeEffectContainer(effect.container, effect)]);
}































/** Serialize a color change effect */
export function serializeColorChange(effect: ColorChangeEffect): XmlElement {
  return createElement(
    "a:clrChange",
    { useA: ooxmlBool(effect.useAlpha) },
    [
      createElement("a:clrFrom", {}, [serializeColor(effect.from)]),
      createElement("a:clrTo", {}, [serializeColor(effect.to)]),
    ],
  );
}































/** Serialize a color replace effect */
export function serializeColorReplace(effect: ColorReplaceEffect): XmlElement {
  return createElement("a:clrRepl", {}, [serializeColor(effect.color)]);
}































/** Serialize a duotone effect */
export function serializeDuotone(effect: DuotoneEffect): XmlElement {
  return createElement("a:duotone", {}, [
    serializeColor(effect.colors[0]),
    serializeColor(effect.colors[1]),
  ]);
}































/** Serialize a fill overlay effect */
export function serializeFillOverlay(effect: FillOverlayEffect): XmlElement {
  const fillChild = effect.fill ? serializeFill(effect.fill) : serializeFillOverlayChild(effect);

  return createElement(
    "a:fillOverlay",
    { blend: effect.blend },
    [fillChild],
  );
}































/** Serialize a grayscale effect */
export function serializeGrayscale(effect: GrayscaleEffect): XmlElement {
  void effect;
  return createElement("a:grayscl");
}































/** Serialize a preset shadow effect */
export function serializePresetShadow(effect: PresetShadowEffect): XmlElement {
  return createElement(
    "a:prstShdw",
    {
      prst: effect.preset,
      dir: ooxmlAngleUnits(effect.direction),
      dist: ooxmlEmu(effect.distance),
    },
    [serializeColor(effect.color)],
  );
}































/** Serialize a relative offset effect */
export function serializeRelativeOffset(effect: RelativeOffsetEffect): XmlElement {
  return createElement("a:relOff", {
    tx: ooxmlPercent1000(effect.offsetX),
    ty: ooxmlPercent1000(effect.offsetY),
  });
}

function serializeEffectContainer(
  container: EffectContainer | undefined,
  fallback: { containerType?: "sib" | "tree"; name?: string },
): XmlElement {
  const attrs: Record<string, string> = {};
  const type = container?.type ?? fallback.containerType;
  const name = container?.name ?? fallback.name;

  if (type) {
    attrs.type = type;
  }
  if (name) {
    attrs.name = name;
  }

  return createElement("a:cont", attrs);
}

function serializeFillOverlayChild(effect: FillOverlayEffect): XmlElement {
  switch (effect.fillType) {
    case "solidFill":
      return createElement("a:solidFill");
    case "gradFill":
      return createElement("a:gradFill");
    case "blipFill":
      return createElement("a:blipFill");
    case "pattFill":
      return createElement("a:pattFill");
    case "grpFill":
      return createElement("a:grpFill");
  }
}
