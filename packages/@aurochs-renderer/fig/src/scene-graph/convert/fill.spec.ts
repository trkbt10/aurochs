/**
 * @file Fill conversion tests
 *
 * Verifies that the scene graph fill conversion correctly handles
 * both API-format paints (gradientStops/gradientHandlePositions)
 * and Kiwi-format paints (stops/transform) from the builder.
 *
 * Uses test-helpers/kiwi-paint.ts for type-safe Kiwi-format data
 * construction — no `as unknown as FigPaint` casts.
 */

import { convertPaintToFill, convertPaintsToFills } from "./fill";
import type { FigSolidPaint } from "@aurochs/fig/types";
import type { FigImage } from "@aurochs/fig/parser";
import {
  type KiwiGradientPaint,
  type KiwiSolidPaint,
  asPaint,
} from "../../test-helpers/kiwi-paint";

const NO_IMAGES: ReadonlyMap<string, FigImage> = new Map();

describe("convertPaintToFill", () => {
  describe("solid paint", () => {
    it("converts SOLID paint with direct type string", () => {
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

    it("converts SOLID paint with KiwiEnumValue type", () => {
      const kiwiSolid: KiwiSolidPaint = {
        type: { value: 0, name: "SOLID" },
        color: { r: 0, g: 1, b: 0, a: 1 },
        opacity: 1,
        visible: true,
      };
      if (asPaint(kiwiSolid)) {
        const fill = convertPaintToFill(kiwiSolid, NO_IMAGES);
        expect(fill).toEqual({
          type: "solid",
          color: { r: 0, g: 1, b: 0, a: 1 },
          opacity: 1,
        });
      }
    });
  });

  describe("linear gradient (Kiwi format: stops + transform)", () => {
    it("converts builder-generated linear gradient", () => {
      // This is the exact format the builder outputs after Kiwi encode/decode
      const kiwiGradient: KiwiGradientPaint = {
        type: { value: 1, name: "GRADIENT_LINEAR" },
        opacity: 1,
        visible: true,
        blendMode: { value: 1, name: "NORMAL" },
        stops: [
          { color: { r: 0.24, g: 0.47, b: 0.85, a: 1 }, position: 0 },
          { color: { r: 0.55, g: 0.30, b: 0.85, a: 1 }, position: 1 },
        ],
        transform: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 1, m12: 0 },
      };

      if (asPaint(kiwiGradient)) {
        const fill = convertPaintToFill(kiwiGradient, NO_IMAGES);
        expect(fill).not.toBeNull();
        expect(fill!.type).toBe("linear-gradient");
        if (fill!.type === "linear-gradient") {
          expect(fill!.stops).toHaveLength(2);
          expect(fill!.stops[0].color).toEqual({ r: 0.24, g: 0.47, b: 0.85, a: 1 });
          expect(fill!.stops[1].color).toEqual({ r: 0.55, g: 0.30, b: 0.85, a: 1 });
          // start and end should be derived from transform
          expect(typeof fill!.start.x).toBe("number");
          expect(typeof fill!.end.x).toBe("number");
        }
      }
    });
  });

  describe("radial gradient (Kiwi format: stops + transform)", () => {
    it("converts builder-generated radial gradient", () => {
      const kiwiGradient: KiwiGradientPaint = {
        type: { value: 2, name: "GRADIENT_RADIAL" },
        opacity: 1,
        visible: true,
        blendMode: { value: 1, name: "NORMAL" },
        stops: [
          { color: { r: 0.95, g: 0.55, b: 0.15, a: 1 }, position: 0 },
          { color: { r: 0.90, g: 0.25, b: 0.25, a: 1 }, position: 1 },
        ],
        transform: { m00: 0.5, m01: 0, m02: 0.5, m10: 0, m11: 0.5, m12: 0.5 },
      };

      if (asPaint(kiwiGradient)) {
        const fill = convertPaintToFill(kiwiGradient, NO_IMAGES);
        expect(fill).not.toBeNull();
        expect(fill!.type).toBe("radial-gradient");
        if (fill!.type === "radial-gradient") {
          expect(fill!.stops).toHaveLength(2);
          expect(fill!.center.x).toBe(0.5);
          expect(fill!.center.y).toBe(0.5);
          expect(fill!.radius).toBe(0.5);
        }
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
});
