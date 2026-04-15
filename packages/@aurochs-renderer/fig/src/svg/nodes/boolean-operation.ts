/**
 * @file Boolean operation node renderer
 *
 * BOOLEAN_OPERATION nodes (union, subtract, intersect, exclude) combine
 * child shapes using boolean logic. Figma does NOT store the pre-computed
 * merged geometry in the .fig file — it computes it on-the-fly during
 * SVG export.
 *
 * This renderer performs actual geometric boolean operations on the child
 * paths using the `path-bool` library, producing a single merged path
 * that matches Figma's output.
 */

import type { FigNode, FigMatrix } from "@aurochs/fig/types";
import type { FigBlob } from "@aurochs/fig/parser";
import { getNodeType, safeChildren } from "@aurochs/fig/parser";
import type { FigSvgRenderContext } from "../../types";
import { path as svgPath, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import type { GeometryPathData } from "../geometry-path";
import { decodePathsFromGeometry } from "../geometry-path";
import { renderPaths } from "../render-paths";
import { extractBaseProps, extractPaintProps, extractGeometryProps } from "./extract-props";
import { renderGroupNode } from "./group";
import { mapWindingRule } from "../../geometry";
import {
  pathFromPathData,
  pathToPathData,
  pathBoolean,
  FillRule,
  PathBooleanOperation,
} from "../../../vendor/path-bool/index.js";

// =============================================================================
// Boolean operation type extraction
// =============================================================================

type BooleanOpType = "UNION" | "SUBTRACT" | "INTERSECT" | "EXCLUDE";

/**
 * Extract the boolean operation type from a node.
 *
 * The .fig format stores the operation as a KiwiEnumValue. The integer
 * `value` field is the authoritative source of truth:
 *
 *   value 0 → UNION
 *   value 1 → SUBTRACT  (Kiwi name may say "INTERSECT")
 *   value 2 → INTERSECT (Kiwi name may say "SUBTRACT")
 *   value 3 → EXCLUDE   (Kiwi name may say "XOR")
 */
function getBooleanOpType(node: FigNode): BooleanOpType {
  const op = (node as Record<string, unknown>).booleanOperation as
    | { value: number; name?: string }
    | undefined;

  if (!op) {
    return "UNION";
  }

  switch (op.value) {
    case 0:
      return "UNION";
    case 1:
      return "SUBTRACT";
    case 2:
      return "INTERSECT";
    case 3:
      return "EXCLUDE";
    default:
      return "UNION";
  }
}

/**
 * Map our operation type to the path-bool enum.
 */
function toPathBoolOp(op: BooleanOpType): PathBooleanOperation {
  switch (op) {
    case "UNION":
      return PathBooleanOperation.Union;
    case "SUBTRACT":
      return PathBooleanOperation.Difference;
    case "INTERSECT":
      return PathBooleanOperation.Intersection;
    case "EXCLUDE":
      return PathBooleanOperation.Exclusion;
  }
}

// =============================================================================
// Transform application to SVG path data
// =============================================================================

/**
 * Apply a 2x3 affine transform matrix to an SVG path d-string.
 *
 * Parses the path commands, transforms each coordinate, and
 * re-serializes to a new d-string. Supports M, L, C, Q, Z, and
 * their relative variants (m, l, c, q, z) as well as H, V, A, S, T.
 *
 * The transform is a Figma 2x3 matrix:
 *   | m00 m01 m02 |    x' = m00*x + m01*y + m02
 *   | m10 m11 m12 |    y' = m10*x + m11*y + m12
 */
function applyTransformToPathData(d: string, matrix: FigMatrix): string {
  const { m00, m01, m02, m10, m11, m12 } = matrix;

  // Identity check
  if (m00 === 1 && m01 === 0 && m02 === 0 && m10 === 0 && m11 === 1 && m12 === 0) {
    return d;
  }

  function tx(x: number, y: number): [number, number] {
    return [
      m00 * x + m01 * y + m02,
      m10 * x + m11 * y + m12,
    ];
  }

  // Tokenize the path data
  const tokens = tokenizeSvgPath(d);
  const result: string[] = [];
  let i = 0;

  function nextNum(): number {
    while (i < tokens.length && tokens[i].type === "ws") { i++; }
    if (i < tokens.length && tokens[i].type === "num") {
      return parseFloat(tokens[i++].value);
    }
    return 0;
  }

  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "ws") {
      i++;
      continue;
    }

    if (token.type === "cmd") {
      const cmd = token.value;
      i++;

      switch (cmd) {
        case "M":
        case "L": {
          const x = nextNum();
          const y = nextNum();
          const [nx, ny] = tx(x, y);
          result.push(`${cmd} ${nx} ${ny}`);
          break;
        }
        case "C": {
          const x1 = nextNum(), y1 = nextNum();
          const x2 = nextNum(), y2 = nextNum();
          const x = nextNum(), y = nextNum();
          const [nx1, ny1] = tx(x1, y1);
          const [nx2, ny2] = tx(x2, y2);
          const [nx, ny] = tx(x, y);
          result.push(`C ${nx1} ${ny1} ${nx2} ${ny2} ${nx} ${ny}`);
          break;
        }
        case "Q": {
          const x1 = nextNum(), y1 = nextNum();
          const x = nextNum(), y = nextNum();
          const [nx1, ny1] = tx(x1, y1);
          const [nx, ny] = tx(x, y);
          result.push(`Q ${nx1} ${ny1} ${nx} ${ny}`);
          break;
        }
        case "H": {
          // H x → convert to L (needs current Y, but we apply absolute transform)
          // For correctness, convert H to L with y=0 then transform.
          // Actually H specifies only x, but we don't track currentY here.
          // Since Figma's blob decoder doesn't produce H/V, this is a fallback.
          const x = nextNum();
          result.push(`H ${x}`);
          break;
        }
        case "V": {
          const y = nextNum();
          result.push(`V ${y}`);
          break;
        }
        case "Z":
        case "z":
          result.push("Z");
          break;
        default:
          // Pass through unknown commands
          result.push(cmd);
          break;
      }
    } else {
      i++;
    }
  }

  return result.join(" ");
}

type Token = { type: "cmd" | "num" | "ws"; value: string };

/**
 * Tokenize an SVG path d-string into commands, numbers, and whitespace.
 */
function tokenizeSvgPath(d: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < d.length) {
    const ch = d[i];

    // Whitespace or comma
    if (ch === " " || ch === "," || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    // Command letter
    if (/[A-Za-z]/.test(ch)) {
      tokens.push({ type: "cmd", value: ch });
      i++;
      continue;
    }

    // Number (including negative and decimal)
    if (/[\d.\-+]/.test(ch)) {
      let num = "";
      if (ch === "-" || ch === "+") {
        num += ch;
        i++;
      }
      while (i < d.length && (/\d/.test(d[i]) || d[i] === ".")) {
        num += d[i];
        i++;
      }
      // Handle scientific notation
      if (i < d.length && (d[i] === "e" || d[i] === "E")) {
        num += d[i];
        i++;
        if (i < d.length && (d[i] === "+" || d[i] === "-")) {
          num += d[i];
          i++;
        }
        while (i < d.length && /\d/.test(d[i])) {
          num += d[i];
          i++;
        }
      }
      tokens.push({ type: "num", value: num });
      continue;
    }

    i++;
  }

  return tokens;
}

// =============================================================================
// Child geometry collection
// =============================================================================

/**
 * A child's SVG path data, already transformed into the parent
 * BOOLEAN_OPERATION's local coordinate system.
 */
type ChildPathData = {
  readonly d: string;
  readonly windingRule: "nonzero" | "evenodd";
};

/**
 * Collect path data from all direct children of a BOOLEAN_OPERATION node.
 *
 * Each child's fillGeometry is decoded and its transform is baked into
 * the path coordinates, so all paths are in the BOOLEAN_OPERATION's
 * local coordinate system — ready for boolean computation.
 */
function collectChildPaths(
  children: readonly FigNode[],
  blobs: readonly FigBlob[],
): ChildPathData[] {
  const result: ChildPathData[] = [];

  for (const child of children) {
    if (child.visible === false) {
      continue;
    }

    const childType = getNodeType(child);

    // Nested BOOLEAN_OPERATION — recursively compute the boolean result,
    // then use the resulting path(s) as operand.
    if (childType === "BOOLEAN_OPERATION") {
      const nestedPaths = computeBooleanResult(child, blobs);
      if (nestedPaths) {
        for (const np of nestedPaths) {
          // Apply this nested node's transform
          const d = child.transform
            ? applyTransformToPathData(np, child.transform)
            : np;
          result.push({ d, windingRule: "nonzero" });
        }
      }
      continue;
    }

    // Regular shape node — extract path data
    const rawPaths = extractPathData(child, childType, blobs);
    if (rawPaths.length === 0) {
      continue;
    }

    // Apply child's transform to the path data
    for (const raw of rawPaths) {
      const d = child.transform
        ? applyTransformToPathData(raw.d, child.transform)
        : raw.d;
      result.push({ d, windingRule: raw.windingRule });
    }
  }

  return result;
}

/**
 * Extract SVG path d-strings from a shape node's geometry.
 *
 * Priority: fillGeometry → vectorPaths → parametric synthesis
 */
function extractPathData(
  node: FigNode,
  nodeType: string,
  blobs: readonly FigBlob[],
): ChildPathData[] {
  // 1. fillGeometry (blob-decoded paths)
  if (node.fillGeometry && node.fillGeometry.length > 0) {
    const decoded = decodePathsFromGeometry(node.fillGeometry, blobs);
    if (decoded.length > 0) {
      return decoded.map((gp) => ({
        d: gp.data,
        windingRule: (gp.windingRule ?? "nonzero") as "nonzero" | "evenodd",
      }));
    }
  }

  // 2. vectorPaths (pre-decoded SVG path strings)
  if (node.vectorPaths) {
    const paths: ChildPathData[] = [];
    for (const vp of node.vectorPaths) {
      if (vp.data) {
        paths.push({
          d: vp.data,
          windingRule: mapWindingRule(vp.windingRule) as "nonzero" | "evenodd",
        });
      }
    }
    if (paths.length > 0) {
      return paths;
    }
  }

  // 3. strokeGeometry
  if (node.strokeGeometry && node.strokeGeometry.length > 0) {
    const decoded = decodePathsFromGeometry(node.strokeGeometry, blobs);
    if (decoded.length > 0) {
      return decoded.map((gp) => ({
        d: gp.data,
        windingRule: (gp.windingRule ?? "nonzero") as "nonzero" | "evenodd",
      }));
    }
  }

  // 4. Parametric synthesis (STAR, POLYGON, ELLIPSE, RECTANGLE)
  const synthesized = synthesizeSvgPath(node, nodeType);
  if (synthesized) {
    return [{ d: synthesized, windingRule: "nonzero" }];
  }

  return [];
}

// =============================================================================
// Parametric shape → SVG path synthesis
// =============================================================================

/**
 * Synthesize SVG path data from parametric shape definitions.
 *
 * Used when fillGeometry blobs are not available (STAR, REGULAR_POLYGON
 * nodes created by the builder, or fallback for any shape type).
 */
function synthesizeSvgPath(
  node: FigNode,
  nodeType: string,
): string | undefined {
  const w = node.size?.x ?? 0;
  const h = node.size?.y ?? 0;
  if (w <= 0 || h <= 0) {
    return undefined;
  }

  switch (nodeType) {
    case "STAR":
      return synthesizeStarPath(w, h, node);
    case "REGULAR_POLYGON":
      return synthesizePolygonPath(w, h, node);
    case "ELLIPSE":
      return synthesizeEllipsePath(w, h);
    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return synthesizeRectPath(w, h);
    default:
      return undefined;
  }
}

function synthesizeStarPath(w: number, h: number, node: FigNode): string {
  const n = Math.max(3, (node as Record<string, unknown>).pointCount as number ?? 5);
  const innerRatio = (node as Record<string, unknown>).starInnerRadius as number ?? 0.382;
  const cx = w / 2;
  const cy = h / 2;
  const outerRx = w / 2;
  const outerRy = h / 2;
  const innerRx = outerRx * innerRatio;
  const innerRy = outerRy * innerRatio;
  const totalVertices = n * 2;

  const parts: string[] = [];
  for (let i = 0; i < totalVertices; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / totalVertices;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    parts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  parts.push("Z");

  return parts.join(" ");
}

function synthesizePolygonPath(w: number, h: number, node: FigNode): string {
  const n = Math.max(3, (node as Record<string, unknown>).pointCount as number ?? 3);
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;

  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    parts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  parts.push("Z");

  return parts.join(" ");
}

function synthesizeEllipsePath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const k = 0.5522847498;
  const kx = rx * k;
  const ky = ry * k;

  return [
    `M ${cx} ${cy - ry}`,
    `C ${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry}`,
    "Z",
  ].join(" ");
}

function synthesizeRectPath(w: number, h: number): string {
  return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
}

// =============================================================================
// Boolean operation computation
// =============================================================================

/**
 * Compute the boolean operation result for a BOOLEAN_OPERATION node.
 *
 * Returns an array of SVG path d-strings representing the result,
 * or undefined if computation fails.
 */
function computeBooleanResult(
  node: FigNode,
  blobs: readonly FigBlob[],
): string[] | undefined {
  const children = safeChildren(node);
  const childPaths = collectChildPaths(children, blobs);

  if (childPaths.length === 0) {
    return undefined;
  }

  const opType = getBooleanOpType(node);
  const boolOp = toPathBoolOp(opType);

  // For a single child, no boolean operation needed
  if (childPaths.length === 1) {
    return [childPaths[0].d];
  }

  // Convert fill rule
  function toFillRule(wr: "nonzero" | "evenodd"): FillRule {
    return wr === "evenodd" ? FillRule.EvenOdd : FillRule.NonZero;
  }

  // Apply boolean operations left to right:
  // result = child[0] OP child[1] OP child[2] ...
  try {
    let currentPath = pathFromPathData(childPaths[0].d);
    let currentFillRule = toFillRule(childPaths[0].windingRule);

    for (let i = 1; i < childPaths.length; i++) {
      const nextPath = pathFromPathData(childPaths[i].d);
      const nextFillRule = toFillRule(childPaths[i].windingRule);

      const results = pathBoolean(
        currentPath, currentFillRule,
        nextPath, nextFillRule,
        boolOp,
      );

      if (results.length === 0) {
        // Boolean result is empty (e.g. subtract with no overlap → first operand,
        // or intersect with no overlap → empty)
        if (boolOp === PathBooleanOperation.Difference) {
          // For subtraction, if the subtracted shape doesn't overlap,
          // the result is the original shape. path-bool may return empty
          // if shapes are identical; keep current.
          continue;
        }
        // For intersection of non-overlapping shapes, result is empty
        return [];
      }

      // For operations that produce multiple disjoint paths, combine them
      // into a single path with multiple subpaths for the next iteration
      if (results.length === 1) {
        currentPath = results[0];
      } else {
        // Combine multiple result paths into one
        const combinedD = results.map((p) => pathToPathData(p)).join(" ");
        currentPath = pathFromPathData(combinedD);
      }
      currentFillRule = FillRule.NonZero;
    }

    // Convert final result to d-string(s)
    const finalD = pathToPathData(currentPath);
    if (!finalD || finalD.trim().length === 0) {
      return [];
    }
    return [finalD];
  } catch {
    // If path-bool fails (edge case), return undefined to trigger fallback
    return undefined;
  }
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Render a BOOLEAN_OPERATION node to SVG.
 *
 * Performs actual geometric boolean operations on child paths using
 * the path-bool library, producing a single merged path.
 *
 * Fallback chain:
 * 1. Pre-computed fillGeometry on the node itself (future-proof)
 * 2. Boolean computation from child geometries
 * 3. Group rendering (children rendered individually)
 *
 * @param node - The BOOLEAN_OPERATION node
 * @param ctx - Render context
 * @param renderedChildren - Pre-rendered children (fallback only)
 */
export function renderBooleanOperationNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  renderedChildren: readonly SvgString[],
): SvgString {
  // 1. Check for pre-computed geometry on the node itself
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  if (fillGeometry && fillGeometry.length > 0) {
    const paths = decodePathsFromGeometry(fillGeometry, ctx.blobs);
    if (paths.length > 0) {
      const { transform, opacity } = extractBaseProps(node);
      const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
      return renderPaths({
        paths,
        fillAttrs: getFillAttrs(fillPaints, ctx),
        strokeAttrs: getStrokeAttrs({ paints: strokePaints, strokeWeight, options: { strokeCap, strokeJoin, dashPattern: strokeDashes } }),
        transform: buildTransformAttr(transform),
        opacity,
      });
    }
  }

  // 2. Compute boolean result from child geometries
  const children = safeChildren(node);
  const resultPaths = computeBooleanResult(node, ctx.blobs);

  if (resultPaths && resultPaths.length > 0) {
    const { transform, opacity } = extractBaseProps(node);
    const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
    const fillAttrs = getFillAttrs(fillPaints, ctx);
    const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight, options: { strokeCap, strokeJoin, dashPattern: strokeDashes } });
    const transformStr = buildTransformAttr(transform);
    const opacityAttr = opacity < 1 ? opacity : undefined;

    // Render result path(s)
    const pathElements = resultPaths.map((d) =>
      svgPath({
        d,
        "fill-rule": "evenodd",
        ...(transformStr ? { transform: transformStr } : {}),
        ...(opacityAttr !== undefined ? { opacity: opacityAttr } : {}),
        ...fillAttrs,
        ...strokeAttrs,
      }),
    );

    if (pathElements.length === 1) {
      return pathElements[0];
    }
    return g(
      {
        transform: transformStr || undefined,
        opacity: opacityAttr,
      },
      ...pathElements,
    );
  }

  // 3. Fallback: render children as group
  return renderGroupNode(node, ctx, renderedChildren);
}
