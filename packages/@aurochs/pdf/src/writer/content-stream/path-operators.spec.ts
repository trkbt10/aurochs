/**
 * @file Path Operators Tests
 */

import {
  serializePathOp,
  serializePaintOp,
  serializePath,
  serializePathOperations,
} from "./path-operators";
import type { PdfPath, PdfPathOp } from "../../domain/path";
import type { PdfGraphicsState } from "../../domain/graphics-state";

// Minimal graphics state for testing
const minimalGraphicsState: PdfGraphicsState = {
  ctm: [1, 0, 0, 1, 0, 0],
  fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
  strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
  lineWidth: 1,
  lineJoin: 0,
  lineCap: 0,
  miterLimit: 10,
  dashArray: [],
  dashPhase: 0,
  fillAlpha: 1,
  strokeAlpha: 1,
  charSpacing: 0,
  wordSpacing: 0,
  horizontalScaling: 100,
  textLeading: 0,
  textRenderingMode: 0,
  textRise: 0,
};

describe("serializePathOp", () => {
  it("serializes moveTo", () => {
    const op: PdfPathOp = { type: "moveTo", point: { x: 100, y: 200 } };
    expect(serializePathOp(op)).toBe("100 200 m");
  });

  it("serializes lineTo", () => {
    const op: PdfPathOp = { type: "lineTo", point: { x: 150, y: 250 } };
    expect(serializePathOp(op)).toBe("150 250 l");
  });

  it("serializes curveTo", () => {
    const op: PdfPathOp = {
      type: "curveTo",
      cp1: { x: 100, y: 100 },
      cp2: { x: 200, y: 200 },
      end: { x: 300, y: 100 },
    };
    expect(serializePathOp(op)).toBe("100 100 200 200 300 100 c");
  });

  it("serializes curveToV", () => {
    const op: PdfPathOp = {
      type: "curveToV",
      cp2: { x: 200, y: 200 },
      end: { x: 300, y: 100 },
    };
    expect(serializePathOp(op)).toBe("200 200 300 100 v");
  });

  it("serializes curveToY", () => {
    const op: PdfPathOp = {
      type: "curveToY",
      cp1: { x: 100, y: 100 },
      end: { x: 300, y: 100 },
    };
    expect(serializePathOp(op)).toBe("100 100 300 100 y");
  });

  it("serializes rect", () => {
    const op: PdfPathOp = { type: "rect", x: 50, y: 50, width: 100, height: 200 };
    expect(serializePathOp(op)).toBe("50 50 100 200 re");
  });

  it("serializes closePath", () => {
    const op: PdfPathOp = { type: "closePath" };
    expect(serializePathOp(op)).toBe("h");
  });

  it("handles decimal coordinates", () => {
    const op: PdfPathOp = { type: "moveTo", point: { x: 100.5, y: 200.123 } };
    expect(serializePathOp(op)).toBe("100.5 200.123 m");
  });

  it("strips trailing zeros", () => {
    const op: PdfPathOp = { type: "moveTo", point: { x: 100.5000, y: 200.0000 } };
    expect(serializePathOp(op)).toBe("100.5 200 m");
  });
});

describe("serializePaintOp", () => {
  it("serializes stroke", () => {
    expect(serializePaintOp("stroke")).toBe("S");
  });

  it("serializes fill (nonzero)", () => {
    expect(serializePaintOp("fill")).toBe("f");
    expect(serializePaintOp("fill", "nonzero")).toBe("f");
  });

  it("serializes fill (evenodd)", () => {
    expect(serializePaintOp("fill", "evenodd")).toBe("f*");
  });

  it("serializes fillStroke (nonzero)", () => {
    expect(serializePaintOp("fillStroke")).toBe("B");
    expect(serializePaintOp("fillStroke", "nonzero")).toBe("B");
  });

  it("serializes fillStroke (evenodd)", () => {
    expect(serializePaintOp("fillStroke", "evenodd")).toBe("B*");
  });

  it("serializes clip (nonzero)", () => {
    expect(serializePaintOp("clip")).toBe("W n");
    expect(serializePaintOp("clip", "nonzero")).toBe("W n");
  });

  it("serializes clip (evenodd)", () => {
    expect(serializePaintOp("clip", "evenodd")).toBe("W* n");
  });

  it("serializes none", () => {
    expect(serializePaintOp("none")).toBe("n");
  });
});

describe("serializePath", () => {
  it("serializes complete path with fill", () => {
    const path: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 100, y: 0 } },
        { type: "lineTo", point: { x: 100, y: 100 } },
        { type: "closePath" },
      ],
      paintOp: "fill",
      graphicsState: minimalGraphicsState,
    };

    const result = serializePath(path);
    expect(result).toBe("0 0 m\n100 0 l\n100 100 l\nh\nf");
  });

  it("serializes rectangle with stroke", () => {
    const path: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 50, y: 50, width: 100, height: 100 }],
      paintOp: "stroke",
      graphicsState: minimalGraphicsState,
    };

    const result = serializePath(path);
    expect(result).toBe("50 50 100 100 re\nS");
  });

  it("serializes curve with fillStroke", () => {
    const path: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveTo",
          cp1: { x: 50, y: 100 },
          cp2: { x: 150, y: 100 },
          end: { x: 200, y: 0 },
        },
      ],
      paintOp: "fillStroke",
      graphicsState: minimalGraphicsState,
    };

    const result = serializePath(path);
    expect(result).toBe("0 0 m\n50 100 150 100 200 0 c\nB");
  });
});

describe("serializePathOperations", () => {
  it("serializes operations without paint", () => {
    const ops: PdfPathOp[] = [
      { type: "moveTo", point: { x: 0, y: 0 } },
      { type: "lineTo", point: { x: 100, y: 100 } },
    ];

    const result = serializePathOperations(ops);
    expect(result).toBe("0 0 m\n100 100 l");
  });

  it("handles empty operations", () => {
    expect(serializePathOperations([])).toBe("");
  });
});
