/** @file Viewport culling and lightweight LOD decisions for the WebGL renderer. */
/* eslint-disable jsdoc/require-jsdoc -- Exported functions form the WebGL visibility contract and are covered by colocated specs. */

import type { AffineMatrix, PathContour } from "../scene-graph/types";
import type { RenderNode } from "../scene-graph/render-tree";
import { svgPathDToContours } from "./path-contours";
import { flattenPathCommands } from "./tessellation";

export type Bounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

export type ViewportCullOptions = {
  readonly paddingPx?: number;
  readonly minPixelArea?: number;
};

export type ViewportRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const DEFAULT_PADDING_PX = 256;
const DEFAULT_MIN_PIXEL_AREA = 0.16;

type IndividualStrokeWeights = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
};

export function shouldRenderVisualNode({
  node,
  transform,
  viewport,
  options,
}: {
  readonly node: RenderNode;
  readonly transform: AffineMatrix;
  readonly viewport: ViewportRect;
  readonly options?: ViewportCullOptions;
}): boolean {
  const bounds = getRenderNodeLocalBounds(node);
  if (!bounds) {
    return true;
  }
  const expanded = expandBounds(bounds, computeVisualPadding(node));
  const screenBounds = transformBounds(expanded, transform);
  if (!boundsIntersect(screenBounds, expandViewport(viewport, options?.paddingPx ?? DEFAULT_PADDING_PX))) {
    return false;
  }
  return boundsArea(screenBounds) >= (options?.minPixelArea ?? DEFAULT_MIN_PIXEL_AREA);
}

export function getRenderNodeLocalBounds(node: RenderNode): Bounds | null {
  switch (node.type) {
    case "group":
      return null;
    case "frame":
      return rectBounds({ x: 0, y: 0, width: node.width, height: node.height });
    case "rect":
      return rectBounds({ x: 0, y: 0, width: node.width, height: node.height });
    case "ellipse":
      return rectBounds({ x: node.cx - node.rx, y: node.cy - node.ry, width: node.rx * 2, height: node.ry * 2 });
    case "path":
      return pathBounds(node.paths.flatMap((path) => svgPathDToContours({
        d: path.d,
        windingRule: path.fillRule ?? "nonzero",
      })));
    case "text":
      return rectBounds({ x: 0, y: 0, width: node.width, height: node.height });
    case "image":
      return rectBounds({ x: 0, y: 0, width: node.width, height: node.height });
  }
}

export function transformBounds(bounds: Bounds, transform: AffineMatrix): Bounds {
  const points = [
    transformPoint({ x: bounds.minX, y: bounds.minY }, transform),
    transformPoint({ x: bounds.maxX, y: bounds.minY }, transform),
    transformPoint({ x: bounds.maxX, y: bounds.maxY }, transform),
    transformPoint({ x: bounds.minX, y: bounds.maxY }, transform),
  ];
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
}

function pathBounds(contours: readonly PathContour[]): Bounds {
  const coordinates = contours.flatMap((contour) => flattenPathCommands(contour.commands));
  if (coordinates.length < 2) {
    return rectBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
  const xs = coordinates.filter((_value, index) => index % 2 === 0);
  const ys = coordinates.filter((_value, index) => index % 2 === 1);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function rectBounds({
  x,
  y,
  width,
  height,
}: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): Bounds {
  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

function expandViewport(viewport: ViewportRect, padding: number): Bounds {
  return {
    minX: viewport.x - padding,
    minY: viewport.y - padding,
    maxX: viewport.x + viewport.width + padding,
    maxY: viewport.y + viewport.height + padding,
  };
}

function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

function computeVisualPadding(node: RenderNode): number {
  const effectPaddings = node.source.effects.map((effect) => {
    switch (effect.type) {
      case "drop-shadow":
      case "inner-shadow":
        return Math.abs(effect.offset.x) + Math.abs(effect.offset.y) + effect.radius * 2 + Math.abs(effect.spread ?? 0);
      case "layer-blur":
      case "background-blur":
        return effect.radius * 2;
    }
  });
  return Math.max(getStrokePadding(node), ...effectPaddings);
}

function getStrokePadding(node: RenderNode): number {
  switch (node.type) {
    case "group":
    case "image":
    case "text":
      return 0;
    case "frame":
      return Math.max(node.sourceStroke?.width ?? 0, maxIndividualStrokeWeight(node.source.individualStrokeWeights)) / 2;
    case "rect":
    case "ellipse":
    case "path":
      return (node.sourceStroke?.width ?? 0) / 2;
  }
}

function maxIndividualStrokeWeight(weights: IndividualStrokeWeights | undefined): number {
  if (!weights) {
    return 0;
  }
  return Math.max(weights.top, weights.right, weights.bottom, weights.left);
}

function transformPoint(
  point: { readonly x: number; readonly y: number },
  transform: AffineMatrix,
): { readonly x: number; readonly y: number } {
  return {
    x: transform.m00 * point.x + transform.m01 * point.y + transform.m02,
    y: transform.m10 * point.x + transform.m11 * point.y + transform.m12,
  };
}

function boundsArea(bounds: Bounds): number {
  return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY);
}
