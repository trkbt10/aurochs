/**
 * @file PDF editor reducer
 *
 * Pure state management for the PDF editor.
 * All actions and state transitions are tested independently of React components.
 */

import type { PdfDocument, PdfElement, PdfMatrix } from "@aurochs/pdf";
import { decomposeMatrix } from "@aurochs/pdf";
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
import { reorderItems } from "@aurochs-ui/editor-core/list-dnd";
import type { PdfElementId, PdfEditorState } from "./types";
import { createElementId, moveElement, rotateElement, updateElementInDocument, getElementRotationRad } from "./types";
import { createDocumentQuery } from "./pdf-document-query";

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
  | { readonly type: "COMMIT_TEXT_EDIT"; readonly text: string }
  | { readonly type: "CANCEL_TEXT_EDIT" }
  | { readonly type: "UPDATE_PAGE_SIZE"; readonly pageIndex: number; readonly width: number; readonly height: number };

// =============================================================================
// Helpers
// =============================================================================


function resolveSelection(state: PdfEditorState, elementId: PdfElementId, add: boolean) {
  if (add) {
    return toggleSelection<PdfElementId>({ selection: state.selection, id: elementId, primaryFallback: "last" });
  }
  return createSingleSelection<PdfElementId>(elementId);
}

export function collectSelectedBounds(doc: PdfDocument, selectedIds: readonly PdfElementId[]): ReadonlyMap<PdfElementId, SimpleBounds> {
  const query = createDocumentQuery(doc);
  const map = new Map<PdfElementId, SimpleBounds>();
  for (const id of selectedIds) {
    const bounds = query.getElementBounds(id);
    if (!bounds) continue;
    map.set(id, { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
  }
  return map;
}

export function collectSelectedElements(doc: PdfDocument, selectedIds: readonly PdfElementId[]): readonly PdfElement[] {
  const query = createDocumentQuery(doc);
  return selectedIds.map((id) => query.getElement(id)).filter((el): el is PdfElement => el !== undefined);
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
      if (el.type === "text") {
        return { ...el, x: newBounds.x, y: pageHeight - newBounds.y - newBounds.height, width: newBounds.width, height: newBounds.height };
      }
      return el;
    },
  });
}

// =============================================================================
// Initial State
// =============================================================================

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
      const idsToDelete = new Set(state.selection.selectedIds);
      const newPages = doc.pages.map((page, pageIndex) => ({
        ...page,
        elements: page.elements.filter((_, elIndex) => !idsToDelete.has(`${pageIndex}:${elIndex}` as PdfElementId)),
      }));
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }), selection: createEmptySelection<PdfElementId>(), drag: createIdleDragState() };
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
      let previewAngleDelta = currentAngle - state.drag.startAngle;
      // Snap total rotation angle to cardinal directions
      const totalDeg = state.drag.initialRotation + (previewAngleDelta * 180) / Math.PI;
      const snappedDeg = snapAngle(totalDeg);
      previewAngleDelta = ((snappedDeg - state.drag.initialRotation) * Math.PI) / 180;
      return { ...state, drag: { ...state.drag, previewAngleDelta } };
    }

    case "END_ROTATE": {
      if (isDragPendingRotate(state.drag)) { return { ...state, drag: createIdleDragState() }; }
      if (!isDragRotate(state.drag)) { return state; }
      const { previewAngleDelta, shapeIds } = state.drag;
      if (Math.abs(previewAngleDelta) < 0.001) { return { ...state, drag: createIdleDragState() }; }
      // Apply rotation to each element by recomposing CTM
      const doc = state.documentHistory.present;
      let rotatedDoc = doc;
      for (const id of shapeIds) {
        rotatedDoc = updateElementInDocument({
          document: rotatedDoc, elementId: id,
          updater: (el) => rotateElement(el, previewAngleDelta),
        });
      }
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
      let nudgedDoc = doc;
      for (const id of state.selection.selectedIds) {
        nudgedDoc = updateElementInDocument({
          document: nudgedDoc, elementId: id,
          updater: (el) => moveElement(el, action.dx, action.dy),
        });
      }
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
      const idsToDelete = new Set(state.selection.selectedIds);
      const newPages = doc.pages.map((page, pageIndex) => ({ ...page, elements: page.elements.filter((_, elIndex) => !idsToDelete.has(`${pageIndex}:${elIndex}` as PdfElementId)) }));
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }), selection: createEmptySelection<PdfElementId>(), drag: createIdleDragState(), clipboard };
    }

    case "PASTE": {
      if (!state.clipboard) { return state; }
      const doc = state.documentHistory.present;
      const page = doc.pages[state.currentPageIndex];
      if (!page) { return state; }
      const offset = (state.clipboard.pasteCount + 1) * 10;
      const pastedElements = state.clipboard.payload.map((el) => moveElement(el, offset, offset));
      const newElements = [...page.elements, ...pastedElements];
      const newPages = doc.pages.map((p, i) => i === state.currentPageIndex ? { ...p, elements: newElements } : p);
      const startIndex = page.elements.length;
      const newIds = pastedElements.map((_, i) => createElementId(state.currentPageIndex, startIndex + i));
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }), selection: newIds.length === 1 ? createSingleSelection<PdfElementId>(newIds[0]) : { selectedIds: newIds, primaryId: newIds[0] }, clipboard: incrementPasteCount(state.clipboard) };
    }

    case "DUPLICATE": {
      if (state.selection.selectedIds.length === 0) { return state; }
      const doc = state.documentHistory.present;
      const elements = collectSelectedElements(doc, state.selection.selectedIds);
      const page = doc.pages[state.currentPageIndex];
      if (!page) { return state; }
      const duped = elements.map((el) => moveElement(el, 10, 10));
      const newElements = [...page.elements, ...duped];
      const newPages = doc.pages.map((p, i) => i === state.currentPageIndex ? { ...p, elements: newElements } : p);
      const startIndex = page.elements.length;
      const newIds = duped.map((_, i) => createElementId(state.currentPageIndex, startIndex + i));
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }), selection: newIds.length === 1 ? createSingleSelection<PdfElementId>(newIds[0]) : { selectedIds: newIds, primaryId: newIds[0] } };
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
      let newDoc = doc;
      for (const update of updates) {
        const original = shapes.find((s) => s.id === update.id);
        if (!original) { continue; }
        const dx = update.bounds.x - original.bounds.x;
        const dy = update.bounds.y - original.bounds.y;
        if (dx === 0 && dy === 0) { continue; }
        newDoc = updateElementInDocument({ document: newDoc, elementId: update.id, updater: (el) => moveElement(el, dx, dy) });
      }
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
      if (!state.textEdit.active) { return state; }
      const { elementId } = state.textEdit;
      const { text } = action;
      const doc = state.documentHistory.present;
      const newDoc = updateElementInDocument({ document: doc, elementId, updater: (el) => el.type === "text" ? { ...el, text } : el });
      return { ...state, documentHistory: pushHistory(state.documentHistory, newDoc), textEdit: { active: false } };
    }

    case "CANCEL_TEXT_EDIT":
      return { ...state, textEdit: { active: false } };

    case "ADD_PAGE": {
      const doc = state.documentHistory.present;
      const sourcePage = doc.pages[action.afterIndex] ?? doc.pages[doc.pages.length - 1];
      if (!sourcePage) { return state; }
      const blankPage = { ...sourcePage, elements: [], pageNumber: doc.pages.length + 1 };
      const newPages = [...doc.pages];
      newPages.splice(action.afterIndex + 1, 0, blankPage);
      const newPageIndex = action.afterIndex + 1;
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }), currentPageIndex: newPageIndex, selection: createEmptySelection<PdfElementId>() };
    }

    case "DELETE_PAGES": {
      const doc = state.documentHistory.present;
      if (doc.pages.length <= 1) { return state; } // Keep at least 1 page
      const indicesToDelete = new Set(action.pageIndices);
      const newPages = doc.pages.filter((_, i) => !indicesToDelete.has(i));
      if (newPages.length === 0) { return state; } // Safety check
      const newPageIndex = Math.min(state.currentPageIndex, newPages.length - 1);
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }), currentPageIndex: newPageIndex, selection: createEmptySelection<PdfElementId>() };
    }

    case "DUPLICATE_PAGES": {
      const doc = state.documentHistory.present;
      const sorted = [...action.pageIndices].sort((a, b) => a - b);
      const duplicated = sorted.map((i) => doc.pages[i]).filter(Boolean);
      if (duplicated.length === 0) { return state; }
      const insertAt = sorted[sorted.length - 1] + 1;
      const newPages = [...doc.pages];
      newPages.splice(insertAt, 0, ...duplicated);
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }), currentPageIndex: insertAt, selection: createEmptySelection<PdfElementId>() };
    }

    case "REORDER_PAGES": {
      const doc = state.documentHistory.present;
      const newPages = reorderItems(doc.pages, action.pageIndices, action.toIndex);
      const newPageIndex = action.toIndex;
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages as readonly typeof doc.pages[number][] }), currentPageIndex: Math.min(newPageIndex, newPages.length - 1), selection: createEmptySelection<PdfElementId>() };
    }

    case "UPDATE_PAGE_SIZE": {
      const doc = state.documentHistory.present;
      const page = doc.pages[action.pageIndex];
      if (!page) { return state; }
      const newPage = { ...page, width: action.width, height: action.height };
      const newPages = doc.pages.map((p, i) => i === action.pageIndex ? newPage : p);
      return { ...state, documentHistory: pushHistory(state.documentHistory, { ...doc, pages: newPages }) };
    }
  }
}
