/**
 * @file Fill parser (shared + PPTX-specific BlipFill)
 *
 * Delegates BaseFill parsing to the shared OOXML implementation and keeps
 * PPTX-specific BlipFill parsing (resourceId/relationships) here.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { TileFlipMode } from "@aurochs-office/ooxml/domain/drawing";
import { deg, pct, px } from "@aurochs-office/drawing-ml/domain/units";
import {
  findFillElement as findOoxmlFillElement,
  parseBaseFill as parseOoxmlBaseFill,
  getAngleAttr,
  getBoolAttrOr,
  getEmuAttr,
  getPercent100kAttr,
  parseFixedPercentage,
  parsePositivePercentage,
} from "@aurochs-office/drawing-ml/parser";
import { getAttr, getChild, isXmlElement, type XmlElement } from "@aurochs/xml";
import type { BlipEffects, BlipFill, Fill, StretchFill, StyleReference, TileFill } from "../../domain/index";
import { parseColor, parseColorFromParent } from "./color-parser";
import { parseBlipCompression, parseRectAlignment } from "../primitive";

// =============================================================================
// Shared Entry Points
// =============================================================================

/** Find fill element in parent element */
export function findFillElement(parent: XmlElement): XmlElement | undefined {
  return findOoxmlFillElement(parent);
}

// =============================================================================
// PPTX-specific BlipFill parsing
// =============================================================================

function parseStretchFill(element: XmlElement): StretchFill | undefined {
  const stretch = getChild(element, "a:stretch");
  if (!stretch) {
    return undefined;
  }

  const fillRect = getChild(stretch, "a:fillRect");
  if (!fillRect) {
    return {};
  }

  return {
    fillRect: {
      left: getPercent100kAttr(fillRect, "l") ?? pct(0),
      top: getPercent100kAttr(fillRect, "t") ?? pct(0),
      right: getPercent100kAttr(fillRect, "r") ?? pct(0),
      bottom: getPercent100kAttr(fillRect, "b") ?? pct(0),
    },
  };
}

function parseTileFillMode(element: XmlElement): TileFill | undefined {
  const tile = getChild(element, "a:tile");
  if (!tile) {
    return undefined;
  }

  const flip = getAttr(tile, "flip") as TileFlipMode | undefined;

  return {
    tx: getEmuAttr(tile, "tx") ?? px(0),
    ty: getEmuAttr(tile, "ty") ?? px(0),
    sx: getPercent100kAttr(tile, "sx") ?? pct(100),
    sy: getPercent100kAttr(tile, "sy") ?? pct(100),
    flip: flip ?? "none",
    alignment: parseRectAlignment(getAttr(tile, "algn")) ?? "tl",
  };
}

function parseSourceRect(element: XmlElement): BlipFill["sourceRect"] | undefined {
  const srcRect = getChild(element, "a:srcRect");
  if (!srcRect) {
    return undefined;
  }

  return {
    left: getPercent100kAttr(srcRect, "l") ?? pct(0),
    top: getPercent100kAttr(srcRect, "t") ?? pct(0),
    right: getPercent100kAttr(srcRect, "r") ?? pct(0),
    bottom: getPercent100kAttr(srcRect, "b") ?? pct(0),
  };
}

type BlipEffectsBuilder = {
  -readonly [K in keyof BlipEffects]?: BlipEffects[K];
};

function parseBlipEffects(blip: XmlElement): BlipEffects | undefined {
  const effects: BlipEffectsBuilder = {};
  let hasEffect = false;

  for (const child of blip.children) {
    if (!isXmlElement(child)) {
      continue;
    }

    switch (child.name) {
      case "a:alphaBiLevel": {
        const threshold = parseFixedPercentage(getAttr(child, "thresh"));
        if (threshold !== undefined) {
          effects.alphaBiLevel = { threshold };
          hasEffect = true;
        }
        break;
      }
      case "a:alphaCeiling":
        effects.alphaCeiling = true;
        hasEffect = true;
        break;
      case "a:alphaFloor":
        effects.alphaFloor = true;
        hasEffect = true;
        break;
      case "a:alphaInv":
        effects.alphaInv = true;
        hasEffect = true;
        break;
      case "a:alphaMod":
        effects.alphaMod = true;
        hasEffect = true;
        break;
      case "a:alphaModFix": {
        const amount = parsePositivePercentage(getAttr(child, "amt")) ?? pct(100);
        effects.alphaModFix = { amount };
        hasEffect = true;
        break;
      }
      case "a:alphaRepl": {
        const alpha = parseFixedPercentage(getAttr(child, "a"));
        if (alpha !== undefined) {
          effects.alphaRepl = { alpha };
          hasEffect = true;
        }
        break;
      }
      case "a:biLevel": {
        const threshold = parseFixedPercentage(getAttr(child, "thresh"));
        if (threshold !== undefined) {
          effects.biLevel = { threshold };
          hasEffect = true;
        }
        break;
      }
      case "a:blur": {
        const radius = getEmuAttr(child, "rad") ?? px(0);
        const grow = getBoolAttrOr(child, "grow", true);
        effects.blur = { radius, grow };
        hasEffect = true;
        break;
      }
      case "a:clrChange": {
        const clrFrom = getChild(child, "a:clrFrom");
        const clrTo = getChild(child, "a:clrTo");
        if (clrFrom && clrTo) {
          const from = parseColorFromParent(clrFrom);
          const to = parseColorFromParent(clrTo);
          if (from && to) {
            effects.colorChange = {
              from,
              to,
              useAlpha: getBoolAttrOr(child, "useA", true),
            };
            hasEffect = true;
          }
        }
        break;
      }
      case "a:clrRepl": {
        const color = parseColorFromParent(child);
        if (color) {
          effects.colorReplace = { color };
          hasEffect = true;
        }
        break;
      }
      case "a:duotone": {
        const colors: Color[] = [];
        for (const colorChild of child.children) {
          if (isXmlElement(colorChild)) {
            const parsed = parseColor(colorChild);
            if (parsed) {
              colors.push(parsed);
            }
          }
        }
        if (colors.length === 2) {
          effects.duotone = { colors: [colors[0], colors[1]] };
          hasEffect = true;
        }
        break;
      }
      case "a:grayscl":
        effects.grayscale = true;
        hasEffect = true;
        break;
      case "a:hsl": {
        const hue = getAngleAttr(child, "hue") ?? deg(0);
        const sat = getPercent100kAttr(child, "sat") ?? pct(0);
        const lum = getPercent100kAttr(child, "lum") ?? pct(0);
        effects.hsl = { hue, saturation: sat, luminance: lum };
        hasEffect = true;
        break;
      }
      case "a:lum": {
        const bright = getPercent100kAttr(child, "bright") ?? pct(0);
        const contrast = getPercent100kAttr(child, "contrast") ?? pct(0);
        effects.luminance = { brightness: bright, contrast };
        hasEffect = true;
        break;
      }
      case "a:tint": {
        const hue = getAngleAttr(child, "hue") ?? deg(0);
        const amt = parseFixedPercentage(getAttr(child, "amt")) ?? pct(0);
        effects.tint = { hue, amount: amt };
        hasEffect = true;
        break;
      }
    }
  }

  return hasEffect ? (effects as BlipEffects) : undefined;
}

function parseBlipFill(element: XmlElement): BlipFill | undefined {
  const blip = getChild(element, "a:blip");
  if (!blip) {
    return undefined;
  }

  const embedId = getAttr(blip, "r:embed");
  const linkId = getAttr(blip, "r:link");
  const resourceId = embedId ?? linkId;
  if (!resourceId) {
    return undefined;
  }

  const dpiAttr = getAttr(element, "dpi");
  const dpi = dpiAttr ? parseInt(dpiAttr, 10) : undefined;

  const blipEffects = parseBlipEffects(blip);

  return {
    type: "blipFill",
    resourceId,
    relationshipType: embedId ? "embed" : "link",
    compressionState: parseBlipCompression(getAttr(blip, "cstate")),
    dpi: dpi !== undefined && !Number.isNaN(dpi) ? dpi : undefined,
    blipEffects,
    stretch: parseStretchFill(element),
    tile: parseTileFillMode(element),
    sourceRect: parseSourceRect(element),
    rotWithShape: getBoolAttrOr(element, "rotWithShape", true),
  };
}

// =============================================================================
// Main Fill Parsing
// =============================================================================

/** Parse fill from XML element including PPTX-specific BlipFill */
export function parseFill(element: XmlElement | undefined): Fill | undefined {
  if (!element) {
    return undefined;
  }

  if (element.name === "a:blipFill") {
    return parseBlipFill(element);
  }

  return parseOoxmlBaseFill(element) ?? undefined;
}

/** Parse fill from parent element by finding fill child */
export function parseFillFromParent(parent: XmlElement | undefined): Fill | undefined {
  if (!parent) {
    return undefined;
  }
  const fillEl = findFillElement(parent);
  return parseFill(fillEl);
}

// =============================================================================
// Style Reference
// =============================================================================

/** Resolve fill from style reference using theme fill styles */
export function resolveFillFromStyleReference(
  fillRef: StyleReference | undefined,
  fillStyles: readonly XmlElement[],
): Fill | undefined {
  if (!fillRef || fillRef.index === 0) {
    return undefined;
  }

  const styleIndex = resolveFillStyleIndex(fillRef.index);

  if (styleIndex < 0 || styleIndex >= fillStyles.length) {
    return undefined;
  }

  const styleElement = fillStyles[styleIndex];
  const parsedFill = parseFill(styleElement);
  if (!parsedFill) {
    return undefined;
  }

  if (fillRef.color) {
    return applyColorOverride(parsedFill, fillRef.color);
  }

  return parsedFill;
}

function resolveFillStyleIndex(index: number): number {
  if (index >= 1001) {
    return index - 1001;
  }
  return index - 1;
}

function applyColorOverride(fill: Fill, overrideColor: Fill): Fill {
  if (fill.type === "solidFill" && overrideColor.type === "solidFill") {
    return {
      type: "solidFill",
      color: overrideColor.color,
    };
  }

  if (fill.type === "gradientFill" && overrideColor.type === "solidFill") {
    return {
      ...fill,
      stops: fill.stops.map((stop) => {
        if (stop.color.spec.type === "scheme" && stop.color.spec.value === "phClr") {
          return {
            ...stop,
            color: overrideColor.color,
          };
        }
        return stop;
      }),
    };
  }

  return fill;
}
