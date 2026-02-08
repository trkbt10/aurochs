/**
 * @file Text tessellation unit tests (WebGL renderer, independent of .fig fixtures)
 *
 * Tests the pipeline: PathContour[] → tessellateContours() → Float32Array
 * with synthetic glyph-like contours to isolate rendering issues.
 *
 * Winding convention (critical):
 *   signedArea() uses the mathematical convention:
 *     - negative signedArea = outer contour
 *     - positive signedArea = hole contour
 *
 *   In screen space (Y-down), this means:
 *     - Visually CCW (right→up→left→down) = negative area = OUTER
 *     - Visually CW (right→down→left→up) = positive area = HOLE
 *
 *   After Y-flip from font space:
 *     - Font CW outer → screen CCW → negative area → OUTER ✓
 *     - Font CCW hole → screen CW → positive area → HOLE ✓
 */

import { describe, it, expect } from "vitest";
import { tessellateContours, tessellateContour, flattenPathCommands } from "./tessellation";
import { tessellateTextNode } from "./text-renderer";
import type { PathContour, PathCommand, TextNode, AffineMatrix } from "../scene-graph/types";

// =============================================================================
// Test Helpers
// =============================================================================

const IDENTITY: AffineMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

function makeTextNode(overrides: Partial<TextNode> = {}): TextNode {
  return {
    type: "text",
    id: "test-text" as TextNode["id"],
    name: "Test Text",
    transform: IDENTITY,
    opacity: 1,
    visible: true,
    effects: [],
    fill: { color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 },
    ...overrides,
  };
}

/**
 * Compute signed area from flat coordinates (same as tessellation.ts)
 */
function signedArea(coords: readonly number[]): number {
  const n = coords.length >> 1;
  let area = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += (coords[j * 2] - coords[i * 2]) * (coords[j * 2 + 1] + coords[i * 2 + 1]);
  }
  return area;
}

/**
 * Create a rectangular outer contour.
 * Goes visually CCW in screen-space (right → up → left → down) = negative signedArea = OUTER.
 *
 * This matches how font CW outers look after Y-flip.
 */
function outerRect(x: number, y: number, w: number, h: number): PathContour {
  return {
    commands: [
      { type: "M", x, y: y + h },         // bottom-left
      { type: "L", x: x + w, y: y + h },  // bottom-right
      { type: "L", x: x + w, y },          // top-right
      { type: "L", x, y },                 // top-left
      { type: "Z" },
    ],
    windingRule: "nonzero",
  };
}

/**
 * Create a rectangular hole contour.
 * Goes visually CW in screen-space (right → down → left → up) = positive signedArea = HOLE.
 */
function holeRect(x: number, y: number, w: number, h: number): PathContour {
  return {
    commands: [
      { type: "M", x, y },
      { type: "L", x: x + w, y },
      { type: "L", x: x + w, y: y + h },
      { type: "L", x, y: y + h },
      { type: "Z" },
    ],
    windingRule: "nonzero",
  };
}

/**
 * Create a circular outer contour approximated with cubic beziers.
 * Goes CCW in screen-space (= negative signedArea = OUTER).
 */
function outerCircle(cx: number, cy: number, r: number): PathContour {
  const k = r * 0.5522847498;
  // CCW in screen: bottom → right → top → left
  return {
    commands: [
      { type: "M", x: cx, y: cy + r },  // bottom
      { type: "C", x1: cx + k, y1: cy + r, x2: cx + r, y2: cy + k, x: cx + r, y: cy },     // → right
      { type: "C", x1: cx + r, y1: cy - k, x2: cx + k, y2: cy - r, x: cx, y: cy - r },      // → top
      { type: "C", x1: cx - k, y1: cy - r, x2: cx - r, y2: cy - k, x: cx - r, y: cy },      // → left
      { type: "C", x1: cx - r, y1: cy + k, x2: cx - k, y2: cy + r, x: cx, y: cy + r },      // → bottom
      { type: "Z" },
    ],
    windingRule: "nonzero",
  };
}

/**
 * Create a circular hole contour.
 * Goes CW in screen-space (= positive signedArea = HOLE).
 */
function holeCircle(cx: number, cy: number, r: number): PathContour {
  const k = r * 0.5522847498;
  // CW in screen: bottom → left → top → right
  return {
    commands: [
      { type: "M", x: cx, y: cy + r },  // bottom
      { type: "C", x1: cx - k, y1: cy + r, x2: cx - r, y2: cy + k, x: cx - r, y: cy },     // → left
      { type: "C", x1: cx - r, y1: cy - k, x2: cx - k, y2: cy - r, x: cx, y: cy - r },      // → top
      { type: "C", x1: cx + k, y1: cy - r, x2: cx + r, y2: cy - k, x: cx + r, y: cy },      // → right
      { type: "C", x1: cx + r, y1: cy + k, x2: cx + k, y2: cy + r, x: cx, y: cy + r },      // → bottom
      { type: "Z" },
    ],
    windingRule: "nonzero",
  };
}

/**
 * Simulate Figma derived glyph contour after Y-axis flip.
 *
 * Font space (Y-up): CW outer / CCW hole (TrueType convention)
 * Screen space (Y-down): font CW → screen CCW (negative area → OUTER) ✓
 */
function simulateYFlippedRect(
  posX: number,
  baselineY: number,
  normX: number,
  normY: number,
  normW: number,
  normH: number,
  fontSize: number,
  cwInFontSpace: boolean
): PathContour {
  const x0 = posX + normX * fontSize;
  const y0 = baselineY - normY * fontSize;
  const x1 = posX + (normX + normW) * fontSize;
  const y1 = baselineY - (normY + normH) * fontSize;

  if (cwInFontSpace) {
    // Font CW outer → after Y-flip → screen CCW → negative signedArea → OUTER
    return {
      commands: [
        { type: "M", x: x0, y: y0 },
        { type: "L", x: x1, y: y0 },
        { type: "L", x: x1, y: y1 },
        { type: "L", x: x0, y: y1 },
        { type: "Z" },
      ],
      windingRule: "nonzero",
    };
  } else {
    // Font CCW hole → after Y-flip → screen CW → positive signedArea → HOLE
    return {
      commands: [
        { type: "M", x: x0, y: y0 },
        { type: "L", x: x0, y: y1 },
        { type: "L", x: x1, y: y1 },
        { type: "L", x: x1, y: y0 },
        { type: "Z" },
      ],
      windingRule: "nonzero",
    };
  }
}

// =============================================================================
// Basic Tessellation Tests
// =============================================================================

describe("Text tessellation pipeline", () => {
  describe("winding convention verification", () => {
    it("outerRect has negative signedArea (OUTER)", () => {
      const coords = flattenPathCommands(outerRect(0, 0, 10, 10).commands);
      const area = signedArea(coords);
      expect(area).toBeLessThan(0);
    });

    it("holeRect has positive signedArea (HOLE)", () => {
      const coords = flattenPathCommands(holeRect(0, 0, 10, 10).commands);
      const area = signedArea(coords);
      expect(area).toBeGreaterThan(0);
    });

    it("outerCircle has negative signedArea (OUTER)", () => {
      const coords = flattenPathCommands(outerCircle(50, 50, 10).commands);
      const area = signedArea(coords);
      expect(area).toBeLessThan(0);
    });

    it("holeCircle has positive signedArea (HOLE)", () => {
      const coords = flattenPathCommands(holeCircle(50, 50, 5).commands);
      const area = signedArea(coords);
      expect(area).toBeGreaterThan(0);
    });
  });

  describe("simple contour tessellation", () => {
    it("tessellates a single outer rect", () => {
      const contour = outerRect(10, 20, 5, 12);
      const vertices = tessellateContour(contour);
      expect(vertices.length).toBe(12); // 2 triangles × 6 coords
    });

    it("tessellates a single hole rect (earcut handles any winding)", () => {
      const contour = holeRect(10, 20, 5, 12);
      const vertices = tessellateContour(contour);
      expect(vertices.length).toBe(12);
    });

    it("tessellates a circular outer contour", () => {
      const contour = outerCircle(50, 50, 8);
      const vertices = tessellateContour(contour);
      expect(vertices.length).toBeGreaterThan(0);

      // All vertices within circle bounds
      for (let i = 0; i < vertices.length; i += 2) {
        const dx = vertices[i] - 50;
        const dy = vertices[i + 1] - 50;
        expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThanOrEqual(8.5);
      }
    });

    it("handles very small glyph (sub-pixel)", () => {
      const contour = outerRect(100, 200, 0.1, 0.2);
      const vertices = tessellateContour(contour);
      expect(vertices.length).toBe(12);
    });
  });

  // =============================================================================
  // Multi-contour tests (glyph-like shapes)
  // =============================================================================

  describe("multi-contour tessellation (glyph-like)", () => {
    it("tessellates multiple simple glyphs (like 'Hi')", () => {
      // 'H' = 3 outer rects
      const hLeft = outerRect(0, 0, 3, 16);
      const hRight = outerRect(10, 0, 3, 16);
      const hCross = outerRect(3, 6, 7, 3);

      // 'i' = 2 outer rects
      const iStem = outerRect(17, 4, 3, 12);
      const iDot = outerRect(17, 0, 3, 3);

      const vertices = tessellateContours([hLeft, hRight, hCross, iStem, iDot]);
      // 5 rectangles × 2 triangles × 6 coords = 60 coords
      expect(vertices.length).toBe(60);
    });

    it("tessellates letter 'O' (outer + hole)", () => {
      const outer = outerCircle(50, 50, 10);
      const inner = holeCircle(50, 50, 5);

      const vertices = tessellateContours([outer, inner]);
      expect(vertices.length).toBeGreaterThan(0);

      // Verify ring: no vertices very close to center
      for (let i = 0; i < vertices.length; i += 2) {
        const dx = vertices[i] - 50;
        const dy = vertices[i + 1] - 50;
        expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("tessellates 'lol' with mixed outer + hole glyphs", () => {
      const contours: PathContour[] = [
        outerRect(0, 0, 5, 14),    // 'l' at x=0
        outerRect(8, 0, 6, 14),    // 'o' outer at x=8
        holeRect(9, 3, 4, 8),      // 'o' hole
        outerRect(17, 0, 5, 14),   // 'l' at x=17
      ];

      const vertices = tessellateContours(contours);
      expect(vertices.length).toBeGreaterThan(0);

      // 3 outer rects (each 12 coords) + 1 ring (more than 12 coords)
      const rectTriangles = 3 * 12;
      expect(vertices.length).toBeGreaterThanOrEqual(rectTriangles);
    });
  });

  // =============================================================================
  // Winding direction after Y-axis flip (derived glyph data)
  // =============================================================================

  describe("winding direction after Y-axis flip", () => {
    it("classifies font CW outer correctly after Y-flip", () => {
      const contour = simulateYFlippedRect(100, 200, 0, 0, 0.5, 0.7, 16, true);
      const coords = flattenPathCommands(contour.commands);
      const area = signedArea(coords);
      expect(area).toBeLessThan(0); // OUTER
    });

    it("classifies font CCW hole correctly after Y-flip", () => {
      const contour = simulateYFlippedRect(100, 200, 0.1, 0.1, 0.3, 0.5, 16, false);
      const coords = flattenPathCommands(contour.commands);
      const area = signedArea(coords);
      expect(area).toBeGreaterThan(0); // HOLE
    });

    it("tessellates Y-flipped outer + hole correctly", () => {
      const outer = simulateYFlippedRect(100, 200, 0, 0, 1, 1, 16, true);
      const hole = simulateYFlippedRect(100, 200, 0.2, 0.2, 0.6, 0.6, 16, false);

      const vertices = tessellateContours([outer, hole]);
      expect(vertices.length).toBeGreaterThan(12); // ring topology
    });

    it("tessellates a single Y-flipped outer (no hole)", () => {
      const outer = simulateYFlippedRect(50, 100, 0, 0, 0.4, 0.8, 14, true);

      const vertices = tessellateContours([outer]);
      expect(vertices.length).toBe(12); // 2 triangles
    });

    it("tessellates Y-flipped text line with multiple glyphs", () => {
      const fontSize = 14;
      const baselineY = 100;
      const contours: PathContour[] = [];

      // 'H' - three rects
      contours.push(simulateYFlippedRect(10, baselineY, 0, 0, 0.15, 0.7, fontSize, true));
      contours.push(simulateYFlippedRect(10, baselineY, 0.35, 0, 0.15, 0.7, fontSize, true));
      contours.push(simulateYFlippedRect(10, baselineY, 0.15, 0.3, 0.2, 0.1, fontSize, true));

      // 'e' - outer
      contours.push(simulateYFlippedRect(20, baselineY, 0, 0, 0.4, 0.5, fontSize, true));

      // 'l' - single rect
      contours.push(simulateYFlippedRect(28, baselineY, 0, 0, 0.15, 0.7, fontSize, true));

      const vertices = tessellateContours(contours);
      expect(vertices.length).toBe(60); // 5 rects × 12
    });

    it("handles glyph with bezier contour after Y-flip", () => {
      const fontSize = 16;
      const posX = 50;
      const baselineY = 120;

      // Curved glyph in font normalized coords (CW in Y-up = outer)
      // Traversal: right along bottom → curve up-left → curve down-left → close
      const normCommands = [
        { type: "M" as const, x: 0, y: 0 },
        { type: "L" as const, x: 0.7, y: 0 },
        { type: "C" as const, x1: 0.7, y1: 0.3, x2: 0.6, y2: 0.5, x: 0.4, y: 0.5 },
        { type: "C" as const, x1: 0.2, y1: 0.5, x2: 0.1, y2: 0.3, x: 0, y: 0 },
        { type: "Z" as const },
      ];

      const tx = (x: number) => posX + x * fontSize;
      const ty = (y: number) => Math.round(baselineY) - y * fontSize;

      const commands: PathCommand[] = normCommands.map((cmd): PathCommand => {
        switch (cmd.type) {
          case "M": return { type: "M", x: tx(cmd.x!), y: ty(cmd.y!) };
          case "L": return { type: "L", x: tx(cmd.x!), y: ty(cmd.y!) };
          case "C": return {
            type: "C",
            x1: tx(cmd.x1!), y1: ty(cmd.y1!),
            x2: tx(cmd.x2!), y2: ty(cmd.y2!),
            x: tx(cmd.x!), y: ty(cmd.y!),
          };
          case "Z": return { type: "Z" };
        }
      });

      const contour: PathContour = { commands, windingRule: "nonzero" };
      const flatCoords = flattenPathCommands(contour.commands);
      const area = signedArea(flatCoords);

      // Should be negative (outer) after Y-flip
      expect(area).toBeLessThan(0);

      const vertices = tessellateContours([contour]);
      expect(vertices.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // tessellateTextNode integration tests
  // =============================================================================

  describe("tessellateTextNode", () => {
    it("returns null when no glyphContours", () => {
      const node = makeTextNode({
        fallbackText: {
          lines: [{ text: "Hello", x: 0, y: 14 }],
          fontFamily: "Inter",
          fontSize: 14,
          fontWeight: 400,
          textAnchor: "start",
        },
      });
      expect(tessellateTextNode(node)).toBeNull();
    });

    it("returns null when glyphContours is empty array", () => {
      const node = makeTextNode({ glyphContours: [] });
      expect(tessellateTextNode(node)).toBeNull();
    });

    it("tessellates a node with glyph contours", () => {
      const contours: PathContour[] = [
        outerRect(0, 0, 5, 14),   // 'l'
        outerRect(8, 4, 5, 10),   // 'i' stem
        outerRect(8, 0, 5, 3),    // 'i' dot
      ];

      const node = makeTextNode({ glyphContours: contours });
      const result = tessellateTextNode(node);

      expect(result).not.toBeNull();
      expect(result!.glyphVertices.length).toBe(36); // 3 rects × 12
      expect(result!.decorationVertices.length).toBe(0);
      expect(result!.color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(result!.opacity).toBe(1);
    });

    it("includes decoration vertices when present", () => {
      const glyphs: PathContour[] = [outerRect(0, 0, 40, 12)];
      const decorations: PathContour[] = [outerRect(0, 14, 40, 1)];

      const node = makeTextNode({
        glyphContours: glyphs,
        decorationContours: decorations,
      });
      const result = tessellateTextNode(node);

      expect(result).not.toBeNull();
      expect(result!.glyphVertices.length).toBeGreaterThan(0);
      expect(result!.decorationVertices.length).toBeGreaterThan(0);
    });

    it("preserves fill color and opacity", () => {
      const node = makeTextNode({
        glyphContours: [outerRect(0, 0, 10, 10)],
        fill: { color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 0.5 },
      });
      const result = tessellateTextNode(node);

      expect(result!.color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
      expect(result!.opacity).toBe(0.5);
    });
  });

  // =============================================================================
  // Edge cases that could cause silent failures
  // =============================================================================

  describe("edge cases", () => {
    it("handles contour with only Move commands", () => {
      const contour: PathContour = {
        commands: [
          { type: "M", x: 0, y: 0 },
          { type: "M", x: 10, y: 10 },
          { type: "M", x: 20, y: 20 },
        ],
        windingRule: "nonzero",
      };
      const vertices = tessellateContour(contour);
      expect(vertices.length).toBeGreaterThanOrEqual(0);
    });

    it("handles zero-area contour (collinear points)", () => {
      const contour: PathContour = {
        commands: [
          { type: "M", x: 0, y: 0 },
          { type: "L", x: 10, y: 0 },
          { type: "L", x: 20, y: 0 },
          { type: "Z" },
        ],
        windingRule: "nonzero",
      };
      const vertices = tessellateContour(contour);
      expect(vertices.length).toBeGreaterThanOrEqual(0);
    });

    it("ALL-holes scenario: orphan holes are silently dropped", () => {
      // If a font produces all contours with "hole" winding, tessellateContours
      // drops them all as orphan holes → empty output → text disappears
      const hole1 = holeRect(0, 0, 10, 10);
      const hole2 = holeRect(20, 0, 10, 10);

      const vertices = tessellateContours([hole1, hole2]);
      // Both positive signedArea → both holes → orphan → dropped
      expect(vertices.length).toBe(0);
    });

    it("single contour with wrong winding is still tessellated by tessellateContour", () => {
      // tessellateContour (singular) doesn't classify winding - it just tessellates
      const hole = holeRect(0, 0, 10, 10);
      const vertices = tessellateContour(hole);
      expect(vertices.length).toBe(12); // works fine individually
    });

    it("but tessellateContours (plural) drops it as orphan hole", () => {
      // tessellateContours classifies by winding → single hole is orphan → dropped
      const hole = holeRect(0, 0, 10, 10);
      const vertices = tessellateContours([hole]);
      expect(vertices.length).toBe(0); // dropped!
    });
  });

  // =============================================================================
  // Auto-detect winding tests
  // =============================================================================

  describe("autoDetectWinding", () => {
    it("auto-detects PostScript convention (positive area = outer)", () => {
      // All contours have positive area (PostScript/CFF)
      // With autoDetectWinding=true, they should be classified as outers
      const contours: PathContour[] = [
        holeRect(0, 0, 10, 10),   // positive area (would be "hole" without auto-detect)
        holeRect(15, 0, 10, 10),  // positive area
      ];

      // Without auto-detect: both classified as holes → dropped
      const noAutoVerts = tessellateContours(contours);
      expect(noAutoVerts.length).toBe(0);

      // With auto-detect: majority positive → positive = outer
      const autoVerts = tessellateContours(contours, 0.25, true);
      expect(autoVerts.length).toBe(24); // 2 rects × 12 coords
    });

    it("auto-detects TrueType convention (negative area = outer)", () => {
      // All contours have negative area (TrueType)
      const contours: PathContour[] = [
        outerRect(0, 0, 10, 10),
        outerRect(15, 0, 10, 10),
      ];

      // Both with and without auto-detect should work
      const noAutoVerts = tessellateContours(contours);
      expect(noAutoVerts.length).toBe(24);

      const autoVerts = tessellateContours(contours, 0.25, true);
      expect(autoVerts.length).toBe(24);
    });

    it("auto-detects PostScript outer + hole correctly", () => {
      // PostScript: outer=positive, hole=negative (opposite of TrueType)
      // 'O' + 'l' glyphs: 2 positive outers + 1 negative hole → majority positive
      const contours: PathContour[] = [
        holeRect(0, 0, 20, 20),   // positive area = outer in PostScript ('O' outer)
        outerRect(5, 5, 10, 10),  // negative area = hole in PostScript ('O' hole)
        holeRect(25, 0, 5, 20),   // positive area = outer in PostScript ('l')
      ];

      // With auto-detect: 2 positive vs 1 negative → positive = outer
      const vertices = tessellateContours(contours, 0.25, true);
      // Should have ring (O outer minus hole) + rect (l)
      expect(vertices.length).toBeGreaterThan(12);

      // Verify no vertices inside the hole of 'O'
      for (let i = 0; i < vertices.length; i += 2) {
        const x = vertices[i];
        const y = vertices[i + 1];
        if (x < 20) { // Only check within 'O' bounds
          const insideHole = x > 6 && x < 14 && y > 6 && y < 14;
          expect(insideHole).toBe(false);
        }
      }
    });

    it("handles mixed convention where majority determines outer", () => {
      // 3 PostScript outers (positive) + 1 PostScript hole (negative)
      const contours: PathContour[] = [
        holeRect(0, 0, 10, 10),    // positive = outer (PostScript)
        outerRect(3, 3, 4, 4),     // negative = hole (PostScript)
        holeRect(20, 0, 10, 10),   // positive = outer
        holeRect(40, 0, 10, 10),   // positive = outer
      ];

      const vertices = tessellateContours(contours, 0.25, true);
      // 3 positive → majority = outer
      // First outer gets the negative hole
      // Remaining 2 outers are simple
      expect(vertices.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // Stress test: many glyphs (typical text paragraph)
  // =============================================================================

  describe("scale tests", () => {
    it("tessellates 100 glyph contours efficiently", () => {
      const contours: PathContour[] = [];
      for (let i = 0; i < 100; i++) {
        contours.push(outerRect(i * 8, 0, 6, 14));
      }

      const start = performance.now();
      const vertices = tessellateContours(contours);
      const elapsed = performance.now() - start;

      expect(vertices.length).toBe(100 * 12);
      expect(elapsed).toBeLessThan(100); // < 100ms
    });

    it("tessellates 100 bezier glyph contours", () => {
      const contours: PathContour[] = [];
      for (let i = 0; i < 100; i++) {
        contours.push(outerCircle(i * 12 + 6, 6, 5));
      }

      const start = performance.now();
      const vertices = tessellateContours(contours);
      const elapsed = performance.now() - start;

      expect(vertices.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(500); // < 500ms for 100 bezier glyphs
    });
  });
});
