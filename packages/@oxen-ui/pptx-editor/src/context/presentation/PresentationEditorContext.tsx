/**
 * @file Presentation editor context
 *
 * Provides presentation editor state and actions to child components.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import type { Shape } from "@oxen/pptx/domain";
import type { PresentationDocument } from "@oxen/pptx/app";
import type { PresentationEditorContextValue } from "./editor/types";
import { presentationEditorReducer, createPresentationEditorState } from "./editor/reducer/reducer";
import { findSlideById } from "./editor/slide";
import { findShapeById } from "../../shape/query";

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
  const [state, dispatch] = useReducer(
    presentationEditorReducer,
    initialDocument,
    createPresentationEditorState
  );

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
  const creationMode = state.creationMode;
  const textEdit = state.textEdit;
  const pathDraw = state.pathDraw;
  const pathEdit = state.pathEdit;
  const editorMode = state.editorMode;

  const value = useMemo<PresentationEditorContextValue>(
    () => ({
      state,
      dispatch,
      document,
      activeSlide,
      selectedShapes,
      primaryShape,
      canUndo,
      canRedo,
      creationMode,
      textEdit,
      pathDraw,
      pathEdit,
      editorMode,
    }),
    [state, document, activeSlide, selectedShapes, primaryShape, canUndo, canRedo, creationMode, textEdit, pathDraw, pathEdit, editorMode]
  );

  return (
    <PresentationEditorContext.Provider value={value}>
      {children}
    </PresentationEditorContext.Provider>
  );
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
