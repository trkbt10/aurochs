/**
 * @file PDF editor reducer
 *
 * Pure state management for the PDF editor.
 * All document mutations delegate to @aurochs/pdf domain operations.
 * All actions and state transitions are tested independently of React components.
 */

import type { PdfDocument, PdfElement, PdfTable, PdfElementId } from "@aurochs/pdf";
import {
  createElementId,
  moveElement,
  rotateElement,
  scaleElement,
  getElementRotationRad,
  getPathBounds,
  updateElementInDocument,
  deleteElements,
  addElementsToPage,
  addPage as domainAddPage,
  deletePages as domainDeletePages,
  duplicatePages as domainDuplicatePages,
  reorderPages as domainReorderPages,
  updatePageSize as domainUpdatePageSize,
  withTextContent,
} from "@aurochs/pdf";
import { createDocumentQuery } from "@aurochs-renderer/pdf/svg";
import { createHistory, pushHistory, undoHistory, redoHistory, canUndo, canRedo } from "@aurochs-ui/editor-core/history";
import { createEmptySelection, createSingleSelection, toggleSelection } from "@aurochs-ui/editor-core/selection";
import { createClipboardContent, incrementPasteCount } from "@aurochs-ui/editor-core/clipboard";
import { createIdleDragState, isDragMove, isDragResize, isDragRotate, isDragPendingMove, isDragPendingRotate } from "@aurochs-ui/editor-core/drag-state";
import { isDragThresholdExceeded } from "@aurochs-ui/editor-core/drag-utils";
import type { MoveDragState, ResizeDragState, RotateDragState, ResizeHandlePosition } from "@aurochs-ui/editor-core/drag-state";
import type { SimpleBounds } from "@aurochs-ui/editor-core/geometry";
import { getCombinedBoundsWithRotation, calculateResizeBounds } from "@aurochs-ui/editor-core/geometry";
import { snapAngle } from "@aurochs-ui/editor-core/geometry";
import { calculateAlignment, type BoundsWithId, type AlignmentType } from "@aurochs-ui/editor-core/alignment";
import type { PdfEditorState } from "./types";

// =============================================================================
// Action Types
// =============================================================================

export type PdfEditorAction =
  | { readonly type: "SELECT"; readonly elementId: PdfElementId; readonly addToSelection: boolean }
  | { readonly type: "CLEAR_SELECTION" }
  | { readonly type: "SET_PAGE"; readonly pageIndex: number }
  | { readonly type: "DELETE_SELECTED" }
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }
  | { readonly type: "START_PENDING_MOVE"; readonly startX: number; readonly startY: number; readonly startClientX: number; readonly startClientY: number }
  | { readonly type: "CONFIRM_MOVE"; readonly clientX: number; readonly clientY: number }
  | { readonly type: "UPDATE_MOVE"; readonly currentX: number; readonly currentY: number }
  | { readonly type: "END_MOVE" }
  | { readonly type: "START_RESIZE"; readonly handle: ResizeHandlePosition; readonly startX: number; readonly startY: number }
  | { readonly type: "UPDATE_RESIZE"; readonly currentX: number; readonly currentY: number }
  | { readonly type: "END_RESIZE" }
  | { readonly type: "START_ROTATE"; readonly startX: number; readonly startY: number }
  | { readonly type: "UPDATE_ROTATE"; readonly currentX: number; readonly currentY: number }
  | { readonly type: "END_ROTATE" }
  | { readonly type: "SELECT_MULTIPLE"; readonly elementIds: readonly PdfElementId[] }
  | { readonly type: "SELECT_ALL" }
  | { readonly type: "NUDGE_SELECTED"; readonly dx: number; readonly dy: number }
  | { readonly type: "ADD_PAGE"; readonly afterIndex: number }
  | { readonly type: "DELETE_PAGES"; readonly pageIndices: readonly number[] }
  | { readonly type: "DUPLICATE_PAGES"; readonly pageIndices: readonly number[] }
  | { readonly type: "REORDER_PAGES"; readonly pageIndices: readonly number[]; readonly toIndex: number }
  | { readonly type: "UPDATE_ELEMENT"; readonly elementId: PdfElementId; readonly updater: (el: PdfElement) => PdfElement }
  | { readonly type: "COPY" }
  | { readonly type: "CUT" }
  | { readonly type: "PASTE" }
  | { readonly type: "DUPLICATE" }
  | { readonly type: "ALIGN"; readonly alignment: AlignmentType }
  | { readonly type: "START_TEXT_EDIT"; readonly elementId: PdfElementId; readonly text: string; readonly bounds: { x: number; y: number; width: number; height: number } }
  | { readonly type: "COMMIT_TEXT_EDIT"; readonly elementId: PdfElementId; readonly text: string }
  | { readonly type: "CANCEL_TEXT_EDIT" }
  | { readonly type: "END_TEXT_EDIT" }
  | { readonly type: "UPDATE_PAGE_SIZE"; readonly pageIndex: number; readonly width: number; readonly height: number }
  | { readonly type: "ADD_TABLE"; readonly table: PdfTable }
  | { readonly type: "UPDATE_TABLE"; readonly elementId: PdfElementId; readonly table: PdfTable };

// =============================================================================
// Helpers
// =============================================================================


/** Resolve selection state after a SELECT action. */
function resolveSelection(state: PdfEditorState, elementId: PdfElementId, add: boolean) {
  if (add) {
    return toggleSelection<PdfElementId>({ selection: state.selection, id: elementId, primaryFallback: "last" });
  }
  return createSingleSelection<PdfElementId>(elementId);
}

/** Collect SVG-space bounds for the given element IDs. */
export function collectSelectedBounds(doc: PdfDocument, selectedIds: readonly PdfElementId[]): ReadonlyMap<PdfElementId, SimpleBounds> {
  const query = createDocumentQuery(doc);
  const map = new Map<PdfElementId, SimpleBounds>();
  for (const id of selectedIds) {
    const bounds = query.getElementBounds(id);
    if (!bounds) { continue; }
    map.set(id, { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
  }
  return map;
}

/** Collect PdfElement instances for the given element IDs. */
export function collectSelectedElements(doc: PdfDocument, selectedIds: readonly PdfElementId[]): readonly PdfElement[] {
  const query = createDocumentQuery(doc);
  return selectedIds.map((id) => query.getElement(id)).filter((el): el is PdfElement => el !== undefined);
}

/** Create selection state from a list of element IDs. */
function createSelectionFromIds(ids: readonly PdfElementId[]) {
  if (ids.length === 1) { return createSingleSelection<PdfElementId>(ids[0]); }
  return { selectedIds: ids, primaryId: ids[0] };
}

function applyResizeToDom(doc: PdfDocument, drag: ResizeDragState<PdfElementId>, pageHeight: number): PdfDocument {
  const dx = drag.previewDelta.dx;
  const dy = drag.previewDelta.dy;
  if (dx === 0 && dy === 0) { return doc; }
  const { shapeId } = drag;
  const initial = drag.initialBounds;
  const newBounds = calculateResizeBounds({
    handle: drag.handle, initial, dx, dy,
    options: { aspectLocked: drag.aspectLocked, minWidth: 10, minHeight: 10 },
  });
  return updateElementInDocument({
    document: doc, elementId: shapeId,
    updater: (el) => {
      if (el.type === "text" || el.type === "textBlock") {
        // Convert SVG-space bounds to PDF-space (flip Y)
        return { ...el, x: newBounds.x, y: pageHeight - newBounds.y - newBounds.height, width: newBounds.width, height: newBounds.height };
      }
      if (el.type === "path") {
        // Path bounds are computed in PDF space by getPathBounds, then converted to SVG space
        // by elementToSvgBounds (y = pageHeight - pdfY - height). Reverse that conversion
        // to get the new bounds in PDF space.
        const oldPdfBounds = getPathBounds(el);
        const newPdfBounds = {
          x: newBounds.x,
          y: pageHeight - newBounds.y - newBounds.height,
          width: newBounds.width,
          height: newBounds.height,
        };
        return scaleElement(el, oldPdfBounds, newPdfBounds);
      }
      if (el.type === "image") {
        // Image: position and size are encoded in the CTM
        const ctm = el.graphicsState.ctm;
        const oldW = Math.abs(ctm[0]);
        const oldH = Math.abs(ctm[3]);
        const oldX = ctm[4];
        const oldY = ctm[5];
        const oldPdfBounds = { x: oldX, y: oldY, width: oldW, height: oldH };
        const newPdfBounds = {
          x: newBounds.x,
          y: pageHeight - newBounds.y - newBounds.height,
          width: newBounds.width,
          height: newBounds.height,
        };
        return scaleElement(el, oldPdfBounds, newPdfBounds);
      }
      return el;
    },
  });
}

// =============================================================================
// Initial State
// =============================================================================

/** Create the initial editor state from a PDF document. */
export function createInitialState(document: PdfDocument): PdfEditorState {
  return {
    documentHistory: createHistory(document),
    currentPageIndex: 0,
    selection: createEmptySelection<PdfElementId>(),
    drag: createIdleDragState(),
    textEdit: { active: false },
    clipboard: undefined,
  };
}

// =============================================================================
// Reducer
// =============================================================================

/** Pure reducer for PDF editor state transitions. */
export function pdfEditorReducer(state: PdfEditorState, action: PdfEditorAction): PdfEditorState {
  switch (action.type) {
    case "SELECT":
      return { ...state, selection: resolveSelection(state, action.elementId, action.addToSelection) };

    case "CLEAR_SELECTION":
      return { ...state, selection: createEmptySelection<PdfElementId>(), drag: createIdleDragState() };

    case "SET_PAGE":
      return { ...state, currentPageIndex: action.pageIndex, selection: createEmptySelection(), drag: createIdleDragState() };

    case "DELETE_SELECTED": {
      if (state.selection.selectedIds.length === 0) { return state; }
      const doc = state.documentHistory.present;
      const newDoc = deleteElements(doc, state.selection.selectedIds);
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), selection: createEmptySelection<PdfElementId>(), drag: createIdleDragState() };
    }

    case "UNDO":
      if (!canUndo(state.documentHistory)) { return state; }
      return { ...state, documentHistory: undoHistory(state.documentHistory), selection: createEmptySelection<PdfElementId>(), drag: createIdleDragState() };

    case "REDO":
      if (!canRedo(state.documentHistory)) { return state; }
      return { ...state, documentHistory: redoHistory(state.documentHistory), selection: createEmptySelection<PdfElementId>(), drag: createIdleDragState() };

    case "START_PENDING_MOVE": {
      if (state.selection.selectedIds.length === 0) { return state; }
      const doc = state.documentHistory.present;
      const initialBounds = collectSelectedBounds(doc, state.selection.selectedIds);
      return { ...state, drag: { type: "pending-move" as const, startX: action.startX, startY: action.startY, startClientX: action.startClientX, startClientY: action.startClientY, shapeIds: state.selection.selectedIds, initialBounds } };
    }

    case "CONFIRM_MOVE": {
      if (!isDragPendingMove(state.drag)) { return state; }
      if (!isDragThresholdExceeded({ startX: state.drag.startClientX, startY: state.drag.startClientY, currentX: action.clientX, currentY: action.clientY })) { return state; }
      const drag: MoveDragState<PdfElementId> = { type: "move", startX: state.drag.startX, startY: state.drag.startY, shapeIds: state.drag.shapeIds, initialBounds: state.drag.initialBounds, previewDelta: { dx: 0, dy: 0 } };
      return { ...state, drag };
    }

    case "UPDATE_MOVE":
      if (!isDragMove(state.drag)) { return state; }
      return { ...state, drag: { ...state.drag, previewDelta: { dx: action.currentX - state.drag.startX, dy: action.currentY - state.drag.startY } } };

    case "END_MOVE": {
      if (isDragPendingMove(state.drag)) { return { ...state, drag: createIdleDragState() }; }
      if (!isDragMove(state.drag)) { return state; }
      const { previewDelta, shapeIds } = state.drag;
      if (previewDelta.dx === 0 && previewDelta.dy === 0) { return { ...state, drag: createIdleDragState() }; }
      const doc = state.documentHistory.present;
      const movedDoc = shapeIds.reduce((d, id) => updateElementInDocument({ document: d, elementId: id, updater: (el) => moveElement(el, previewDelta.dx, previewDelta.dy) }), doc);
      return { ...state, documentHistory: pushHistory(state.documentHistory, movedDoc), drag: createIdleDragState() };
    }

    case "START_RESIZE": {
      const primaryId = state.selection.primaryId;
      if (!primaryId) { return state; }
      const doc = state.documentHistory.present;
      const boundsMap = collectSelectedBounds(doc, [primaryId]);
      const bounds = boundsMap.get(primaryId);
      if (!bounds) { return state; }
      const combined = getCombinedBoundsWithRotation([{ ...bounds, rotation: 0 }]) ?? bounds;
      const drag: ResizeDragState<PdfElementId> = { type: "resize", handle: action.handle, startX: action.startX, startY: action.startY, shapeIds: [primaryId], initialBoundsMap: boundsMap, combinedBounds: combined, aspectLocked: false, shapeId: primaryId, initialBounds: bounds, previewDelta: { dx: 0, dy: 0 } };
      return { ...state, drag };
    }

    case "UPDATE_RESIZE":
      if (!isDragResize(state.drag)) { return state; }
      return { ...state, drag: { ...state.drag, previewDelta: { dx: action.currentX - state.drag.startX, dy: action.currentY - state.drag.startY } } };

    case "END_RESIZE": {
      if (!isDragResize(state.drag)) { return state; }
      const { previewDelta } = state.drag;
      if (previewDelta.dx === 0 && previewDelta.dy === 0) { return { ...state, drag: createIdleDragState() }; }
      const doc = state.documentHistory.present;
      const q = createDocumentQuery(doc);
      const newDoc = applyResizeToDom(doc, state.drag, q.getPageHeight(state.currentPageIndex));
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), drag: createIdleDragState() };
    }

    case "START_ROTATE": {
      const primaryId = state.selection.primaryId;
      if (!primaryId) { return state; }
      const doc = state.documentHistory.present;
      const q = createDocumentQuery(doc);
      const boundsMap = collectSelectedBounds(doc, state.selection.selectedIds);
      const rotationsMap = new Map<PdfElementId, number>();
      for (const id of state.selection.selectedIds) {
        const el = q.getElement(id);
        const rotRad = el ? getElementRotationRad(el) : 0;
        rotationsMap.set(id, (rotRad * 180) / Math.PI);
      }
      const primaryEl = q.getElement(primaryId);
      const primaryRotDeg = primaryEl ? (getElementRotationRad(primaryEl) * 180) / Math.PI : 0;
      const allBounds = [...boundsMap.entries()].map(([id, b]) => ({ ...b, rotation: rotationsMap.get(id) ?? 0, id }));
      const combined = getCombinedBoundsWithRotation(allBounds);
      const centerX = (combined?.x ?? 0) + (combined?.width ?? 0) / 2;
      const centerY = (combined?.y ?? 0) + (combined?.height ?? 0) / 2;
      const startAngle = Math.atan2(action.startY - centerY, action.startX - centerX);
      const drag: RotateDragState<PdfElementId> = {
        type: "rotate", startAngle, shapeIds: state.selection.selectedIds,
        initialRotationsMap: rotationsMap, initialBoundsMap: boundsMap,
        centerX, centerY, shapeId: primaryId, initialRotation: primaryRotDeg, previewAngleDelta: 0,
      };
      return { ...state, drag };
    }

    case "UPDATE_ROTATE": {
      if (!isDragRotate(state.drag)) { return state; }
      const currentAngle = Math.atan2(action.currentY - state.drag.centerY, action.currentX - state.drag.centerX);
      const rawDeltaRad = currentAngle - state.drag.startAngle;
      // Convert to degrees, snap, and keep in degrees.
      // previewAngleDelta is in degrees — consistent with initialRotationsMap and applyRotatePreview.
      const totalDeg = state.drag.initialRotation + (rawDeltaRad * 180) / Math.PI;
      const snappedDeg = snapAngle(totalDeg);
      const previewAngleDelta = snappedDeg - state.drag.initialRotation;
      return { ...state, drag: { ...state.drag, previewAngleDelta } };
    }

    case "END_ROTATE": {
      if (isDragPendingRotate(state.drag)) { return { ...state, drag: createIdleDragState() }; }
      if (!isDragRotate(state.drag)) { return state; }
      const { previewAngleDelta, shapeIds } = state.drag;
      // previewAngleDelta is in degrees
      if (Math.abs(previewAngleDelta) < 0.01) { return { ...state, drag: createIdleDragState() }; }
      // Convert degrees to radians for rotateElement (which operates on CTM)
      const deltaRad = (previewAngleDelta * Math.PI) / 180;
      const doc = state.documentHistory.present;
      const rotatedDoc = shapeIds.reduce((d, id) => updateElementInDocument({ document: d, elementId: id, updater: (el) => rotateElement(el, deltaRad) }), doc);
      return { ...state, documentHistory: pushHistory(state.documentHistory, rotatedDoc), drag: createIdleDragState() };
    }

    case "SELECT_MULTIPLE": {
      if (action.elementIds.length === 0) { return { ...state, selection: createEmptySelection<PdfElementId>() }; }
      return { ...state, selection: { selectedIds: action.elementIds, primaryId: action.elementIds[0] } };
    }

    case "SELECT_ALL": {
      const doc = state.documentHistory.present;
      const page = doc.pages[state.currentPageIndex];
      if (!page) { return state; }
      const allIds = page.elements.map((_, i) => createElementId(state.currentPageIndex, i));
      if (allIds.length === 0) { return state; }
      return { ...state, selection: { selectedIds: allIds, primaryId: allIds[0] } };
    }

    case "NUDGE_SELECTED": {
      if (state.selection.selectedIds.length === 0) { return state; }
      const doc = state.documentHistory.present;
      const nudgedDoc = state.selection.selectedIds.reduce((d, id) => updateElementInDocument({ document: d, elementId: id, updater: (el) => moveElement(el, action.dx, action.dy) }), doc);
      return { ...state, documentHistory: pushHistory(state.documentHistory, nudgedDoc) };
    }

    case "COPY": {
      if (state.selection.selectedIds.length === 0) { return state; }
      const doc = state.documentHistory.present;
      const elements = collectSelectedElements(doc, state.selection.selectedIds);
      return { ...state, clipboard: createClipboardContent({ payload: elements }) };
    }

    case "CUT": {
      if (state.selection.selectedIds.length === 0) { return state; }
      const doc = state.documentHistory.present;
      const elements = collectSelectedElements(doc, state.selection.selectedIds);
      const clipboard = createClipboardContent({ payload: elements, isCut: true });
      const newDoc = deleteElements(doc, state.selection.selectedIds);
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), selection: createEmptySelection<PdfElementId>(), drag: createIdleDragState(), clipboard };
    }

    case "PASTE": {
      if (!state.clipboard) { return state; }
      const doc = state.documentHistory.present;
      const page = doc.pages[state.currentPageIndex];
      if (!page) { return state; }
      const offset = (state.clipboard.pasteCount + 1) * 10;
      const pastedElements = state.clipboard.payload.map((el) => moveElement(el, offset, offset));
      const { document: newDoc, newElementIds } = addElementsToPage(doc, state.currentPageIndex, pastedElements);
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), selection: createSelectionFromIds(newElementIds), clipboard: incrementPasteCount(state.clipboard) };
    }

    case "DUPLICATE": {
      if (state.selection.selectedIds.length === 0) { return state; }
      const doc = state.documentHistory.present;
      const elements = collectSelectedElements(doc, state.selection.selectedIds);
      const page = doc.pages[state.currentPageIndex];
      if (!page) { return state; }
      const duped = elements.map((el) => moveElement(el, 10, 10));
      const { document: newDoc, newElementIds } = addElementsToPage(doc, state.currentPageIndex, duped);
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), selection: createSelectionFromIds(newElementIds) };
    }

    case "ALIGN": {
      if (state.selection.selectedIds.length < 2) { return state; }
      const doc = state.documentHistory.present;
      const q = createDocumentQuery(doc);
      const shapes: BoundsWithId<PdfElementId>[] = state.selection.selectedIds.map((id) => {
        const b = q.getElementBounds(id);
        if (!b) { return { id, bounds: { x: 0, y: 0, width: 0, height: 0 } }; }
        return { id, bounds: { x: b.x, y: b.y, width: b.width, height: b.height } };
      });
      const updates = calculateAlignment(shapes, action.alignment);
      if (updates.length === 0) { return state; }
      const newDoc = updates.reduce((d, update) => {
        const original = shapes.find((s) => s.id === update.id);
        if (!original) { return d; }
        const dx = update.bounds.x - original.bounds.x;
        const dy = update.bounds.y - original.bounds.y;
        if (dx === 0 && dy === 0) { return d; }
        return updateElementInDocument({ document: d, elementId: update.id, updater: (el) => moveElement(el, dx, dy) });
      }, doc);
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc) };
    }

    case "UPDATE_ELEMENT": {
      const doc = state.documentHistory.present;
      const newDoc = updateElementInDocument({ document: doc, elementId: action.elementId, updater: action.updater });
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc) };
    }

    case "START_TEXT_EDIT":
      return { ...state, textEdit: { active: true, elementId: action.elementId, initialText: action.text, bounds: action.bounds } };

    case "COMMIT_TEXT_EDIT": {
      const { elementId, text } = action;
      const doc = state.documentHistory.present;
      const newDoc = updateElementInDocument({
        document: doc,
        elementId,
        updater: (el) => {
          if (el.type === "text") { return withTextContent(el, text); }
          if (el.type === "textBlock") {
            // Update the first run's text content with the full edited text.
            // Multi-paragraph editing: split by newline, assign to paragraphs.
            const lines = text.split("\n");
            const paragraphs = el.paragraphs.map((para, pi) => {
              const lineText = lines[pi] ?? "";
              // Update the first run with the line text, keep other runs empty
              const runs = para.runs.map((run, ri) =>
                ri === 0 ? withTextContent(run, lineText) : withTextContent(run, ""),
              );
              return { ...para, runs };
            });
            return { ...el, paragraphs };
          }
          return el;
        },
      });
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), textEdit: { active: false } };
    }

    case "CANCEL_TEXT_EDIT":
      return { ...state, textEdit: { active: false } };

    case "END_TEXT_EDIT":
      return { ...state, textEdit: { active: false } };

    case "ADD_PAGE": {
      const doc = state.documentHistory.present;
      const { document: newDoc, newPageIndex } = domainAddPage(doc, action.afterIndex);
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), currentPageIndex: newPageIndex, selection: createEmptySelection<PdfElementId>() };
    }

    case "DELETE_PAGES": {
      const doc = state.documentHistory.present;
      const newDoc = domainDeletePages(doc, action.pageIndices);
      if (newDoc === doc) { return state; }
      const newPageIndex = Math.min(state.currentPageIndex, newDoc.pages.length - 1);
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), currentPageIndex: newPageIndex, selection: createEmptySelection<PdfElementId>() };
    }

    case "DUPLICATE_PAGES": {
      const doc = state.documentHistory.present;
      const { document: newDoc, insertedAtIndex } = domainDuplicatePages(doc, action.pageIndices);
      if (newDoc === doc) { return state; }
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), currentPageIndex: insertedAtIndex, selection: createEmptySelection<PdfElementId>() };
    }

    case "REORDER_PAGES": {
      const doc = state.documentHistory.present;
      const newDoc = domainReorderPages({ document: doc, pageIndices: action.pageIndices, toIndex: action.toIndex });
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), currentPageIndex: Math.min(action.toIndex, newDoc.pages.length - 1), selection: createEmptySelection<PdfElementId>() };
    }

    case "UPDATE_PAGE_SIZE": {
      const doc = state.documentHistory.present;
      const newDoc = domainUpdatePageSize({ document: doc, pageIndex: action.pageIndex, width: action.width, height: action.height });
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc) };
    }

    case "ADD_TABLE": {
      const doc = state.documentHistory.present;
      const { document: newDoc, newElementIds } = addElementsToPage(doc, state.currentPageIndex, [action.table as PdfElement]);
      if (newElementIds.length === 0) { return state; }
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), selection: createSingleSelection<PdfElementId>(newElementIds[0]) };
    }

    case "UPDATE_TABLE": {
      const doc = state.documentHistory.present;
      const newDoc = updateElementInDocument({ document: doc, elementId: action.elementId, updater: () => action.table as PdfElement });
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc) };
    }
  }
}
