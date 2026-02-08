/**
 * @file Tests for PDF path builder
 */

import {
  buildPath,
  buildPaths,
  builtPathToPdfPath,
  getPathComplexity,
  isDegenerate,
  isSimpleRectangle,
  mergePaths,
  type BuiltPath,
} from "./path-builder";
import type { ParsedPath } from "../core/operator-parser";
import { createDefaultGraphicsState, IDENTITY_MATRIX } from "../../domain";

describe("buildPath", () => {
  function makeParsedPath(operations: ParsedPath["operations"], ctm = IDENTITY_MATRIX): ParsedPath {
    const gfx = createDefaultGraphicsState();
    return {
      type: "path",
      operations,
      paintOp: "stroke",
      graphicsState: { ...gfx, ctm },
    };
  }

  describe("basic operations", () => {
    it("builds moveTo", () => {
      const parsed = makeParsedPath([{ type: "moveTo", point: { x: 10, y: 20 } }]);
      const built = buildPath(parsed);

      expect(built.operations).toHaveLength(1);
      expect(built.operations[0]).toEqual({ type: "moveTo", x: 10, y: 20 });
    });

    it("builds lineTo", () => {
      const parsed = makeParsedPath([
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 100, y: 100 } },
      ]);
      const built = buildPath(parsed);

      expect(built.operations).toHaveLength(2);
      expect(built.operations[1]).toEqual({ type: "lineTo", x: 100, y: 100 });
    });

    it("builds curveTo", () => {
      const parsed = makeParsedPath([
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveTo",
          cp1: { x: 10, y: 20 },
          cp2: { x: 30, y: 40 },
          end: { x: 50, y: 60 },
        },
      ]);
      const built = buildPath(parsed);

      expect(built.operations[1]).toEqual({
        type: "curveTo",
        cp1x: 10,
        cp1y: 20,
        cp2x: 30,
        cp2y: 40,
        x: 50,
        y: 60,
      });
    });

    it("builds curveToV (cp1 = current point)", () => {
      const parsed = makeParsedPath([
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveToV",
          cp2: { x: 30, y: 40 },
          end: { x: 50, y: 60 },
        },
      ]);
      const built = buildPath(parsed);

      expect(built.operations[1]).toEqual({
        type: "curveTo",
        cp1x: 0,
        cp1y: 0, // current point
        cp2x: 30,
        cp2y: 40,
        x: 50,
        y: 60,
      });
    });

    it("builds curveToY (cp2 = end point)", () => {
      const parsed = makeParsedPath([
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveToY",
          cp1: { x: 10, y: 20 },
          end: { x: 50, y: 60 },
        },
      ]);
      const built = buildPath(parsed);

      expect(built.operations[1]).toEqual({
        type: "curveTo",
        cp1x: 10,
        cp1y: 20,
        cp2x: 50,
        cp2y: 60, // same as end
        x: 50,
        y: 60,
      });
    });

    it("builds closePath", () => {
      const parsed = makeParsedPath([
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 100, y: 0 } },
        { type: "closePath" },
      ]);
      const built = buildPath(parsed);

      expect(built.operations[2]).toEqual({ type: "closePath" });
    });

    it("builds rectangle as moveTo + lineTo + close", () => {
      const parsed = makeParsedPath([
        { type: "rect", x: 10, y: 20, width: 100, height: 50 },
      ]);
      const built = buildPath(parsed);

      expect(built.operations).toHaveLength(5);
      expect(built.operations[0]).toEqual({ type: "moveTo", x: 10, y: 20 });
      expect(built.operations[1]).toEqual({ type: "lineTo", x: 110, y: 20 });
      expect(built.operations[2]).toEqual({ type: "lineTo", x: 110, y: 70 });
      expect(built.operations[3]).toEqual({ type: "lineTo", x: 10, y: 70 });
      expect(built.operations[4]).toEqual({ type: "closePath" });
    });
  });

  describe("CTM transformation", () => {
    it("applies translation", () => {
      const ctm: [number, number, number, number, number, number] = [1, 0, 0, 1, 100, 50];
      const parsed = makeParsedPath(
        [{ type: "moveTo", point: { x: 0, y: 0 } }],
        ctm
      );
      const built = buildPath(parsed);

      expect(built.operations[0]).toEqual({ type: "moveTo", x: 100, y: 50 });
    });

    it("applies scale", () => {
      const ctm: [number, number, number, number, number, number] = [2, 0, 0, 2, 0, 0];
      const parsed = makeParsedPath(
        [{ type: "moveTo", point: { x: 10, y: 20 } }],
        ctm
      );
      const built = buildPath(parsed);

      expect(built.operations[0]).toEqual({ type: "moveTo", x: 20, y: 40 });
    });

    it("applies combined transform", () => {
      const ctm: [number, number, number, number, number, number] = [2, 0, 0, 2, 100, 100];
      const parsed = makeParsedPath(
        [{ type: "moveTo", point: { x: 10, y: 20 } }],
        ctm
      );
      const built = buildPath(parsed);

      expect(built.operations[0]).toEqual({ type: "moveTo", x: 120, y: 140 });
    });
  });

  describe("bounds calculation", () => {
    it("calculates bounds for line", () => {
      const parsed = makeParsedPath([
        { type: "moveTo", point: { x: 10, y: 20 } },
        { type: "lineTo", point: { x: 100, y: 80 } },
      ]);
      const built = buildPath(parsed);

      expect(built.bounds).toEqual([10, 20, 100, 80]);
    });

    it("calculates bounds for rectangle", () => {
      const parsed = makeParsedPath([
        { type: "rect", x: 50, y: 100, width: 200, height: 150 },
      ]);
      const built = buildPath(parsed);

      expect(built.bounds).toEqual([50, 100, 250, 250]);
    });

    it("includes curve control points in bounds", () => {
      const parsed = makeParsedPath([
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveTo",
          cp1: { x: -50, y: -50 },
          cp2: { x: 150, y: 150 },
          end: { x: 100, y: 100 },
        },
      ]);
      const built = buildPath(parsed);

      expect(built.bounds[0]).toBe(-50);
      expect(built.bounds[1]).toBe(-50);
      expect(built.bounds[2]).toBe(150);
      expect(built.bounds[3]).toBe(150);
    });

    it("handles empty path", () => {
      const parsed = makeParsedPath([]);
      const built = buildPath(parsed);

      expect(built.bounds).toEqual([0, 0, 0, 0]);
    });
  });

  describe("paint operation", () => {
    it("preserves stroke paint op", () => {
      const gfx = createDefaultGraphicsState();
      const parsed: ParsedPath = {
        type: "path",
        operations: [{ type: "moveTo", point: { x: 0, y: 0 } }],
        paintOp: "stroke",
        graphicsState: gfx,
      };
      const built = buildPath(parsed);
      expect(built.paintOp).toBe("stroke");
    });

    it("preserves fill paint op", () => {
      const gfx = createDefaultGraphicsState();
      const parsed: ParsedPath = {
        type: "path",
        operations: [{ type: "moveTo", point: { x: 0, y: 0 } }],
        paintOp: "fill",
        graphicsState: gfx,
      };
      const built = buildPath(parsed);
      expect(built.paintOp).toBe("fill");
    });
  });
});

describe("buildPaths", () => {
  it("builds multiple paths", () => {
    const gfx = createDefaultGraphicsState();
    const paths: ParsedPath[] = [
      {
        type: "path",
        operations: [{ type: "moveTo", point: { x: 0, y: 0 } }],
        paintOp: "stroke",
        graphicsState: gfx,
      },
      {
        type: "path",
        operations: [{ type: "moveTo", point: { x: 100, y: 100 } }],
        paintOp: "fill",
        graphicsState: gfx,
      },
    ];
    const built = buildPaths(paths);

    expect(built).toHaveLength(2);
    expect(built[0].paintOp).toBe("stroke");
    expect(built[1].paintOp).toBe("fill");
  });
});

describe("builtPathToPdfPath", () => {
  it("converts normalized ops to PdfPathOp", () => {
    const gfx = createDefaultGraphicsState();
    const built: BuiltPath = {
      operations: [
        { type: "moveTo", x: 10, y: 20 },
        { type: "lineTo", x: 30, y: 40 },
        { type: "curveTo", cp1x: 50, cp1y: 60, cp2x: 70, cp2y: 80, x: 90, y: 100 },
        { type: "closePath" },
      ],
      bounds: [10, 20, 90, 100],
      paintOp: "stroke",
      graphicsState: gfx,
    };

    const pdfPath = builtPathToPdfPath(built);

    expect(pdfPath.type).toBe("path");
    expect(pdfPath.operations).toHaveLength(4);
    expect(pdfPath.operations[0]).toEqual({ type: "moveTo", point: { x: 10, y: 20 } });
    expect(pdfPath.operations[1]).toEqual({ type: "lineTo", point: { x: 30, y: 40 } });
    expect(pdfPath.operations[2]).toEqual({
      type: "curveTo",
      cp1: { x: 50, y: 60 },
      cp2: { x: 70, y: 80 },
      end: { x: 90, y: 100 },
    });
    expect(pdfPath.operations[3]).toEqual({ type: "closePath" });
  });
});

describe("path utilities", () => {
  const gfx = createDefaultGraphicsState();

  function makeBuiltPath(ops: BuiltPath["operations"], bounds: BuiltPath["bounds"]): BuiltPath {
    return {
      operations: ops,
      bounds,
      paintOp: "stroke",
      graphicsState: gfx,
    };
  }

  describe("getPathComplexity", () => {
    it("returns operation count", () => {
      const path = makeBuiltPath(
        [
          { type: "moveTo", x: 0, y: 0 },
          { type: "lineTo", x: 100, y: 100 },
        ],
        [0, 0, 100, 100]
      );
      expect(getPathComplexity(path)).toBe(2);
    });
  });

  describe("isDegenerate", () => {
    it("returns true for zero-extent path", () => {
      const path = makeBuiltPath(
        [{ type: "moveTo", x: 50, y: 50 }],
        [50, 50, 50, 50]
      );
      expect(isDegenerate(path)).toBe(true);
    });

    it("returns true for moveTo-only path", () => {
      const path = makeBuiltPath(
        [
          { type: "moveTo", x: 0, y: 0 },
          { type: "moveTo", x: 100, y: 100 },
        ],
        [0, 0, 100, 100]
      );
      expect(isDegenerate(path)).toBe(true);
    });

    it("returns false for path with lines", () => {
      const path = makeBuiltPath(
        [
          { type: "moveTo", x: 0, y: 0 },
          { type: "lineTo", x: 100, y: 100 },
        ],
        [0, 0, 100, 100]
      );
      expect(isDegenerate(path)).toBe(false);
    });
  });

  describe("isSimpleRectangle", () => {
    it("returns true for axis-aligned rectangle", () => {
      const path = makeBuiltPath(
        [
          { type: "moveTo", x: 0, y: 0 },
          { type: "lineTo", x: 100, y: 0 },
          { type: "lineTo", x: 100, y: 50 },
          { type: "lineTo", x: 0, y: 50 },
          { type: "closePath" },
        ],
        [0, 0, 100, 50]
      );
      expect(isSimpleRectangle(path)).toBe(true);
    });

    it("returns false for non-rectangular path", () => {
      const path = makeBuiltPath(
        [
          { type: "moveTo", x: 0, y: 0 },
          { type: "lineTo", x: 100, y: 50 },
          { type: "lineTo", x: 50, y: 100 },
          { type: "closePath" },
        ],
        [0, 0, 100, 100]
      );
      expect(isSimpleRectangle(path)).toBe(false);
    });

    it("returns false for path with curves", () => {
      const path = makeBuiltPath(
        [
          { type: "moveTo", x: 0, y: 0 },
          { type: "curveTo", cp1x: 50, cp1y: 0, cp2x: 100, cp2y: 50, x: 100, y: 100 },
        ],
        [0, 0, 100, 100]
      );
      expect(isSimpleRectangle(path)).toBe(false);
    });
  });

  describe("mergePaths", () => {
    it("returns null for empty array", () => {
      expect(mergePaths([])).toBeNull();
    });

    it("returns single path unchanged", () => {
      const path = makeBuiltPath(
        [{ type: "moveTo", x: 0, y: 0 }],
        [0, 0, 0, 0]
      );
      expect(mergePaths([path])).toBe(path);
    });

    it("merges multiple paths", () => {
      const path1 = makeBuiltPath(
        [{ type: "moveTo", x: 0, y: 0 }, { type: "lineTo", x: 50, y: 50 }],
        [0, 0, 50, 50]
      );
      const path2 = makeBuiltPath(
        [{ type: "moveTo", x: 100, y: 100 }, { type: "lineTo", x: 150, y: 150 }],
        [100, 100, 150, 150]
      );

      const merged = mergePaths([path1, path2]);
      expect(merged).not.toBeNull();
      expect(merged!.operations).toHaveLength(4);
      expect(merged!.bounds).toEqual([0, 0, 150, 150]);
    });

    it("returns null for paths with different paint ops", () => {
      const path1: BuiltPath = {
        operations: [{ type: "moveTo", x: 0, y: 0 }],
        bounds: [0, 0, 0, 0],
        paintOp: "stroke",
        graphicsState: gfx,
      };
      const path2: BuiltPath = {
        operations: [{ type: "moveTo", x: 0, y: 0 }],
        bounds: [0, 0, 0, 0],
        paintOp: "fill",
        graphicsState: gfx,
      };

      expect(mergePaths([path1, path2])).toBeNull();
    });
  });
});
