/** @file Convert editable nodes to explicit VECTOR paths. */

import type { FigDesignDocument, FigDesignNode } from "@aurochs/fig/domain";
import type { FigVectorPath } from "@aurochs/fig/types";
import { resolveTextRendering } from "@aurochs-renderer/fig/text";
import type { PathContour } from "@aurochs-renderer/fig/text";

const KAPPA = 0.5522847498307936;

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function path(data: string, windingRule: FigVectorPath["windingRule"] = "NONZERO"): FigVectorPath {
  return { windingRule, data };
}

function rectPath(width: number, height: number): FigVectorPath {
  return path(`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`);
}

function roundedRectPath(width: number, height: number, radius: number): FigVectorPath {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    return rectPath(width, height);
  }
  const c = round(r * KAPPA);
  return path([
    `M ${r} 0`,
    `L ${width - r} 0`,
    `C ${width - r + c} 0 ${width} ${r - c} ${width} ${r}`,
    `L ${width} ${height - r}`,
    `C ${width} ${height - r + c} ${width - r + c} ${height} ${width - r} ${height}`,
    `L ${r} ${height}`,
    `C ${r - c} ${height} 0 ${height - r + c} 0 ${height - r}`,
    `L 0 ${r}`,
    `C 0 ${r - c} ${r - c} 0 ${r} 0`,
    "Z",
  ].join(" "));
}

function ellipsePath(width: number, height: number): FigVectorPath {
  const rx = width / 2;
  const ry = height / 2;
  const cx = rx;
  const cy = ry;
  const ox = round(rx * KAPPA);
  const oy = round(ry * KAPPA);
  return path([
    `M ${cx} 0`,
    `C ${cx + ox} 0 ${width} ${cy - oy} ${width} ${cy}`,
    `C ${width} ${cy + oy} ${cx + ox} ${height} ${cx} ${height}`,
    `C ${cx - ox} ${height} 0 ${cy + oy} 0 ${cy}`,
    `C 0 ${cy - oy} ${cx - ox} 0 ${cx} 0`,
    "Z",
  ].join(" "));
}

function linePath(width: number, height: number): FigVectorPath {
  return path(`M 0 0 L ${width} ${height}`);
}

function regularPoints(width: number, height: number, pointCount: number, innerScale?: number): readonly { readonly x: number; readonly y: number }[] {
  const count = Math.max(3, Math.floor(pointCount));
  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.min(width, height) / 2;
  const inner = outer * (innerScale ?? 1);
  const steps = innerScale === undefined ? count : count * 2;
  return Array.from({ length: steps }, (_, index) => {
    const radius = innerScale === undefined || index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index / steps) * Math.PI * 2;
    return { x: round(cx + Math.cos(angle) * radius), y: round(cy + Math.sin(angle) * radius) };
  });
}

function pointsPath(points: readonly { readonly x: number; readonly y: number }[]): FigVectorPath {
  const [first, ...rest] = points;
  if (!first) {
    return path("");
  }
  return path([`M ${first.x} ${first.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`), "Z"].join(" "));
}

function contourToPathData(contour: PathContour): string {
  return contour.commands.map((cmd) => {
    switch (cmd.type) {
      case "M":
        return `M ${cmd.x ?? 0} ${cmd.y ?? 0}`;
      case "L":
        return `L ${cmd.x ?? 0} ${cmd.y ?? 0}`;
      case "Q":
        return `Q ${cmd.x1 ?? 0} ${cmd.y1 ?? 0} ${cmd.x ?? 0} ${cmd.y ?? 0}`;
      case "C":
        return `C ${cmd.x1 ?? 0} ${cmd.y1 ?? 0} ${cmd.x2 ?? 0} ${cmd.y2 ?? 0} ${cmd.x ?? 0} ${cmd.y ?? 0}`;
      case "Z":
        return "Z";
    }
  }).join(" ");
}

function outlineVectorPaths(node: FigDesignNode, doc: FigDesignDocument): readonly FigVectorPath[] | undefined {
  switch (node.type) {
    case "VECTOR":
      return node.vectorPaths && node.vectorPaths.length > 0 ? node.vectorPaths : undefined;
    case "RECTANGLE":
      return [rectPath(node.size.x, node.size.y)];
    case "ROUNDED_RECTANGLE":
      return [roundedRectPath(node.size.x, node.size.y, node.cornerRadius ?? 0)];
    case "ELLIPSE":
      return [ellipsePath(node.size.x, node.size.y)];
    case "LINE":
      return [linePath(node.size.x, node.size.y)];
    case "REGULAR_POLYGON":
      return [pointsPath(regularPoints(node.size.x, node.size.y, node.pointCount ?? 3))];
    case "STAR":
      return [pointsPath(regularPoints(node.size.x, node.size.y, node.pointCount ?? 5, node.starInnerScale ?? node.starInnerRadius ?? 0.382))];
    case "TEXT": {
      const rendering = resolveTextRendering(node, { blobs: doc.blobs });
      if (rendering.kind !== "glyphs") {
        return undefined;
      }
      const contours = [...rendering.glyphContours, ...rendering.decorationContours];
      const data = contours.map(contourToPathData).filter((d) => d.length > 0).join(" ");
      return data.length > 0 ? [path(data)] : undefined;
    }
    default:
      return undefined;
  }
}

export function outlineNode(node: FigDesignNode, doc: FigDesignDocument): FigDesignNode | undefined {
  const vectorPaths = outlineVectorPaths(node, doc);
  if (!vectorPaths || vectorPaths.length === 0) {
    return undefined;
  }
  return {
    ...node,
    type: "VECTOR",
    name: node.type === "VECTOR" ? node.name : `${node.name} Outline`,
    vectorPaths,
    textData: undefined,
    derivedTextData: undefined,
    arcData: undefined,
    cornerRadius: undefined,
    rectangleCornerRadii: undefined,
    pointCount: undefined,
    starInnerRadius: undefined,
    starInnerScale: undefined,
    children: undefined,
  };
}
