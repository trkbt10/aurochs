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

/**
 * Build a NodeSpec from creation mode and drag bounds.
 *
 * Each creation mode maps to a specific NodeSpec type with sensible defaults.
 * The x/y/width/height come from the user's drag gesture on the canvas.
 */
function buildNodeSpecFromCreationMode(
  mode: FigCreationMode,
  x: number,
  y: number,
  width: number,
  height: number,
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

    const spec = buildNodeSpecFromCreationMode(
      state.creationMode,
      x,
      y,
      finalWidth,
      finalHeight,
    );

    if (!spec) {
      return {
        ...state,
        drag: createIdleDragState(),
        creationMode: createSelectMode(),
      };
    }

    const doc = state.documentHistory.present;
    const result = addNode(doc, pageId, null, spec);

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, result.doc),
      nodeSelection: createSingleSelection(result.nodeId),
      drag: createIdleDragState(),
      creationMode: createSelectMode(),
    };
  },
};
