/**
 * @file Blip fill builder tests
 */

import { buildBlipFill, buildSimpleBlipFill, buildCroppedBlipFill, buildTiledBlipFill } from "./blip-fill";
import { pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { BlipFillSpec } from "../types";

describe("blip fill builder", () => {
  describe("buildBlipFill", () => {
    it("creates a blip fill with resourceId", () => {
      const spec: BlipFillSpec = {
        resourceId: "rId1",
      };

      const result = buildBlipFill(spec);

      expect(result.type).toBe("blipFill");
      expect(result.resourceId).toBe("rId1");
      expect(result.stretch).toEqual({});
      expect(result.tile).toBeUndefined();
    });

    it("creates a blip fill with source rectangle", () => {
      const spec: BlipFillSpec = {
        resourceId: "rId1",
        sourceRect: { left: 10, top: 20, right: 10, bottom: 20 },
      };

      const result = buildBlipFill(spec);

      expect(result.sourceRect).toEqual({
        left: pct(10),
        top: pct(20),
        right: pct(10),
        bottom: pct(20),
      });
    });

    it("creates a blip fill with tile mode", () => {
      const spec: BlipFillSpec = {
        resourceId: "rId1",
        tile: {
          flip: "xy",
          scaleX: 100,
          scaleY: 100,
          alignment: "ctr",
        },
      };

      const result = buildBlipFill(spec);

      expect(result.stretch).toBeUndefined();
      expect(result.tile).toBeDefined();
      expect(result.tile?.flip).toBe("xy");
      expect(result.tile?.sx).toEqual(pct(100));
      expect(result.tile?.sy).toEqual(pct(100));
      expect(result.tile?.alignment).toBe("ctr");
    });

    it("includes optional properties", () => {
      const spec: BlipFillSpec = {
        resourceId: "rId1",
        dpi: 300,
        rotWithShape: true,
        compressionState: "print",
      };

      const result = buildBlipFill(spec);

      expect(result.dpi).toBe(300);
      expect(result.rotWithShape).toBe(true);
      expect(result.compressionState).toBe("print");
    });
  });

  describe("buildSimpleBlipFill", () => {
    it("creates a simple stretched blip fill", () => {
      const result = buildSimpleBlipFill("rId2");

      expect(result.type).toBe("blipFill");
      expect(result.resourceId).toBe("rId2");
      expect(result.stretch).toEqual({});
    });
  });

  describe("buildCroppedBlipFill", () => {
    it("creates a cropped blip fill", () => {
      const result = buildCroppedBlipFill("rId3", { left: 5, top: 10, right: 15, bottom: 20 });

      expect(result.type).toBe("blipFill");
      expect(result.resourceId).toBe("rId3");
      expect(result.sourceRect).toEqual({
        left: pct(5),
        top: pct(10),
        right: pct(15),
        bottom: pct(20),
      });
    });
  });

  describe("buildTiledBlipFill", () => {
    it("creates a tiled blip fill", () => {
      const result = buildTiledBlipFill("rId4", {
        flip: "x",
        scaleX: 50,
        scaleY: 50,
        alignment: "tl",
      });

      expect(result.type).toBe("blipFill");
      expect(result.resourceId).toBe("rId4");
      expect(result.tile?.flip).toBe("x");
      expect(result.tile?.sx).toEqual(pct(50));
      expect(result.tile?.alignment).toBe("tl");
    });

    it("creates a tiled blip fill with default values", () => {
      const result = buildTiledBlipFill("rId5", {});

      expect(result.tile?.tx).toEqual(px(0));
      expect(result.tile?.ty).toEqual(px(0));
      expect(result.tile?.sx).toEqual(pct(100));
      expect(result.tile?.sy).toEqual(pct(100));
      expect(result.tile?.flip).toBe("none");
      expect(result.tile?.alignment).toBe("tl");
    });
  });
});
