/**
 * @file PDF Path Operators
 *
 * Serializes PdfPath to PDF content stream operators.
 * @see ISO 32000-1:2008 Section 8.5 (Path Construction and Painting)
 */

import type { PdfPath, PdfPathOp, PdfPaintOp } from "../../domain/path";

/**
 * Format a number for PDF content stream.
 * Uses minimal precision to reduce file size.
 */
function formatNum(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  // Up to 4 decimal places, strip trailing zeros
  const fixed = value.toFixed(4);
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Serialize a single path operation to PDF operator string.
 * @see ISO 32000-1:2008 Table 59
 */
export function serializePathOp(op: PdfPathOp): string {
  switch (op.type) {
    case "moveTo":
      return `${formatNum(op.point.x)} ${formatNum(op.point.y)} m`;

    case "lineTo":
      return `${formatNum(op.point.x)} ${formatNum(op.point.y)} l`;

    case "curveTo":
      return `${formatNum(op.cp1.x)} ${formatNum(op.cp1.y)} ${formatNum(op.cp2.x)} ${formatNum(op.cp2.y)} ${formatNum(op.end.x)} ${formatNum(op.end.y)} c`;

    case "curveToV":
      return `${formatNum(op.cp2.x)} ${formatNum(op.cp2.y)} ${formatNum(op.end.x)} ${formatNum(op.end.y)} v`;

    case "curveToY":
      return `${formatNum(op.cp1.x)} ${formatNum(op.cp1.y)} ${formatNum(op.end.x)} ${formatNum(op.end.y)} y`;

    case "rect":
      return `${formatNum(op.x)} ${formatNum(op.y)} ${formatNum(op.width)} ${formatNum(op.height)} re`;

    case "closePath":
      return "h";

    default: {
      const _exhaustive: never = op;
      throw new Error(`Unknown path operation type: ${(_exhaustive as PdfPathOp).type}`);
    }
  }
}

/**
 * Serialize paint operation to PDF operator.
 * @param paintOp - The paint operation
 * @param windingRule - Optional winding rule for fill operations
 * @see ISO 32000-1:2008 Table 60
 */
export function serializePaintOp(
  paintOp: PdfPaintOp,
  windingRule: "nonzero" | "evenodd" = "nonzero"
): string {
  switch (paintOp) {
    case "stroke":
      return "S";

    case "fill":
      return windingRule === "evenodd" ? "f*" : "f";

    case "fillStroke":
      return windingRule === "evenodd" ? "B*" : "B";

    case "clip":
      // Clipping requires fill rule and then n (no-op paint)
      return windingRule === "evenodd" ? "W* n" : "W n";

    case "none":
      return "n";

    default: {
      const _exhaustive: never = paintOp;
      throw new Error(`Unknown paint operation: ${_exhaustive}`);
    }
  }
}

/**
 * Serialize a complete PdfPath to PDF content stream operators.
 *
 * Note: This only serializes the path construction and painting operators.
 * Graphics state (colors, line width, etc.) must be set separately.
 *
 * @returns PDF operators as string (newline-separated)
 */
export function serializePath(path: PdfPath): string {
  const lines: string[] = [];

  // Path construction operators
  for (const op of path.operations) {
    lines.push(serializePathOp(op));
  }

  // Paint operator
  lines.push(serializePaintOp(path.paintOp));

  return lines.join("\n");
}

/**
 * Serialize path operations without paint operation.
 * Useful when building composite paths or for clipping.
 */
export function serializePathOperations(operations: readonly PdfPathOp[]): string {
  return operations.map(serializePathOp).join("\n");
}
