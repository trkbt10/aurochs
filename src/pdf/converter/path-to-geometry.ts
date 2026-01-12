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
  let currentPoint: PdfPoint = { x: 0, y: 0 };
  let subpathStartPoint: PdfPoint = { x: 0, y: 0 };

  for (const op of ops) {
    switch (op.type) {
      case "moveTo": {
        const point = convertToLocal(op.point, context);
        const cmd: MoveToCommand = { type: "moveTo", point };
        commands.push(cmd);
        currentPoint = op.point;
        subpathStartPoint = op.point;
        break;
      }

      case "lineTo": {
        const point = convertToLocal(op.point, context);
        const cmd: LineToCommand = { type: "lineTo", point };
        commands.push(cmd);
        currentPoint = op.point;
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
        currentPoint = op.end;
        break;
      }

      case "curveToV": {
        const cmd: CubicBezierCommand = {
          type: "cubicBezierTo",
          control1: convertToLocal(currentPoint, context),
          control2: convertToLocal(op.cp2, context),
          end: convertToLocal(op.end, context),
        };
        commands.push(cmd);
        currentPoint = op.end;
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
        currentPoint = op.end;
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

        currentPoint = p1;
        subpathStartPoint = p1;
        break;
      }

      case "closePath": {
        const close: CloseCommand = { type: "close" };
        commands.push(close);
        currentPoint = subpathStartPoint;
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
export function convertToPresetRect(_pdfPath: PdfPath, _context: ConversionContext): PresetGeometry {
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

  if (ops.length !== 6) return false;
  if (ops[0]?.type !== "moveTo") return false;
  if (ops[5]?.type !== "closePath") return false;

  for (let i = 1; i <= 4; i++) {
    if (ops[i]?.type !== "curveTo") return false;
  }

  return true;
}

/**
 * 楕円パスをPresetGeometry（ellipse）に変換
 */
export function convertToPresetEllipse(_pdfPath: PdfPath, _context: ConversionContext): PresetGeometry {
  return {
    type: "preset",
    preset: "ellipse",
    adjustValues: [],
  };
}

