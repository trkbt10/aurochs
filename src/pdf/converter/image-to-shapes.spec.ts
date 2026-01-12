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
  it("creates a pic shape with data URL resourceId", () => {
    const image: PdfImage = {
      type: "image",
      data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00]),
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
