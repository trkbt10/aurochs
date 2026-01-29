/**
 * @file Tests for geometry rendering
 *
 * Tests ECMA-376 Part 1, Section 20.1.9 (DrawingML Shapes) and
 * Section 20.1.10.56 (ST_ShapeType) preset geometries.
 *
 * @see ECMA-376 Part 1, Section 20.1.9
 * @see ECMA-376 Part 1, Section 20.1.10.56
 */

import { renderGeometryData, renderPresetGeometryData } from "./geometry";
import type { CustomGeometry, GeometryPath, PresetGeometry } from "@oxen-office/pptx/domain";
import { px } from "@oxen-office/ooxml/domain/units";

/**
 * Helper to create a PresetGeometry object for testing.
 *
 * @see ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom)
 */
function createPresetGeom(preset: string, adjustValues: Array<{ name: string; value: number }> = []): PresetGeometry {
  return {
    type: "preset",
    preset,
    adjustValues,
  };
}

describe("renderGeometryData", () => {
  describe("Preset geometry", () => {
    it("should render rect preset with shape dimensions", () => {
      const geom: PresetGeometry = {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      };

      const pathData = renderGeometryData(geom, 100, 50);

      expect(pathData).toContain("M 0 0");
      expect(pathData).toContain("L 100 0");
      expect(pathData).toContain("L 100 50");
    });

    /**
     * @test Line preset should handle horizontal lines (w > h)
     * @see ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom prst="line")
     */
    it("should render horizontal line preset", () => {
      const geom: PresetGeometry = {
        type: "preset",
        preset: "line",
        adjustValues: [],
      };

      // Wide shape = horizontal line
      const pathData = renderGeometryData(geom, 100, 1);

      // Should be a horizontal line through middle
      expect(pathData).toContain("M 0");
      expect(pathData).toContain("L 100");
    });

    /**
     * @test Line preset should handle vertical lines (h > w)
     * @see ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom prst="line")
     *
     * When shape height >> width, line should be vertical.
     */
    it("should render vertical line preset", () => {
      const geom: PresetGeometry = {
        type: "preset",
        preset: "line",
        adjustValues: [],
      };

      // Tall shape = vertical line
      const pathData = renderGeometryData(geom, 1, 100);

      // Should be a vertical line
      // M {w/2} 0 L {w/2} {h}
      expect(pathData).toContain("M 0.5 0");
      expect(pathData).toContain("L 0.5 100");
    });
  });

  describe("Custom geometry scaling - ECMA-376 20.1.9.15", () => {
    /**
     * @test Custom geometry path coordinates should be scaled from path's w/h to shape's width/height
     *
     * Per ECMA-376 Part 1, Section 20.1.9.15 (a:path):
     * - The w and h attributes define the path's coordinate system
     * - Path commands use coordinates in this space
     * - The path should be scaled to fit the shape bounds
     */
    it("should scale custom geometry path to shape dimensions", () => {
      // Path defined in 1000x1000 coordinate space
      const path: GeometryPath = {
        width: px(1000),
        height: px(1000),
        fill: "norm",
        stroke: true,
        extrusionOk: false,
        commands: [
          { type: "moveTo", point: { x: px(0), y: px(0) } },
          { type: "lineTo", point: { x: px(1000), y: px(0) } },
          { type: "lineTo", point: { x: px(1000), y: px(1000) } },
          { type: "lineTo", point: { x: px(0), y: px(1000) } },
          { type: "close" },
        ],
      };

      const geom: CustomGeometry = {
        type: "custom",
        paths: [path],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
      };

      // Render to a 100x50 shape
      const pathData = renderGeometryData(geom, 100, 50);

      // After scaling from 1000x1000 to 100x50:
      // - x coordinates should be scaled by 100/1000 = 0.1
      // - y coordinates should be scaled by 50/1000 = 0.05
      // So (1000, 1000) -> (100, 50)
      expect(pathData).toContain("M 0 0");
      expect(pathData).toContain("L 100 0");
      expect(pathData).toContain("L 100 50");
      expect(pathData).toContain("L 0 50");
    });

    it("should handle paths with non-zero w/h", () => {
      const path: GeometryPath = {
        width: px(2426), // Example from shapes.pptx Cloud
        height: px(1564),
        fill: "norm",
        stroke: true,
        extrusionOk: false,
        commands: [
          { type: "moveTo", point: { x: px(1213), y: px(0) } }, // Center top
          { type: "lineTo", point: { x: px(2426), y: px(782) } }, // Right middle
          { type: "lineTo", point: { x: px(1213), y: px(1564) } }, // Center bottom
          { type: "lineTo", point: { x: px(0), y: px(782) } }, // Left middle
          { type: "close" },
        ],
      };

      const geom: CustomGeometry = {
        type: "custom",
        paths: [path],
        adjustValues: [],
        adjustHandles: [],
        guides: [],
        connectionSites: [],
      };

      // Render to 268x167 (actual Cloud shape size)
      const pathData = renderGeometryData(geom, 268, 167);

      // Parse the path data to check coordinates are scaled
      // x scale: 268/2426 ≈ 0.1105
      // y scale: 167/1564 ≈ 0.1068
      // (1213, 0) -> (134, 0)
      // (2426, 782) -> (268, 83.5)
      // Coordinates should be approximately in the target range
      expect(pathData).not.toContain("1213"); // Original coords shouldn't appear
      expect(pathData).not.toContain("2426");
      expect(pathData).not.toContain("1564");
    });
  });
});

// =============================================================================
// ECMA-376 Preset Geometry Tests (ST_ShapeType)
// =============================================================================

describe("Preset Geometry Rendering - ECMA-376 20.1.10.56 (ST_ShapeType)", () => {
  describe("Basic Shapes", () => {
    /**
     * @test rect - Basic rectangle
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders rect as a closed rectangle path", () => {
      const path = renderPresetGeometryData(createPresetGeom("rect"), 100, 50);

      expect(path).toContain("M 0 0");
      expect(path).toContain("L 100 0");
      expect(path).toContain("L 100 50");
      expect(path).toContain("L 0 50");
      expect(path).toContain("Z");
    });

    /**
     * @test ellipse - Ellipse/circle
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders ellipse as two arcs forming a complete ellipse", () => {
      const path = renderPresetGeometryData(createPresetGeom("ellipse"), 100, 80);

      expect(path).toContain("A");
      expect(path).toContain("Z");
      expect(path).toMatch(/M\s+50\s+0/);
    });

    /**
     * @test roundRect - Rounded rectangle with corner radius
     * @see ECMA-376 Part 1, Section 20.1.10.56
     *
     * Per ECMA-376: adj attribute controls corner radius as percentage of min(w,h).
     * Default adj = 16667 (16.667%)
     */
    it("renders roundRect with corner radius from adj value", () => {
      const path = renderPresetGeometryData(createPresetGeom("roundRect", [{ name: "adj", value: 16667 }]), 100, 100);

      expect(path).toContain("Q"); // Quadratic bezier for corners
      expect(path).toContain("Z");
    });

    /**
     * @test triangle - Isoceles triangle
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders triangle with apex at top center", () => {
      const path = renderPresetGeometryData(createPresetGeom("triangle"), 100, 80);

      expect(path).toMatch(/M\s+50\s+0/); // Top center
      expect(path).toContain("L 100 80"); // Bottom right
      expect(path).toContain("L 0 80"); // Bottom left
      expect(path).toContain("Z");
    });

    /**
     * @test diamond - Diamond/rhombus
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders diamond with points at edge centers", () => {
      const path = renderPresetGeometryData(createPresetGeom("diamond"), 100, 80);

      expect(path).toMatch(/M\s+50\s+0/); // Top
      expect(path).toContain("L 100 40"); // Right
      expect(path).toContain("L 50 80"); // Bottom
      expect(path).toContain("L 0 40"); // Left
      expect(path).toContain("Z");
    });
  });

  describe("Arrow Shapes", () => {
    /**
     * @test rightArrow - Arrow pointing right
     * @see ECMA-376 Part 1, Section 20.1.10.56
     *
     * Per ECMA-376:
     * - adj1: Head width as percentage (default 50000 = 50%)
     * - adj2: Head height as percentage (default 50000 = 50%)
     */
    it("renders rightArrow pointing right with head and tail", () => {
      const path = renderPresetGeometryData(createPresetGeom("rightArrow"), 100, 60);

      expect(path).toContain("M 0"); // Starts at left edge
      expect(path).toContain("L 100 30"); // Point at right center
      expect(path).toContain("Z");
    });

    /**
     * @test leftArrow - Arrow pointing left (mirror of rightArrow)
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders leftArrow pointing left", () => {
      const path = renderPresetGeometryData(createPresetGeom("leftArrow"), 100, 60);

      expect(path).toContain("M 0 30"); // Point at left center (start of path)
      expect(path).toContain("L 100"); // Extends to right edge
      expect(path).toContain("Z");
    });

    /**
     * @test downArrow - Arrow pointing down
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders downArrow pointing down", () => {
      const path = renderPresetGeometryData(createPresetGeom("downArrow"), 60, 100);

      expect(path).toContain("L 30 100"); // Point at bottom center
      expect(path).toContain("Z");
    });

    /**
     * @test chevron - Chevron/notched arrow
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders chevron with notch on left", () => {
      const path = renderPresetGeometryData(createPresetGeom("chevron"), 100, 60);

      expect(path).toContain("M 0 0"); // Top left
      expect(path).toContain("L 100 30"); // Point at right center
      expect(path).toContain("Z");
    });

    /**
     * @test stripedRightArrow - Arrow with stripes
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders stripedRightArrow with multiple stripes", () => {
      const path = renderPresetGeometryData(createPresetGeom("stripedRightArrow"), 100, 60);

      // Should have multiple closed paths (stripes + arrow)
      const matches = path.match(/Z/g);
      const zCount = matches ? matches.length : 0;
      expect(zCount).toBeGreaterThanOrEqual(3); // 2 stripes + 1 arrow body
    });
  });

  describe("Connector Shapes", () => {
    /**
     * @test straightConnector1 - Diagonal straight connector
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders straightConnector1 as diagonal line", () => {
      const path = renderPresetGeometryData(createPresetGeom("straightConnector1"), 100, 80);

      expect(path).toBe("M 0 0 L 100 80");
    });

    /**
     * @test bentConnector3 - 3-segment bent connector
     * @see ECMA-376 Part 1, Section 20.1.10.56
     *
     * Per ECMA-376: adj1 controls horizontal midpoint position
     */
    it("renders bentConnector3 with adjustable midpoint", () => {
      const path = renderPresetGeometryData(
        createPresetGeom("bentConnector3", [{ name: "adj1", value: 50000 }]),
        100,
        80,
      );

      expect(path).toContain("M 0 0");
      expect(path).toContain("L 50 0"); // Horizontal to midpoint
      expect(path).toContain("L 50 80"); // Vertical down
      expect(path).toContain("L 100 80"); // Horizontal to end
    });

    /**
     * @test curvedConnector3 - Curved S-shaped connector
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders curvedConnector3 with smooth curves", () => {
      const path = renderPresetGeometryData(createPresetGeom("curvedConnector3"), 100, 80);

      expect(path).toContain("M 0 0");
      expect(path).toContain("Q"); // Quadratic bezier curves
    });
  });

  describe("Flowchart Shapes", () => {
    /**
     * @test flowChartMerge - Inverted triangle (merge)
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders flowChartMerge as inverted triangle", () => {
      const path = renderPresetGeometryData(createPresetGeom("flowChartMerge"), 100, 80);

      expect(path).toBe("M 0 0 L 100 0 L 50 80 Z");
    });

    /**
     * @test flowChartExtract - Upward triangle (extract)
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders flowChartExtract as upward triangle", () => {
      const path = renderPresetGeometryData(createPresetGeom("flowChartExtract"), 100, 80);

      expect(path).toBe("M 50 0 L 100 80 L 0 80 Z");
    });

    /**
     * @test flowChartDecision - Diamond (decision)
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders flowChartDecision as diamond", () => {
      const path = renderPresetGeometryData(createPresetGeom("flowChartDecision"), 100, 80);

      expect(path).toMatch(/M\s+50\s+0/); // Top
      expect(path).toContain("L 100 40"); // Right
      expect(path).toContain("L 50 80"); // Bottom
      expect(path).toContain("L 0 40"); // Left
    });

    /**
     * @test flowChartTerminator - Stadium/pill shape
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders flowChartTerminator as stadium shape", () => {
      const path = renderPresetGeometryData(createPresetGeom("flowChartTerminator"), 100, 40);

      expect(path).toContain("A"); // Arc for rounded ends
      expect(path).toContain("Z");
    });
  });

  describe("Callout Shapes", () => {
    /**
     * @test wedgeRectCallout - Rectangle with triangular tail
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders wedgeRectCallout with tail", () => {
      const path = renderPresetGeometryData(createPresetGeom("wedgeRectCallout"), 100, 80);

      expect(path).toContain("M 0 0");
      expect(path).toContain("Z");
    });

    /**
     * @test wedgeRoundRectCallout - Rounded rectangle with tail
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders wedgeRoundRectCallout with rounded corners and tail", () => {
      const path = renderPresetGeometryData(createPresetGeom("wedgeRoundRectCallout"), 100, 80);

      expect(path).toContain("Q"); // Rounded corners
      expect(path).toContain("Z");
    });
  });

  describe("Brace/Bracket Shapes", () => {
    /**
     * @test leftBrace - Curly left brace
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders leftBrace with curved shape", () => {
      const path = renderPresetGeometryData(createPresetGeom("leftBrace"), 20, 100);

      expect(path).toContain("Q"); // Quadratic curves
    });

    /**
     * @test rightBrace - Curly right brace (mirror of left)
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders rightBrace as mirror of leftBrace", () => {
      const path = renderPresetGeometryData(createPresetGeom("rightBrace"), 20, 100);

      expect(path).toContain("Q");
      expect(path).toContain("M 0"); // Starts at left edge (mirror)
    });
  });

  describe("Other Shapes", () => {
    /**
     * @test donut - Ring with hole
     * @see ECMA-376 Part 1, Section 20.1.10.56
     *
     * Per ECMA-376: adj controls hole size as percentage of radius
     */
    it("renders donut with hole in center", () => {
      const path = renderPresetGeometryData(createPresetGeom("donut", [{ name: "adj", value: 25000 }]), 100, 100);

      // Should have outer circle + inner hole
      const zMatches = path.match(/Z/g);
      const zCount = zMatches ? zMatches.length : 0;
      expect(zCount).toBe(2);
    });

    /**
     * @test sun - Sun with rays
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("renders sun with rays", () => {
      const path = renderPresetGeometryData(createPresetGeom("sun"), 100, 100);

      // Should have many line segments for rays
      const lMatches = path.match(/L\s/g);
      const lCount = lMatches ? lMatches.length : 0;
      expect(lCount).toBeGreaterThanOrEqual(15); // 16-point sun
    });

  });

  describe("Adjust Value Handling", () => {
    /**
     * @test adj values should affect shape geometry
     * @see ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom)
     */
    it("applies adj values to parameterized shapes", () => {
      const smallRadius = renderPresetGeometryData(
        createPresetGeom("roundRect", [{ name: "adj", value: 5000 }]),
        100,
        100,
      );

      const largeRadius = renderPresetGeometryData(
        createPresetGeom("roundRect", [{ name: "adj", value: 40000 }]),
        100,
        100,
      );

      expect(smallRadius).not.toBe(largeRadius);
    });

    /**
     * @test Default adj values per ECMA-376
     * @see ECMA-376 Part 1, Section 20.1.10.56
     */
    it("uses default adj values when not specified", () => {
      const withDefault = renderPresetGeometryData(createPresetGeom("roundRect"), 100, 100);
      const withExplicit = renderPresetGeometryData(
        createPresetGeom("roundRect", [{ name: "adj", value: 16667 }]),
        100,
        100,
      );

      expect(withDefault).toBe(withExplicit);
    });
  });

  describe("Unknown Preset Handling", () => {
    /**
     * @test Unknown presets should throw
     */
    it("throws for unknown presets", () => {
      expect(() => renderPresetGeometryData(createPresetGeom("unknownShape12345"), 100, 50))
        .toThrow("Unsupported preset geometry: unknownShape12345");
    });
  });
});
