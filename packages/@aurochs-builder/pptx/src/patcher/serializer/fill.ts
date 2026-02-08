/**
 * @file Fill serializer
 */

import { createElement, type XmlElement } from "@aurochs/xml";
import type { GradientFill, GradientStop, PatternFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BlipEffects, BlipFill, Fill, StretchFill, TileFill } from "@aurochs-office/pptx/domain";
import { serializeColor } from "./color";
import { ooxmlBool, ooxmlAngleUnits, ooxmlEmu, ooxmlPercent100k } from "@aurochs-builder/core";

/** Serialize a fill to its XML element representation */
export function serializeFill(fill: Fill): XmlElement {
  switch (fill.type) {
    case "noFill":
      return createElement("a:noFill");
    case "solidFill":
      return createElement("a:solidFill", {}, [serializeColor(fill.color)]);
    case "gradientFill":
      return serializeGradientFill(fill);
    case "patternFill":
      return serializePatternFill(fill);
    case "blipFill":
      return serializeBlipFill(fill);
    case "groupFill":
      return createElement("a:grpFill");
  }
}

/** Serialize a gradient fill */
export function serializeGradientFill(gradient: GradientFill): XmlElement {
  const attrs: Record<string, string> = {
    rotWithShape: ooxmlBool(gradient.rotWithShape),
  };

  const children: XmlElement[] = [createElement("a:gsLst", {}, gradient.stops.map(serializeGradientStop))];

  if (gradient.linear) {
    children.push(
      createElement("a:lin", {
        ang: ooxmlAngleUnits(gradient.linear.angle),
        scaled: ooxmlBool(gradient.linear.scaled),
      }),
    );
  }

  if (gradient.path) {
    const pathChildren: XmlElement[] = [];
    if (gradient.path.fillToRect) {
      pathChildren.push(
        createElement("a:fillToRect", {
          l: ooxmlPercent100k(gradient.path.fillToRect.left),
          t: ooxmlPercent100k(gradient.path.fillToRect.top),
          r: ooxmlPercent100k(gradient.path.fillToRect.right),
          b: ooxmlPercent100k(gradient.path.fillToRect.bottom),
        }),
      );
    }
    children.push(createElement("a:path", { path: gradient.path.path }, pathChildren));
  }

  if (gradient.tileRect) {
    children.push(
      createElement("a:tileRect", {
        l: ooxmlPercent100k(gradient.tileRect.left),
        t: ooxmlPercent100k(gradient.tileRect.top),
        r: ooxmlPercent100k(gradient.tileRect.right),
        b: ooxmlPercent100k(gradient.tileRect.bottom),
      }),
    );
  }

  return createElement("a:gradFill", attrs, children);
}

function serializeGradientStop(stop: GradientStop): XmlElement {
  return createElement("a:gs", { pos: ooxmlPercent100k(stop.position) }, [serializeColor(stop.color)]);
}

/** Serialize a pattern fill */
export function serializePatternFill(pattern: PatternFill): XmlElement {
  return createElement("a:pattFill", { prst: pattern.preset }, [
    createElement("a:fgClr", {}, [serializeColor(pattern.foregroundColor)]),
    createElement("a:bgClr", {}, [serializeColor(pattern.backgroundColor)]),
  ]);
}

/** Serialize a blip (image) fill */
export function serializeBlipFill(blip: BlipFill): XmlElement {
  if (blip.resourceId.startsWith("data:")) {
    throw new Error("serializeBlipFill: data: resourceId requires Phase 7 media embedding");
  }

  const attrs: Record<string, string> = {
    rotWithShape: ooxmlBool(blip.rotWithShape),
  };
  if (blip.dpi !== undefined) {
    attrs.dpi = String(blip.dpi);
  }

  const blipAttrs: Record<string, string> = {};
  if (blip.relationshipType === "link") {
    blipAttrs["r:link"] = blip.resourceId;
  } else {
    blipAttrs["r:embed"] = blip.resourceId;
  }
  if (blip.compressionState) {
    blipAttrs.cstate = blip.compressionState;
  }

  // Serialize blip effects as child elements of a:blip
  const blipChildren = blip.blipEffects ? serializeBlipEffects(blip.blipEffects) : [];

  const children: XmlElement[] = [createElement("a:blip", blipAttrs, blipChildren)];

  if (blip.sourceRect) {
    children.push(
      createElement("a:srcRect", {
        l: ooxmlPercent100k(blip.sourceRect.left),
        t: ooxmlPercent100k(blip.sourceRect.top),
        r: ooxmlPercent100k(blip.sourceRect.right),
        b: ooxmlPercent100k(blip.sourceRect.bottom),
      }),
    );
  }

  if (blip.stretch) {
    children.push(serializeStretchFill(blip.stretch));
  }

  if (blip.tile) {
    children.push(serializeTileFill(blip.tile));
  }

  return createElement("a:blipFill", attrs, children);
}

function serializeStretchFill(stretch: StretchFill): XmlElement {
  if (!stretch.fillRect) {
    return createElement("a:stretch");
  }

  return createElement("a:stretch", {}, [
    createElement("a:fillRect", {
      l: ooxmlPercent100k(stretch.fillRect.left),
      t: ooxmlPercent100k(stretch.fillRect.top),
      r: ooxmlPercent100k(stretch.fillRect.right),
      b: ooxmlPercent100k(stretch.fillRect.bottom),
    }),
  ]);
}

function serializeTileFill(tile: TileFill): XmlElement {
  return createElement("a:tile", {
    tx: ooxmlEmu(tile.tx),
    ty: ooxmlEmu(tile.ty),
    sx: ooxmlPercent100k(tile.sx),
    sy: ooxmlPercent100k(tile.sy),
    flip: tile.flip,
    algn: tile.alignment,
  });
}

/**
 * Serialize blip effects (color transform effects) to a:blip child elements
 * @see ECMA-376 Part 1, Section 20.1.8.13 (CT_Blip)
 */
export function serializeBlipEffects(effects: BlipEffects): XmlElement[] {
  const children: XmlElement[] = [];

  if (effects.alphaBiLevel) {
    children.push(createElement("a:alphaBiLevel", { thresh: ooxmlPercent100k(effects.alphaBiLevel.threshold) }));
  }
  if (effects.alphaCeiling) {
    children.push(createElement("a:alphaCeiling"));
  }
  if (effects.alphaFloor) {
    children.push(createElement("a:alphaFloor"));
  }
  if (effects.alphaInv) {
    children.push(createElement("a:alphaInv"));
  }
  if (effects.alphaMod) {
    children.push(createElement("a:alphaMod"));
  }
  if (effects.alphaModFix) {
    children.push(createElement("a:alphaModFix", { amt: ooxmlPercent100k(effects.alphaModFix.amount) }));
  }
  if (effects.alphaRepl) {
    children.push(createElement("a:alphaRepl", { a: ooxmlPercent100k(effects.alphaRepl.alpha) }));
  }
  if (effects.biLevel) {
    children.push(createElement("a:biLevel", { thresh: ooxmlPercent100k(effects.biLevel.threshold) }));
  }
  if (effects.blur) {
    children.push(
      createElement("a:blur", {
        rad: ooxmlEmu(effects.blur.radius),
        grow: ooxmlBool(effects.blur.grow),
      }),
    );
  }
  if (effects.colorChange) {
    children.push(
      createElement("a:clrChange", { useA: ooxmlBool(effects.colorChange.useAlpha) }, [
        createElement("a:clrFrom", {}, [serializeColor(effects.colorChange.from)]),
        createElement("a:clrTo", {}, [serializeColor(effects.colorChange.to)]),
      ]),
    );
  }
  if (effects.colorReplace) {
    children.push(createElement("a:clrRepl", {}, [serializeColor(effects.colorReplace.color)]));
  }
  if (effects.duotone) {
    children.push(
      createElement("a:duotone", {}, [
        serializeColor(effects.duotone.colors[0]),
        serializeColor(effects.duotone.colors[1]),
      ]),
    );
  }
  if (effects.grayscale) {
    children.push(createElement("a:grayscl"));
  }
  if (effects.hsl) {
    children.push(
      createElement("a:hsl", {
        hue: ooxmlAngleUnits(effects.hsl.hue),
        sat: ooxmlPercent100k(effects.hsl.saturation),
        lum: ooxmlPercent100k(effects.hsl.luminance),
      }),
    );
  }
  if (effects.luminance) {
    children.push(
      createElement("a:lum", {
        bright: ooxmlPercent100k(effects.luminance.brightness),
        contrast: ooxmlPercent100k(effects.luminance.contrast),
      }),
    );
  }
  if (effects.tint) {
    children.push(
      createElement("a:tint", {
        hue: ooxmlAngleUnits(effects.tint.hue),
        amt: ooxmlPercent100k(effects.tint.amount),
      }),
    );
  }

  return children;
}
