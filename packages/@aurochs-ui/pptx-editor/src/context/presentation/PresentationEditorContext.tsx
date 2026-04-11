/**
 * @file Presentation editor context
 *
 * Provides presentation editor state and actions to child components.
 *
 * The context value is memoized with fine-grained dependencies: each
 * sub-field of the reducer state is tracked individually so that changes
 * to one field (e.g. drag preview) do not invalidate the context for
 * consumers that only use other fields (e.g. document, activeSlide).
 */

import { createContext, useContext, useReducer, useMemo, type ReactNode } from "react";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import type { PresentationEditorContextValue } from "./editor/types";
import { presentationEditorReducer, createPresentationEditorState } from "./editor/reducer/reducer";
import { findSlideById } from "./editor/slide";
import { findShapeById } from "@aurochs-ui/pptx-slide-canvas/shape/query";
import { useSlideOperations } from "./editor/useSlideOperations";

// =============================================================================
// Context
// =============================================================================

const PresentationEditorContext = createContext<PresentationEditorContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

/**
 * Provider for presentation editor context
 */
export function PresentationEditorProvider({
  children,
  initialDocument,
}: {
  readonly children: ReactNode;
  readonly initialDocument: PresentationDocument;
}) {
  const [state, dispatch] = useReducer(presentationEditorReducer, initialDocument, createPresentationEditorState);

  const document = state.documentHistory.present;

  const activeSlide = useMemo(() => {
    if (!state.activeSlideId) {
      return undefined;
    }
    return findSlideById(document, state.activeSlideId);
  }, [document, state.activeSlideId]);

  const selectedShapes = useMemo(() => {
    if (!activeSlide) {
      return [];
    }
    const shapes: Shape[] = [];
    for (const id of state.shapeSelection.selectedIds) {
      const shape = findShapeById(activeSlide.slide.shapes, id);
      if (shape) {
        shapes.push(shape);
      }
    }
    return shapes;
  }, [activeSlide, state.shapeSelection.selectedIds]);

  const primaryShape = useMemo(() => {
    if (!activeSlide || !state.shapeSelection.primaryId) {
      return undefined;
    }
    return findShapeById(activeSlide.slide.shapes, state.shapeSelection.primaryId);
  }, [activeSlide, state.shapeSelection.primaryId]);

  const canUndo = state.documentHistory.past.length > 0;
  const canRedo = state.documentHistory.future.length > 0;

  // Slide operations hook (async operations)
  const slideOperations = useSlideOperations(state, dispatch);

  // Memoize context value with fine-grained dependencies.
  // Each sub-field is listed individually so that a change to one
  // (e.g. drag preview updating state.drag) does not cause consumers
  // that only read document/activeSlide to re-render.
  const value = useMemo<PresentationEditorContextValue>(
    () => ({
      dispatch,
      document,
      activeSlide,
      activeSlideId: state.activeSlideId,
      selectedShapes,
      primaryShape,
      shapeSelection: state.shapeSelection,
      drag: state.drag,
      clipboard: state.clipboard,
      canUndo,
      canRedo,
      creationMode: state.creationMode,
      textEdit: state.textEdit,
      pathDraw: state.pathDraw,
      pathEdit: state.pathEdit,
      slideOperations,
    }),
    [
      document,
      activeSlide,
      state.activeSlideId,
      selectedShapes,
      primaryShape,
      state.shapeSelection,
      state.drag,
      state.clipboard,
      canUndo,
      canRedo,
      state.creationMode,
      state.textEdit,
      state.pathDraw,
      state.pathEdit,
      slideOperations,
    ],
  );

  return <PresentationEditorContext.Provider value={value}>{children}</PresentationEditorContext.Provider>;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access presentation editor context
 */
export function usePresentationEditor(): PresentationEditorContextValue {
  const context = useContext(PresentationEditorContext);
  if (!context) {
    throw new Error("usePresentationEditor must be used within PresentationEditorProvider");
  }
  return context;
}

/**
 * Hook to access presentation editor with null check (for optional usage)
 */
export function usePresentationEditorOptional(): PresentationEditorContextValue | null {
  return useContext(PresentationEditorContext);
}
