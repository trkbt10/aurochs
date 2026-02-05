import { describe, it, expect } from "bun:test";
import { createMapperConfig, mapBoundsToGrid } from "./coordinate-mapper";

describe("coordinate-mapper", () => {
  describe("createMapperConfig", () => {
    it("computes grid height for 960x540 (16:9) at width 80", () => {
      const config = createMapperConfig(960, 540, 80);
      expect(config.gridWidth).toBe(80);
      expect(config.gridHeight).toBe(23);
    });

    it("computes grid height for 720x540 (4:3) at width 80", () => {
      const config = createMapperConfig(720, 540, 80);
      expect(config.gridWidth).toBe(80);
      expect(config.gridHeight).toBe(30);
    });

    it("enforces minimum grid height of 1", () => {
      const config = createMapperConfig(1000, 1, 80);
      expect(config.gridHeight).toBeGreaterThanOrEqual(1);
    });

    it("uses specified terminal width as grid width", () => {
      const config = createMapperConfig(960, 540, 120);
      expect(config.gridWidth).toBe(120);
    });
  });

  describe("mapBoundsToGrid", () => {
    const config = createMapperConfig(960, 540, 80);

    it("maps a full-slide shape to fill the grid", () => {
      const rect = mapBoundsToGrid(config, { x: 0, y: 0, width: 960, height: 540 });
      expect(rect).toEqual({ col: 0, row: 0, width: 80, height: 23 });
    });

    it("maps a shape in the center of the slide", () => {
      const rect = mapBoundsToGrid(config, { x: 240, y: 135, width: 480, height: 270 });
      expect(rect).toBeDefined();
      expect(rect!.col).toBeGreaterThan(0);
      expect(rect!.row).toBeGreaterThan(0);
      expect(rect!.width).toBeGreaterThan(0);
      expect(rect!.height).toBeGreaterThan(0);
    });

    it("clamps shapes extending beyond slide right edge", () => {
      const rect = mapBoundsToGrid(config, { x: 800, y: 0, width: 300, height: 100 });
      expect(rect).toBeDefined();
      expect(rect!.col + rect!.width).toBeLessThanOrEqual(config.gridWidth);
    });

    it("clamps shapes extending beyond slide bottom edge", () => {
      const rect = mapBoundsToGrid(config, { x: 0, y: 400, width: 100, height: 300 });
      expect(rect).toBeDefined();
      expect(rect!.row + rect!.height).toBeLessThanOrEqual(config.gridHeight);
    });

    it("returns a valid rect for shapes starting at negative coordinates", () => {
      const rect = mapBoundsToGrid(config, { x: -100, y: -50, width: 300, height: 200 });
      expect(rect).toBeDefined();
      expect(rect!.col).toBe(0);
      expect(rect!.row).toBe(0);
    });

    it("maps a very small shape to at least 1x1", () => {
      const rect = mapBoundsToGrid(config, { x: 480, y: 270, width: 5, height: 5 });
      expect(rect).toBeDefined();
      expect(rect!.width).toBeGreaterThanOrEqual(1);
      expect(rect!.height).toBeGreaterThanOrEqual(1);
    });
  });
});
