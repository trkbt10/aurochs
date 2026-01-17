/**
 * @file src/pdf/converter/path-to-geometry.ts
 */

import type { PdfPath, PdfPathOp, PdfPoint } from "../domain";
import type {
  CloseCommand,
  CubicBezierCommand,
  CustomGeometry,
  GeometryPath,
  LineToCommand,
  MoveToCommand,
  PathCommand,
  PresetGeometry,
} from "../../pptx/domain/shape";
import type { Pixels } from "../../ooxml/domain/units";
import { px } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, convertPoint } from "./transform-converter";
import { computePathBBox } from "../parser/path-builder";

type LocalConversionContext = ConversionContext & {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
};

const pixelsToNumber = (value: Pixels): number => value as number;

/**
 * PdfPathをCustomGeometryに変換
 */
export function convertPathToGeometry(pdfPath: PdfPath, context: ConversionContext): CustomGeometry {
  const bbox = computePathBBox(pdfPath);
  const converted = convertBBox(bbox, context);

  const localContext: LocalConversionContext = {
    ...context,
    offsetX: pixelsToNumber(converted.x),
    offsetY: pixelsToNumber(converted.y),
    width: pixelsToNumber(converted.width),
    height: pixelsToNumber(converted.height),
  };

  const commands = convertPathOps(pdfPath.operations, localContext);

  const geometryPath: GeometryPath = {
    width: converted.width,
    height: converted.height,
    fill: pdfPath.paintOp === "fill" || pdfPath.paintOp === "fillStroke" ? "norm" : "none",
    stroke: pdfPath.paintOp === "stroke" || pdfPath.paintOp === "fillStroke",
    extrusionOk: false,
    commands,
  };

  return {
    type: "custom",
    paths: [geometryPath],
  };
}

function convertPathOps(ops: readonly PdfPathOp[], context: LocalConversionContext): readonly PathCommand[] {
  const commands: PathCommand[] = [];
  const state: { currentPoint: PdfPoint; subpathStartPoint: PdfPoint } = {
    currentPoint: { x: 0, y: 0 },
    subpathStartPoint: { x: 0, y: 0 },
  };

  for (const op of ops) {
    switch (op.type) {
      case "moveTo": {
        const point = convertToLocal(op.point, context);
        const cmd: MoveToCommand = { type: "moveTo", point };
        commands.push(cmd);
        state.currentPoint = op.point;
        state.subpathStartPoint = op.point;
        break;
      }

      case "lineTo": {
        const point = convertToLocal(op.point, context);
        const cmd: LineToCommand = { type: "lineTo", point };
        commands.push(cmd);
        state.currentPoint = op.point;
        break;
      }

      case "curveTo": {
        const cmd: CubicBezierCommand = {
          type: "cubicBezierTo",
          control1: convertToLocal(op.cp1, context),
          control2: convertToLocal(op.cp2, context),
          end: convertToLocal(op.end, context),
        };
        commands.push(cmd);
        state.currentPoint = op.end;
        break;
      }

      case "curveToV": {
        const cmd: CubicBezierCommand = {
          type: "cubicBezierTo",
          control1: convertToLocal(state.currentPoint, context),
          control2: convertToLocal(op.cp2, context),
          end: convertToLocal(op.end, context),
        };
        commands.push(cmd);
        state.currentPoint = op.end;
        break;
      }

      case "curveToY": {
        const cmd: CubicBezierCommand = {
          type: "cubicBezierTo",
          control1: convertToLocal(op.cp1, context),
          control2: convertToLocal(op.end, context),
          end: convertToLocal(op.end, context),
        };
        commands.push(cmd);
        state.currentPoint = op.end;
        break;
      }

      case "rect": {
        const p1: PdfPoint = { x: op.x, y: op.y };
        const p2: PdfPoint = { x: op.x + op.width, y: op.y };
        const p3: PdfPoint = { x: op.x + op.width, y: op.y + op.height };
        const p4: PdfPoint = { x: op.x, y: op.y + op.height };

        const move: MoveToCommand = { type: "moveTo", point: convertToLocal(p1, context) };
        const l1: LineToCommand = { type: "lineTo", point: convertToLocal(p2, context) };
        const l2: LineToCommand = { type: "lineTo", point: convertToLocal(p3, context) };
        const l3: LineToCommand = { type: "lineTo", point: convertToLocal(p4, context) };
        const close: CloseCommand = { type: "close" };

        commands.push(move, l1, l2, l3, close);

        state.currentPoint = p1;
        state.subpathStartPoint = p1;
        break;
      }

      case "closePath": {
        const close: CloseCommand = { type: "close" };
        commands.push(close);
        state.currentPoint = state.subpathStartPoint;
        break;
      }
    }
  }

  return commands;
}

/**
 * PDF座標をジオメトリローカル座標に変換
 */
function convertToLocal(
  point: PdfPoint,
  context: LocalConversionContext
): { readonly x: Pixels; readonly y: Pixels } {
  const pptx = convertPoint(point, context);

  return {
    x: px((pptx.x as number) - context.offsetX),
    y: px((pptx.y as number) - context.offsetY),
  };
}

/**
 * パスが単純な矩形かどうか判定
 */
export function isSimpleRectangle(pdfPath: PdfPath): boolean {
  const ops = pdfPath.operations;

  if (ops.length === 1 && ops[0]?.type === "rect") {
    return true;
  }

  if (
    ops.length === 5 &&
    ops[0]?.type === "moveTo" &&
    ops[1]?.type === "lineTo" &&
    ops[2]?.type === "lineTo" &&
    ops[3]?.type === "lineTo" &&
    ops[4]?.type === "closePath"
  ) {
    return isAxisAlignedRectangle(ops[0].point, ops[1].point, ops[2].point, ops[3].point);
  }

  return false;
}

/**
 * 矩形パスをPresetGeometry（rect）に変換
 */
export function convertToPresetRect(pdfPath: PdfPath): PresetGeometry {
  if (!isSimpleRectangle(pdfPath)) {
    throw new Error("Path is not a simple rectangle");
  }
  return {
    type: "preset",
    preset: "rect",
    adjustValues: [],
  };
}

/**
 * Check if 4 points form an axis-aligned rectangle.
 * Uses floating-point epsilon for near-zero comparison (IEEE 754 precision consideration).
 */
function isAxisAlignedRectangle(p1: PdfPoint, p2: PdfPoint, p3: PdfPoint, p4: PdfPoint): boolean {
  // Floating-point epsilon for near-zero comparison (IEEE 754 precision consideration)
  const FLOAT_EPSILON = 1e-10;

  const isAxisAlignedSegment = (a: PdfPoint, b: PdfPoint): boolean => {
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    return dx <= FLOAT_EPSILON || dy <= FLOAT_EPSILON;
  };

  if (
    !isAxisAlignedSegment(p1, p2) ||
    !isAxisAlignedSegment(p2, p3) ||
    !isAxisAlignedSegment(p3, p4) ||
    !isAxisAlignedSegment(p4, p1)
  ) {
    return false;
  }

  const uniqueWithinTolerance = (values: readonly number[]): readonly number[] => {
    const uniques: number[] = [];
    for (const value of values) {
      if (!uniques.some((u) => Math.abs(u - value) <= FLOAT_EPSILON)) {
        uniques.push(value);
      }
    }
    return uniques;
  };

  const xs = uniqueWithinTolerance([p1.x, p2.x, p3.x, p4.x]);
  const ys = uniqueWithinTolerance([p1.y, p2.y, p3.y, p4.y]);

  return xs.length === 2 && ys.length === 2;
}

/**
 * パスが楕円に近いかどうか判定
 * ベジェ曲線4本で構成される楕円近似を検出
 */
export function isApproximateEllipse(pdfPath: PdfPath): boolean {
  const ops = pdfPath.operations;

  if (ops.length !== 5 && ops.length !== 6) {return false;}
  if (ops[0]?.type !== "moveTo") {return false;}

  for (let i = 1; i <= 4; i++) {
    if (ops[i]?.type !== "curveTo") {return false;}
  }

  if (ops.length === 6 && ops[5]?.type !== "closePath") {return false;}

  const start = ops[0].point;
  const lastCurve = ops[4];
  if (lastCurve.type !== "curveTo") {
    return false;
  }

  const end = lastCurve.end;
  const [minX, minY, maxX, maxY] = computePathBBox(pdfPath);
  const size = Math.max(maxX - minX, maxY - minY);
  const epsilon = Math.max(1e-6, size * 1e-3);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist2 = dx * dx + dy * dy;
  return dist2 <= epsilon * epsilon;
}

/**
 * 楕円パスをPresetGeometry（ellipse）に変換
 */
export function convertToPresetEllipse(pdfPath: PdfPath): PresetGeometry {
  if (!isApproximateEllipse(pdfPath)) {
    throw new Error("Path is not an approximate ellipse");
  }

  return {
    type: "preset",
    preset: "ellipse",
    adjustValues: [],
  };
}

/**
 * Check if a path is a rounded rectangle.
 *
 * A rounded rectangle in PDF typically consists of:
 * - moveTo (start on an edge)
 * - Alternating lineTo (4 edges) and curveTo (4 corners)
 * - closePath
 *
 * Returns the corner radius ratio (0-1) if detected, or null if not a rounded rect.
 */
export function detectRoundedRectangle(pdfPath: PdfPath): number | null {
  const ops = pdfPath.operations;

  // Minimum: moveTo + 4 corners (curveTo) + 4 edges (lineTo or implicit) + closePath
  // Common patterns:
  // 1. moveTo, lineTo, curveTo, lineTo, curveTo, lineTo, curveTo, lineTo, curveTo, closePath (10 ops)
  // 2. moveTo, curveTo, lineTo, curveTo, lineTo, curveTo, lineTo, curveTo, closePath (9 ops)
  if (ops.length < 5 || ops.length > 14) {return null;}
  if (ops[0]?.type !== "moveTo") {return null;}

  // Count curve operations (corners) and line operations (edges)
  const counts = { curveCount: 0, lineCount: 0 };

  for (let i = 1; i < ops.length; i++) {
    const op = ops[i];
    if (op.type === "curveTo" || op.type === "curveToV" || op.type === "curveToY") {
      counts.curveCount += 1;
    } else if (op.type === "lineTo") {
      counts.lineCount += 1;
    } else if (op.type === "closePath") {
      // Expected at the end
    } else {
      // Unexpected operation
      return null;
    }
  }

  // A rounded rectangle should have 4 corners (curves) and some line segments
  if (counts.curveCount !== 4) {return null;}
  if (counts.lineCount < 2) {return null;} // At least 2 lines (could be 4, but short edges may be omitted)

  // Get bounding box
  const [minX, minY, maxX, maxY] = computePathBBox(pdfPath);
  const width = maxX - minX;
  const height = maxY - minY;
  const minDimension = Math.min(width, height);

  if (minDimension <= 0) {return null;}

  // Extract corner curves and estimate radius
  const curves = ops.filter(
    (op): op is Extract<PdfPathOp, { type: "curveTo" | "curveToV" | "curveToY" }> =>
      op.type === "curveTo" || op.type === "curveToV" || op.type === "curveToY"
  );

  // Estimate radius from the first curve
  const firstCurve = curves[0];
  if (firstCurve.type !== "curveTo") {return null;}

  const cp1 = firstCurve.cp1;
  const cp2 = firstCurve.cp2;
  const end = firstCurve.end;

  // Get the start point of the curve (from the previous operation)
  const startPointState: { value: PdfPoint | null } = { value: null };
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.type === "moveTo" || op.type === "lineTo") {
      startPointState.value = op.point;
    }
    if (ops[i + 1] === firstCurve) {break;}
  }

  const startPoint = startPointState.value;
  if (!startPoint) {return null;}

  // For a Bézier curve approximating a 90-degree arc:
  // - Start point to cp1 distance = radius * KAPPA
  // - End point to cp2 distance = radius * KAPPA
  // Where KAPPA ≈ 0.5523 is the Bézier circle constant
  const BEZIER_CIRCLE_CONSTANT = 0.5523;

  const dist1 = Math.hypot(cp1.x - startPoint.x, cp1.y - startPoint.y);
  const dist2 = Math.hypot(cp2.x - end.x, cp2.y - end.y);
  const avgControlDist = (dist1 + dist2) / 2;

  const estimatedRadius = avgControlDist / BEZIER_CIRCLE_CONSTANT;

  // Calculate ratio relative to smaller dimension
  const radiusRatio = estimatedRadius / minDimension;

  // Sanity check: ratio should be between 0 and 0.5 (can't be more than half)
  if (radiusRatio < 0.01 || radiusRatio > 0.55) {return null;}

  // Verify all corners have similar control point distances (within 50% tolerance)
  // This catches cases where curves have very different radii
  const radii: number[] = [];
  for (let i = 0; i < curves.length; i++) {
    const curve = curves[i];
    if (curve.type !== "curveTo") {continue;}

    // Find the start point for this curve
    const curveStartState: { value: PdfPoint | null } = { value: null };
    for (let j = 0; j < ops.length; j++) {
      const op = ops[j];
      if (op.type === "moveTo" || op.type === "lineTo") {
        curveStartState.value = op.point;
      } else if (op.type === "curveTo" || op.type === "curveToV" || op.type === "curveToY") {
        curveStartState.value = op.end;
      }
      if (ops[j + 1] === curve) {break;}
    }

    const curveStart = curveStartState.value;
    if (!curveStart) {continue;}

    const d1 = Math.hypot(curve.cp1.x - curveStart.x, curve.cp1.y - curveStart.y);
    const d2 = Math.hypot(curve.cp2.x - curve.end.x, curve.cp2.y - curve.end.y);
    const curveRadius = ((d1 + d2) / 2) / BEZIER_CIRCLE_CONSTANT;
    radii.push(curveRadius);
  }

  // Check that all radii are similar
  if (radii.length >= 2) {
    const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const maxDeviation = Math.max(...radii.map((r) => Math.abs(r - avgRadius)));
    if (maxDeviation > avgRadius * 0.5) {
      // Radii are too different - not a uniform rounded rect
      return null;
    }
  }

  return Math.min(0.5, Math.max(0.01, radiusRatio));
}

/**
 * Check if a path is a rounded rectangle.
 */
export function isRoundedRectangle(pdfPath: PdfPath): boolean {
  return detectRoundedRectangle(pdfPath) !== null;
}

/**
 * Convert rounded rectangle path to PresetGeometry (roundRect).
 *
 * PPTX roundRect uses an adjust value (adj) that represents the radius
 * as a percentage of the smaller dimension, scaled to 50000 = 50%.
 */
export function convertToPresetRoundRect(pdfPath: PdfPath): PresetGeometry {
  const radiusRatio = detectRoundedRectangle(pdfPath);
  if (radiusRatio === null) {
    throw new Error("Path is not a rounded rectangle");
  }

  // PPTX uses a scale of 0-50000 for the adj value (50000 = 50% = half the short side)
  // For roundRect, the default is 16667 (about 16.7%)
  const adjValue = Math.round(radiusRatio * 100000);

  return {
    type: "preset",
    preset: "roundRect",
    adjustValues: [{ name: "adj", value: adjValue }],
  };
}
