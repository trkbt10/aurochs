/**
 * @file Tests for ECMA-376 compliant line end (arrow) marker rendering
 *
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd)
 * @see ECMA-376 Part 1, Section 20.1.8.57 (tailEnd)
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_LineEndType)
 * @see ECMA-376 Part 1, Section 20.1.10.56 (ST_LineEndWidth)
 * @see ECMA-376 Part 1, Section 20.1.10.57 (ST_LineEndLength)
 */

import type { LineEnd } from "../../domain";
import {
  generateMarkerId,
  generateMarkerDef,
  generateLineMarkers,
} from "./marker";

// =============================================================================
// Marker ID Generation Tests
// =============================================================================

describe("generateMarkerId - ECMA-376 compliance", () => {
  it("generates unique ID for triangle marker", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const id = generateMarkerId(lineEnd, "#000000", "tail");
    expect(id).toBe("marker-tail-triangle-med-med-000000");
  });

  it("generates unique ID for different colors", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const id1 = generateMarkerId(lineEnd, "#FF0000", "tail");
    const id2 = generateMarkerId(lineEnd, "#00FF00", "tail");
    expect(id1).not.toBe(id2);
    expect(id1).toBe("marker-tail-triangle-med-med-FF0000");
    expect(id2).toBe("marker-tail-triangle-med-med-00FF00");
  });

  it("generates unique ID for different sizes", () => {
    const lineEnd1: LineEnd = { type: "triangle", width: "sm", length: "sm" };
    const lineEnd2: LineEnd = { type: "triangle", width: "lg", length: "lg" };
    const id1 = generateMarkerId(lineEnd1, "#000000", "tail");
    const id2 = generateMarkerId(lineEnd2, "#000000", "tail");
    expect(id1).not.toBe(id2);
  });

  it("generates unique ID for head vs tail position", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const idHead = generateMarkerId(lineEnd, "#000000", "head");
    const idTail = generateMarkerId(lineEnd, "#000000", "tail");
    expect(idHead).toBe("marker-head-triangle-med-med-000000");
    expect(idTail).toBe("marker-tail-triangle-med-med-000000");
  });
});

// =============================================================================
// Marker Size Calculation Tests (ECMA-376 20.1.10.56, 20.1.10.57)
// =============================================================================

describe("Marker size calculation - ECMA-376 compliance", () => {
  const strokeWidth = 2;
  const color = "#000000";

  describe("Width multiplier (ECMA-376 20.1.10.56)", () => {
    it("sm width = 2x stroke width", () => {
      const lineEnd: LineEnd = { type: "triangle", width: "sm", length: "med" };
      const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
      // markerWidth should be 2 * 2 = 4
      expect(result.def).toContain('markerWidth="4"');
    });

    it("med width = 3x stroke width (default)", () => {
      const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
      const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
      // markerWidth should be 3 * 2 = 6
      expect(result.def).toContain('markerWidth="6"');
    });

    it("lg width = 5x stroke width", () => {
      const lineEnd: LineEnd = { type: "triangle", width: "lg", length: "med" };
      const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
      // markerWidth should be 5 * 2 = 10
      expect(result.def).toContain('markerWidth="10"');
    });
  });

  describe("Length multiplier (ECMA-376 20.1.10.57)", () => {
    it("sm length = 2x stroke width", () => {
      const lineEnd: LineEnd = { type: "triangle", width: "med", length: "sm" };
      const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
      // markerHeight should be 2 * 2 = 4
      expect(result.def).toContain('markerHeight="4"');
    });

    it("med length = 3x stroke width (default)", () => {
      const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
      const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
      // markerHeight should be 3 * 2 = 6
      expect(result.def).toContain('markerHeight="6"');
    });

    it("lg length = 5x stroke width", () => {
      const lineEnd: LineEnd = { type: "triangle", width: "med", length: "lg" };
      const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
      // markerHeight should be 5 * 2 = 10
      expect(result.def).toContain('markerHeight="10"');
    });
  });
});

// =============================================================================
// Marker Type Tests (ECMA-376 20.1.10.55)
// =============================================================================

describe("Marker type shapes - ECMA-376 20.1.10.55", () => {
  const strokeWidth = 2;
  const color = "#FF0000";

  it("triangle: generates filled polygon", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
    expect(result.def).toContain("<polygon");
    expect(result.def).toContain('fill="#FF0000"');
  });

  it("stealth: generates notched polygon", () => {
    const lineEnd: LineEnd = { type: "stealth", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
    expect(result.def).toContain("<polygon");
    expect(result.def).toContain('fill="#FF0000"');
  });

  it("diamond: generates diamond polygon", () => {
    const lineEnd: LineEnd = { type: "diamond", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
    expect(result.def).toContain("<polygon");
    expect(result.def).toContain('fill="#FF0000"');
  });

  it("oval: generates ellipse", () => {
    const lineEnd: LineEnd = { type: "oval", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
    expect(result.def).toContain("<ellipse");
    expect(result.def).toContain('fill="#FF0000"');
  });

  it("arrow: generates open V-shape polyline (no fill)", () => {
    const lineEnd: LineEnd = { type: "arrow", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
    expect(result.def).toContain("<polyline");
    expect(result.def).toContain('fill="none"');
    expect(result.def).toContain('stroke="#FF0000"');
  });
});

// =============================================================================
// Marker Orientation Tests
// =============================================================================

describe("Marker orientation", () => {
  const strokeWidth = 2;
  const color = "#000000";

  it("tail marker: refX at marker tip (right edge)", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
    // For tail, refX should be at markerWidth (6)
    expect(result.def).toContain('refX="6"');
  });

  it("head marker: refX at origin (left edge)", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "head");
    // For head, refX should be at 0
    expect(result.def).toContain('refX="0"');
  });

  it("marker uses auto orientation", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, strokeWidth, color, "tail");
    expect(result.def).toContain('orient="auto"');
  });
});

// =============================================================================
// Line Markers Collection Tests
// =============================================================================

describe("generateLineMarkers", () => {
  const strokeWidth = 2;
  const color = "#0000FF";

  it("returns empty when no line ends", () => {
    const result = generateLineMarkers(undefined, undefined, strokeWidth, color);
    expect(result.defs).toHaveLength(0);
    expect(result.markerStart).toBeUndefined();
    expect(result.markerEnd).toBeUndefined();
  });

  it("generates headEnd marker only", () => {
    const headEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateLineMarkers(headEnd, undefined, strokeWidth, color);
    expect(result.defs).toHaveLength(1);
    expect(result.markerStart).toContain("url(#marker-head-triangle");
    expect(result.markerEnd).toBeUndefined();
  });

  it("generates tailEnd marker only", () => {
    const tailEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateLineMarkers(undefined, tailEnd, strokeWidth, color);
    expect(result.defs).toHaveLength(1);
    expect(result.markerStart).toBeUndefined();
    expect(result.markerEnd).toContain("url(#marker-tail-triangle");
  });

  it("generates both headEnd and tailEnd markers", () => {
    const headEnd: LineEnd = { type: "oval", width: "sm", length: "sm" };
    const tailEnd: LineEnd = { type: "triangle", width: "lg", length: "lg" };
    const result = generateLineMarkers(headEnd, tailEnd, strokeWidth, color);
    expect(result.defs).toHaveLength(2);
    expect(result.markerStart).toContain("url(#marker-head-oval");
    expect(result.markerEnd).toContain("url(#marker-tail-triangle");
  });

  it("ignores 'none' type line ends", () => {
    const headEnd: LineEnd = { type: "none", width: "med", length: "med" };
    const tailEnd: LineEnd = { type: "none", width: "med", length: "med" };
    const result = generateLineMarkers(headEnd, tailEnd, strokeWidth, color);
    expect(result.defs).toHaveLength(0);
    expect(result.markerStart).toBeUndefined();
    expect(result.markerEnd).toBeUndefined();
  });
});

// =============================================================================
// SVG Structure Tests
// =============================================================================

describe("SVG marker structure", () => {
  it("generates valid SVG marker element", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, 2, "#000000", "tail");

    // Verify marker element structure
    expect(result.def).toMatch(/<marker\s/);
    expect(result.def).toMatch(/id="[^"]+"/);
    expect(result.def).toMatch(/markerWidth="[^"]+"/);
    expect(result.def).toMatch(/markerHeight="[^"]+"/);
    expect(result.def).toMatch(/refX="[^"]+"/);
    expect(result.def).toMatch(/refY="[^"]+"/);
    expect(result.def).toMatch(/orient="[^"]+"/);
    expect(result.def).toContain("</marker>");
  });

  it("uses userSpaceOnUse for markerUnits", () => {
    const lineEnd: LineEnd = { type: "triangle", width: "med", length: "med" };
    const result = generateMarkerDef(lineEnd, 2, "#000000", "tail");
    expect(result.def).toContain('markerUnits="userSpaceOnUse"');
  });
});
