/**
 * @file src/pdf/converter/image-to-shapes.spec.ts
 */

import type { PdfImage } from "../domain";
import { createDefaultGraphicsState } from "../domain";
import { px } from "../../ooxml/domain/units";
import { base64ArrayBuffer, base64ToArrayBuffer } from "../../buffer/base64";
import { parseDataUrl, toDataUrl } from "../../buffer/data-url";
import { convertImageToShape } from "./image-to-shapes";

const graphicsState = createDefaultGraphicsState();

const context = {
  pdfWidth: 100,
  pdfHeight: 100,
  slideWidth: px(100),
  slideHeight: px(100),
} as const;

describe("convertImageToShape", () => {
  it("creates a pic shape with data URL resourceId (PNG format)", () => {
    // Full PNG signature (8 bytes) - will be detected as PNG and used as-is
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
      width: 10,
      height: 10,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState,
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {
      throw new Error("Expected shape to be created");
    }
    expect(shape.type).toBe("pic");
    expect(shape.nonVisual.id).toBe("1");
    expect(shape.blipFill.resourceId.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("creates a pic shape with raw pixel data", () => {
    // 2x2 RGB image = 12 bytes of raw pixel data
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([
        255, 0, 0,    // red
        0, 255, 0,    // green
        0, 0, 255,    // blue
        255, 255, 0,  // yellow
      ]),
      width: 2,
      height: 2,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState,
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {
      throw new Error("Expected shape to be created");
    }
    expect(shape.type).toBe("pic");
    expect(shape.nonVisual.id).toBe("1");
    expect(shape.blipFill.resourceId.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("applies alpha mask when encoding raw pixels to PNG", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([
        255, 0, 0, // red (transparent)
        0, 255, 0, // green (opaque)
      ]),
      alpha: new Uint8Array([0, 255]),
      width: 2,
      height: 1,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState,
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {
      throw new Error("Expected shape to be created");
    }
    const parsed = parseDataUrl(shape.blipFill.resourceId);
    expect(parsed.mimeType).toBe("image/png");

    type PngReadResult = Readonly<{ readonly width: number; readonly height: number; readonly data: Uint8Array }>;
    type PngjsModule = Readonly<{ readonly PNG: Readonly<{ readonly sync: Readonly<{ readonly read: (bytes: Buffer) => PngReadResult }> }> }>;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- pngjs is CJS
    const pngjs = require("pngjs") as PngjsModule;
    const decoded = pngjs.PNG.sync.read(Buffer.from(parsed.data));

    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);

    // RGBA for 2x1: [r,g,b,a, r,g,b,a]
    expect(decoded.data[3]).toBe(0);
    expect(decoded.data[7]).toBe(255);
  });

  it("applies /SMask /Matte by un-matting RGB before alpha is applied", () => {
    const image: PdfImage = {
      type: "image",
      // 2 pixels (RGB, 8bpc) that were composited over a white matte:
      // p0: intended red @ alpha=128 => stored [FF 7F 7F]
      // p1: intended blue @ alpha=64  => stored [BF BF FF]
      data: new Uint8Array([255, 127, 127, 191, 191, 255]),
      alpha: new Uint8Array([128, 64]),
      softMaskMatte: [1, 1, 1],
      width: 2,
      height: 1,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState,
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {
      throw new Error("Expected shape to be created");
    }
    const parsed = parseDataUrl(shape.blipFill.resourceId);
    expect(parsed.mimeType).toBe("image/png");

    type PngReadResult = Readonly<{ readonly width: number; readonly height: number; readonly data: Uint8Array }>;
    type PngjsModule = Readonly<{ readonly PNG: Readonly<{ readonly sync: Readonly<{ readonly read: (bytes: Buffer) => PngReadResult }> }> }>;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- pngjs is CJS
    const pngjs = require("pngjs") as PngjsModule;
    const decoded = pngjs.PNG.sync.read(Buffer.from(parsed.data));

    // RGBA for 2x1: [r,g,b,a, r,g,b,a]
    expect(Array.from(decoded.data.slice(0, 4))).toEqual([255, 0, 0, 128]);
    expect(Array.from(decoded.data.slice(4, 8))).toEqual([0, 0, 255, 64]);
  });

  it("detects JPEG signature and uses image/jpeg", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
      width: 10,
      height: 10,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState,
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {
      throw new Error("Expected shape to be created");
    }
    expect(shape.blipFill.resourceId.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("throws when shapeId is empty", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
      width: 10,
      height: 10,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState,
    };

    expect(() => convertImageToShape(image, context, "")).toThrow("shapeId is required");
  });

  it("applies rectangular clipBBox by setting srcRect and shrinking transform", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
      width: 10,
      height: 10,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: {
        ...graphicsState,
        ctm: [50, 0, 0, 50, 10, 10],
        clipBBox: [20, 20, 50, 40],
      },
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {
      throw new Error("Expected shape to be created");
    }

    expect(shape.blipFill.sourceRect).toEqual({
      left: 20,
      top: 40,
      right: 20,
      bottom: 20,
    });

    // pdfHeight=100 => y is flipped: [20..40] becomes [60..80] in PPTX.
    expect(shape.properties.transform).toMatchObject({
      x: 20,
      y: 60,
      width: 30,
      height: 20,
    });
  });

  it("drops images that are completely outside clipBBox even when rotated/sheared (bbox-only)", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
      width: 10,
      height: 10,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: {
        ...graphicsState,
        // Rotated/scaled image far away from the clip region.
        ctm: [10, 10, -10, 10, 80, 80],
        clipBBox: [0, 0, 10, 10],
      },
    };

    expect(convertImageToShape(image, context, "1")).toBeNull();
  });
});

describe("buffer/data-url + buffer/base64", () => {
  it("round-trips ArrayBuffer ↔ base64", () => {
    const buf = new Uint8Array([0x00, 0x01, 0x02, 0xff]).buffer;
    const b64 = base64ArrayBuffer(buf);
    expect(new Uint8Array(base64ToArrayBuffer(b64))).toEqual(new Uint8Array(buf));
  });

  it("round-trips ArrayBuffer ↔ data URL", () => {
    const buf = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
    const dataUrl = toDataUrl(buf, "application/octet-stream");
    const parsed = parseDataUrl(dataUrl);
    expect(parsed.mimeType).toBe("application/octet-stream");
    expect(new Uint8Array(parsed.data)).toEqual(new Uint8Array(buf));
  });

  it("throws on invalid data URL", () => {
    expect(() => parseDataUrl("not-a-data-url")).toThrow("Invalid data URL format");
  });
});
