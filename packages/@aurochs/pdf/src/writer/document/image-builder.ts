/**
 * @file PDF Image Builder
 *
 * Builds PDF image XObject streams.
 */

import type { PdfObject } from "../../native/core/types";
import type { PdfImage } from "../../domain/image";
import { serializeIndirectObject } from "../object-serializer";
import { serializePdfStream } from "../stream-encoder";
import type { PdfObjectTracker } from "./object-tracker";

/**
 * Map PdfColorSpace to PDF color space name.
 */
function getColorSpaceName(colorSpace: PdfImage["colorSpace"]): string {
  switch (colorSpace) {
    case "DeviceGray":
      return "DeviceGray";
    case "DeviceRGB":
      return "DeviceRGB";
    case "DeviceCMYK":
      return "DeviceCMYK";
    case "ICCBased":
      return "DeviceRGB"; // Fallback
    default:
      return "DeviceRGB";
  }
}

/**
 * Build an image XObject.
 *
 * @param image - The image to build
 * @param tracker - Object tracker for allocation
 * @returns The allocated object number
 */
export function buildImageXObject(
  image: PdfImage,
  tracker: PdfObjectTracker
): number {
  const objNum = tracker.allocate();

  // Build image stream dictionary
  const imageDict = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "XObject" }],
    ["Subtype", { type: "name", value: "Image" }],
    ["Width", { type: "number", value: image.width }],
    ["Height", { type: "number", value: image.height }],
    ["ColorSpace", { type: "name", value: getColorSpaceName(image.colorSpace) }],
    ["BitsPerComponent", { type: "number", value: image.bitsPerComponent }],
  ]);

  // Add decode array if present
  if (image.decode && image.decode.length > 0) {
    imageDict.set("Decode", {
      type: "array",
      items: image.decode.map((v) => ({ type: "number", value: v })),
    });
  }

  // Build soft mask if present
  if (image.alpha) {
    const maskObjNum = buildSoftMask({
      alpha: image.alpha,
      width: image.width,
      height: image.height,
      tracker,
    });
    imageDict.set("SMask", { type: "ref", obj: maskObjNum, gen: 0 });
  }

  // Build the image stream
  const streamBytes = serializePdfStream({
    dict: imageDict,
    data: image.data,
    encoding: "FlateDecode",
  });

  tracker.set(objNum, serializeIndirectObject(objNum, 0, streamBytes));

  return objNum;
}

type BuildSoftMaskOptions = {
  readonly alpha: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly tracker: PdfObjectTracker;
};

/**
 * Build a soft mask (alpha channel) XObject.
 */
function buildSoftMask(options: BuildSoftMaskOptions): number {
  const { alpha, width, height, tracker } = options;
  const objNum = tracker.allocate();

  const maskDict = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "XObject" }],
    ["Subtype", { type: "name", value: "Image" }],
    ["Width", { type: "number", value: width }],
    ["Height", { type: "number", value: height }],
    ["ColorSpace", { type: "name", value: "DeviceGray" }],
    ["BitsPerComponent", { type: "number", value: 8 }],
  ]);

  const streamBytes = serializePdfStream({
    dict: maskDict,
    data: alpha,
    encoding: "FlateDecode",
  });

  tracker.set(objNum, serializeIndirectObject(objNum, 0, streamBytes));

  return objNum;
}

/**
 * Collect and build all images from a page.
 *
 * @param images - Array of PdfImage elements
 * @param tracker - Object tracker
 * @returns Map of image index to object number
 */
export function buildImages(
  images: readonly PdfImage[],
  tracker: PdfObjectTracker
): Map<number, number> {
  const imageMap = new Map<number, number>();

  for (let i = 0; i < images.length; i++) {
    const objNum = buildImageXObject(images[i], tracker);
    imageMap.set(i, objNum);
  }

  return imageMap;
}
