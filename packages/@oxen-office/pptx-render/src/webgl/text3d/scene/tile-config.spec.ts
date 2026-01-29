/**
 * @file Unit tests for tile-config.ts
 *
 * Tests ECMA-376 compliant tile configuration utilities.
 */

import * as THREE from "three";
import type { Percent, Pixels } from "@oxen-office/ooxml/domain/units";
import {
  applyTileFlipMode,
  applyTileRect,
  calculateTileRectTransform,
  calculateTileFillTransform,
  createDefaultTileFill,
  createDefaultTileRect,
} from "./tile-config";

describe("tile-config", () => {
  describe("applyTileFlipMode", () => {
    it("applies 'none' flip mode with RepeatWrapping", () => {
      const texture = new THREE.Texture();
      applyTileFlipMode(texture, "none");

      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    });

    it("applies 'x' flip mode with MirroredRepeat on S axis", () => {
      const texture = new THREE.Texture();
      applyTileFlipMode(texture, "x");

      expect(texture.wrapS).toBe(THREE.MirroredRepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    });

    it("applies 'y' flip mode with MirroredRepeat on T axis", () => {
      const texture = new THREE.Texture();
      applyTileFlipMode(texture, "y");

      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.MirroredRepeatWrapping);
    });

    it("applies 'xy' flip mode with MirroredRepeat on both axes", () => {
      const texture = new THREE.Texture();
      applyTileFlipMode(texture, "xy");

      expect(texture.wrapS).toBe(THREE.MirroredRepeatWrapping);
      expect(texture.wrapT).toBe(THREE.MirroredRepeatWrapping);
    });
  });

  describe("calculateTileRectTransform", () => {
    it("returns 1x repeat for default tileRect (no tiling)", () => {
      const tileRect = createDefaultTileRect();
      const result = calculateTileRectTransform(tileRect);

      expect(result.repeatX).toBe(1);
      expect(result.repeatY).toBe(1);
      // Use toBeCloseTo for -0 vs 0 comparison
      expect(result.offsetX).toBeCloseTo(0);
      expect(result.offsetY).toBeCloseTo(0);
    });

    it("calculates 2x repeat for 50% tile size", () => {
      const tileRect = {
        left: 0 as Percent,
        top: 0 as Percent,
        right: 50 as Percent,
        bottom: 50 as Percent,
      };
      const result = calculateTileRectTransform(tileRect);

      // 50% width/height = 2x repeat
      expect(result.repeatX).toBe(2);
      expect(result.repeatY).toBe(2);
    });

    it("calculates offset for negative left/bottom values", () => {
      const tileRect = {
        left: -25 as Percent,
        top: 0 as Percent,
        right: 25 as Percent,
        bottom: 0 as Percent,
      };
      const result = calculateTileRectTransform(tileRect);

      // Width is 1 - (-0.25) - 0.25 = 1.0
      expect(result.repeatX).toBe(1);
      // Offset is -(-0.25) * 1 = 0.25
      expect(result.offsetX).toBe(0.25);
    });

    it("handles symmetric tileRect for gradient tiling", () => {
      // Common pattern: tile gradient 4 times
      const tileRect = {
        left: 0 as Percent,
        top: 0 as Percent,
        right: 75 as Percent,
        bottom: 75 as Percent,
      };
      const result = calculateTileRectTransform(tileRect);

      // 25% size = 4x repeat
      expect(result.repeatX).toBe(4);
      expect(result.repeatY).toBe(4);
    });
  });

  describe("applyTileRect", () => {
    it("configures texture with calculated repeat and offset", () => {
      const texture = new THREE.Texture();
      const tileRect = {
        left: 0 as Percent,
        top: 0 as Percent,
        right: 50 as Percent,
        bottom: 50 as Percent,
      };

      applyTileRect(texture, tileRect);

      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
      expect(texture.repeat.x).toBe(2);
      expect(texture.repeat.y).toBe(2);
    });
  });

  describe("calculateTileFillTransform", () => {
    it("calculates repeat based on geometry and texture size", () => {
      const config = createDefaultTileFill();

      const result = calculateTileFillTransform(
        config,
        200, // geometry width
        100, // geometry height
        50, // texture width
        50, // texture height
      );

      // 200px geometry / 50px tile = 4 repeats
      expect(result.repeatX).toBe(4);
      // 100px geometry / 50px tile = 2 repeats
      expect(result.repeatY).toBe(2);
    });

    it("scales tile size based on sx/sy", () => {
      const config = {
        ...createDefaultTileFill(),
        sx: 50 as Percent, // 50% scale = half size = double repeats
        sy: 200 as Percent, // 200% scale = double size = half repeats
      };

      const result = calculateTileFillTransform(
        config,
        100, // geometry width
        100, // geometry height
        50, // texture width
        50, // texture height
      );

      // 100 / (50 * 0.5) = 100 / 25 = 4
      expect(result.repeatX).toBe(4);
      // 100 / (50 * 2.0) = 100 / 100 = 1
      expect(result.repeatY).toBe(1);
    });

    it("applies tx/ty offset", () => {
      const config = {
        ...createDefaultTileFill(),
        tx: 10 as Pixels,
        ty: 20 as Pixels,
      };

      const result = calculateTileFillTransform(
        config,
        100, // geometry width
        100, // geometry height
        50, // texture width
        50, // texture height
      );

      // tx=10 / geoWidth=100 = 0.1 (plus alignment offset for 'tl')
      expect(result.offsetX).toBe(0.1);
      expect(result.offsetY).toBe(0.2);
    });
  });

  describe("createDefaultTileFill", () => {
    it("has expected default values", () => {
      const defaultFill = createDefaultTileFill();
      expect(defaultFill.tx as number).toBe(0);
      expect(defaultFill.ty as number).toBe(0);
      expect(defaultFill.sx as number).toBe(100);
      expect(defaultFill.sy as number).toBe(100);
      expect(defaultFill.flip).toBe("none");
      expect(defaultFill.alignment).toBe("tl");
    });
  });

  describe("createDefaultTileRect", () => {
    it("has zero values (no tiling)", () => {
      const defaultRect = createDefaultTileRect();
      expect(defaultRect.left as number).toBe(0);
      expect(defaultRect.top as number).toBe(0);
      expect(defaultRect.right as number).toBe(0);
      expect(defaultRect.bottom as number).toBe(0);
    });
  });
});
