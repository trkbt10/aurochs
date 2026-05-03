/** @file Vector path editor model consumed by canvas interaction code. */
/* eslint-disable jsdoc/require-jsdoc -- Exported operation names are the vector-path domain contract and are covered by colocated specs. */

import type { FigDesignBlob, FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix, FigVectorPath } from "@aurochs/fig/types";
import { findNodeById } from "@aurochs-builder/fig/node-ops";
import {
  contourToSvgD,
  decodeGeometryToContours,
  generateEllipseContour,
  generateLineContour,
  generatePolygonContour,
  generateRectContour,
  generateStarContour,
} from "@aurochs-renderer/fig/scene-graph";
import { computeAbsoluteTransform, findDeepestBoundsAtPoint } from "../canvas/interaction/bounds";
import {
  applyEditableVectorPathOperation,
  getEditableCommandEndpoint,
  getEditableCommandPoints,
  getEditableControlLines,
  parseEditablePathData,
  serializeEditablePathData,
  type EditablePathCommand,
  type EditableVectorPathOperation,
} from "./commands";
import type { VectorPathDraft } from "./draft";

export type VectorPathHandle = {
  readonly key: string;
  readonly pathIndex: number;
  readonly commandIndex: number;
  readonly valueIndex: number;
  readonly role: "anchor" | "control";
  readonly x: number;
  readonly y: number;
};

export type VectorPathDragState = {
  readonly nodeId: FigNodeId;
  readonly pathIndex: number;
  readonly commandIndex: number;
  readonly valueIndex: number;
  readonly editableVectorPaths?: EditableVectorPathSource;
};

export type EditableVectorPathSource = readonly FigVectorPath[];

export type VectorPathControlLine = {
  readonly key: string;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
};

export type EditableVectorPathOverlay = {
  readonly key: string;
  readonly pathIndex: number;
  readonly data: string;
  readonly transform: string;
};

type ItemBounds = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};






export function resolveEditableVectorPaths(
  node: FigDesignNode | undefined,
  blobs: readonly FigDesignBlob[] = [],
): readonly FigVectorPath[] | undefined {
  if (!node) {
    return undefined;
  }
  if (isExplicitEditableVectorPathNode(node) && node.vectorPaths && node.vectorPaths.length > 0) {
    return node.vectorPaths;
  }
  if (isExplicitEditableVectorPathNode(node)) {
    const geometryPaths = decodeEditableGeometryVectorPaths(node, blobs);
    if (geometryPaths.length > 0) {
      return geometryPaths;
    }
  }
  return synthesizeEditableVectorPaths(node);
}






export function collectVectorPathHandles(
  node: FigDesignNode | undefined,
  activePage: { readonly children: readonly FigDesignNode[] } | null | undefined,
  editableVectorPaths?: EditableVectorPathSource,
): readonly VectorPathHandle[] {
  const vectorPaths = editableVectorPaths ?? resolveEditableVectorPaths(node);
  if (!node || !activePage || !vectorPaths) {
    return [];
  }
  const transform = computeAbsoluteTransform(activePage.children, node.id);
  if (!transform) {
    return [];
  }
  return vectorPaths.flatMap((path, pathIndex) => {
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return [];
    }
    return commands.flatMap((command, commandIndex) => getEditableCommandPoints(command)
      .filter((point) => !isClosingAnchorPoint(commands, commandIndex, point))
      .map((point) => ({
        key: `${pathIndex}:${commandIndex}:${point.valueIndex}`,
        pathIndex,
        commandIndex,
        valueIndex: point.valueIndex,
        role: point.role,
        ...transformPoint(transform, point),
      })));
  });
}






export function collectVectorPathControlLines(
  node: FigDesignNode | undefined,
  activePage: { readonly children: readonly FigDesignNode[] } | null | undefined,
  editableVectorPaths?: EditableVectorPathSource,
): readonly VectorPathControlLine[] {
  const vectorPaths = editableVectorPaths ?? resolveEditableVectorPaths(node);
  if (!node || !activePage || !vectorPaths) {
    return [];
  }
  const transform = computeAbsoluteTransform(activePage.children, node.id);
  if (!transform) {
    return [];
  }
  return vectorPaths.flatMap((path, pathIndex) => {
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return [];
    }
    return getEditableControlLines(commands).map((line) => ({
      key: `${pathIndex}:${line.key}`,
      from: transformPoint(transform, line.from),
      to: transformPoint(transform, line.to),
    }));
  });
}






export function collectEditableVectorPathOverlays(
  node: FigDesignNode | undefined,
  activePage: { readonly children: readonly FigDesignNode[] } | null | undefined,
  editableVectorPaths?: EditableVectorPathSource,
): readonly EditableVectorPathOverlay[] {
  const vectorPaths = editableVectorPaths ?? resolveEditableVectorPaths(node);
  if (!node || !activePage || !vectorPaths) {
    return [];
  }
  const transform = computeAbsoluteTransform(activePage.children, node.id);
  if (!transform) {
    return [];
  }
  return vectorPaths.map((path, pathIndex) => ({
    key: `${node.id}:${pathIndex}`,
    pathIndex,
    data: path.data ?? "",
    transform: matrixToSvgTransform(transform),
  }));
}






export function findNearestVectorHandle(
  handles: readonly VectorPathHandle[],
  point: { readonly x: number; readonly y: number },
): VectorPathHandle | undefined {
  return handles.reduce<VectorPathHandle | undefined>((best, handle) => {
    if (handle.role !== "anchor") {
      return best;
    }
    if (!best) {
      return handle;
    }
    const bestDistance = Math.hypot(best.x - point.x, best.y - point.y);
    const candidateDistance = Math.hypot(handle.x - point.x, handle.y - point.y);
    return candidateDistance < bestDistance ? handle : best;
  }, undefined);
}






export function resolveContextVectorHandle(
  contextMenu: { readonly pageX: number; readonly pageY: number; readonly vectorHandle?: VectorPathHandle } | null,
  handles: readonly VectorPathHandle[],
): VectorPathHandle | undefined {
  if (!contextMenu) {
    return undefined;
  }
  if (contextMenu.vectorHandle) {
    return contextMenu.vectorHandle;
  }
  return findNearestVectorHandle(handles, { x: contextMenu.pageX, y: contextMenu.pageY });
}






export function canEnterVectorPathEdit(node: FigDesignNode | undefined): boolean {
  if (!node) {
    return false;
  }
  if (isExplicitEditableVectorPathNode(node)) {
    return Boolean(
      (node.vectorPaths && node.vectorPaths.length > 0)
      || (node.fillGeometry && node.fillGeometry.length > 0)
      || (node.strokeGeometry && node.strokeGeometry.length > 0),
    );
  }
  return Boolean(synthesizeEditableVectorPaths(node));
}






export function resolvePathDrawingParent({
  activePage,
  itemBounds,
  point,
}: {
  readonly activePage: { readonly children: readonly FigDesignNode[] } | null | undefined;
  readonly itemBounds: readonly ItemBounds[];
  readonly point: { readonly x: number; readonly y: number };
}): { readonly parentId: FigNodeId | null; readonly parentTransform: FigMatrix | undefined } {
  if (!activePage) {
    return { parentId: null, parentTransform: undefined };
  }
  const parentBounds = findDeepestBoundsAtPoint(itemBounds, point, (bounds) => {
    return isContainerNode(findNodeById(activePage.children, bounds.id as FigNodeId));
  });
  if (!parentBounds) {
    return { parentId: null, parentTransform: undefined };
  }
  const parentId = parentBounds.id as FigNodeId;
  return {
    parentId,
    parentTransform: computeAbsoluteTransform(activePage.children, parentId),
  };
}






export function addVectorPathPoint({
  node,
  pathIndex,
  point,
  editableVectorPaths,
}: {
  readonly node: FigDesignNode;
  readonly pathIndex: number;
  readonly point: { readonly x: number; readonly y: number };
  readonly editableVectorPaths?: EditableVectorPathSource;
}): FigDesignNode {
  const editableNode = toExplicitEditableVectorNode(node, editableVectorPaths);
  const paths = editableNode.vectorPaths ?? [];
  const vectorPaths = paths.map((path, index) => {
    if (index !== pathIndex) {
      return path;
    }
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return path;
    }
    return { ...path, data: serializeEditablePathData(applyEditableVectorPathOperation(commands, {
      type: "insert-point-at-nearest-segment",
      point,
    })) };
  });
  return { ...editableNode, vectorPaths };
}






export function updateVectorPathCommands({
  node,
  pathIndex,
  operation,
  editableVectorPaths,
}: {
  readonly node: FigDesignNode;
  readonly pathIndex: number;
  readonly operation: EditableVectorPathOperation;
  readonly editableVectorPaths?: EditableVectorPathSource;
}): FigDesignNode {
  const editableNode = toExplicitEditableVectorNode(node, editableVectorPaths);
  const paths = editableNode.vectorPaths ?? [];
  const vectorPaths = paths.map((path, index) => {
    if (index !== pathIndex) {
      return path;
    }
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return path;
    }
    return { ...path, data: serializeEditablePathData(applyEditableVectorPathOperation(commands, operation)) };
  });
  return { ...editableNode, vectorPaths };
}






export function updateVectorPathEndpoint({
  node,
  pathIndex,
  commandIndex,
  valueIndex,
  point,
  editableVectorPaths,
}: {
  readonly node: FigDesignNode;
  readonly pathIndex: number;
  readonly commandIndex: number;
  readonly valueIndex: number;
  readonly point: { readonly x: number; readonly y: number };
  readonly editableVectorPaths?: EditableVectorPathSource;
}): FigDesignNode {
  const editableNode = toExplicitEditableVectorNode(node, editableVectorPaths);
  const paths = editableNode.vectorPaths ?? [];
  const vectorPaths = paths.map((path, index) => {
    if (index !== pathIndex) {
      return path;
    }
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return path;
    }
    const nextCommands = applyEditableVectorPathOperation(commands, {
      type: "move-command-point",
      commandIndex,
      valueIndex,
      point,
    });
    return { ...path, data: serializeEditablePathData(nextCommands) };
  });
  return { ...editableNode, vectorPaths };
}






export function pageToDrawingLocalPoint(
  draw: Pick<VectorPathDraft, "parentTransform">,
  point: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  if (!draw.parentTransform) {
    return point;
  }
  return worldToLocalPoint(draw.parentTransform, point);
}






export function getVectorHandleAriaLabel(handle: VectorPathHandle): string {
  const index = handle.commandIndex + 1;
  return handle.role === "control" ? `Vector path control handle ${index}` : `Vector path anchor handle ${index}`;
}

function isClosingAnchorPoint(
  commands: readonly EditablePathCommand[],
  commandIndex: number,
  point: { readonly x: number; readonly y: number; readonly role: "anchor" | "control" },
): boolean {
  if (point.role !== "anchor" || commands[commandIndex + 1]?.type !== "Z") {
    return false;
  }
  const start = getEditableCommandEndpoint(commands[0]!);
  return Boolean(start && Math.hypot(start.x - point.x, start.y - point.y) < 0.001);
}

function synthesizeEditableVectorPaths(node: FigDesignNode): readonly FigVectorPath[] | undefined {
  switch (node.type) {
    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return [toEditablePath(contourToSvgD(generateRectContour(node.size.x, node.size.y, resolveEditableCornerRadius(node))))];
    case "ELLIPSE":
      return [toEditablePath(contourToSvgD(generateEllipseContour(node.size.x, node.size.y)))];
    case "LINE":
      return [toEditablePath(contourToSvgD(generateLineContour(node.size.x)))];
    case "REGULAR_POLYGON":
      return [toEditablePath(contourToSvgD(generatePolygonContour(node.size.x, node.size.y, node.pointCount ?? 3)))];
    case "STAR":
      return [toEditablePath(contourToSvgD(generateStarContour({
        width: node.size.x,
        height: node.size.y,
        pointCount: node.pointCount ?? 5,
        innerRadiusRatio: node.starInnerScale ?? node.starInnerRadius ?? 0.382,
      })))];
    default:
      return undefined;
  }
}

function toEditablePath(data: string): FigVectorPath {
  return { windingRule: "NONZERO", data };
}

function decodeEditableGeometryVectorPaths(
  node: FigDesignNode,
  blobs: readonly FigDesignBlob[],
): readonly FigVectorPath[] {
  if (blobs.length === 0) {
    return [];
  }
  const fillContours = decodeGeometryToContours(node.fillGeometry, blobs);
  const contours = fillContours.length > 0 ? fillContours : decodeGeometryToContours(node.strokeGeometry, blobs);
  return contours.map((contour) => ({
    windingRule: contour.windingRule === "evenodd" ? "EVENODD" : "NONZERO",
    data: contourToSvgD(contour),
  }));
}

function resolveEditableCornerRadius(node: FigDesignNode): number | readonly [number, number, number, number] | undefined {
  const radii = node.rectangleCornerRadii;
  if (radii && radii.length === 4) {
    return [radii[0] ?? 0, radii[1] ?? 0, radii[2] ?? 0, radii[3] ?? 0];
  }
  return node.cornerRadius;
}

function isContainerNode(node: FigDesignNode | undefined): boolean {
  return node?.type === "FRAME" || node?.type === "COMPONENT" || node?.type === "COMPONENT_SET" || node?.type === "SYMBOL";
}

function isExplicitEditableVectorPathNode(node: FigDesignNode): boolean {
  return node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION";
}

function toExplicitEditableVectorNode(
  node: FigDesignNode,
  editableVectorPaths?: EditableVectorPathSource,
): FigDesignNode {
  if (isExplicitEditableVectorPathNode(node) && node.vectorPaths && node.vectorPaths.length > 0) {
    return node;
  }
  const vectorPaths = editableVectorPaths ?? resolveEditableVectorPaths(node);
  if (!vectorPaths) {
    return node;
  }
  return {
    ...node,
    type: "VECTOR",
    vectorPaths,
    fillGeometry: undefined,
    strokeGeometry: undefined,
    vectorData: undefined,
    cornerRadius: undefined,
    rectangleCornerRadii: undefined,
    pointCount: undefined,
    starInnerRadius: undefined,
    starInnerScale: undefined,
  };
}






export function worldToLocalPoint(
  transform: FigMatrix,
  point: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  const det = transform.m00 * transform.m11 - transform.m01 * transform.m10;
  if (Math.abs(det) < 0.000001) {
    return { x: point.x - transform.m02, y: point.y - transform.m12 };
  }
  const dx = point.x - transform.m02;
  const dy = point.y - transform.m12;
  return {
    x: (transform.m11 * dx - transform.m01 * dy) / det,
    y: (-transform.m10 * dx + transform.m00 * dy) / det,
  };
}

function transformPoint(
  transform: FigMatrix,
  point: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  return {
    x: transform.m00 * point.x + transform.m01 * point.y + transform.m02,
    y: transform.m10 * point.x + transform.m11 * point.y + transform.m12,
  };
}

function matrixToSvgTransform(transform: FigMatrix): string {
  return `matrix(${transform.m00} ${transform.m10} ${transform.m01} ${transform.m11} ${transform.m02} ${transform.m12})`;
}
