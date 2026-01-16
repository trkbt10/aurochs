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
    const parsed = parseDataUrl(shape.blipFill.resourceId);
    expect(parsed.mimeType).toBe("image/png");

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- pngjs is CJS
    const pngjs = require("pngjs") as typeof import("pngjs");
    const { PNG } = pngjs;
    const decoded = PNG.sync.read(Buffer.from(parsed.data));

    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);

    // RGBA for 2x1: [r,g,b,a, r,g,b,a]
    expect(decoded.data[3]).toBe(0);
    expect(decoded.data[7]).toBe(255);
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
