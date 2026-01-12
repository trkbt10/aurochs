import type { PdfPath } from "../domain";
import {
  GraphicsStateStack,
  IDENTITY_MATRIX,
  createDefaultGraphicsState,
  getMatrixRotation,
  getMatrixScale,
  invertMatrix,
  isIdentityMatrix,
  isSimpleTransform,
  multiplyMatrices,
  rotationMatrix,
  scalingMatrix,
  transformPoint,
  translationMatrix,
} from "../domain";
import { px } from "../../ooxml/domain/units";
import {
  convertToPresetEllipse,
  convertToPresetRect,
  convertPathToGeometry,
  isApproximateEllipse,
  isSimpleRectangle,
} from "./path-to-geometry";
import type { ParsedPath } from "../parser/operator-parser";
import {
  buildPath,
  buildPaths,
  builtPathToPdfPath,
  computePathBBox,
  getPathComplexity,
  getPathHeight,
  getPathWidth,
  isDegenerate,
  isSimpleRectangle as isBuiltPathSimpleRectangle,
  mergePaths,
} from "../parser/path-builder";

const graphicsState = createDefaultGraphicsState();

const context = {
  pdfWidth: 100,
  pdfHeight: 100,
  slideWidth: px(100),
  slideHeight: px(100),
} as const;

describe("convertPathToGeometry", () => {
  it("converts moveTo/lineTo into geometry PathCommands (with Y-flip + local coords)", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 10, y: 0 } },
        { type: "lineTo", point: { x: 20, y: 10 } },
      ] as const,
      paintOp: "stroke",
      graphicsState,
    };

    expect(convertPathToGeometry(pdfPath, context)).toEqual({
      type: "custom",
      paths: [
        {
          width: px(10),
          height: px(10),
          fill: "none",
          stroke: true,
          extrusionOk: false,
          commands: [
            { type: "moveTo", point: { x: px(0), y: px(10) } },
            { type: "lineTo", point: { x: px(10), y: px(0) } },
          ],
        },
      ],
    });
  });

  it("converts curveTo into cubicBezierTo", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveTo",
          cp1: { x: 0, y: 10 },
          cp2: { x: 10, y: 10 },
          end: { x: 10, y: 0 },
        },
      ] as const,
      paintOp: "fill",
      graphicsState,
    };

    expect(convertPathToGeometry(pdfPath, context)).toEqual({
      type: "custom",
      paths: [
        {
          width: px(10),
          height: px(10),
          fill: "norm",
          stroke: false,
          extrusionOk: false,
          commands: [
            { type: "moveTo", point: { x: px(0), y: px(10) } },
            {
              type: "cubicBezierTo",
              control1: { x: px(0), y: px(0) },
              control2: { x: px(10), y: px(0) },
              end: { x: px(10), y: px(10) },
            },
          ],
        },
      ],
    });
  });

  it("expands curveToV (cp1 = current point) into cubicBezierTo", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveToV",
          cp2: { x: 10, y: 10 },
          end: { x: 10, y: 0 },
        },
      ] as const,
      paintOp: "stroke",
      graphicsState,
    };

    expect(convertPathToGeometry(pdfPath, context).paths[0]?.commands).toEqual([
      { type: "moveTo", point: { x: px(0), y: px(10) } },
      {
        type: "cubicBezierTo",
        control1: { x: px(0), y: px(10) },
        control2: { x: px(10), y: px(0) },
        end: { x: px(10), y: px(10) },
      },
    ]);
  });

  it("expands curveToY (cp2 = end point) into cubicBezierTo", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        {
          type: "curveToY",
          cp1: { x: 0, y: 10 },
          end: { x: 10, y: 0 },
        },
      ] as const,
      paintOp: "stroke",
      graphicsState,
    };

    expect(convertPathToGeometry(pdfPath, context).paths[0]?.commands).toEqual([
      { type: "moveTo", point: { x: px(0), y: px(10) } },
      {
        type: "cubicBezierTo",
        control1: { x: px(0), y: px(0) },
        control2: { x: px(10), y: px(10) },
        end: { x: px(10), y: px(10) },
      },
    ]);
  });

  it("expands rect operations into moveTo/lineTo/close", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 10, y: 20, width: 30, height: 40 }] as const,
      paintOp: "stroke",
      graphicsState,
    };

    const commands = convertPathToGeometry(pdfPath, context).paths[0]?.commands;
    expect(commands?.map((c) => c.type)).toEqual(["moveTo", "lineTo", "lineTo", "lineTo", "close"]);
  });

  it("converts closePath into close commands", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 10, y: 0 } },
        { type: "closePath" },
      ] as const,
      paintOp: "fillStroke",
      graphicsState,
    };

    const commands = convertPathToGeometry(pdfPath, context).paths[0]?.commands;
    expect(commands?.map((c) => c.type)).toEqual(["moveTo", "lineTo", "close"]);
  });
});

describe("isSimpleRectangle", () => {
  it("detects a rect operation", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 0, y: 0, width: 10, height: 5 }] as const,
      paintOp: "fill",
      graphicsState,
    };

    expect(isSimpleRectangle(pdfPath)).toBe(true);
  });

  it("detects moveTo + 3 lineTo + closePath axis-aligned rectangle", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 10, y: 0 } },
        { type: "lineTo", point: { x: 10, y: 5 } },
        { type: "lineTo", point: { x: 0, y: 5 } },
        { type: "closePath" },
      ] as const,
      paintOp: "fill",
      graphicsState,
    };

    expect(isSimpleRectangle(pdfPath)).toBe(true);
  });

  it("returns false for non-rectangular paths", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 10, y: 10 } },
        { type: "lineTo", point: { x: 20, y: 0 } },
        { type: "closePath" },
      ] as const,
      paintOp: "fill",
      graphicsState,
    };

    expect(isSimpleRectangle(pdfPath)).toBe(false);
  });
});

describe("isApproximateEllipse", () => {
  it("detects moveTo + 4 curveTo + closePath pattern", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 5 } },
        { type: "curveTo", cp1: { x: 0, y: 8 }, cp2: { x: 2, y: 10 }, end: { x: 5, y: 10 } },
        { type: "curveTo", cp1: { x: 8, y: 10 }, cp2: { x: 10, y: 8 }, end: { x: 10, y: 5 } },
        { type: "curveTo", cp1: { x: 10, y: 2 }, cp2: { x: 8, y: 0 }, end: { x: 5, y: 0 } },
        { type: "curveTo", cp1: { x: 2, y: 0 }, cp2: { x: 0, y: 2 }, end: { x: 0, y: 5 } },
        { type: "closePath" },
      ] as const,
      paintOp: "stroke",
      graphicsState,
    };

    expect(isApproximateEllipse(pdfPath)).toBe(true);
  });
});

describe("convertToPresetRect / convertToPresetEllipse", () => {
  it("returns preset geometries", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 0, y: 0, width: 10, height: 10 }] as const,
      paintOp: "fill",
      graphicsState,
    };

    expect(convertToPresetRect(pdfPath, context)).toEqual({ type: "preset", preset: "rect", adjustValues: [] });
    expect(convertToPresetEllipse(pdfPath, context)).toEqual({ type: "preset", preset: "ellipse", adjustValues: [] });
  });
});

describe("pdf/parser/graphics-state", () => {
  it("creates a default state and manages a stack", () => {
    const s0 = createDefaultGraphicsState();
    expect(s0.ctm).toEqual(IDENTITY_MATRIX);
    expect(s0.lineWidth).toBe(1);

    const stack = new GraphicsStateStack();
    const before = stack.get();
    stack.push();
    stack.setFillRgb(1, 0, 0);
    stack.setLineWidth(5);
    const modified = stack.get();
    expect(modified.fillColor.colorSpace).toBe("DeviceRGB");
    expect(modified.lineWidth).toBe(5);

    stack.pop();
    expect(stack.get()).toEqual(before);
  });

  it("multiplies matrices and transforms points", () => {
    const m = multiplyMatrices(translationMatrix(10, 20), scalingMatrix(2, 3));
    expect(transformPoint({ x: 1, y: 1 }, m)).toEqual({ x: 22, y: 63 });
  });

  it("inverts matrices when possible", () => {
    const m = translationMatrix(10, 20);
    const inv = invertMatrix(m);
    if (!inv) throw new Error("Expected invertible matrix");
    expect(transformPoint({ x: 10, y: 20 }, inv)).toEqual({ x: 0, y: 0 });
    expect(invertMatrix([0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it("detects identity/simple transforms and extracts scale/rotation", () => {
    expect(isIdentityMatrix(IDENTITY_MATRIX)).toBe(true);
    expect(isIdentityMatrix(translationMatrix(1, 0))).toBe(false);
    expect(isSimpleTransform(scalingMatrix(2, 3))).toBe(true);
    expect(isSimpleTransform(rotationMatrix(Math.PI / 2))).toBe(false);

    const rot = rotationMatrix(Math.PI / 2);
    const scale = getMatrixScale(rot);
    expect(scale.scaleX).toBeCloseTo(1, 6);
    expect(scale.scaleY).toBeCloseTo(1, 6);
    expect(getMatrixRotation(rot)).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe("pdf/parser/path-builder", () => {
  it("builds normalized operations and bounds (including rect expansion)", () => {
    const parsed: ParsedPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 10, y: 0 } },
        { type: "curveTo", cp1: { x: 10, y: 5 }, cp2: { x: 15, y: 5 }, end: { x: 15, y: 0 } },
        { type: "curveToV", cp2: { x: 20, y: 0 }, end: { x: 20, y: 10 } },
        { type: "curveToY", cp1: { x: 30, y: 20 }, end: { x: 40, y: 30 } },
        { type: "rect", x: 0, y: 0, width: 5, height: 5 },
        { type: "closePath" },
      ] as const,
      paintOp: "stroke",
      graphicsState: { ...createDefaultGraphicsState(), ctm: translationMatrix(10, 20) },
    };

    const built = buildPath(parsed);
    expect(built.paintOp).toBe("stroke");
    expect(built.operations[0]).toEqual({ type: "moveTo", x: 10, y: 20 });
    expect(built.bounds).toEqual([10, 20, 50, 50]);
  });

  it("buildPaths maps buildPath", () => {
    const parsed: ParsedPath = {
      type: "path",
      operations: [{ type: "moveTo", point: { x: 0, y: 0 } }] as const,
      paintOp: "none",
      graphicsState: createDefaultGraphicsState(),
    };
    expect(buildPaths([parsed, parsed])).toHaveLength(2);
  });

  it("builtPathToPdfPath converts normalized ops back to PdfPath", () => {
    const built = {
      operations: [
        { type: "moveTo", x: 0, y: 0 },
        { type: "lineTo", x: 10, y: 0 },
        { type: "curveTo", cp1x: 10, cp1y: 10, cp2x: 0, cp2y: 10, x: 0, y: 0 },
        { type: "closePath" },
      ] as const,
      bounds: [0, 0, 10, 10] as const,
      paintOp: "fill" as const,
      graphicsState: createDefaultGraphicsState(),
    };

    expect(builtPathToPdfPath(built)).toEqual({
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 10, y: 0 } },
        { type: "curveTo", cp1: { x: 10, y: 10 }, cp2: { x: 0, y: 10 }, end: { x: 0, y: 0 } },
        { type: "closePath" },
      ],
      paintOp: "fill",
      graphicsState: createDefaultGraphicsState(),
    });
  });

  it("computePathBBox handles all op variants and empty paths", () => {
    const path: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "curveToV", cp2: { x: 10, y: 10 }, end: { x: 5, y: 5 } },
        { type: "curveToY", cp1: { x: 20, y: -10 }, end: { x: 30, y: 0 } },
        { type: "closePath" },
      ] as const,
      paintOp: "stroke",
      graphicsState,
    };
    expect(computePathBBox(path)).toEqual([0, -10, 30, 10]);

    expect(
      computePathBBox({ type: "path", operations: [] as const, paintOp: "stroke", graphicsState })
    ).toEqual([0, 0, 0, 0]);
  });

  it("computes path metrics and detects degeneracy", () => {
    const degenerate = {
      operations: [{ type: "moveTo", x: 0, y: 0 }] as const,
      bounds: [0, 0, 0, 0] as const,
      paintOp: "stroke" as const,
      graphicsState: createDefaultGraphicsState(),
    };
    expect(getPathComplexity(degenerate)).toBe(1);
    expect(isDegenerate(degenerate)).toBe(true);
    expect(getPathWidth(degenerate)).toBe(0);
    expect(getPathHeight(degenerate)).toBe(0);

    const nonDegenerate = {
      ...degenerate,
      operations: [
        { type: "moveTo", x: 0, y: 0 },
        { type: "lineTo", x: 10, y: 0 },
      ] as const,
      bounds: [0, 0, 10, 0] as const,
    };
    expect(isDegenerate(nonDegenerate)).toBe(false);
  });

  it("detects simple rectangles (built-path form)", () => {
    const rect = {
      operations: [
        { type: "moveTo", x: 0, y: 0 },
        { type: "lineTo", x: 10, y: 0 },
        { type: "lineTo", x: 10, y: 5 },
        { type: "lineTo", x: 0, y: 5 },
        { type: "closePath" },
      ] as const,
      bounds: [0, 0, 10, 5] as const,
      paintOp: "stroke" as const,
      graphicsState: createDefaultGraphicsState(),
    };
    expect(isBuiltPathSimpleRectangle(rect)).toBe(true);

    const notRect = { ...rect, operations: [{ type: "moveTo", x: 0, y: 0 }] as const };
    expect(isBuiltPathSimpleRectangle(notRect)).toBe(false);
  });

  it("merges paths when paintOp matches", () => {
    const g = createDefaultGraphicsState();
    const p1 = { operations: [{ type: "moveTo", x: 0, y: 0 }] as const, bounds: [0, 0, 0, 0] as const, paintOp: "fill" as const, graphicsState: g };
    const p2 = { operations: [{ type: "lineTo", x: 10, y: 10 }] as const, bounds: [10, 10, 10, 10] as const, paintOp: "fill" as const, graphicsState: g };

    expect(mergePaths([])).toBeNull();
    expect(mergePaths([p1])).toEqual(p1);
    expect(mergePaths([p1, { ...p2, paintOp: "stroke" as const }])).toBeNull();

    const merged = mergePaths([p1, p2]);
    if (!merged) throw new Error("Expected merged path");
    expect(merged.bounds).toEqual([0, 0, 10, 10]);
    expect(merged.operations).toHaveLength(2);
  });
});
