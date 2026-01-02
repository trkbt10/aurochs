/**
 * @file Picture shape (p:pic) parser
 *
 * @see ECMA-376 Part 1, Section 19.3.1.37 (p:pic)
 */

import { getAttr, getChild, type XmlElement } from "../../../xml";
import type { BlipFillProperties, PicShape, PictureLocks } from "../../domain";
import { px, pct } from "../../domain/types";
import { getBoolAttr, getIntAttr, parseBlipCompression, parseRectAlignment } from "../primitive";
import { parseNonVisualMedia, parseNonVisualProperties } from "./non-visual";
import { parseShapeProperties } from "./properties";
import { parseShapeStyle } from "./style";
import { getBlipFillElement } from "./alternate-content";
import { resolveEffectsFromStyleReference } from "../graphics/effects-parser";
import type { FormatScheme } from "../context";

/**
 * Parse blip fill properties for pictures
 */
export function parseBlipFillProperties(blipFill: XmlElement | undefined): BlipFillProperties | undefined {
  if (!blipFill) {
    return undefined;
  }

  const blip = getChild(blipFill, "a:blip");
  if (!blip) {
    return undefined;
  }

  const resourceId = getAttr(blip, "r:embed") ?? getAttr(blip, "r:link");
  if (!resourceId) {
    return undefined;
  }

  // Parse source rect
  const sourceRect = parseSourceRect(getChild(blipFill, "a:srcRect"));

  // Check for stretch
  const stretch = getChild(blipFill, "a:stretch");

  // Check for tile
  const tileProps = parseTileProperties(getChild(blipFill, "a:tile"));

  return {
    resourceId,
    compressionState: parseBlipCompression(getAttr(blip, "cstate")),
    sourceRect,
    stretch: stretch !== undefined,
    tile: tileProps,
    rotateWithShape: getBoolAttr(blipFill, "rotWithShape"),
    dpi: getIntAttr(blipFill, "dpi"),
  };
}

function parsePictureLocksElement(element: XmlElement | undefined): PictureLocks | undefined {
  if (!element) {
    return undefined;
  }
  const noGrp = getBoolAttr(element, "noGrp");
  const noSelect = getBoolAttr(element, "noSelect");
  const noRot = getBoolAttr(element, "noRot");
  const noChangeAspect = getBoolAttr(element, "noChangeAspect");
  const noMove = getBoolAttr(element, "noMove");
  const noResize = getBoolAttr(element, "noResize");
  const noEditPoints = getBoolAttr(element, "noEditPoints");
  const noAdjustHandles = getBoolAttr(element, "noAdjustHandles");
  const noChangeArrowheads = getBoolAttr(element, "noChangeArrowheads");
  const noChangeShapeType = getBoolAttr(element, "noChangeShapeType");
  const noCrop = getBoolAttr(element, "noCrop");
  if (
    noGrp === undefined &&
    noSelect === undefined &&
    noRot === undefined &&
    noChangeAspect === undefined &&
    noMove === undefined &&
    noResize === undefined &&
    noEditPoints === undefined &&
    noAdjustHandles === undefined &&
    noChangeArrowheads === undefined &&
    noChangeShapeType === undefined &&
    noCrop === undefined
  ) {
    return undefined;
  }
  return {
    noGrp,
    noSelect,
    noRot,
    noChangeAspect,
    noMove,
    noResize,
    noEditPoints,
    noAdjustHandles,
    noChangeArrowheads,
    noChangeShapeType,
    noCrop,
  };
}

/**
 * Detect media type from nvPicPr
 */
function detectMediaType(nvPicPr: XmlElement | undefined): PicShape["mediaType"] {
  if (!nvPicPr) {
    return undefined;
  }

  const nvPr = getChild(nvPicPr, "p:nvPr");
  if (!nvPr) {
    return undefined;
  }

  // Check for video/audio frame
  if (hasAnyChild(nvPr, ["a:videoFile", "a:quickTimeFile"])) {
    return "video";
  }
  if (hasAnyChild(nvPr, ["a:audioFile", "a:audioCd", "a:wavAudioFile"])) {
    return "audio";
  }
  if (getChild(nvPr, "p:extLst")) {
    // Check extension list for media
    // This is simplified - actual implementation needs extension parsing
  }

  return undefined;
}

/**
 * Parse picture shape (p:pic)
 * @see ECMA-376 Part 1, Section 19.3.1.37
 */
export function parsePicShape(element: XmlElement, formatScheme?: FormatScheme): PicShape | undefined {
  const nvPicPr = getChild(element, "p:nvPicPr");
  const cNvPr = nvPicPr ? getChild(nvPicPr, "p:cNvPr") : undefined;
  const cNvPicPr = nvPicPr ? getChild(nvPicPr, "p:cNvPicPr") : undefined;
  const nvPr = nvPicPr ? getChild(nvPicPr, "p:nvPr") : undefined;

  const blipFill = getBlipFillElement(element);
  const blipFillProps = parseBlipFillProperties(blipFill);
  if (!blipFillProps) {
    return undefined;
  }

  const spPr = getChild(element, "p:spPr");
  const style = getChild(element, "p:style");

  const nonVisual = parseNonVisualProperties(cNvPr);
  const preferRelativeResize = parsePreferRelativeResize(cNvPicPr);
  const pictureLocks = parsePictureLocksFromParent(cNvPicPr);

  const baseProperties = parseShapeProperties(spPr);
  const shapeStyle = parseShapeStyle(style);

  const properties = resolvePropertiesWithEffects(baseProperties, shapeStyle, formatScheme);

  return {
    type: "pic",
    nonVisual: { ...nonVisual, preferRelativeResize, pictureLocks },
    blipFill: blipFillProps,
    properties,
    style: shapeStyle,
    mediaType: detectMediaType(nvPicPr),
    media: parseNonVisualMedia(nvPr),
  };
}

function parseSourceRect(srcRect: XmlElement | undefined): BlipFillProperties["sourceRect"] | undefined {
  if (!srcRect) {
    return undefined;
  }
  return {
    left: pct((getIntAttr(srcRect, "l") ?? 0) / 100000 * 100),
    top: pct((getIntAttr(srcRect, "t") ?? 0) / 100000 * 100),
    right: pct((getIntAttr(srcRect, "r") ?? 0) / 100000 * 100),
    bottom: pct((getIntAttr(srcRect, "b") ?? 0) / 100000 * 100),
  };
}

function parseTileProperties(tile: XmlElement | undefined): BlipFillProperties["tile"] | undefined {
  if (!tile) {
    return undefined;
  }
  type TileFlip = NonNullable<BlipFillProperties["tile"]>["flip"];
  const flip = (getAttr(tile, "flip") as TileFlip) ?? "none";
  const alignment = parseRectAlignment(getAttr(tile, "algn")) ?? "tl";
  return {
    tx: px((getIntAttr(tile, "tx") ?? 0) * 96 / 914400),
    ty: px((getIntAttr(tile, "ty") ?? 0) * 96 / 914400),
    sx: pct((getIntAttr(tile, "sx") ?? 100000) / 100000 * 100),
    sy: pct((getIntAttr(tile, "sy") ?? 100000) / 100000 * 100),
    flip,
    alignment,
  };
}

function parsePreferRelativeResize(cNvPicPr: XmlElement | undefined): boolean | undefined {
  if (!cNvPicPr) {
    return undefined;
  }
  return getBoolAttr(cNvPicPr, "preferRelativeResize");
}

function parsePictureLocksFromParent(cNvPicPr: XmlElement | undefined): PictureLocks | undefined {
  if (!cNvPicPr) {
    return undefined;
  }
  return parsePictureLocksElement(getChild(cNvPicPr, "a:picLocks"));
}

function resolvePropertiesWithEffects(
  properties: ReturnType<typeof parseShapeProperties>,
  shapeStyle: ReturnType<typeof parseShapeStyle>,
  formatScheme: FormatScheme | undefined,
): ReturnType<typeof parseShapeProperties> {
  if (!properties.effects) {
    if (shapeStyle?.effectReference && formatScheme) {
      const resolvedEffects = resolveEffectsFromStyleReference(
        shapeStyle.effectReference,
        formatScheme.effectStyles,
      );
      if (resolvedEffects) {
        return { ...properties, effects: resolvedEffects };
      }
    }
  }
  return properties;
}

function hasAnyChild(parent: XmlElement, names: readonly string[]): boolean {
  for (const name of names) {
    if (getChild(parent, name)) {
      return true;
    }
  }
  return false;
}
