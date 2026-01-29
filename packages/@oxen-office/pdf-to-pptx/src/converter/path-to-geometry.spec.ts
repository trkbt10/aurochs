/**
 * @file src/pdf/converter/path-to-geometry.spec.ts
 */

import type { PdfPath } from "@oxen/pdf/domain";
import {
  createGraphicsStateStack,
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
} from "@oxen/pdf/domain";
import { px } from "@oxen-office/ooxml/domain/units";
import { createFitContext } from "./transform-converter";
import {
  convertToPresetEllipse,
  convertToPresetRect,
  convertToPresetRoundRect,
  convertPathToGeometry,
  detectRoundedRectangle,
  isApproximateEllipse,
  isRoundedRectangle,
  isSimpleRectangle,
} from "./path-to-geometry";
import type { ParsedPath } from "@oxen/pdf/parser/operator";
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
} from "@oxen/pdf/parser/path/path-builder";

const graphicsState = createDefaultGraphicsState();

const context = createFitContext(100, 100, px(100), px(100), "stretch");

const KAPPA = 0.5522847498307936;

const createEllipsePath = (params: {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly paintOp: PdfPath["paintOp"];
  readonly closePath: boolean;
}): PdfPath => {
  const { cx, cy, rx, ry, paintOp, closePath } = params;

  const opsWithoutClose = [
    { type: "moveTo", point: { x: cx + rx, y: cy } },
    {
      type: "curveTo",
      cp1: { x: cx + rx, y: cy + ry * KAPPA },
      cp2: { x: cx + rx * KAPPA, y: cy + ry },
      end: { x: cx, y: cy + ry },
    },
    {
      type: "curveTo",
      cp1: { x: cx - rx * KAPPA, y: cy + ry },
      cp2: { x: cx - rx, y: cy + ry * KAPPA },
      end: { x: cx - rx, y: cy },
    },
    {
      type: "curveTo",
      cp1: { x: cx - rx, y: cy - ry * KAPPA },
      cp2: { x: cx - rx * KAPPA, y: cy - ry },
      end: { x: cx, y: cy - ry },
    },
    {
      type: "curveTo",
      cp1: { x: cx + rx * KAPPA, y: cy - ry },
      cp2: { x: cx + rx, y: cy - ry * KAPPA },
      end: { x: cx + rx, y: cy },
    },
  ] as const;

  const operations = closePath ? ([...opsWithoutClose, { type: "closePath" }] as const) : opsWithoutClose;

  return {
    type: "path",
    operations,
    paintOp,
    graphicsState,
  };
};

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

  it("detects a circle-like path (rx == ry)", () => {
    const pdfPath = createEllipsePath({ cx: 50, cy: 50, rx: 10, ry: 10, paintOp: "stroke", closePath: true });
    expect(isApproximateEllipse(pdfPath)).toBe(true);
  });

  it("detects an ellipse-like path (rx != ry) even without closePath", () => {
    const pdfPath = createEllipsePath({ cx: 50, cy: 50, rx: 10, ry: 20, paintOp: "stroke", closePath: false });
    expect(isApproximateEllipse(pdfPath)).toBe(true);
  });

  it("does not detect rectangles as ellipses", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 0, y: 0, width: 10, height: 10 }] as const,
      paintOp: "stroke",
      graphicsState,
    };

    expect(isApproximateEllipse(pdfPath)).toBe(false);
  });

  it("does not detect incomplete ellipses (3 curves)", () => {
    const pdfPath: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 5 } },
        { type: "curveTo", cp1: { x: 0, y: 8 }, cp2: { x: 2, y: 10 }, end: { x: 5, y: 10 } },
        { type: "curveTo", cp1: { x: 8, y: 10 }, cp2: { x: 10, y: 8 }, end: { x: 10, y: 5 } },
        { type: "curveTo", cp1: { x: 10, y: 2 }, cp2: { x: 8, y: 0 }, end: { x: 5, y: 0 } },
        { type: "closePath" },
      ] as const,
      paintOp: "stroke",
      graphicsState,
    };

    expect(isApproximateEllipse(pdfPath)).toBe(false);
  });
});

describe("convertToPresetRect / convertToPresetEllipse", () => {
  it("returns preset geometries", () => {
    const rectPath: PdfPath = {
      type: "path",
      operations: [{ type: "rect", x: 0, y: 0, width: 10, height: 10 }] as const,
      paintOp: "fill",
      graphicsState,
    };

    expect(convertToPresetRect(rectPath)).toEqual({ type: "preset", preset: "rect", adjustValues: [] });
    expect(() => convertToPresetEllipse(rectPath)).toThrow("Path is not an approximate ellipse");

    const ellipsePath = createEllipsePath({ cx: 50, cy: 50, rx: 10, ry: 20, paintOp: "stroke", closePath: true });
    expect(convertToPresetEllipse(ellipsePath)).toEqual({ type: "preset", preset: "ellipse", adjustValues: [] });
  });
});

describe("pdf/parser/graphics-state", () => {
  it("creates a default state and manages a stack", () => {
    const s0 = createDefaultGraphicsState();
    expect(s0.ctm).toEqual(IDENTITY_MATRIX);
    expect(s0.lineWidth).toBe(1);

    const stack = createGraphicsStateStack();
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
    if (!inv) {throw new Error("Expected invertible matrix");}
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
    if (!merged) {throw new Error("Expected merged path");}
    expect(merged.bounds).toEqual([0, 0, 10, 10]);
    expect(merged.operations).toHaveLength(2);
  });
});

describe("isRoundedRectangle", () => {
  // Bezier constant for circular arc approximation
  const K = KAPPA;

  /**
   * Create a rounded rectangle path.
   * Structure: moveTo, then alternating lineTo/curveTo for edges and corners.
   */
	  function createRoundedRectPath(
	    ...args: readonly [x: number, y: number, width: number, height: number, radius: number]
	  ): PdfPath {
	    const [x, y, width, height, radius] = args;
	    const r = radius;
	    // Start at top-left, after the corner curve ends
	    const ops = [
      // Start on top edge after top-left corner
      { type: "moveTo" as const, point: { x: x + r, y: y + height } },
      // Top edge
      { type: "lineTo" as const, point: { x: x + width - r, y: y + height } },
      // Top-right corner
      {
        type: "curveTo" as const,
        cp1: { x: x + width - r + r * K, y: y + height },
        cp2: { x: x + width, y: y + height - r + r * K },
        end: { x: x + width, y: y + height - r },
      },
      // Right edge
      { type: "lineTo" as const, point: { x: x + width, y: y + r } },
      // Bottom-right corner
      {
        type: "curveTo" as const,
        cp1: { x: x + width, y: y + r - r * K },
        cp2: { x: x + width - r + r * K, y: y },
        end: { x: x + width - r, y: y },
      },
      // Bottom edge
      { type: "lineTo" as const, point: { x: x + r, y: y } },
      // Bottom-left corner
      {
        type: "curveTo" as const,
        cp1: { x: x + r - r * K, y: y },
        cp2: { x: x, y: y + r - r * K },
        end: { x: x, y: y + r },
      },
      // Left edge
      { type: "lineTo" as const, point: { x: x, y: y + height - r } },
      // Top-left corner
      {
        type: "curveTo" as const,
        cp1: { x: x, y: y + height - r + r * K },
        cp2: { x: x + r - r * K, y: y + height },
        end: { x: x + r, y: y + height },
      },
      { type: "closePath" as const },
    ];

    return {
      type: "path",
      operations: ops,
      paintOp: "fill",
      graphicsState,
    };
  }

  it("detects a rounded rectangle with 10% corner radius", () => {
    const path = createRoundedRectPath(0, 0, 100, 50, 5); // 5/50 = 10%
    expect(isRoundedRectangle(path)).toBe(true);

    const ratio = detectRoundedRectangle(path);
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(0.1, 1);
  });

  it("detects a rounded rectangle with 25% corner radius", () => {
    const path = createRoundedRectPath(0, 0, 100, 100, 25); // 25/100 = 25%
    expect(isRoundedRectangle(path)).toBe(true);

    const ratio = detectRoundedRectangle(path);
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(0.25, 1);
  });

  it("returns false for a simple rectangle (no curves)", () => {
    const path: PdfPath = {
      type: "path",
      operations: [
        { type: "moveTo", point: { x: 0, y: 0 } },
        { type: "lineTo", point: { x: 100, y: 0 } },
        { type: "lineTo", point: { x: 100, y: 50 } },
        { type: "lineTo", point: { x: 0, y: 50 } },
        { type: "closePath" },
      ],
      paintOp: "fill",
      graphicsState,
    };
    expect(isRoundedRectangle(path)).toBe(false);
  });

  it("returns false for an ellipse (4 curves only)", () => {
    const path = createEllipsePath({
      cx: 50,
      cy: 25,
      rx: 50,
      ry: 25,
      paintOp: "fill",
      closePath: true,
    });
    expect(isRoundedRectangle(path)).toBe(false);
  });

  it("converts rounded rect to roundRect preset", () => {
    const path = createRoundedRectPath(0, 0, 100, 100, 16.67); // ~16.7%
    const preset = convertToPresetRoundRect(path);

    expect(preset.type).toBe("preset");
    expect(preset.preset).toBe("roundRect");
    expect(preset.adjustValues).toHaveLength(1);
    expect(preset.adjustValues[0]?.name).toBe("adj");
    // 16.67% * 100000 ≈ 16670
    expect(preset.adjustValues[0]?.value).toBeCloseTo(16670, -2);
  });
});
