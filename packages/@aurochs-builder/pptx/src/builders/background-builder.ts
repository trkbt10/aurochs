/**
 * @file Background building utilities for PPTX slides
 *
 * NOTE: This module uses Node.js fs for file reading. For browser usage,
 * the image data should be passed directly instead of file paths.
 */

import * as path from "node:path";
import { createElement, type XmlElement, type XmlDocument } from "@aurochs/xml";
import { detectImageMimeType, readFileToArrayBuffer, uint8ArrayToArrayBuffer } from "./file-utils";
import { updateDocumentRoot, replaceChildByName } from "@aurochs-builder/pptx/patcher/core/xml-mutator";
import { getChild, isXmlElement } from "@aurochs/xml";
import { serializeFill } from "@aurochs-builder/pptx/patcher/serializer/fill";
import { addMedia } from "@aurochs-builder/pptx/patcher/resources/media-manager";
import type { Fill } from "@aurochs-office/pptx/domain/color/types";
import type { ZipPackage } from "@aurochs/zip";
import type { Degrees, Percent } from "@aurochs-office/drawing-ml/domain/units";
import type { BackgroundFillSpec, BackgroundGradientSpec, BackgroundImageSpec } from "../types";
import { buildColor } from "@aurochs-builder/drawing-ml/fill";

/**
 * Build a Fill from a non-image BackgroundFillSpec.
 * Image backgrounds require async handling via applyImageBackground.
 */
function buildBackgroundFill(spec: Exclude<BackgroundFillSpec, BackgroundImageSpec>): Fill {
  if (typeof spec === "string") {
    // Solid fill from hex color
    return {
      type: "solidFill",
      color: buildColor(spec),
    };
  }

  switch (spec.type) {
    case "solid":
      return {
        type: "solidFill",
        color: buildColor(spec.color),
      };
    case "gradient":
      return buildGradientFill(spec);
    default:
      throw new Error(`Unknown background fill type: ${(spec as { type: string }).type}`);
  }
}

/**
 * Build gradient fill for background
 */
function buildGradientFill(spec: BackgroundGradientSpec): Fill {
  const stops = spec.stops.map((stop) => ({
    position: (stop.position * 1000) as Percent, // Convert 0-100 to 0-100000
    color: buildColor(stop.color),
  }));

  return {
    type: "gradientFill",
    stops,
    linear: {
      angle: (spec.angle ?? 0) as Degrees,
      scaled: false,
    },
    rotWithShape: false,
  };
}

/**
 * Build background XML element from Fill
 */
function buildBackgroundElement(fill: Fill): XmlElement {
  const fillXml = serializeFill(fill);

  // Create p:bgPr element with the fill
  const bgPr = createElement("p:bgPr", {}, [fillXml]);

  // Create p:bg element containing bgPr
  return createElement("p:bg", {}, [bgPr]);
}

/**
 * Build blip fill background for images
 */
function buildFillMode(mode: "stretch" | "tile" | "cover"): XmlElement {
  if (mode === "tile") {
    return createElement("a:tile", {
      tx: "0",
      ty: "0",
      sx: "100000",
      sy: "100000",
      flip: "none",
      algn: "tl",
    });
  }
  // stretch or cover - use stretch
  return createElement("a:stretch", {}, [createElement("a:fillRect")]);
}

function buildBlipFillBackground(rId: string, mode: "stretch" | "tile" | "cover" = "stretch"): XmlElement {
  const blipElement = createElement("a:blip", { "r:embed": rId });
  const fillMode = buildFillMode(mode);

  const blipFill = createElement("a:blipFill", { rotWithShape: "0" }, [blipElement, fillMode]);

  const bgPr = createElement("p:bgPr", {}, [blipFill]);
  return createElement("p:bg", {}, [bgPr]);
}

type XmlChild = XmlElement["children"][number];

function withoutBackground(children: XmlElement["children"]): XmlChild[] {
  return children.filter((c) => !(isXmlElement(c) && c.name === "p:bg"));
}

/**
 * Apply background to slide XML document
 */
export function applyBackground(
  slideDoc: XmlDocument,
  spec: Exclude<BackgroundFillSpec, BackgroundImageSpec>,
): XmlDocument {
  const fill = buildBackgroundFill(spec);
  const bgElement = buildBackgroundElement(fill);

  return updateDocumentRoot(slideDoc, (root) => {
    const cSld = getChild(root, "p:cSld");
    if (!cSld) {
      return root;
    }

    // Remove existing background if present
    const existingBg = getChild(cSld, "p:bg");
    const filteredChildren = existingBg ? withoutBackground(cSld.children) : cSld.children;

    // p:bg should be the first child of p:cSld
    const newCsld: XmlElement = {
      ...cSld,
      children: [bgElement, ...filteredChildren],
    };

    return replaceChildByName(root, "p:cSld", newCsld);
  });
}

/**
 * Apply image background to slide XML document (async for file loading)
 */
export async function applyImageBackground(
  slideDoc: XmlDocument,
  spec: BackgroundImageSpec,
  ctx: { specDir: string; zipPackage: ZipPackage; slidePath: string },
): Promise<XmlDocument> {
  let arrayBuffer: ArrayBuffer;
  let mimeType: ReturnType<typeof detectImageMimeType>;

  if (spec.data) {
    arrayBuffer = uint8ArrayToArrayBuffer(spec.data);
    mimeType = (spec.mimeType ?? "image/png") as typeof mimeType;
  } else if (spec.path) {
    const imagePath = path.resolve(ctx.specDir, spec.path);
    mimeType = detectImageMimeType(imagePath);
    arrayBuffer = await readFileToArrayBuffer(imagePath);
  } else {
    throw new Error("BackgroundImageSpec requires either 'path' or 'data'");
  }

  const { rId } = addMedia({
    pkg: ctx.zipPackage,
    mediaData: arrayBuffer,
    mediaType: mimeType,
    referringPart: ctx.slidePath,
  });

  const bgElement = buildBlipFillBackground(rId, spec.mode ?? "stretch");

  return updateDocumentRoot(slideDoc, (root) => {
    const cSld = getChild(root, "p:cSld");
    if (!cSld) {
      return root;
    }

    // Remove existing background if present
    const existingBg = getChild(cSld, "p:bg");
    const filteredChildren = existingBg ? withoutBackground(cSld.children) : cSld.children;

    // p:bg should be the first child of p:cSld
    const newCsld: XmlElement = {
      ...cSld,
      children: [bgElement, ...filteredChildren],
    };

    return replaceChildByName(root, "p:cSld", newCsld);
  });
}

/**
 * Check if background spec is image type
 */
export function isImageBackground(spec: BackgroundFillSpec): spec is BackgroundImageSpec {
  return typeof spec === "object" && spec.type === "image";
}
