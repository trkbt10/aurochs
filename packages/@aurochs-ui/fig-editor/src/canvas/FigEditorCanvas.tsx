/**
 * @file Fig editor canvas component
 *
 * The main editing surface for Figma-like .fig files.
 * Unlike PPTX's fixed-size slide canvas, this is an infinite canvas:
 * - No fixed background (no "paper")
 * - No viewport clamping (pan freely in any direction)
 * - Canvas size derived from actual node bounds (with padding)
 *
 * Selection model (matching Figma):
 * - Single click selects the deepest (topmost z-order) node at the cursor.
 *   Clicking inside a frame selects the child element directly, not the
 *   frame. Clicking empty space inside a frame selects the frame itself.
 * - Double-click on TEXT nodes enters text editing mode.
 * - Click canvas background clears selection.
 * - Right-click shows context menu with copy/paste/duplicate/delete/reorder.
 *
 * Implementation: the entire node tree is flattened into absolute-coordinate
 * hit-area bounds (pre-order traversal). Children's hit areas sit above
 * their parents in the SVG z-stack, so the browser's native event dispatch
 * delivers the deepest node's ID on click.
 *
 * Composes:
 * - EditorCanvas (from editor-controls) for viewport, selection, interaction
 * - FigPageRenderer for the selected SVG/WebGL backend layer
 */

import { useRef, useMemo, useCallback, useState, useEffect, type ReactNode } from "react";
import type { EditorCanvasHandle, CanvasPageCoords } from "@aurochs-ui/editor-controls/canvas";
import { EditorCanvas } from "@aurochs-ui/editor-controls/canvas";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";
import type { DragState } from "@aurochs-ui/editor-core/drag-state";
import { isDragThresholdExceeded } from "@aurochs-ui/editor-core/drag-utils";
import type { FigNodeId, FigDesignNode } from "@aurochs/fig/domain";
import type { FigMatrix, FigVectorPath } from "@aurochs/fig/types";
import { findNodeById } from "@aurochs-builder/fig/node-ops";
import { useFigEditor, useFigDrag } from "../context/FigEditorContext";
import { FigPageRenderer } from "./FigPageRenderer";
import type { FigEditorRendererKind } from "./renderer-kind";
import { useFigSceneGraph } from "./use-fig-scene-graph";
import { useFigTextFontResolver } from "./use-fig-text-font-resolver";
import { computeAbsoluteTransform, filterMarqueeSelectionByHierarchy, findDeepestBoundsAtPoint, flattenAllNodeBounds } from "./interaction/bounds";
import { resolveCanvasInteractionPolicy } from "./interaction/interaction-policy";
import { resolveCanvasInteractionTarget, type CanvasTargetMode } from "./interaction/target-resolution";
import { screenDashToPageDash, screenPxToPagePx, VECTOR_PATH_OVERLAY_STYLE } from "./interaction/vector-path-overlay-style";
import { useFigKeyboard } from "./interaction/use-fig-keyboard";
import { FigTextEditOverlay } from "./FigTextEditOverlay";
import { computeAbsoluteNodeBounds } from "./interaction/bounds";
import {
  convertEditableSegmentToCurve,
  convertEditableSegmentToLine,
  deleteEditableAnchorCommand,
  getEditableControlLines,
  getEditableCommandPoints,
  insertEditableLineAtNearestSegment,
  parseEditablePathData,
  replaceEditableCommandPoint,
  serializeEditablePathData,
  setEditablePathClosed,
} from "./vector-path-data";
import type { EditablePathCommand } from "./vector-path-data";
import {
  appendVectorPathDraftPoint,
  applyVectorPathDraftAnchorDrag,
  canCommitVectorPathDraft,
  closeVectorPathDraft,
  commitVectorPathDraftToNodeSpec,
  isVectorPathDraftClosePoint,
  startVectorPathDraft,
  updateVectorPathDraftPreview,
  vectorPathDraftToPreviewPath,
  type VectorPathDraft,
} from "./vector-path-draft";
import type { MenuEntry } from "@aurochs-ui/ui-components/context-menu";
import { ContextMenu } from "@aurochs-ui/ui-components/context-menu";
import type { CachingFontLoader } from "@aurochs-renderer/fig/font";
import {
  contourToSvgD,
  generateEllipseContour,
  generateLineContour,
  generatePolygonContour,
  generateRectContour,
  generateStarContour,
} from "@aurochs-renderer/fig/scene-graph";
import { resolveFigUserIntent } from "../context/fig-editor/user-intent";
import { allowsFigUserOperation, resolveFigUserOperationDomain } from "../context/fig-editor/user-operation";

// =============================================================================
// Canvas bounds computation
// =============================================================================

/** Minimum canvas size to prevent degenerate viewports */
const MIN_CANVAS_SIZE = 800;
/** Padding around content for breathing room */
const CANVAS_PADDING = 200;
const VECTOR_PATH_CLOSE_TOLERANCE_PX = 8;

/**
 * Compute canvas dimensions that enclose all nodes with padding.
 *
 * Unlike PPTX where canvas = slide size (fixed), the fig canvas
 * size is the bounding box of all content + padding.
 * This ensures fit-to-view works correctly for any page content.
 */
function computeCanvasBoundsFromNodes(nodes: readonly FigDesignNode[]): {
  width: number;
  height: number;
  renderX: number;
  renderY: number;
  renderWidth: number;
  renderHeight: number;
} {
  if (nodes.length === 0) {
    return {
      width: MIN_CANVAS_SIZE,
      height: MIN_CANVAS_SIZE,
      renderX: 0,
      renderY: 0,
      renderWidth: MIN_CANVAS_SIZE,
      renderHeight: MIN_CANVAS_SIZE,
    };
  }

  const extremes = nodes.reduce(
    (acc, node) => {
      const left = node.transform.m02;
      const top = node.transform.m12;
      const right = node.transform.m02 + node.size.x;
      const bottom = node.transform.m12 + node.size.y;
      return {
        minLeft: Math.min(acc.minLeft, left),
        minTop: Math.min(acc.minTop, top),
        maxRight: Math.max(acc.maxRight, right),
        maxBottom: Math.max(acc.maxBottom, bottom),
      };
    },
    { minLeft: 0, minTop: 0, maxRight: 0, maxBottom: 0 },
  );

  return {
    width: Math.max(MIN_CANVAS_SIZE, extremes.maxRight + CANVAS_PADDING),
    height: Math.max(MIN_CANVAS_SIZE, extremes.maxBottom + CANVAS_PADDING),
    renderX: extremes.minLeft - CANVAS_PADDING,
    renderY: extremes.minTop - CANVAS_PADDING,
    renderWidth: Math.max(MIN_CANVAS_SIZE, extremes.maxRight - extremes.minLeft + CANVAS_PADDING * 2),
    renderHeight: Math.max(MIN_CANVAS_SIZE, extremes.maxBottom - extremes.minTop + CANVAS_PADDING * 2),
  };
}

function resolveSelectableMarqueeIds({
  activePage,
  itemIds,
}: {
  readonly activePage: { readonly children: readonly FigDesignNode[] } | null | undefined;
  readonly itemIds: readonly string[];
}): readonly string[] {
  if (!activePage) {
    return itemIds;
  }
  return filterMarqueeSelectionByHierarchy(activePage.children, itemIds);
}

/** Identity clamp — infinite canvas has no viewport boundaries */
const NO_CLAMP = (vp: { translateX: number; translateY: number; scale: number }) => vp;

type ExceedsThresholdOptions = {
  readonly startClientX: number;
  readonly startClientY: number;
  readonly clientX: number;
  readonly clientY: number;
};

function exceedsThreshold(
  { startClientX, startClientY, clientX, clientY }: ExceedsThresholdOptions,
): boolean {
  return isDragThresholdExceeded({
    startX: startClientX,
    startY: startClientY,
    currentX: clientX,
    currentY: clientY,
  });
}

// =============================================================================
// Context menu state
// =============================================================================

type ContextMenuState = {
  readonly x: number;
  readonly y: number;
  readonly pageX: number;
  readonly pageY: number;
  readonly targetId: FigNodeId;
  readonly vectorHandle?: VectorPathHandle;
} | null;

type VectorPathHandle = {
  readonly key: string;
  readonly pathIndex: number;
  readonly commandIndex: number;
  readonly valueIndex: number;
  readonly role: "anchor" | "control";
  readonly x: number;
  readonly y: number;
};

type VectorPathDragState = {
  readonly nodeId: FigNodeId;
  readonly pathIndex: number;
  readonly commandIndex: number;
  readonly valueIndex: number;
};

type VectorPathControlLine = {
  readonly key: string;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
};

type EditableVectorPathOverlay = {
  readonly key: string;
  readonly pathIndex: number;
  readonly data: string;
  readonly transform: string;
};

function resolveEditableVectorPaths(node: FigDesignNode | undefined): readonly FigVectorPath[] | undefined {
  if (!node) {
    return undefined;
  }
  if (node.vectorPaths && node.vectorPaths.length > 0) {
    return node.vectorPaths;
  }
  return synthesizeEditableVectorPaths(node);
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

function resolveEditableCornerRadius(node: FigDesignNode): number | readonly [number, number, number, number] | undefined {
  const radii = node.rectangleCornerRadii;
  if (radii && radii.length === 4) {
    return [radii[0] ?? 0, radii[1] ?? 0, radii[2] ?? 0, radii[3] ?? 0];
  }
  return node.cornerRadius;
}

function collectVectorPathHandles(
  node: FigDesignNode | undefined,
  activePage: { readonly children: readonly FigDesignNode[] } | null | undefined,
): readonly VectorPathHandle[] {
  const vectorPaths = resolveEditableVectorPaths(node);
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
    return commands.flatMap((command, commandIndex) => getEditableCommandPoints(command).map((point) => ({
      key: `${pathIndex}:${commandIndex}:${point.valueIndex}`,
      pathIndex,
      commandIndex,
      valueIndex: point.valueIndex,
      role: point.role,
      ...transformPoint(transform, point),
    })));
  });
}

function collectVectorPathControlLines(
  node: FigDesignNode | undefined,
  activePage: { readonly children: readonly FigDesignNode[] } | null | undefined,
): readonly VectorPathControlLine[] {
  const vectorPaths = resolveEditableVectorPaths(node);
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

function collectEditableVectorPathOverlays(
  node: FigDesignNode | undefined,
  activePage: { readonly children: readonly FigDesignNode[] } | null | undefined,
): readonly EditableVectorPathOverlay[] {
  const vectorPaths = resolveEditableVectorPaths(node);
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

function findNearestVectorHandle(
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

function resolveContextVectorHandle(
  contextMenu: ContextMenuState,
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

function canEnterVectorPathEdit(node: FigDesignNode | undefined): boolean {
  return Boolean(resolveEditableVectorPaths(node));
}

function isContainerNode(node: FigDesignNode | undefined): boolean {
  return node?.type === "FRAME" || node?.type === "COMPONENT" || node?.type === "COMPONENT_SET" || node?.type === "SYMBOL";
}

function resolvePathDrawingParent({
  activePage,
  itemBounds,
  point,
}: {
  readonly activePage: { readonly children: readonly FigDesignNode[] } | null | undefined;
  readonly itemBounds: readonly { readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }[];
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

function toExplicitEditableVectorNode(node: FigDesignNode): FigDesignNode {
  if (node.vectorPaths && node.vectorPaths.length > 0) {
    return node;
  }
  const vectorPaths = resolveEditableVectorPaths(node);
  if (!vectorPaths) {
    return node;
  }
  return {
    ...node,
    type: "VECTOR",
    vectorPaths,
    cornerRadius: undefined,
    rectangleCornerRadii: undefined,
    pointCount: undefined,
    starInnerRadius: undefined,
    starInnerScale: undefined,
  };
}

function addVectorPathPoint(
  node: FigDesignNode,
  pathIndex: number,
  point: { readonly x: number; readonly y: number },
): FigDesignNode {
  const editableNode = toExplicitEditableVectorNode(node);
  const paths = editableNode.vectorPaths ?? [];
  const vectorPaths = paths.map((path, index) => {
    if (index !== pathIndex) {
      return path;
    }
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return path;
    }
    return { ...path, data: serializeEditablePathData(insertEditableLineAtNearestSegment(commands, point)) };
  });
  return { ...editableNode, vectorPaths };
}

function updateVectorPathCommands({
  node,
  pathIndex,
  update,
}: {
  readonly node: FigDesignNode;
  readonly pathIndex: number;
  readonly update: (commands: readonly EditablePathCommand[]) => readonly EditablePathCommand[];
}): FigDesignNode {
  const paths = node.vectorPaths ?? [];
  const vectorPaths = paths.map((path, index) => {
    if (index !== pathIndex) {
      return path;
    }
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return path;
    }
    return { ...path, data: serializeEditablePathData(update(commands)) };
  });
  return { ...node, vectorPaths };
}

function updateVectorPathEndpoint({
  node,
  pathIndex,
  commandIndex,
  valueIndex,
  point,
}: {
  readonly node: FigDesignNode;
  readonly pathIndex: number;
  readonly commandIndex: number;
  readonly valueIndex: number;
  readonly point: { readonly x: number; readonly y: number };
}): FigDesignNode {
  if (!node.vectorPaths || node.vectorPaths.length === 0) {
    return updateParametricShapeEndpoint({ node, commandIndex, point });
  }
  const paths = resolveEditableVectorPaths(node) ?? [];
  const vectorPaths = paths.map((path, index) => {
    if (index !== pathIndex) {
      return path;
    }
    const commands = parseEditablePathData(path.data ?? "");
    if (!commands) {
      return path;
    }
    const nextCommands = replaceEditableCommandPoint({ commands, commandIndex, valueIndex, point });
    return { ...path, data: serializeEditablePathData(nextCommands) };
  });
  return { ...node, vectorPaths };
}

function updateParametricShapeEndpoint({
  node,
  commandIndex,
  point,
}: {
  readonly node: FigDesignNode;
  readonly commandIndex: number;
  readonly point: { readonly x: number; readonly y: number };
}): FigDesignNode {
  switch (node.type) {
    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return updateRectanglePathEndpoint(node, commandIndex, point);
    case "ELLIPSE":
      return updateEllipsePathEndpoint(node, commandIndex, point);
    case "LINE":
      return updateLinePathEndpoint(node, commandIndex, point);
    case "REGULAR_POLYGON":
    case "STAR":
      return updatePathBoundsFromSyntheticEndpoint({ node, commandIndex, point });
    default:
      return node;
  }
}

function updateRectanglePathEndpoint(
  node: FigDesignNode,
  commandIndex: number,
  point: { readonly x: number; readonly y: number },
): FigDesignNode {
  const width = Math.max(1, node.size.x);
  const height = Math.max(1, node.size.y);
  switch (commandIndex) {
    case 0:
      return resizeParametricNode({ node, left: point.x, top: point.y, right: width, bottom: height });
    case 1:
      return resizeParametricNode({ node, left: 0, top: point.y, right: point.x, bottom: height });
    case 2:
      return resizeParametricNode({ node, left: 0, top: 0, right: point.x, bottom: point.y });
    case 3:
      return resizeParametricNode({ node, left: point.x, top: 0, right: width, bottom: point.y });
    default:
      return node;
  }
}

function updateEllipsePathEndpoint(
  node: FigDesignNode,
  commandIndex: number,
  point: { readonly x: number; readonly y: number },
): FigDesignNode {
  const width = Math.max(1, node.size.x);
  const height = Math.max(1, node.size.y);
  switch (commandIndex) {
    case 0:
    case 4:
      return resizeParametricNode({ node, left: 0, top: point.y, right: width, bottom: height });
    case 1:
      return resizeParametricNode({ node, left: 0, top: 0, right: point.x, bottom: height });
    case 2:
      return resizeParametricNode({ node, left: 0, top: 0, right: width, bottom: point.y });
    case 3:
      return resizeParametricNode({ node, left: point.x, top: 0, right: width, bottom: height });
    default:
      return node;
  }
}

function updateLinePathEndpoint(
  node: FigDesignNode,
  commandIndex: number,
  point: { readonly x: number; readonly y: number },
): FigDesignNode {
  if (commandIndex === 0) {
    return resizeParametricNode({ node, left: point.x, top: point.y, right: node.size.x, bottom: 0 });
  }
  if (commandIndex === 1) {
    return resizeParametricNode({ node, left: 0, top: 0, right: point.x, bottom: point.y });
  }
  return node;
}

function updatePathBoundsFromSyntheticEndpoint({
  node,
  commandIndex,
  point,
}: {
  readonly node: FigDesignNode;
  readonly commandIndex: number;
  readonly point: { readonly x: number; readonly y: number };
}): FigDesignNode {
  const path = resolveEditableVectorPaths(node)?.[0];
  const commands = parseEditablePathData(path?.data ?? "");
  if (!commands) {
    return node;
  }
  const nextCommands = replaceEditableCommandPoint({ commands, commandIndex, valueIndex: 0, point });
  const anchors = nextCommands.flatMap((command) => getEditableCommandPoints(command).filter((candidate) => candidate.role === "anchor"));
  if (anchors.length < 2) {
    return node;
  }
  const left = Math.min(...anchors.map((anchor) => anchor.x));
  const top = Math.min(...anchors.map((anchor) => anchor.y));
  const right = Math.max(...anchors.map((anchor) => anchor.x));
  const bottom = Math.max(...anchors.map((anchor) => anchor.y));
  return resizeParametricNode({ node, left, top, right, bottom });
}

function resizeParametricNode({
  node,
  left,
  top,
  right,
  bottom,
}: {
  readonly node: FigDesignNode;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}): FigDesignNode {
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  return {
    ...node,
    transform: {
      ...node.transform,
      m02: node.transform.m02 + left,
      m12: node.transform.m12 + top,
    },
    size: { x: width, y: height },
  };
}

function worldToLocalPoint(
  transform: { readonly m00: number; readonly m01: number; readonly m02: number; readonly m10: number; readonly m11: number; readonly m12: number },
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

function pageToDrawingLocalPoint(
  draw: Pick<VectorPathDraft, "parentTransform">,
  point: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  if (!draw.parentTransform) {
    return point;
  }
  return worldToLocalPoint(draw.parentTransform, point);
}

function transformPoint(
  transform: { readonly m00: number; readonly m01: number; readonly m02: number; readonly m10: number; readonly m11: number; readonly m12: number },
  point: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  return {
    x: transform.m00 * point.x + transform.m01 * point.y + transform.m02,
    y: transform.m10 * point.x + transform.m11 * point.y + transform.m12,
  };
}

function matrixToSvgTransform(
  transform: { readonly m00: number; readonly m01: number; readonly m02: number; readonly m10: number; readonly m11: number; readonly m12: number },
): string {
  return `matrix(${transform.m00} ${transform.m10} ${transform.m01} ${transform.m11} ${transform.m02} ${transform.m12})`;
}

function getVectorHandleAriaLabel(handle: VectorPathHandle): string {
  const index = handle.commandIndex + 1;
  return handle.role === "control" ? `Vector path control handle ${index}` : `Vector path anchor handle ${index}`;
}

function resolveInteractionTargetNodeId({
  activePage,
  itemBounds,
  hitNodeId,
  targetMode,
  point,
}: {
  readonly activePage: { readonly children: readonly FigDesignNode[] } | null | undefined;
  readonly itemBounds: readonly { readonly id: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }[];
  readonly hitNodeId: FigNodeId;
  readonly targetMode: CanvasTargetMode;
  readonly point: { readonly x: number; readonly y: number };
}): FigNodeId {
  if (!activePage) {
    return hitNodeId;
  }
  return resolveCanvasInteractionTarget({
    pageChildren: activePage.children,
    itemBounds,
    point,
    hitNodeId,
    mode: targetMode,
    canEditPath: canEnterVectorPathEdit,
  });
}

// =============================================================================
// Component
// =============================================================================

/**
 * Fig editor canvas.
 *
 * Provides the interactive editing surface with:
 * - Rendering of the active page's nodes
 * - Direct selection of any node at any depth (deepest-first hit testing)
 * - Multi-select via Shift/Cmd+click and marquee drag
 * - Drag to move, resize, rotate
 * - Right-click context menu
 * - Zoom and pan (unclamped — infinite canvas)
 *
 * @param canvasOverlay Optional React node rendered inside the canvas
 * page coordinate space, above the page content and below selection
 * chrome. Intended for inspection overlays (e.g. FigInspectorOverlay).
 * Toggling the overlay is the caller's responsibility.
 */
type FigEditorCanvasProps = {
  readonly canvasOverlay?: ReactNode;
  readonly renderer?: FigEditorRendererKind;
  readonly fontLoader?: CachingFontLoader;
};

/** Render the interactive fig editor canvas with selectable renderer backends. */
export function FigEditorCanvas({ canvasOverlay, renderer = "svg", fontLoader }: FigEditorCanvasProps = {}) {
  const {
    dispatch,
    document,
    activePage,
    nodeSelection,
    canUndo,
    canRedo,
    creationMode,
    textEdit,
  } = useFigEditor();

  // Drag state is in a separate context so that high-frequency preview
  // updates (PREVIEW_MOVE/RESIZE/ROTATE at 40-60Hz) only re-render this
  // canvas component, not PropertyPanel/LayerPanel/Toolbar etc.
  const { drag } = useFigDrag();

  // Keep a ref to the latest drag state so that useCallback handlers
  // can read it without listing `drag` as a dependency. This prevents
  // callback identity from changing on every mouse move, which would
  // cascade re-renders into EditorCanvas's global listener useEffect.
  const dragRef = useRef<DragState<FigNodeId>>(drag);
  dragRef.current = drag;

  const canvasRef = useRef<EditorCanvasHandle>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [viewportScale, setViewportScale] = useState(1);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const vectorPathDragRef = useRef<VectorPathDragState | null>(null);
  const vectorPathDrawRef = useRef<VectorPathDraft | null>(null);
  const [vectorPathDrawPreview, setVectorPathDrawPreview] = useState<VectorPathDraft | null>(null);
  const vectorPathDrawPointerRef = useRef<{ readonly clientX: number; readonly clientY: number } | null>(null);

  // =========================================================================
  // Item bounds — flattened tree with absolute coordinates
  // =========================================================================

  /**
   * Flatten the entire node tree into absolute-coordinate bounds.
   *
   * Every visible node (containers and leaves alike) gets a hit area.
   * The array is in pre-order (parent before children), so children's
   * hit-area rects are rendered AFTER (and thus ON TOP OF) their parents
   * in the SVG z-stack. Clicking at a position covered by a leaf will
   * hit the leaf's rect, not the ancestor frame's rect — matching
   * Figma's "click-through to deepest element" behavior.
   *
   * Clicking empty space inside a frame (not covered by any child) will
   * hit the frame's own rect, selecting the frame itself.
   */
  const itemBounds = useMemo(() => {
    if (!activePage) {
      return [];
    }
    return flattenAllNodeBounds(activePage.children);
  }, [activePage]);

  // Compute canvas size from actual content bounds (always from top-level)
  const canvasSize = useMemo(
    () => computeCanvasBoundsFromNodes(activePage?.children ?? []),
    [activePage],
  );
  const textFontResolver = useFigTextFontResolver({ page: activePage, fontLoader });
  const primaryNode = useMemo(
    () => activePage && nodeSelection.primaryId ? findNodeById(activePage.children, nodeSelection.primaryId) : undefined,
    [activePage, nodeSelection.primaryId],
  );
  const userIntent = useMemo(
    () => resolveFigUserIntent({ creationMode, textEdit, drag }),
    [creationMode, drag, textEdit],
  );
  const interactionPolicy = useMemo(
    () => resolveCanvasInteractionPolicy(userIntent),
    [userIntent],
  );
  const operationDomain = useMemo(
    () => resolveFigUserOperationDomain(userIntent),
    [userIntent],
  );
  useFigKeyboard({
    dispatch,
    hasSelection: nodeSelection.selectedIds.length > 0,
    selectedIds: nodeSelection.selectedIds,
    canUndo,
    canRedo,
    operationDomain,
    isTextEditing: textEdit.type === "active",
  });
  const vectorPathHandles = useMemo(
    () => interactionPolicy.pathEditingEnabled ? collectVectorPathHandles(primaryNode, activePage) : [],
    [activePage, interactionPolicy.pathEditingEnabled, primaryNode],
  );
  const vectorPathControlLines = useMemo(
    () => interactionPolicy.pathEditingEnabled ? collectVectorPathControlLines(primaryNode, activePage) : [],
    [activePage, interactionPolicy.pathEditingEnabled, primaryNode],
  );
  const editableVectorPathOverlays = useMemo(
    () => interactionPolicy.pathEditingEnabled ? collectEditableVectorPathOverlays(primaryNode, activePage) : [],
    [activePage, interactionPolicy.pathEditingEnabled, primaryNode],
  );

  const addVectorPointAtPagePoint = useCallback(
    (nodeId: FigNodeId, pagePoint: { readonly x: number; readonly y: number }): boolean => {
      if (!activePage) {
        return false;
      }
      const targetNode = findNodeById(activePage.children, nodeId);
      if (!targetNode?.vectorPaths || targetNode.vectorPaths.length === 0) {
        return false;
      }
      const transform = computeAbsoluteTransform(activePage.children, nodeId);
      if (!transform) {
        return false;
      }
      const point = worldToLocalPoint(transform, pagePoint);
      dispatch({
        type: "UPDATE_NODE",
        source: "path-edit",
        nodeId,
        updater: (node) => addVectorPathPoint(node, 0, point),
      });
      return true;
    },
    [activePage, dispatch],
  );

  const sceneGraph = useFigSceneGraph({
    page: activePage,
    canvasWidth: canvasSize.renderWidth,
    canvasHeight: canvasSize.renderHeight,
    viewportX: canvasSize.renderX,
    viewportY: canvasSize.renderY,
    images: document.images,
    blobs: document.blobs,
    symbolMap: document.components,
    styleRegistry: document.styleRegistry,
    textFontResolver,
  });

  const addVectorPathDraftPointAt = useCallback(
    (
      point: { readonly x: number; readonly y: number },
      parent: { readonly parentId: FigNodeId | null; readonly parentTransform: FigMatrix | undefined },
      clientPoint: { readonly clientX: number; readonly clientY: number },
    ) => {
      const currentDraft = vectorPathDrawRef.current;
      vectorPathDrawPointerRef.current = clientPoint;
      if (currentDraft && isVectorPathDraftClosePoint(
        currentDraft,
        point,
        screenPxToPagePx(VECTOR_PATH_CLOSE_TOLERANCE_PX, viewportScale),
      )) {
        const nextDraft = closeVectorPathDraft(currentDraft);
        vectorPathDrawRef.current = nextDraft;
        setVectorPathDrawPreview(nextDraft);
        dispatch({
          type: "ADD_NODE",
          parentId: nextDraft.parentId ?? undefined,
          spec: commitVectorPathDraftToNodeSpec(nextDraft),
        });
        vectorPathDrawRef.current = null;
        vectorPathDrawPointerRef.current = null;
        setVectorPathDrawPreview(null);
        return;
      }
      const localPoint = pageToDrawingLocalPoint(currentDraft ?? parent, point);
      if (!currentDraft) {
        const draft = startVectorPathDraft({
          parent,
          localPoint,
          pagePoint: point,
        });
        vectorPathDrawRef.current = draft;
        setVectorPathDrawPreview(draft);
        return;
      }
      const nextDraft = appendVectorPathDraftPoint(currentDraft, localPoint, point);
      vectorPathDrawRef.current = nextDraft;
      setVectorPathDrawPreview(nextDraft);
    },
    [dispatch, viewportScale],
  );

  const commitVectorPathDraft = useCallback(() => {
    const draft = vectorPathDrawRef.current;
    if (!draft) {
      return;
    }
    vectorPathDrawRef.current = null;
    vectorPathDrawPointerRef.current = null;
    setVectorPathDrawPreview(null);
    if (!canCommitVectorPathDraft(draft)) {
      return;
    }
    dispatch({
      type: "ADD_NODE",
      parentId: draft.parentId ?? undefined,
      spec: commitVectorPathDraftToNodeSpec(draft),
    });
  }, [dispatch]);

  const cancelVectorPathDraft = useCallback(() => {
    vectorPathDrawRef.current = null;
    vectorPathDrawPointerRef.current = null;
    setVectorPathDrawPreview(null);
  }, []);

  // =========================================================================
  // Item events
  // =========================================================================

  const handleItemPointerDown = useCallback(
    (id: string, coords: CanvasPageCoords, e: React.PointerEvent) => {
      // If text editing is active, clicking any node exits text edit first.
      // This prevents the invalid state of "text editing + other node selected".
      if (textEdit.type === "active") {
        if (allowsFigUserOperation(operationDomain, "exit-text-edit")) {
          dispatch({ type: "EXIT_TEXT_EDIT" });
        }
        return;
      }

      if (e.button !== 0) {
        return;
      }

      if (allowsFigUserOperation(operationDomain, "resolve-path-target")) {
        e.preventDefault();
        e.stopPropagation();
        if (vectorPathDrawRef.current) {
          addVectorPathDraftPointAt(
            { x: coords.pageX, y: coords.pageY },
            { parentId: null, parentTransform: undefined },
            { clientX: coords.clientX, clientY: coords.clientY },
          );
          return;
        }
        const hitNodeId = id as FigNodeId;
        const nodeId = resolveInteractionTargetNodeId({
          activePage,
          itemBounds,
          hitNodeId,
          targetMode: interactionPolicy.targetMode,
          point: { x: coords.pageX, y: coords.pageY },
        });
        const targetNode = activePage ? findNodeById(activePage.children, nodeId) : undefined;
        if (!canEnterVectorPathEdit(targetNode)) {
          const parent = resolvePathDrawingParent({
            activePage,
            itemBounds,
            point: { x: coords.pageX, y: coords.pageY },
          });
          addVectorPathDraftPointAt(
            { x: coords.pageX, y: coords.pageY },
            parent,
            { clientX: coords.clientX, clientY: coords.clientY },
          );
          return;
        }
        if (!nodeSelection.selectedIds.includes(nodeId)) {
          if (allowsFigUserOperation(operationDomain, "select-node")) {
            dispatch({
              type: "SELECT_NODE",
              nodeId,
              addToSelection: false,
            });
          }
          return;
        }
        return;
      }

      if (allowsFigUserOperation(operationDomain, "start-create")) {
        e.preventDefault();
        e.stopPropagation();
        creationDragRef.current = {
          startPageX: coords.pageX,
          startPageY: coords.pageY,
          currentPageX: coords.pageX,
          currentPageY: coords.pageY,
        };
        return;
      }

      if (allowsFigUserOperation(operationDomain, "select-node")) {
        dispatch({
          type: "SELECT_NODE",
          nodeId: id as FigNodeId,
          addToSelection: coords.addToSelection,
          toggle: coords.toggle,
        });
      }

      if (allowsFigUserOperation(operationDomain, "start-move")) {
        dispatch({
          type: "START_PENDING_MOVE",
          startX: coords.pageX,
          startY: coords.pageY,
          startClientX: coords.clientX,
          startClientY: coords.clientY,
        });
      }
    },
    [activePage, addVectorPathDraftPointAt, dispatch, interactionPolicy, itemBounds, nodeSelection.selectedIds, operationDomain, textEdit],
  );

  const handleItemClick = useCallback(
    (id: string, coords: CanvasPageCoords, _e: React.MouseEvent) => {
      if (!allowsFigUserOperation(operationDomain, "select-node")) {
        return;
      }
      dispatch({
        type: "SELECT_NODE",
        nodeId: id as FigNodeId,
        addToSelection: coords.addToSelection,
        toggle: coords.toggle,
      });
    },
    [dispatch, operationDomain],
  );

  /**
   * Double-click handler: enter text editing for TEXT nodes.
   *
   * Since clicking already selects the deepest node at the cursor,
   * double-click's purpose is limited to entering text edit mode.
   */
  const handleDoubleClick = useCallback(
    (id: string, _coords: CanvasPageCoords, _e: React.MouseEvent) => {
      if (allowsFigUserOperation(operationDomain, "resolve-path-target")) {
        commitVectorPathDraft();
        return;
      }
      if (!activePage) {
        return;
      }

      const node = findNodeById(activePage.children, id as FigNodeId);
      if (node?.type === "TEXT" && allowsFigUserOperation(operationDomain, "enter-text-edit")) {
        dispatch({ type: "ENTER_TEXT_EDIT", nodeId: id as FigNodeId });
      }
    },
    [activePage, commitVectorPathDraft, dispatch, operationDomain],
  );

  // =========================================================================
  // Canvas (background) events
  // =========================================================================

  /**
   * Creation drag state — tracked via ref to avoid re-renders during drag.
   * When the user is in a creation mode and drags on the canvas background,
   * we track the start/current page coordinates. On pointer up, we compute
   * the final rectangle and dispatch COMMIT_CREATION.
   */
  const creationDragRef = useRef<{
    startPageX: number;
    startPageY: number;
    currentPageX: number;
    currentPageY: number;
  } | null>(null);
  const [creationPreview, setCreationPreview] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);

  const handleCanvasPointerDown = useCallback(
    (coords: CanvasPageCoords, e: React.PointerEvent) => {
      // Exit text editing on any canvas background click
      if (textEdit.type === "active") {
        if (allowsFigUserOperation(operationDomain, "exit-text-edit")) {
          dispatch({ type: "EXIT_TEXT_EDIT" });
        }
        return;
      }

      if (allowsFigUserOperation(operationDomain, "resolve-path-target")) {
        e.preventDefault();
        addVectorPathDraftPointAt(
          { x: coords.pageX, y: coords.pageY },
          { parentId: null, parentTransform: undefined },
          { clientX: coords.clientX, clientY: coords.clientY },
        );
        return;
      }

      if (!allowsFigUserOperation(operationDomain, "clear-selection") && !allowsFigUserOperation(operationDomain, "start-create")) {
        return;
      }

      if (allowsFigUserOperation(operationDomain, "start-create")) {
        // Start creation drag
        e.preventDefault(); // Suppress marquee in EditorCanvas
        creationDragRef.current = {
          startPageX: coords.pageX,
          startPageY: coords.pageY,
          currentPageX: coords.pageX,
          currentPageY: coords.pageY,
        };
        return;
      }
      if (allowsFigUserOperation(operationDomain, "clear-selection")) {
        dispatch({ type: "CLEAR_NODE_SELECTION" });
      }
    },
    [addVectorPathDraftPointAt, dispatch, operationDomain, textEdit],
  );

  const handleCanvasClick = useCallback(
    (coords: CanvasPageCoords, _e: React.MouseEvent) => {
      if (!allowsFigUserOperation(operationDomain, "clear-selection") && !allowsFigUserOperation(operationDomain, "commit-create")) {
        return;
      }

      if (allowsFigUserOperation(operationDomain, "commit-create")) {
        // Single click in creation mode: create shape at click position with default size
        dispatch({
          type: "COMMIT_CREATION",
          x: coords.pageX,
          y: coords.pageY,
          width: 0,
          height: 0,
        });
        return;
      }
      if (allowsFigUserOperation(operationDomain, "clear-selection")) {
        dispatch({ type: "CLEAR_NODE_SELECTION" });
      }
    },
    [dispatch, operationDomain],
  );

  // Global pointer listeners for creation drag
  useEffect(() => {
    if (!interactionPolicy.shapeCreationEnabled) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const drag = creationDragRef.current;
      if (!drag) {
        return;
      }

      const pageCoords = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!pageCoords) {
        return;
      }

      drag.currentPageX = pageCoords.pageX;
      drag.currentPageY = pageCoords.pageY;

      // Update preview rectangle
      const x = Math.min(drag.startPageX, drag.currentPageX);
      const y = Math.min(drag.startPageY, drag.currentPageY);
      const width = Math.abs(drag.currentPageX - drag.startPageX);
      const height = Math.abs(drag.currentPageY - drag.startPageY);
      setCreationPreview({ x, y, width, height });
    };

    const handlePointerUp = () => {
      const drag = creationDragRef.current;
      if (!drag) {
        return;
      }

      const x = Math.min(drag.startPageX, drag.currentPageX);
      const y = Math.min(drag.startPageY, drag.currentPageY);
      const width = Math.abs(drag.currentPageX - drag.startPageX);
      const height = Math.abs(drag.currentPageY - drag.startPageY);

      creationDragRef.current = null;
      setCreationPreview(null);

      dispatch({
        type: "COMMIT_CREATION",
        x,
        y,
        width,
        height,
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dispatch, interactionPolicy.shapeCreationEnabled]);

  // =========================================================================
  // Context menu
  // =========================================================================

  const handleItemContextMenu = useCallback(
    (id: string, coords: CanvasPageCoords, e: React.MouseEvent) => {
      if (!allowsFigUserOperation(operationDomain, "open-context-menu")) {
        return;
      }
      // Select the right-clicked item if not already selected
      if (!nodeSelection.selectedIds.includes(id as FigNodeId) && allowsFigUserOperation(operationDomain, "select-node")) {
        dispatch({
          type: "SELECT_NODE",
          nodeId: id as FigNodeId,
          addToSelection: false,
        });
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        pageX: coords.pageX,
        pageY: coords.pageY,
        targetId: id as FigNodeId,
      });
    },
    [dispatch, nodeSelection.selectedIds, operationDomain],
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Canvas-level context menu (no item selected) — for now just prevent default
      setContextMenu(null);
    },
    [],
  );

  const handleVectorPathHandlePointerDown = useCallback(
    (handle: VectorPathHandle, e: React.PointerEvent) => {
      if (!primaryNode || !allowsFigUserOperation(operationDomain, "edit-vector-path")) {
        return;
      }
      if (e.button === 2) {
        if (!allowsFigUserOperation(operationDomain, "open-context-menu")) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          pageX: handle.x,
          pageY: handle.y,
          targetId: primaryNode.id,
          vectorHandle: handle,
        });
        return;
      }
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      vectorPathDragRef.current = {
        nodeId: primaryNode.id,
        pathIndex: handle.pathIndex,
        commandIndex: handle.commandIndex,
        valueIndex: handle.valueIndex,
      };
    },
    [operationDomain, primaryNode],
  );

  const handleVectorPathHandleContextMenu = useCallback(
    (handle: VectorPathHandle, e: React.MouseEvent) => {
      if (!primaryNode || !allowsFigUserOperation(operationDomain, "open-context-menu")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        pageX: handle.x,
        pageY: handle.y,
        targetId: primaryNode.id,
        vectorHandle: handle,
      });
    },
    [operationDomain, primaryNode],
  );

  const handleVectorPathHandleMouseDown = useCallback(
    (handle: VectorPathHandle, e: React.MouseEvent) => {
      if (e.button !== 2 || !primaryNode || !allowsFigUserOperation(operationDomain, "open-context-menu")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        pageX: handle.x,
        pageY: handle.y,
        targetId: primaryNode.id,
        vectorHandle: handle,
      });
    },
    [operationDomain, primaryNode],
  );

  const handleEditablePathPointerDown = useCallback(
    (pathIndex: number, e: React.PointerEvent) => {
      if (!primaryNode || !allowsFigUserOperation(operationDomain, "edit-vector-path") || e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (!primaryNode.vectorPaths || primaryNode.vectorPaths.length === 0) {
        // Topology operations on a parametric shape explicitly turn it
        // into an editable vector path. Simple anchor drags above keep
        // using shape-specific resize semantics.
      }
      if (!nodeSelection.selectedIds.includes(primaryNode.id)) {
        if (allowsFigUserOperation(operationDomain, "select-node")) {
          dispatch({ type: "SELECT_NODE", nodeId: primaryNode.id, addToSelection: false });
        }
        return;
      }
      if (!activePage) {
        return;
      }
      const coords = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!coords) {
        return;
      }
      const transform = computeAbsoluteTransform(activePage.children, primaryNode.id);
      if (!transform) {
        return;
      }
      const point = worldToLocalPoint(transform, { x: coords.pageX, y: coords.pageY });
      dispatch({
        type: "UPDATE_NODE",
        source: "path-edit",
        nodeId: primaryNode.id,
        updater: (node) => addVectorPathPoint(node, pathIndex, point),
      });
    },
    [activePage, dispatch, nodeSelection.selectedIds, operationDomain, primaryNode],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const currentDrag = vectorPathDragRef.current;
      if (!currentDrag || !activePage) {
        return;
      }
      const pageCoords = canvasRef.current?.screenToPage(event.clientX, event.clientY);
      const transform = computeAbsoluteTransform(activePage.children, currentDrag.nodeId);
      if (!pageCoords || !transform) {
        return;
      }
      if (!allowsFigUserOperation(operationDomain, "edit-vector-path")) {
        return;
      }
      const point = worldToLocalPoint(transform, { x: pageCoords.pageX, y: pageCoords.pageY });
      dispatch({
        type: "UPDATE_NODE",
        source: "path-edit",
        nodeId: currentDrag.nodeId,
        updater: (node) => updateVectorPathEndpoint({
          node,
          pathIndex: currentDrag.pathIndex,
          commandIndex: currentDrag.commandIndex,
          valueIndex: currentDrag.valueIndex,
          point,
        }),
      });
    };
    const handlePointerUp = () => {
      vectorPathDragRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activePage, dispatch, operationDomain]);

  useEffect(() => {
    if (!interactionPolicy.pathEditingEnabled) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const draw = vectorPathDrawRef.current;
      if (!draw) {
        return;
      }
      const pageCoords = canvasRef.current?.screenToPage(event.clientX, event.clientY);
      if (!pageCoords) {
        return;
      }
      const next = updateVectorPathDraftPreview(draw, { x: pageCoords.pageX, y: pageCoords.pageY });
      vectorPathDrawRef.current = next;
      setVectorPathDrawPreview(next);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = vectorPathDrawPointerRef.current;
      const draw = vectorPathDrawRef.current;
      if (!start || !draw) {
        vectorPathDrawPointerRef.current = null;
        return;
      }
      vectorPathDrawPointerRef.current = null;
      if (!exceedsThreshold({
        startClientX: start.clientX,
        startClientY: start.clientY,
        clientX: event.clientX,
        clientY: event.clientY,
      })) {
        return;
      }
      const pageCoords = canvasRef.current?.screenToPage(event.clientX, event.clientY);
      if (!pageCoords) {
        return;
      }
      const localPoint = pageToDrawingLocalPoint(draw, { x: pageCoords.pageX, y: pageCoords.pageY });
      const next = applyVectorPathDraftAnchorDrag(
        draw,
        localPoint,
        { x: pageCoords.pageX, y: pageCoords.pageY },
      );
      vectorPathDrawRef.current = next;
      setVectorPathDrawPreview(next);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitVectorPathDraft();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelVectorPathDraft();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelVectorPathDraft, commitVectorPathDraft, interactionPolicy.pathEditingEnabled]);

  const contextMenuItems = useMemo((): readonly MenuEntry[] => {
    const hasSelection = nodeSelection.selectedIds.length > 0;
    const primaryNode = activePage && nodeSelection.primaryId ? findNodeById(activePage.children, nodeSelection.primaryId) : undefined;
    const canEditVectorPath = canEnterVectorPathEdit(primaryNode);
    const hasExplicitVectorPaths = Boolean(primaryNode?.vectorPaths && primaryNode.vectorPaths.length > 0);
    const canAddVectorPoint = hasExplicitVectorPaths && interactionPolicy.pathEditingEnabled;
    const vectorHandle = resolveContextVectorHandle(contextMenu, vectorPathHandles);
    const isAnchorHandle = vectorHandle?.role === "anchor";
    const canConvertToCurve = Boolean(hasExplicitVectorPaths && isAnchorHandle && vectorHandle.commandIndex > 0);
    const canConvertToLine = Boolean(hasExplicitVectorPaths && isAnchorHandle && vectorHandle.commandIndex > 0);
    const canDeleteVectorPoint = Boolean(hasExplicitVectorPaths && isAnchorHandle && vectorPathHandles.filter((handle) => handle.role === "anchor").length > 2);
    return [
      { id: "duplicate", label: "Duplicate", shortcut: "Cmd+D", disabled: !hasSelection || !allowsFigUserOperation(operationDomain, "duplicate-selection") },
      { id: "copy", label: "Copy", shortcut: "Cmd+C", disabled: !hasSelection || !allowsFigUserOperation(operationDomain, "copy-selection") },
      { id: "paste", label: "Paste", shortcut: "Cmd+V", disabled: !allowsFigUserOperation(operationDomain, "paste") },
      { type: "separator" },
      { id: "group", label: "Group Selection", shortcut: "Cmd+G", disabled: nodeSelection.selectedIds.length === 0 || !allowsFigUserOperation(operationDomain, "group-selection") },
      { id: "make-component", label: "Create Component", disabled: nodeSelection.selectedIds.length === 0 || !allowsFigUserOperation(operationDomain, "make-component") },
      { id: "make-symbol", label: "Create Symbol", disabled: nodeSelection.selectedIds.length === 0 || !allowsFigUserOperation(operationDomain, "make-symbol") },
      { id: "outline", label: "Outline Selection", disabled: nodeSelection.selectedIds.length === 0 || !allowsFigUserOperation(operationDomain, "outline-selection") },
      { type: "separator" },
      { id: "boolean-union", label: "Union Selection", disabled: nodeSelection.selectedIds.length < 2 || !allowsFigUserOperation(operationDomain, "boolean-operation") },
      { id: "boolean-subtract", label: "Subtract Selection", disabled: nodeSelection.selectedIds.length < 2 || !allowsFigUserOperation(operationDomain, "boolean-operation") },
      { id: "boolean-intersect", label: "Intersect Selection", disabled: nodeSelection.selectedIds.length < 2 || !allowsFigUserOperation(operationDomain, "boolean-operation") },
      { id: "boolean-exclude", label: "Exclude Selection", disabled: nodeSelection.selectedIds.length < 2 || !allowsFigUserOperation(operationDomain, "boolean-operation") },
      { type: "separator" },
      { id: "edit-vector-path", label: "Edit Vector Path", disabled: !canEditVectorPath || !allowsFigUserOperation(operationDomain, "set-tool") },
      { id: "add-vector-point", label: "Add Vector Point", disabled: !canAddVectorPoint },
      { id: "convert-vector-point-curve", label: "Convert Segment to Curve", disabled: !canConvertToCurve },
      { id: "convert-vector-point-line", label: "Convert Segment to Line", disabled: !canConvertToLine },
      { id: "delete-vector-point", label: "Delete Vector Point", disabled: !canDeleteVectorPoint, danger: true },
      { id: "close-vector-path", label: "Close Vector Path", disabled: !canEditVectorPath },
      { id: "open-vector-path", label: "Open Vector Path", disabled: !canEditVectorPath },
      { type: "separator" },
      { id: "bring-to-front", label: "Bring to Front", disabled: !hasSelection },
      { id: "bring-forward", label: "Bring Forward", disabled: !hasSelection },
      { id: "send-backward", label: "Send Backward", disabled: !hasSelection },
      { id: "send-to-back", label: "Send to Back", disabled: !hasSelection },
      { type: "separator" },
      { id: "delete", label: "Delete", shortcut: "Del", disabled: !hasSelection || !allowsFigUserOperation(operationDomain, "delete-selection"), danger: true },
    ];
  }, [activePage, contextMenu?.vectorHandle, interactionPolicy.pathEditingEnabled, nodeSelection.primaryId, nodeSelection.selectedIds.length, operationDomain, vectorPathHandles]);

  const handleContextMenuAction = useCallback(
    (actionId: string) => {
      const selectedIds = nodeSelection.selectedIds;
      const vectorHandle = resolveContextVectorHandle(contextMenu, vectorPathHandles);

      switch (actionId) {
        case "duplicate":
          if (selectedIds.length > 0 && allowsFigUserOperation(operationDomain, "duplicate-selection")) {
            dispatch({ type: "DUPLICATE_NODES", nodeIds: selectedIds });
          }
          break;
        case "copy":
          if (allowsFigUserOperation(operationDomain, "copy-selection")) {
            dispatch({ type: "COPY" });
          }
          break;
        case "paste":
          if (allowsFigUserOperation(operationDomain, "paste")) {
            dispatch({ type: "PASTE" });
          }
          break;
        case "delete":
          if (selectedIds.length > 0 && allowsFigUserOperation(operationDomain, "delete-selection")) {
            dispatch({ type: "DELETE_NODES", nodeIds: selectedIds });
          }
          break;
        case "group":
          if (allowsFigUserOperation(operationDomain, "group-selection")) { dispatch({ type: "GROUP_SELECTION" }); }
          break;
        case "make-component":
          if (allowsFigUserOperation(operationDomain, "make-component")) { dispatch({ type: "MAKE_COMPONENT_FROM_SELECTION" }); }
          break;
        case "make-symbol":
          if (allowsFigUserOperation(operationDomain, "make-symbol")) { dispatch({ type: "MAKE_SYMBOL_FROM_SELECTION" }); }
          break;
        case "outline":
          if (allowsFigUserOperation(operationDomain, "outline-selection")) { dispatch({ type: "OUTLINE_SELECTION" }); }
          break;
        case "boolean-union":
          if (allowsFigUserOperation(operationDomain, "boolean-operation")) { dispatch({ type: "BOOLEAN_OPERATION_SELECTION", operation: "UNION" }); }
          break;
        case "boolean-subtract":
          if (allowsFigUserOperation(operationDomain, "boolean-operation")) { dispatch({ type: "BOOLEAN_OPERATION_SELECTION", operation: "SUBTRACT" }); }
          break;
        case "boolean-intersect":
          if (allowsFigUserOperation(operationDomain, "boolean-operation")) { dispatch({ type: "BOOLEAN_OPERATION_SELECTION", operation: "INTERSECT" }); }
          break;
        case "boolean-exclude":
          if (allowsFigUserOperation(operationDomain, "boolean-operation")) { dispatch({ type: "BOOLEAN_OPERATION_SELECTION", operation: "EXCLUDE" }); }
          break;
        case "edit-vector-path":
          if (allowsFigUserOperation(operationDomain, "set-tool")) { dispatch({ type: "SET_CREATION_MODE", mode: { type: "pen" } }); }
          break;
        case "add-vector-point":
          if (selectedIds.length === 1 && contextMenu) {
            addVectorPointAtPagePoint(selectedIds[0], { x: contextMenu.pageX, y: contextMenu.pageY });
          }
          break;
        case "convert-vector-point-curve":
          if (selectedIds.length === 1 && vectorHandle) {
            const handle = vectorHandle;
            dispatch({
              type: "UPDATE_NODE",
        source: "path-edit",
              nodeId: selectedIds[0],
              updater: (node) => updateVectorPathCommands({
                node,
                pathIndex: handle.pathIndex,
                update: (commands) => convertEditableSegmentToCurve(commands, handle.commandIndex),
              }),
            });
          }
          break;
        case "convert-vector-point-line":
          if (selectedIds.length === 1 && vectorHandle) {
            const handle = vectorHandle;
            dispatch({
              type: "UPDATE_NODE",
        source: "path-edit",
              nodeId: selectedIds[0],
              updater: (node) => updateVectorPathCommands({
                node,
                pathIndex: handle.pathIndex,
                update: (commands) => convertEditableSegmentToLine(commands, handle.commandIndex),
              }),
            });
          }
          break;
        case "delete-vector-point":
          if (selectedIds.length === 1 && vectorHandle) {
            const handle = vectorHandle;
            dispatch({
              type: "UPDATE_NODE",
        source: "path-edit",
              nodeId: selectedIds[0],
              updater: (node) => updateVectorPathCommands({
                node,
                pathIndex: handle.pathIndex,
                update: (commands) => deleteEditableAnchorCommand(commands, handle.commandIndex),
              }),
            });
          }
          break;
        case "close-vector-path":
          if (selectedIds.length === 1) {
            dispatch({
              type: "UPDATE_NODE",
        source: "path-edit",
              nodeId: selectedIds[0],
              updater: (node) => updateVectorPathCommands({
                node,
                pathIndex: vectorHandle?.pathIndex ?? 0,
                update: (commands) => setEditablePathClosed(commands, true),
              }),
            });
          }
          break;
        case "open-vector-path":
          if (selectedIds.length === 1) {
            dispatch({
              type: "UPDATE_NODE",
        source: "path-edit",
              nodeId: selectedIds[0],
              updater: (node) => updateVectorPathCommands({
                node,
                pathIndex: vectorHandle?.pathIndex ?? 0,
                update: (commands) => setEditablePathClosed(commands, false),
              }),
            });
          }
          break;
        case "bring-to-front":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "front" });
          }
          break;
        case "bring-forward":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "forward" });
          }
          break;
        case "send-backward":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "backward" });
          }
          break;
        case "send-to-back":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "back" });
          }
          break;
      }
      setContextMenu(null);
    },
    [addVectorPointAtPagePoint, contextMenu, dispatch, nodeSelection.selectedIds, operationDomain, vectorPathHandles],
  );

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  // =========================================================================
  // Marquee selection
  // =========================================================================

  const handleMarqueeSelect = useCallback(
    (
      result: {
        readonly itemIds: readonly string[];
        readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
      },
      additive: boolean,
    ) => {
      if (!allowsFigUserOperation(operationDomain, "marquee-select")) {
        return;
      }
      const selectableIds = resolveSelectableMarqueeIds({
        activePage,
        itemIds: result.itemIds,
      });

      if (selectableIds.length > 0) {
        if (additive) {
          // Add to existing selection
          const existingIds = new Set(nodeSelection.selectedIds);
          const newIds = selectableIds.filter((id) => !existingIds.has(id as FigNodeId));
          if (newIds.length > 0) {
            dispatch({
              type: "SELECT_MULTIPLE_NODES",
              nodeIds: [
                ...nodeSelection.selectedIds,
                ...newIds as FigNodeId[],
              ],
            });
          }
        } else {
          dispatch({
            type: "SELECT_MULTIPLE_NODES",
            nodeIds: selectableIds as FigNodeId[],
            primaryId: selectableIds[0] as FigNodeId,
          });
        }
      } else if (!additive) {
        dispatch({ type: "CLEAR_NODE_SELECTION" });
      }
    },
    [activePage, dispatch, nodeSelection.selectedIds, operationDomain],
  );

  // =========================================================================
  // Resize & rotate handle start
  // =========================================================================

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, coords: CanvasPageCoords, _e: React.PointerEvent) => {
      if (!allowsFigUserOperation(operationDomain, "start-resize")) {
        return;
      }
      dispatch({
        type: "START_PENDING_RESIZE",
        handle,
        startX: coords.pageX,
        startY: coords.pageY,
        startClientX: coords.clientX,
        startClientY: coords.clientY,
        aspectLocked: false,
      });
    },
    [dispatch, operationDomain],
  );

  const handleRotateStart = useCallback(
    (coords: CanvasPageCoords, _e: React.PointerEvent) => {
      if (!allowsFigUserOperation(operationDomain, "start-rotate")) {
        return;
      }
      dispatch({
        type: "START_PENDING_ROTATE",
        startX: coords.pageX,
        startY: coords.pageY,
        startClientX: coords.clientX,
        startClientY: coords.clientY,
      });
    },
    [dispatch, operationDomain],
  );

  // =========================================================================
  // Global drag tracking (item move)
  // =========================================================================

  const handleItemDragMove = useCallback(
    (coords: CanvasPageCoords) => {
      if (!allowsFigUserOperation(operationDomain, "preview-move")) {
        return;
      }
      const d = dragRef.current;
      if (d.type === "pending-move") {
        if (exceedsThreshold({ startClientX: d.startClientX, startClientY: d.startClientY, clientX: coords.clientX, clientY: coords.clientY })) {
          dispatch({ type: "CONFIRM_MOVE" });
          dispatch({
            type: "PREVIEW_MOVE",
            dx: coords.pageX - d.startX,
            dy: coords.pageY - d.startY,
          });
        }
        return;
      }
      if (d.type === "move") {
        dispatch({
          type: "PREVIEW_MOVE",
          dx: coords.pageX - d.startX,
          dy: coords.pageY - d.startY,
        });
      }
    },
    [dispatch, operationDomain],
  );

  const handleItemDragEnd = useCallback(
    (_coords: CanvasPageCoords) => {
      const d = dragRef.current;
      if (d.type === "move" && allowsFigUserOperation(operationDomain, "commit-transform")) {
        dispatch({ type: "COMMIT_DRAG" });
      } else {
        dispatch({ type: "END_DRAG" });
      }
    },
    [dispatch, operationDomain],
  );

  // =========================================================================
  // Global drag tracking (resize)
  // =========================================================================

  const handleResizeDragMove = useCallback(
    (_handle: ResizeHandlePosition, coords: CanvasPageCoords) => {
      if (!allowsFigUserOperation(operationDomain, "preview-resize")) {
        return;
      }
      const d = dragRef.current;
      if (d.type === "pending-resize") {
        if (exceedsThreshold({ startClientX: d.startClientX, startClientY: d.startClientY, clientX: coords.clientX, clientY: coords.clientY })) {
          dispatch({ type: "CONFIRM_RESIZE" });
          dispatch({
            type: "PREVIEW_RESIZE",
            dx: coords.pageX - d.startX,
            dy: coords.pageY - d.startY,
          });
        }
        return;
      }
      if (d.type === "resize") {
        dispatch({
          type: "PREVIEW_RESIZE",
          dx: coords.pageX - d.startX,
          dy: coords.pageY - d.startY,
        });
      }
    },
    [dispatch, operationDomain],
  );

  const handleResizeDragEnd = useCallback(
    (_handle: ResizeHandlePosition, _coords: CanvasPageCoords) => {
      const d = dragRef.current;
      if (d.type === "resize" && allowsFigUserOperation(operationDomain, "commit-transform")) {
        dispatch({ type: "COMMIT_DRAG" });
      } else {
        dispatch({ type: "END_DRAG" });
      }
    },
    [dispatch, operationDomain],
  );

  // =========================================================================
  // Global drag tracking (rotate)
  // =========================================================================

  const handleRotateDragMove = useCallback(
    (coords: CanvasPageCoords) => {
      if (!allowsFigUserOperation(operationDomain, "preview-rotate")) {
        return;
      }
      const d = dragRef.current;
      if (d.type === "pending-rotate") {
        if (exceedsThreshold({ startClientX: d.startClientX, startClientY: d.startClientY, clientX: coords.clientX, clientY: coords.clientY })) {
          dispatch({ type: "CONFIRM_ROTATE" });
          // Compute angle from center to pointer
          const centerX = (d as { centerX?: number }).centerX ?? 0;
          const centerY = (d as { centerY?: number }).centerY ?? 0;
          const angle = Math.atan2(coords.pageY - centerY, coords.pageX - centerX) * (180 / Math.PI);
          dispatch({ type: "PREVIEW_ROTATE", currentAngle: angle });
        }
        return;
      }
      if (d.type === "rotate") {
        const centerX = (d as { centerX?: number }).centerX ?? 0;
        const centerY = (d as { centerY?: number }).centerY ?? 0;
        const angle = Math.atan2(coords.pageY - centerY, coords.pageX - centerX) * (180 / Math.PI);
        dispatch({ type: "PREVIEW_ROTATE", currentAngle: angle });
      }
    },
    [dispatch, operationDomain],
  );

  const handleRotateDragEnd = useCallback(
    (_coords: CanvasPageCoords) => {
      const d = dragRef.current;
      if (d.type === "rotate" && allowsFigUserOperation(operationDomain, "commit-transform")) {
        dispatch({ type: "COMMIT_DRAG" });
      } else {
        dispatch({ type: "END_DRAG" });
      }
    },
    [dispatch, operationDomain],
  );

  // =========================================================================
  // Determine if rotate handle should show
  // =========================================================================

  // =========================================================================
  // Text edit overlay
  // =========================================================================

  const textEditOverlay = useMemo(() => {
    if (textEdit.type !== "active" || !activePage) {
      return undefined;
    }

    const editingNodeId = textEdit.nodeId;
    const editingNode = findNodeById(activePage.children, editingNodeId);
    if (!editingNode || editingNode.type !== "TEXT") {
      return undefined;
    }

    const bounds = computeAbsoluteNodeBounds(activePage.children, editingNodeId);
    if (!bounds) {
      return undefined;
    }

    return (
      <FigTextEditOverlay
        key="text-edit"
        node={editingNode}
        bounds={bounds}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        dispatch={dispatch}
      />
    );
  }, [textEdit, activePage, canvasSize, dispatch]);

  // =========================================================================
  // Determine if rotate handle should show
  // =========================================================================

  // In Figma, frames cannot be rotated. Show rotate handle only for non-frame nodes.
  const showRotateHandle = useMemo(() => {
    if (nodeSelection.selectedIds.length === 0) {return false;}
    if (!activePage) {return false;}
    // If any selected node is a frame/component/symbol, hide rotate
    const frameTypes = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "SYMBOL"]);
    return !nodeSelection.selectedIds.some((id) => {
      const node = findNodeById(activePage.children, id);
      return node && frameTypes.has(node.type);
    });
  }, [nodeSelection.selectedIds, activePage]);

  const viewportContent = useMemo(() => {
    if (!activePage || !sceneGraph) {
      return undefined;
    }
    return (
      <FigPageRenderer
        page={activePage}
        canvasWidth={canvasSize.renderWidth}
        canvasHeight={canvasSize.renderHeight}
        images={document.images}
        blobs={document.blobs}
        symbolMap={document.components}
        styleRegistry={document.styleRegistry}
        renderer={renderer}
        sceneGraph={sceneGraph}
        viewportX={canvasSize.renderX}
        viewportY={canvasSize.renderY}
        viewportScale={viewportScale}
        textFontResolver={textFontResolver}
      />
    );
  }, [activePage, sceneGraph, renderer, canvasSize, document.images, document.blobs, document.components, document.styleRegistry, viewportScale, textFontResolver]);

  const pathInteractionOverlay = useMemo(() => (
    <>
      {editableVectorPathOverlays.length > 0 && (
        <g>
          {editableVectorPathOverlays.map((path) => (
            <path
              key={path.key}
              role="button"
              aria-label={`Editable vector path segment ${path.pathIndex + 1}`}
              d={path.data}
              transform={path.transform}
              fill="none"
              stroke={VECTOR_PATH_OVERLAY_STYLE.segmentHitStroke}
              strokeWidth={screenPxToPagePx(VECTOR_PATH_OVERLAY_STYLE.segmentHitStrokeWidthPx, viewportScale)}
              vectorEffect="non-scaling-stroke"
              pointerEvents="stroke"
              style={{ cursor: "crosshair" }}
              onPointerDown={(event) => handleEditablePathPointerDown(path.pathIndex, event)}
            />
          ))}
        </g>
      )}

      {vectorPathControlLines.length > 0 && (
        <g pointerEvents="none">
          {vectorPathControlLines.map((line) => (
            <line
              key={line.key}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke={VECTOR_PATH_OVERLAY_STYLE.selectionColor}
              strokeWidth={screenPxToPagePx(VECTOR_PATH_OVERLAY_STYLE.controlLineStrokeWidthPx, viewportScale)}
              strokeDasharray={screenDashToPageDash(VECTOR_PATH_OVERLAY_STYLE.controlLineDashPx, viewportScale)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      {vectorPathHandles.length > 0 && (
        <g>
          {vectorPathHandles.map((handle) => (
            <circle
              key={handle.key}
              role="button"
              aria-label={getVectorHandleAriaLabel(handle)}
              tabIndex={0}
              cx={handle.x}
              cy={handle.y}
              r={screenPxToPagePx(handle.role === "control" ? VECTOR_PATH_OVERLAY_STYLE.controlRadiusPx : VECTOR_PATH_OVERLAY_STYLE.anchorRadiusPx, viewportScale)}
              fill={handle.role === "control" ? VECTOR_PATH_OVERLAY_STYLE.selectionColor : VECTOR_PATH_OVERLAY_STYLE.anchorFill}
              stroke={VECTOR_PATH_OVERLAY_STYLE.selectionColor}
              strokeWidth={screenPxToPagePx(VECTOR_PATH_OVERLAY_STYLE.handleStrokeWidthPx, viewportScale)}
              vectorEffect="non-scaling-stroke"
              pointerEvents="all"
              style={{ cursor: "move" }}
              onPointerDown={(event) => handleVectorPathHandlePointerDown(handle, event)}
              onMouseDown={(event) => handleVectorPathHandleMouseDown(handle, event)}
              onContextMenu={(event) => handleVectorPathHandleContextMenu(handle, event)}
            />
          ))}
        </g>
      )}
    </>
  ), [
    editableVectorPathOverlays,
    handleEditablePathPointerDown,
    handleVectorPathHandleContextMenu,
    handleVectorPathHandleMouseDown,
    handleVectorPathHandlePointerDown,
    vectorPathControlLines,
    vectorPathHandles,
    viewportScale,
  ]);

  return (
    <>
      <EditorCanvas
        ref={canvasRef}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        clampFn={NO_CLAMP}
        rulerCoordinateMode="unbounded"
        zoomMode={zoomMode}
        onZoomModeChange={setZoomMode}
        onViewportChange={(viewport) => setViewportScale(viewport.scale)}
        itemBounds={itemBounds}
        selectedIds={nodeSelection.selectedIds}
        primaryId={nodeSelection.primaryId}
        drag={drag}
        isInteracting={drag.type !== "idle"}
        isTextEditing={textEdit.type === "active"}
        selectionInteractionEnabled={interactionPolicy.selectionChromeInteractive}
        showRotateHandle={showRotateHandle}
        onItemPointerDown={handleItemPointerDown}
        onItemClick={handleItemClick}
        onItemDoubleClick={handleDoubleClick}
        onCanvasPointerDown={handleCanvasPointerDown}
        onCanvasClick={handleCanvasClick}
        onItemContextMenu={handleItemContextMenu}
        onContextMenu={handleCanvasContextMenu}
        onResizeStart={handleResizeStart}
        onRotateStart={handleRotateStart}
        onItemDragMove={handleItemDragMove}
        onItemDragEnd={handleItemDragEnd}
        onResizeDragMove={handleResizeDragMove}
        onResizeDragEnd={handleResizeDragEnd}
        onRotateDragMove={handleRotateDragMove}
        onRotateDragEnd={handleRotateDragEnd}
        enableMarquee={interactionPolicy.marqueeEnabled}
        onMarqueeSelect={handleMarqueeSelect}
        viewportOverlay={textEditOverlay}
        viewportContent={viewportContent}
        interactionOverlay={pathInteractionOverlay}
      >
        {/* Inspector / custom canvas overlay (page-coord space) */}
        {canvasOverlay}

        {/* Creation drag preview rectangle */}
        {creationPreview && creationPreview.width > 0 && creationPreview.height > 0 && (
          <rect
            x={creationPreview.x}
            y={creationPreview.y}
            width={creationPreview.width}
            height={creationPreview.height}
            fill={VECTOR_PATH_OVERLAY_STYLE.previewFill}
            stroke={VECTOR_PATH_OVERLAY_STYLE.selectionColor}
            strokeWidth={VECTOR_PATH_OVERLAY_STYLE.controlLineStrokeWidthPx}
            strokeDasharray={VECTOR_PATH_OVERLAY_STYLE.creationPreviewDashPx.join(" ")}
            pointerEvents="none"
          />
        )}
        {vectorPathDrawPreview && (
          <path
            d={vectorPathDraftToPreviewPath(vectorPathDrawPreview)}
            fill="none"
            stroke={VECTOR_PATH_OVERLAY_STYLE.selectionColor}
            strokeWidth={screenPxToPagePx(VECTOR_PATH_OVERLAY_STYLE.controlLineStrokeWidthPx, viewportScale)}
            strokeDasharray={screenDashToPageDash(VECTOR_PATH_OVERLAY_STYLE.creationPreviewDashPx, viewportScale)}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
      </EditorCanvas>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onAction={handleContextMenuAction}
          onClose={handleContextMenuClose}
        />
      )}
    </>
  );
}
