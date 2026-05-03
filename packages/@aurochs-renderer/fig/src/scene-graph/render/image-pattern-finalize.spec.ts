/**
 * @file Tests for image pattern finalization
 */

import { finalizeImagePatternDefs } from "./image-pattern-finalize";
import type { RenderDef } from "../render-tree/types";

function createPngDataUri(size: { readonly width: number; readonly height: number }): string {
  const bytes = new Uint8Array(24);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  bytes[2] = 0x4e;
  bytes[3] = 0x47;
  bytes[12] = 0x49;
  bytes[13] = 0x48;
  bytes[14] = 0x44;
  bytes[15] = 0x52;
  const view = new DataView(bytes.buffer);
  view.setUint32(16, size.width);
  view.setUint32(20, size.height);
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

function createImagePatternDef(fields: { readonly scaleMode: string; readonly scalingFactor?: number }): RenderDef {
  return {
    type: "pattern",
    def: {
      type: "image",
      id: "img-1",
      dataUri: createPngDataUri({ width: 200, height: 100 }),
      patternContentUnits: "objectBoundingBox",
      width: 1,
      height: 1,
      imageWidth: 1,
      imageHeight: 1,
      preserveAspectRatio: "none",
      scaleMode: fields.scaleMode,
      scalingFactor: fields.scalingFactor,
    },
  };
}

function createJpegDataUriWithLateSof(size: { readonly width: number; readonly height: number }): string {
  const bytes = new Uint8Array(1300);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  const markerOffset = 1200;
  bytes[markerOffset] = 0xff;
  bytes[markerOffset + 1] = 0xc0;
  bytes[markerOffset + 2] = 0x00;
  bytes[markerOffset + 3] = 0x11;
  bytes[markerOffset + 4] = 0x08;
  const view = new DataView(bytes.buffer);
  view.setUint16(markerOffset + 5, size.height);
  view.setUint16(markerOffset + 7, size.width);
  return `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("finalizeImagePatternDefs", () => {
  it("centers FIT image fills without stretching the image", () => {
    const defs = [createImagePatternDef({ scaleMode: "FIT" })];

    finalizeImagePatternDefs(defs, { width: 100, height: 100 });

    const def = defs[0];
    expect(def.type).toBe("pattern");
    if (def.type === "pattern") {
      expect(def.def.width).toBe(1);
      expect(def.def.height).toBe(1);
      expect(def.def.imageWidth).toBe(200);
      expect(def.def.imageHeight).toBe(100);
      expect(def.def.imageTransform).toBe("matrix(0.005 0 0 0.005 0 0.25)");
    }
  });

  it("uses a repeating pattern size for TILE image fills", () => {
    const defs = [createImagePatternDef({ scaleMode: "TILE", scalingFactor: 0.5 })];

    finalizeImagePatternDefs(defs, { width: 100, height: 100 });

    const def = defs[0];
    expect(def.type).toBe("pattern");
    if (def.type === "pattern") {
      expect(def.def.width).toBe(1);
      expect(def.def.height).toBe(0.5);
      expect(def.def.imageWidth).toBe(200);
      expect(def.def.imageHeight).toBe(100);
      expect(def.def.imageTransform).toBe("scale(0.005)");
    }
  });

  it("throws instead of stretching silently when image dimensions cannot be decoded", () => {
    const defs: RenderDef[] = [{
      type: "pattern",
      def: {
        type: "image",
        id: "bad-image",
        dataUri: "data:image/png;base64,AAAA",
        patternContentUnits: "objectBoundingBox",
        width: 1,
        height: 1,
        imageWidth: 1,
        imageHeight: 1,
        preserveAspectRatio: "none",
        scaleMode: "FILL",
      },
    }];

    expect(() => finalizeImagePatternDefs(defs, { width: 100, height: 100 }))
      .toThrow("requires decodable image dimensions");
  });

  it("reads JPEG dimensions even when the SOF marker appears after metadata", () => {
    const defs: RenderDef[] = [{
      type: "pattern",
      def: {
        type: "image",
        id: "jpeg-image",
        dataUri: createJpegDataUriWithLateSof({ width: 320, height: 160 }),
        patternContentUnits: "objectBoundingBox",
        width: 1,
        height: 1,
        imageWidth: 1,
        imageHeight: 1,
        preserveAspectRatio: "none",
        scaleMode: "FIT",
      },
    }];

    finalizeImagePatternDefs(defs, { width: 160, height: 160 });

    const def = defs[0];
    expect(def.type).toBe("pattern");
    if (def.type === "pattern") {
      expect(def.def.imageWidth).toBe(320);
      expect(def.def.imageHeight).toBe(160);
      expect(def.def.imageTransform).toBe("matrix(0.003125 0 0 0.003125 0 0.25)");
    }
  });
});
