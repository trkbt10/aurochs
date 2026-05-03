/**
 * @file Creation mode action handlers
 *
 * Handles creation mode selection and shape creation from drag bounds.
 * When the user drags on the canvas in a creation mode, the drag handlers
 * track the rectangle. On completion, COMMIT_CREATION receives the final
 * bounds and creates the appropriate node based on the active creation mode.
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createSingleSelection } from "@aurochs-ui/editor-core/selection";
import { createIdleDragState } from "@aurochs-ui/editor-core/drag-state";
import { addNode } from "@aurochs-builder/fig/node-ops";
import type { NodeSpec } from "@aurochs-builder/fig/types";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import type { HandlerMap } from "./handler-types";
import { createSelectMode, type FigCreationMode } from "../types";

/**
 * Minimum shape dimension to create. Prevents accidental zero-size shapes
 * from single clicks in creation mode.
 */
const MIN_CREATION_SIZE = 2;

/**
 * Default dimensions for shapes created by single click (no drag).
 */
const DEFAULT_SHAPE_SIZE = 100;
const CONTAINER_TYPES = new Set<FigDesignNode["type"]>(["FRAME", "COMPONENT", "COMPONENT_SET", "SYMBOL"]);
const IDENTITY_MATRIX: FigMatrix = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };

type BuildNodeSpecFromCreationModeOptions = {
  readonly mode: FigCreationMode;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Build a NodeSpec from creation mode and drag bounds.
 *
 * Each creation mode maps to a specific NodeSpec type with sensible defaults.
 * The x/y/width/height come from the user's drag gesture on the canvas.
 */
function buildNodeSpecFromCreationMode(
  { mode, x, y, width, height }: BuildNodeSpecFromCreationModeOptions,
): NodeSpec | null {
  switch (mode.type) {
    case "rectangle":
      return { type: "RECTANGLE", name: "Rectangle", x, y, width, height };
    case "ellipse":
      return { type: "ELLIPSE", name: "Ellipse", x, y, width, height };
    case "line":
      return { type: "LINE", name: "Line", x, y, width: width, height: 0 };
    case "star":
      return { type: "STAR", name: "Star", x, y, width, height, pointCount: 5 };
    case "polygon":
      return { type: "REGULAR_POLYGON", name: "Polygon", x, y, width, height, pointCount: 6 };
    case "frame":
      return { type: "FRAME", name: "Frame", x, y, width, height };
    case "text":
      return {
        type: "TEXT",
        name: "Text",
        x,
        y,
        width: Math.max(width, 100),
        height: Math.max(height, 24),
        characters: "",
        fontSize: 16,
        fontFamily: "Inter",
        fontStyle: "Regular",
      };
    case "select":
    case "pen":
      return null;
  }
}

function composeTransforms(parent: FigMatrix, child: FigMatrix): FigMatrix {
  return {
    m00: parent.m00 * child.m00 + parent.m01 * child.m10,
    m01: parent.m00 * child.m01 + parent.m01 * child.m11,
    m02: parent.m00 * child.m02 + parent.m01 * child.m12 + parent.m02,
    m10: parent.m10 * child.m00 + parent.m11 * child.m10,
    m11: parent.m10 * child.m01 + parent.m11 * child.m11,
    m12: parent.m10 * child.m02 + parent.m11 * child.m12 + parent.m12,
  };
}

function pointToLocal(transform: FigMatrix, x: number, y: number): { readonly x: number; readonly y: number } | undefined {
  const det = transform.m00 * transform.m11 - transform.m01 * transform.m10;
  if (Math.abs(det) < 1e-9) {
    return undefined;
  }
  const dx = x - transform.m02;
  const dy = y - transform.m12;
  return {
    x: (transform.m11 * dx - transform.m01 * dy) / det,
    y: (-transform.m10 * dx + transform.m00 * dy) / det,
  };
}

function findDeepestContainingContainer({
  nodes,
  x,
  y,
  parentTransform = IDENTITY_MATRIX,
}: {
  readonly nodes: readonly FigDesignNode[];
  readonly x: number;
  readonly y: number;
  readonly parentTransform?: FigMatrix;
}): { readonly nodeId: FigNodeId; readonly transform: FigMatrix } | undefined {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]!;
    if (!node.visible) {
      continue;
    }
    const absTransform = composeTransforms(parentTransform, node.transform);
    const nested = findDeepestNestedContainer({ node, x, y, parentTransform: absTransform });
    if (nested) {
      return nested;
    }
    if (!CONTAINER_TYPES.has(node.type)) {
      continue;
    }
    const local = pointToLocal(absTransform, x, y);
    if (local && local.x >= 0 && local.y >= 0 && local.x <= node.size.x && local.y <= node.size.y) {
      return { nodeId: node.id, transform: absTransform };
    }
  }
  return undefined;
}

function findDeepestNestedContainer({
  node,
  x,
  y,
  parentTransform,
}: {
  readonly node: FigDesignNode;
  readonly x: number;
  readonly y: number;
  readonly parentTransform: FigMatrix;
}): { readonly nodeId: FigNodeId; readonly transform: FigMatrix } | undefined {
  if (!node.children) {
    return undefined;
  }
  return findDeepestContainingContainer({ nodes: node.children, x, y, parentTransform });
}

export const CREATION_HANDLERS: HandlerMap = {
  SET_CREATION_MODE(state, action) {
    return {
      ...state,
      creationMode: action.mode,
    };
  },

  COMMIT_CREATION(state, action) {
    const pageId = state.activePageId;
    if (!pageId) {
      return { ...state, drag: createIdleDragState() };
    }

    const { x, y, width, height } = action;

    // Use default size if drag was too small (single click)
    const finalWidth = width < MIN_CREATION_SIZE ? DEFAULT_SHAPE_SIZE : width;
    const finalHeight = height < MIN_CREATION_SIZE ? DEFAULT_SHAPE_SIZE : height;

    const doc = state.documentHistory.present;
    const page = doc.pages.find((p) => p.id === pageId);
    if (!page) {
      return { ...state, drag: createIdleDragState(), creationMode: createSelectMode() };
    }

    const parent = findDeepestContainingContainer({ nodes: page.children, x, y });
    const localOrigin = parent ? pointToLocal(parent.transform, x, y) : undefined;

    const spec = buildNodeSpecFromCreationMode({
      mode: state.creationMode,
      x: localOrigin?.x ?? x,
      y: localOrigin?.y ?? y,
      width: finalWidth,
      height: finalHeight,
    });

    if (!spec) {
      return {
        ...state,
        drag: createIdleDragState(),
        creationMode: createSelectMode(),
      };
    }

    const result = addNode({ doc, pageId, parentId: parent?.nodeId ?? null, spec });

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, result.doc),
      nodeSelection: createSingleSelection(result.nodeId),
      drag: createIdleDragState(),
      creationMode: createSelectMode(),
      textEdit: state.creationMode.type === "text" ? { type: "active", nodeId: result.nodeId } : state.textEdit,
    };
  },
};
