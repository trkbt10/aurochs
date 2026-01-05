/**
 * @file Tests for Connection Site Calculator
 *
 * @see ECMA-376 Part 1, Section 20.1.9.7 (cxn - Connection Site)
 */

import { calculateConnectionSites, getConnectionPoint, transformConnectionPoint } from "./connection-site";
import type { CustomGeometry, PresetGeometry } from "../shape";
import { deg, px } from "../types";

describe("connection-site - ECMA-376 compliance", () => {
  describe("calculateConnectionSites - preset geometry (ECMA-376 20.1.9.18)", () => {
    it("returns 4 standard sites for rect", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rect", adjustValues: [] };
      const result = calculateConnectionSites(geom, 100, 50);

      expect(result.count).toBe(4);
      expect(result.sites).toHaveLength(4);

      // Top center
      expect(result.sites[0].x).toBe(50);
      expect(result.sites[0].y).toBe(0);
      expect(result.sites[0].angle).toBe(270);

      // Right center
      expect(result.sites[1].x).toBe(100);
      expect(result.sites[1].y).toBe(25);
      expect(result.sites[1].angle).toBe(0);

      // Bottom center
      expect(result.sites[2].x).toBe(50);
      expect(result.sites[2].y).toBe(50);
      expect(result.sites[2].angle).toBe(90);

      // Left center
      expect(result.sites[3].x).toBe(0);
      expect(result.sites[3].y).toBe(25);
      expect(result.sites[3].angle).toBe(180);
    });

    it("returns 4 standard sites for ellipse", () => {
      const geom: PresetGeometry = { type: "preset", preset: "ellipse", adjustValues: [] };
      const result = calculateConnectionSites(geom, 100, 80);

      expect(result.count).toBe(4);
      expect(result.sites[0].x).toBe(50); // Top
      expect(result.sites[0].y).toBe(0);
      expect(result.sites[1].x).toBe(100); // Right
      expect(result.sites[1].y).toBe(40);
    });

    it("returns 3 sites for triangle", () => {
      const geom: PresetGeometry = { type: "preset", preset: "triangle", adjustValues: [] };
      const result = calculateConnectionSites(geom, 100, 100);

      expect(result.count).toBe(3);
      expect(result.sites[0].x).toBe(50); // Top vertex
      expect(result.sites[0].y).toBe(0);
      expect(result.sites[1].x).toBe(100); // Bottom right
      expect(result.sites[1].y).toBe(100);
      expect(result.sites[2].x).toBe(0); // Bottom left
      expect(result.sites[2].y).toBe(100);
    });

    it("returns 2 sites for line", () => {
      const geom: PresetGeometry = { type: "preset", preset: "line", adjustValues: [] };
      const result = calculateConnectionSites(geom, 100, 50);

      expect(result.count).toBe(2);
      expect(result.sites[0].x).toBe(0); // Start
      expect(result.sites[0].y).toBe(0);
      expect(result.sites[1].x).toBe(100); // End
      expect(result.sites[1].y).toBe(50);
    });

    it("returns 4 sites for diamond", () => {
      const geom: PresetGeometry = { type: "preset", preset: "diamond", adjustValues: [] };
      const result = calculateConnectionSites(geom, 100, 100);

      expect(result.count).toBe(4);
      expect(result.sites[0].x).toBe(50); // Top
      expect(result.sites[0].y).toBe(0);
      expect(result.sites[1].x).toBe(100); // Right
      expect(result.sites[1].y).toBe(50);
    });

    it("returns 6 sites for hexagon", () => {
      const geom: PresetGeometry = { type: "preset", preset: "hexagon", adjustValues: [] };
      const result = calculateConnectionSites(geom, 100, 100);

      expect(result.count).toBe(6);
    });

    it("returns 8 sites for octagon", () => {
      const geom: PresetGeometry = { type: "preset", preset: "octagon", adjustValues: [] };
      const result = calculateConnectionSites(geom, 100, 100);

      expect(result.count).toBe(8);
    });
  });

  describe("calculateConnectionSites - custom geometry (ECMA-376 20.1.9.7)", () => {
    it("returns default sites when no connection sites defined", () => {
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
        textRect: undefined,
      };
      const result = calculateConnectionSites(geom, 100, 50);

      // Should fall back to default 4-point rect sites
      expect(result.count).toBe(4);
    });

    it("resolves custom connection sites with literal coordinates", () => {
      const geom: CustomGeometry = {
        type: "custom",
        paths: [],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [
          { angle: deg(270), position: { x: px(50), y: px(0) } },
          { angle: deg(90), position: { x: px(50), y: px(100) } },
        ],
        textRect: undefined,
      };
      const result = calculateConnectionSites(geom, 100, 100);

      expect(result.count).toBe(2);
      expect(result.sites[0].x).toBe(50);
      expect(result.sites[0].y).toBe(0);
      expect(result.sites[0].angle).toBe(270);
      expect(result.sites[1].x).toBe(50);
      expect(result.sites[1].y).toBe(100);
      expect(result.sites[1].angle).toBe(90);
    });
  });

  describe("getConnectionPoint", () => {
    it("returns site by index for preset geometry", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rect", adjustValues: [] };

      const site0 = getConnectionPoint(geom, 100, 50, 0);
      expect(site0).toBeDefined();
      expect(site0!.x).toBe(50);
      expect(site0!.y).toBe(0);

      const site1 = getConnectionPoint(geom, 100, 50, 1);
      expect(site1).toBeDefined();
      expect(site1!.x).toBe(100);
      expect(site1!.y).toBe(25);
    });

    it("returns undefined for invalid index", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rect", adjustValues: [] };
      const site = getConnectionPoint(geom, 100, 50, 99);
      expect(site).toBeUndefined();
    });

    it("returns default sites when geometry is undefined", () => {
      const site = getConnectionPoint(undefined, 100, 50, 0);
      expect(site).toBeDefined();
      expect(site!.x).toBe(50);
      expect(site!.y).toBe(0);
    });
  });

  describe("transformConnectionPoint", () => {
    it("translates to world coordinates without transforms", () => {
      const result = transformConnectionPoint(
        50,
        0, // Site position
        100,
        200, // Shape position
        100,
        50, // Shape size
        0, // No rotation
        false,
        false, // No flips
      );

      expect(result.x).toBe(150); // 100 + 50
      expect(result.y).toBe(200); // 200 + 0
    });

    it("applies horizontal flip", () => {
      const result = transformConnectionPoint(
        0,
        25, // Left center site
        100,
        200, // Shape position
        100,
        50, // Shape size
        0, // No rotation
        true,
        false, // Flip H
      );

      // Horizontal flip: x becomes (width - x) = 100 - 0 = 100
      expect(result.x).toBe(200); // 100 + 100
      expect(result.y).toBe(225); // 200 + 25
    });

    it("applies vertical flip", () => {
      const result = transformConnectionPoint(
        50,
        0, // Top center site
        100,
        200, // Shape position
        100,
        50, // Shape size
        0, // No rotation
        false,
        true, // Flip V
      );

      // Vertical flip: y becomes (height - y) = 50 - 0 = 50
      expect(result.x).toBe(150); // 100 + 50
      expect(result.y).toBe(250); // 200 + 50
    });

    it("applies 90 degree rotation", () => {
      const result = transformConnectionPoint(
        50,
        0, // Top center site
        100,
        200, // Shape position
        100,
        100, // Square shape
        90, // 90 degree rotation
        false,
        false, // No flips
      );

      // After 90° rotation around center (50, 50):
      // Point (50, 0) -> (100, 50)
      expect(result.x).toBeCloseTo(200, 5);
      expect(result.y).toBeCloseTo(250, 5);
    });

    it("applies 180 degree rotation", () => {
      const result = transformConnectionPoint(
        50,
        0, // Top center site
        100,
        200, // Shape position
        100,
        100, // Square shape
        180, // 180 degree rotation
        false,
        false, // No flips
      );

      // After 180° rotation around center (50, 50):
      // Point (50, 0) -> (50, 100)
      expect(result.x).toBeCloseTo(150, 5);
      expect(result.y).toBeCloseTo(300, 5);
    });

    it("applies combined flip and rotation", () => {
      const result = transformConnectionPoint(
        0,
        50, // Left center site
        0,
        0, // Shape at origin
        100,
        100, // Square shape
        90, // 90 degree rotation
        true,
        false, // Flip H
      );

      // First flip H: (0, 50) -> (100, 50)
      // Then rotate 90° around center (50, 50): (100, 50) -> (50, 100)
      expect(result.x).toBeCloseTo(50, 5);
      expect(result.y).toBeCloseTo(100, 5);
    });
  });

  describe("getSite lookup function", () => {
    it("finds site by index", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rect", adjustValues: [] };
      const lookup = calculateConnectionSites(geom, 100, 50);

      const site = lookup.getSite(2);
      expect(site).toBeDefined();
      expect(site!.index).toBe(2);
      expect(site!.x).toBe(50); // Bottom center x
      expect(site!.y).toBe(50); // Bottom center y
    });

    it("returns undefined for non-existent index", () => {
      const geom: PresetGeometry = { type: "preset", preset: "rect", adjustValues: [] };
      const lookup = calculateConnectionSites(geom, 100, 50);

      expect(lookup.getSite(10)).toBeUndefined();
      expect(lookup.getSite(-1)).toBeUndefined();
    });
  });
});
