/**
 * @file Fill conversion tests
 *
 * Verifies that the scene graph fill conversion correctly handles
 * domain-format paints. After parser SSoT normalisation, all paint
 * `type` fields are FigPaintType strings; no Kiwi `{ value, name }`
 * shape is representable in the FigPaint type.
 */

import { convertPaintToFill, convertPaintsToFills } from "./fill";
import type {
  FigImagePaint,
  FigSolidPaint,
  FigGradientPaint,
} from "@aurochs/fig/types";
import type { FigImage } from "@aurochs/fig/parser";

const NO_IMAGES: ReadonlyMap<string, FigImage> = new Map();

describe("convertPaintToFill", () => {
  describe("solid paint", () => {
    it("converts SOLID paint with string type", () => {
      const paint: FigSolidPaint = {
        type: "SOLID",
        color: { r: 0, g: 0.5, b: 1, a: 1 },
        opacity: 0.8,
        visible: true,
      };
      const fill = convertPaintToFill(paint, NO_IMAGES);
      expect(fill).toEqual({
        type: "solid",
        color: { r: 0, g: 0.5, b: 1, a: 1 },
        opacity: 0.8,
      });
    });
  });

  describe("linear gradient (domain format: stops + transform)", () => {
    it("converts builder-generated linear gradient", () => {
      // This is the shape the builder emits after parser normalisation.
      const paint: FigGradientPaint = {
        type: "GRADIENT_LINEAR",
        opacity: 1,
        visible: true,
        blendMode: "NORMAL",
        stops: [
          { color: { r: 0.24, g: 0.47, b: 0.85, a: 1 }, position: 0 },
          { color: { r: 0.55, g: 0.30, b: 0.85, a: 1 }, position: 1 },
        ],
        transform: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 1, m12: 0 },
      };

      const fill = convertPaintToFill(paint, NO_IMAGES);
      expect(fill).not.toBeNull();
      expect(fill!.type).toBe("linear-gradient");
      if (fill!.type === "linear-gradient") {
        expect(fill!.stops).toHaveLength(2);
        expect(fill!.stops[0].color).toEqual({ r: 0.24, g: 0.47, b: 0.85, a: 1 });
        expect(fill!.stops[1].color).toEqual({ r: 0.55, g: 0.30, b: 0.85, a: 1 });
        expect(typeof fill!.start.x).toBe("number");
        expect(typeof fill!.end.x).toBe("number");
      }
    });
  });

  describe("radial gradient (domain format: stops + transform)", () => {
    it("converts builder-generated radial gradient", () => {
      const paint: FigGradientPaint = {
        type: "GRADIENT_RADIAL",
        opacity: 1,
        visible: true,
        blendMode: "NORMAL",
        stops: [
          { color: { r: 0.95, g: 0.55, b: 0.15, a: 1 }, position: 0 },
          { color: { r: 0.90, g: 0.25, b: 0.25, a: 1 }, position: 1 },
        ],
        transform: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
      };

      const fill = convertPaintToFill(paint, NO_IMAGES);
      expect(fill).not.toBeNull();
      expect(fill!.type).toBe("radial-gradient");
      if (fill!.type === "radial-gradient") {
        expect(fill!.stops).toHaveLength(2);
        expect(fill!.center.x).toBe(0.5);
        expect(fill!.center.y).toBe(0.5);
        expect(fill!.radius).toBe(0.5);
      }
    });
  });

  describe("invisible paints", () => {
    it("skips paints with visible=false", () => {
      const hidden: FigSolidPaint = { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: false };
      const visible: FigSolidPaint = { type: "SOLID", color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true };
      const fills = convertPaintsToFills([hidden, visible], NO_IMAGES);
      expect(fills).toHaveLength(1);
      expect(fills[0].type).toBe("solid");
      if (fills[0].type === "solid") {
        expect(fills[0].color.g).toBe(1);
      }
    });
  });

  describe("image paint", () => {
    it("preserves API imageTransform and TILE scalingFactor", () => {
      const image = { ref: "img-ref", data: new Uint8Array([1, 2, 3]), mimeType: "image/png" };
      const images: ReadonlyMap<string, FigImage> = new Map([["img-ref", image]]);
      const paint: FigImagePaint = {
        type: "IMAGE",
        imageRef: "img-ref",
        scaleMode: "TILE",
        scalingFactor: 0.5,
        imageTransform: { m00: 0.5, m01: 0, m02: 0.25, m10: 0, m11: 0.5, m12: 0.25 },
      };

      const fill = convertPaintToFill(paint, images);

      expect(fill).toEqual({
        type: "image",
        imageRef: "img-ref",
        data: image.data,
        mimeType: "image/png",
        scaleMode: "TILE",
        opacity: 1,
        scalingFactor: 0.5,
        imageTransform: { m00: 0.5, m01: 0, m02: 0.25, m10: 0, m11: 0.5, m12: 0.25 },
      });
    });
  });
});
