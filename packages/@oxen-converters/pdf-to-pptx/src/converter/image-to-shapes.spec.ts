/**
 * @file src/pdf/converter/image-to-shapes.spec.ts
 */

import type { PdfImage } from "@oxen/pdf/domain";
import { createDefaultGraphicsState } from "@oxen/pdf/domain";
import { px } from "@oxen-office/ooxml/domain/units";
import { base64ArrayBuffer, base64ToArrayBuffer, parseDataUrl, toDataUrl } from "@oxen/buffer";
import { convertImageToShape } from "./image-to-shapes";
import { createFitContext } from "./transform-converter";

const graphicsState = createDefaultGraphicsState();

const context = createFitContext(100, 100, px(100), px(100), "stretch");

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

  it("warps sheared images into an axis-aligned PNG (bbox-based)", () => {
    // 2x2 RGB image (row-major, top-to-bottom): red, green / blue, yellow.
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([
        255, 0, 0,    // top-left: red
        0, 255, 0,    // top-right: green
        0, 0, 255,    // bottom-left: blue
        255, 255, 0,  // bottom-right: yellow
      ]),
      width: 2,
      height: 2,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: {
        ...graphicsState,
        // x' = 10x + 5y, y' = 10y (shear in X).
        ctm: [10, 0, 5, 10, 0, 0],
      },
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {throw new Error("Expected shape to be created");}

    expect(shape.blipFill.sourceRect).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    expect(shape.properties.transform).toMatchObject({ x: 0, y: 90, width: 15, height: 10 });

    const parsed = parseDataUrl(shape.blipFill.resourceId);
    expect(parsed.mimeType).toBe("image/png");

    type PngReadResult = Readonly<{ readonly width: number; readonly height: number; readonly data: Uint8Array }>;
    type PngjsModule = Readonly<{ readonly PNG: Readonly<{ readonly sync: Readonly<{ readonly read: (bytes: Buffer) => PngReadResult }> }> }>;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- pngjs is CJS
    const pngjs = require("pngjs") as PngjsModule;
    const decoded = pngjs.PNG.sync.read(Buffer.from(parsed.data));

    expect(decoded.width).toBe(15);
    expect(decoded.height).toBe(10);

    const pxAt = (x: number, y: number): readonly [number, number, number, number] => {
      const i = (y * decoded.width + x) * 4;
      return [decoded.data[i] ?? 0, decoded.data[i + 1] ?? 0, decoded.data[i + 2] ?? 0, decoded.data[i + 3] ?? 0];
    };

    // Outside the sheared parallelogram → transparent.
    expect(pxAt(0, 0)[3]).toBe(0);
    expect(pxAt(14, 9)[3]).toBe(0);

    // Inside samples map into the original 2x2 image.
    expect(pxAt(14, 0)).toEqual([0, 255, 0, 255]); // top-right → green
    expect(pxAt(0, 9)).toEqual([0, 0, 255, 255]); // bottom-left → blue
  });

  it("applies clipBBox for rotated images by baking the transform into a clipped PNG (bbox-only)", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([
        255, 0, 0,    // top-left: red
        0, 255, 0,    // top-right: green
        0, 0, 255,    // bottom-left: blue
        255, 255, 0,  // bottom-right: yellow
      ]),
      width: 2,
      height: 2,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState: {
        ...graphicsState,
        // 90° rotation with scale 10 around (0,0), then translate to keep in +X/+Y:
        // (0,1) maps to (0,0), (1,1) maps to (0,10), (0,0) maps to (10,0), (1,0) maps to (10,10).
        ctm: [0, 10, -10, 0, 10, 0],
        clipBBox: [0, 0, 5, 10],
      },
    };

    const shape = convertImageToShape(image, context, "1");
    if (!shape) {throw new Error("Expected shape to be created");}

    // Clipped bbox is applied by shrinking the placed image bounds.
    expect(shape.properties.transform).toMatchObject({ x: 0, y: 90, width: 5, height: 10 });

    const parsed = parseDataUrl(shape.blipFill.resourceId);
    expect(parsed.mimeType).toBe("image/png");

    type PngReadResult = Readonly<{ readonly width: number; readonly height: number; readonly data: Uint8Array }>;
    type PngjsModule = Readonly<{ readonly PNG: Readonly<{ readonly sync: Readonly<{ readonly read: (bytes: Buffer) => PngReadResult }> }> }>;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- pngjs is CJS
    const pngjs = require("pngjs") as PngjsModule;
    const decoded = pngjs.PNG.sync.read(Buffer.from(parsed.data));
    expect(decoded.width).toBe(5);
    expect(decoded.height).toBe(10);
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
