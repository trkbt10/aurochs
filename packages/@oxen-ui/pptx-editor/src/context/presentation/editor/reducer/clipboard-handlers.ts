/**
 * @file Clipboard handlers
 *
 * Handlers for copy and paste operations.
 */

import type { Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";
import type { PresentationEditorState } from "../types";
import type { HandlerMap } from "./handler-types";
import { getActiveSlide, updateActiveSlideInDocument } from "./helpers";
import { findSlideById } from "../slide";
import { pushHistory } from "../../../slide/state";
import { findShapeById } from "../../../../shape/query";
import { generateShapeId } from "../../../../shape/mutation";
import { withUpdatedTransform } from "../../../../shape/transform";
import { getShapeTransform } from "@oxen/pptx-render/svg";

// Note: CopyAction and PasteAction types not needed since handlers don't use action payload

function handleCopy(
  state: PresentationEditorState
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (!activeSlide || state.shapeSelection.selectedIds.length === 0) {
    return state;
  }

  const shapesToCopy = state.shapeSelection.selectedIds
    .map((id) => findShapeById(activeSlide.slide.shapes, id))
    .filter((s): s is Shape => s !== undefined);

  if (shapesToCopy.length === 0) {
    return state;
  }

  return {
    ...state,
    clipboard: {
      shapes: shapesToCopy,
      pasteCount: 0,
    },
  };
}

/**
 * Get shape name for cloning
 */
function getClonedShapeName(shape: Shape): string {
  if ("nonVisual" in shape) {
    return `Copy of ${shape.nonVisual.name}`;
  }
  return "Copy of Shape";
}

/**
 * Apply offset to shape if it has a transform
 */
function applyPasteOffset(
  shape: Shape,
  transform: ReturnType<typeof getShapeTransform>,
  offset: number
): Shape {
  if (!transform) {
    return shape;
  }
  return withUpdatedTransform(shape, {
    x: px((transform.x as number) + offset),
    y: px((transform.y as number) + offset),
  });
}

function handlePaste(
  state: PresentationEditorState
): PresentationEditorState {
  const activeSlide = getActiveSlide(state);
  if (
    !activeSlide ||
    !state.clipboard ||
    state.clipboard.shapes.length === 0
  ) {
    return state;
  }

  const offset = (state.clipboard.pasteCount + 1) * 20;
  const pastedIds: ShapeId[] = [];

  // eslint-disable-next-line no-restricted-syntax -- accumulator pattern for sequential doc updates
  let currentDoc = state.documentHistory.present;

  for (const shape of state.clipboard.shapes) {
    // Generate new ID
    const activeSlideData = findSlideById(currentDoc, state.activeSlideId!);
    if (!activeSlideData) {
      continue;
    }

    const newId = generateShapeId(activeSlideData.slide.shapes);
    const transform = getShapeTransform(shape);

    // Clone shape with new ID and offset position
    const newShape = {
      ...shape,
      nonVisual: {
        ...("nonVisual" in shape ? shape.nonVisual : {}),
        id: newId,
        name: getClonedShapeName(shape),
      },
    } as Shape;

    const offsetShape = applyPasteOffset(newShape, transform, offset);

    pastedIds.push(newId);

    // Update document
    currentDoc = updateActiveSlideInDocument(
      currentDoc,
      state.activeSlideId,
      (slide) => ({ ...slide, shapes: [...slide.shapes, offsetShape] })
    );
  }

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, currentDoc),
    shapeSelection: {
      selectedIds: pastedIds,
      primaryId: pastedIds[0],
    },
    clipboard: {
      ...state.clipboard,
      pasteCount: state.clipboard.pasteCount + 1,
    },
  };
}

/**
 * Clipboard handlers
 */
export const CLIPBOARD_HANDLERS: HandlerMap = {
  COPY: handleCopy,
  PASTE: handlePaste,
};
