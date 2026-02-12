/**
 * @file Blip fill builder tests
 */

import { buildBlipFill, buildSimpleBlipFill, buildCroppedBlipFill, buildTiledBlipFill } from "./blip-fill";
import type { BlipFillSpec } from "../types";

describe("blip fill builder", () => {
  describe("buildBlipFill", () => {
    it("creates a blip fill with resourceId", () => {
      const spec: BlipFillSpec = {
        resourceId: "rId1",
      };

      const result = buildBlipFill(spec);

      expect(result.type).toBe("blip");
      expect(result.resourceId).toBe("rId1");
      expect(result.stretchMode).toBe("fill");
      expect(result.tileMode).toBeUndefined();
    });

    it("creates a blip fill with source rectangle", () => {
      const spec: BlipFillSpec = {
        resourceId: "rId1",
        sourceRect: { left: 10, top: 20, right: 10, bottom: 20 },
      };

      const result = buildBlipFill(spec);

      expect(result.sourceRect).toEqual({ left: 10, top: 20, right: 10, bottom: 20 });
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

      expect(result.stretchMode).toBeUndefined();
      expect(result.tileMode).toBeDefined();
      expect(result.tileMode?.flip).toBe("xy");
      expect(result.tileMode?.scaleX).toBe(100);
      expect(result.tileMode?.scaleY).toBe(100);
      expect(result.tileMode?.alignment).toBe("ctr");
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

      expect(result.type).toBe("blip");
      expect(result.resourceId).toBe("rId2");
      expect(result.stretchMode).toBe("fill");
    });
  });

  describe("buildCroppedBlipFill", () => {
    it("creates a cropped blip fill", () => {
      const result = buildCroppedBlipFill("rId3", { left: 5, top: 10, right: 15, bottom: 20 });

      expect(result.type).toBe("blip");
      expect(result.resourceId).toBe("rId3");
      expect(result.sourceRect).toEqual({ left: 5, top: 10, right: 15, bottom: 20 });
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

      expect(result.type).toBe("blip");
      expect(result.resourceId).toBe("rId4");
      expect(result.tileMode?.flip).toBe("x");
      expect(result.tileMode?.scaleX).toBe(50);
      expect(result.tileMode?.alignment).toBe("tl");
    });
  });
});
