/**
 * @file Tests for shape-serializer
 */

import { serializeShape } from "./shape-serializer";
import type { SpShape, PicShape } from "@aurochs-office/pptx/domain/shape";
import type { Pixels, Degrees, Percent } from "@aurochs-office/drawing-ml/domain/units";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";

describe("shape-serializer", () => {
  describe("serializeShape", () => {
    it("serializes an sp shape with text", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Title" },
        properties: {
          transform: {
            x: 100 as Pixels,
            y: 50 as Pixels,
            width: 800 as Pixels,
            height: 100 as Pixels,
            rotation: 0 as Degrees,
            flipH: false,
            flipV: false,
          },
        },
        textBody: {
          bodyProperties: {},
          paragraphs: [
            {
              properties: {},
              runs: [{ type: "text", text: "Hello World" }],
            },
          ],
        },
      };

      const result = serializeShape(shape);

      expect(result.id).toBe("1");
      expect(result.name).toBe("Title");
      expect(result.type).toBe("sp");
      expect(result.text).toBe("Hello World");
      expect(result.bounds).toEqual({ x: 100, y: 50, width: 800, height: 100 });
    });

    it("serializes an sp shape with placeholder", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "2", name: "Title 1" },
        placeholder: { type: "title" },
        properties: {},
      };

      const result = serializeShape(shape);

      expect(result.placeholder).toEqual({ type: "title", idx: undefined });
    });

    it("serializes a pic shape", () => {
      const red: Color = { spec: { type: "srgb", value: "FF0000" } };
      const accent1: Color = {
        spec: { type: "scheme", value: "accent1" },
        transform: { lumMod: 80 as Percent },
      };
      const shape: PicShape = {
        type: "pic",
        nonVisual: { id: "3", name: "Picture 1" },
        blipFill: {
          resourceId: "rId2",
          blipEffects: {
            grayscale: true,
            alphaBiLevel: { threshold: 50 as Percent },
            alphaModFix: { amount: 90 as Percent },
            colorChange: { from: red, to: accent1, useAlpha: true },
          },
        },
        properties: {
          transform: {
            x: 200 as Pixels,
            y: 200 as Pixels,
            width: 400 as Pixels,
            height: 300 as Pixels,
            rotation: 0 as Degrees,
            flipH: false,
            flipV: false,
          },
        },
        mediaType: "video",
        media: { videoFile: { link: "rId10", contentType: "video/mp4" } },
      };

      const result = serializeShape(shape);

      expect(result.id).toBe("3");
      expect(result.name).toBe("Picture 1");
      expect(result.type).toBe("pic");
      expect(result.resourceId).toBe("rId2");
      expect(result.blipEffects).toEqual({
        grayscale: true,
        alphaBiLevel: { threshold: 50 },
        alphaModFix: 90,
        colorChange: { from: "FF0000", to: "scheme:accent1", useAlpha: true },
      });
      expect(result.mediaType).toBe("video");
      expect(result.media).toEqual({ videoFile: { link: "rId10", contentType: "video/mp4" } });
      expect(result.bounds).toEqual({ x: 200, y: 200, width: 400, height: 300 });
    });

    it("omits undefined text from sp shape", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Shape" },
        properties: {},
      };

      const result = serializeShape(shape);

      expect(result.text).toBeUndefined();
    });
  });
});
