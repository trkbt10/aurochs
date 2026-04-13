/**
 * @file Drag action handlers
 *
 * Handles drag state transitions: pending -> active -> preview -> commit/end.
 * Uses DragState from editor-core/drag-state.
 */

import { createIdleDragState } from "@aurochs-ui/editor-core/drag-state";
import type { SimpleBounds } from "@aurochs-ui/editor-core/geometry";
import { calculateResizedDimensions } from "@aurochs-ui/editor-core/geometry";
import { normalizeAngle } from "@aurochs-ui/editor-core/geometry";
import { pushHistory, replacePresent } from "@aurochs-ui/editor-core/history";
import { updateNode } from "@aurochs-builder/fig/node-ops";
import type { FigNodeId } from "@aurochs/fig/domain";
import type { HandlerMap } from "./handler-types";
import { getAbsoluteNodeBounds } from "../node-geometry";

export const DRAG_HANDLERS: HandlerMap = {
  START_PENDING_MOVE(state, action) {
    const selectedIds = state.nodeSelection.selectedIds;
    if (selectedIds.length === 0) {
      return state;
    }

    const doc = state.documentHistory.present;
    const page = doc.pages.find((p) => p.id === state.activePageId);
    if (!page) {
      return state;
    }

    const initialBounds = new Map<FigNodeId, SimpleBounds>();
    for (const id of selectedIds) {
      const bounds = getAbsoluteNodeBounds(page.children, id);
      if (bounds) {
        initialBounds.set(id, bounds);
      }
    }

    return {
      ...state,
      drag: {
        type: "pending-move",
        startX: action.startX,
        startY: action.startY,
        startClientX: action.startClientX,
        startClientY: action.startClientY,
        shapeIds: selectedIds,
        initialBounds,
      },
    };
  },

  CONFIRM_MOVE(state) {
    if (state.drag.type !== "pending-move") {
      return state;
    }
    return {
      ...state,
      drag: {
        type: "move",
        startX: state.drag.startX,
        startY: state.drag.startY,
        shapeIds: state.drag.shapeIds,
        initialBounds: state.drag.initialBounds,
        previewDelta: { dx: 0, dy: 0 },
      },
    };
  },

  START_PENDING_RESIZE(state, action) {
    const selectedIds = state.nodeSelection.selectedIds;
    if (selectedIds.length === 0) {
      return state;
    }

    const doc = state.documentHistory.present;
    const page = doc.pages.find((p) => p.id === state.activePageId);
    if (!page) {
      return state;
    }

    const initialBoundsMap = new Map<FigNodeId, SimpleBounds>();
    for (const id of selectedIds) {
      const bounds = getAbsoluteNodeBounds(page.children, id);
      if (bounds) {
        initialBoundsMap.set(id, bounds);
      }
    }

    const primaryId = state.nodeSelection.primaryId ?? selectedIds[0];
    const primaryBounds = initialBoundsMap.get(primaryId) ?? { x: 0, y: 0, width: 0, height: 0, rotation: 0 };

    // Compute combined bounds
    const allBounds = [...initialBoundsMap.values()];
    const combinedBounds = computeCombinedBounds(allBounds);

    return {
      ...state,
      drag: {
        type: "pending-resize",
        handle: action.handle,
        startX: action.startX,
        startY: action.startY,
        startClientX: action.startClientX,
        startClientY: action.startClientY,
        shapeIds: selectedIds,
        initialBoundsMap,
        combinedBounds,
        aspectLocked: action.aspectLocked,
        shapeId: primaryId,
        initialBounds: primaryBounds,
      },
    };
  },

  CONFIRM_RESIZE(state) {
    if (state.drag.type !== "pending-resize") {
      return state;
    }
    return {
      ...state,
      drag: {
        type: "resize",
        handle: state.drag.handle,
        startX: state.drag.startX,
        startY: state.drag.startY,
        shapeIds: state.drag.shapeIds,
        initialBoundsMap: state.drag.initialBoundsMap,
        combinedBounds: state.drag.combinedBounds,
        aspectLocked: state.drag.aspectLocked,
        shapeId: state.drag.shapeId,
        initialBounds: state.drag.initialBounds,
        previewDelta: { dx: 0, dy: 0 },
      },
    };
  },

  START_PENDING_ROTATE(state, action) {
    const selectedIds = state.nodeSelection.selectedIds;
    if (selectedIds.length === 0) {
      return state;
    }

    const doc = state.documentHistory.present;
    const page = doc.pages.find((p) => p.id === state.activePageId);
    if (!page) {
      return state;
    }

    const initialBoundsMap = new Map<FigNodeId, SimpleBounds>();
    const initialRotationsMap = new Map<FigNodeId, number>();
    for (const id of selectedIds) {
      const bounds = getAbsoluteNodeBounds(page.children, id);
      if (bounds) {
        initialBoundsMap.set(id, { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
        initialRotationsMap.set(id, bounds.rotation);
      }
    }

    const primaryId = state.nodeSelection.primaryId ?? selectedIds[0];
    const primaryRotation = initialRotationsMap.get(primaryId) ?? 0;

    // Combined center
    const allBounds = [...initialBoundsMap.values()];
    const combined = computeCombinedBounds(allBounds);
    const centerX = combined.x + combined.width / 2;
    const centerY = combined.y + combined.height / 2;

    // Compute start angle from pointer to combined center
    const startAngle = Math.atan2(action.startY - centerY, action.startX - centerX) * (180 / Math.PI);

    return {
      ...state,
      drag: {
        type: "pending-rotate",
        startX: action.startX,
        startY: action.startY,
        startClientX: action.startClientX,
        startClientY: action.startClientY,
        startAngle,
        shapeIds: selectedIds,
        initialRotationsMap,
        initialBoundsMap,
        centerX,
        centerY,
        shapeId: primaryId,
        initialRotation: primaryRotation,
      },
    };
  },

  CONFIRM_ROTATE(state) {
    if (state.drag.type !== "pending-rotate") {
      return state;
    }
    return {
      ...state,
      drag: {
        type: "rotate",
        startAngle: state.drag.startAngle,
        shapeIds: state.drag.shapeIds,
        initialRotationsMap: state.drag.initialRotationsMap,
        initialBoundsMap: state.drag.initialBoundsMap,
        centerX: state.drag.centerX,
        centerY: state.drag.centerY,
        shapeId: state.drag.shapeId,
        initialRotation: state.drag.initialRotation,
        previewAngleDelta: 0,
      },
    };
  },

  PREVIEW_MOVE(state, action) {
    if (state.drag.type !== "move") {
      return state;
    }
    return {
      ...state,
      drag: {
        ...state.drag,
        previewDelta: { dx: action.dx, dy: action.dy },
      },
    };
  },

  PREVIEW_RESIZE(state, action) {
    if (state.drag.type !== "resize") {
      return state;
    }
    return {
      ...state,
      drag: {
        ...state.drag,
        previewDelta: { dx: action.dx, dy: action.dy },
      },
    };
  },

  PREVIEW_ROTATE(state, action) {
    if (state.drag.type !== "rotate") {
      return state;
    }
    return {
      ...state,
      drag: {
        ...state.drag,
        previewAngleDelta: action.currentAngle - state.drag.startAngle,
      },
    };
  },

  COMMIT_DRAG(state) {
    const pageId = state.activePageId;
    if (!pageId) {
      return { ...state, drag: createIdleDragState() };
    }

    let doc = state.documentHistory.present;

    if (state.drag.type === "move") {
      const { dx, dy } = state.drag.previewDelta;
      for (const nodeId of state.drag.shapeIds) {
        doc = updateNode(doc, pageId, nodeId, (node) => ({
          ...node,
          transform: {
            ...node.transform,
            m02: node.transform.m02 + dx,
            m12: node.transform.m12 + dy,
          },
        }));
      }
    }

    if (state.drag.type === "resize") {
      const { handle, previewDelta, initialBoundsMap, combinedBounds: cb, aspectLocked } = state.drag;
      const { dx, dy } = previewDelta;

      // Compute scale factors from the combined bounds resize
      const { newWidth, newHeight, newX, newY } = calculateResizedDimensions({
        handle,
        baseW: cb.width,
        baseH: cb.height,
        baseX: cb.x,
        baseY: cb.y,
        dx,
        dy,
        aspectLocked,
      });

      const scaleX = cb.width > 0 ? newWidth / cb.width : 1;
      const scaleY = cb.height > 0 ? newHeight / cb.height : 1;

      for (const nodeId of state.drag.shapeIds) {
        const initial = initialBoundsMap.get(nodeId);
        if (!initial) {
          continue;
        }

        // Compute new absolute position and size
        const relX = initial.x - cb.x;
        const relY = initial.y - cb.y;
        const absNewX = newX + relX * scaleX;
        const absNewY = newY + relY * scaleY;
        const newW = initial.width * scaleX;
        const newH = initial.height * scaleY;

        // Apply as delta to the local transform (works for non-rotated parents)
        const absDx = absNewX - initial.x;
        const absDy = absNewY - initial.y;

        doc = updateNode(doc, pageId, nodeId, (node) => ({
          ...node,
          transform: {
            ...node.transform,
            m02: node.transform.m02 + absDx,
            m12: node.transform.m12 + absDy,
          },
          size: { x: newW, y: newH },
        }));
      }
    }

    if (state.drag.type === "rotate") {
      const { previewAngleDelta, initialRotationsMap } = state.drag;

      for (const nodeId of state.drag.shapeIds) {
        const initialRotation = initialRotationsMap.get(nodeId);
        if (initialRotation === undefined) {
          continue;
        }

        const newAngle = normalizeAngle(initialRotation + previewAngleDelta);
        const radians = (newAngle * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        doc = updateNode(doc, pageId, nodeId, (node) => ({
          ...node,
          transform: {
            ...node.transform,
            m00: cos,
            m01: -sin,
            m10: sin,
            m11: cos,
          },
        }));
      }
    }

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, doc),
      drag: createIdleDragState(),
    };
  },

  END_DRAG(state) {
    return {
      ...state,
      drag: createIdleDragState(),
    };
  },

  START_MARQUEE(state, action) {
    return {
      ...state,
      drag: {
        type: "marquee",
        startX: action.startX,
        startY: action.startY,
        currentX: action.startX,
        currentY: action.startY,
        additive: action.additive,
        confirmed: false,
      },
    };
  },

  UPDATE_MARQUEE(state, action) {
    if (state.drag.type !== "marquee") {
      return state;
    }
    return {
      ...state,
      drag: {
        ...state.drag,
        currentX: action.currentX,
        currentY: action.currentY,
        confirmed: true,
      },
    };
  },

  END_MARQUEE(state) {
    if (state.drag.type !== "marquee") {
      return { ...state, drag: createIdleDragState() };
    }
    // Selection based on marquee rect is handled by the canvas component
    return { ...state, drag: createIdleDragState() };
  },

  START_CREATE_DRAG(state, action) {
    return {
      ...state,
      drag: {
        type: "create",
        startX: action.startX,
        startY: action.startY,
        currentX: action.startX,
        currentY: action.startY,
        confirmed: false,
      },
    };
  },

  UPDATE_CREATE_DRAG(state, action) {
    if (state.drag.type !== "create") {
      return state;
    }
    return {
      ...state,
      drag: {
        ...state.drag,
        currentX: action.currentX,
        currentY: action.currentY,
        confirmed: true,
      },
    };
  },

  END_CREATE_DRAG(state) {
    return { ...state, drag: createIdleDragState() };
  },
};

// =============================================================================
// Helpers
// =============================================================================

function computeCombinedBounds(bounds: readonly SimpleBounds[]): SimpleBounds {
  if (bounds.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  if (bounds.length === 1) {
    return bounds[0];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
