/**
 * @file Slide editor context
 *
 * Provides slide editor state and actions to child components.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import type { Slide, Shape } from "../../pptx/domain";
import {
  type SlideEditorContextValue,
  createSlideEditorState,
} from "./types";
import { slideEditorReducer } from "./reducer";
import { findShapeById } from "./shape/query";

// =============================================================================
// Context
// =============================================================================

// Exported for SlideEditorBridge in presentation layer
export const SlideEditorContext = createContext<SlideEditorContextValue | null>(null);

/**
 * Provider for slide editor context
 */
export function SlideEditorProvider({
  children,
  initialSlide,
}: {
  readonly children: ReactNode;
  readonly initialSlide: Slide;
}) {
  const [state, dispatch] = useReducer(
    slideEditorReducer,
    initialSlide,
    createSlideEditorState
  );

  const slide = state.slideHistory.present;

  const selectedShapes = useMemo(() => {
    const shapes: Shape[] = [];
    for (const id of state.selection.selectedIds) {
      const shape = findShapeById(slide.shapes, id);
      if (shape) {
        shapes.push(shape);
      }
    }
    return shapes;
  }, [slide.shapes, state.selection.selectedIds]);

  const primaryShape = useMemo(() => {
    if (!state.selection.primaryId) {return undefined;}
    return findShapeById(slide.shapes, state.selection.primaryId);
  }, [slide.shapes, state.selection.primaryId]);

  const canUndo = state.slideHistory.past.length > 0;
  const canRedo = state.slideHistory.future.length > 0;

  const value = useMemo<SlideEditorContextValue>(
    () => ({
      state,
      dispatch,
      slide,
      selectedShapes,
      primaryShape,
      canUndo,
      canRedo,
    }),
    [state, slide, selectedShapes, primaryShape, canUndo, canRedo]
  );

  return (
    <SlideEditorContext.Provider value={value}>
      {children}
    </SlideEditorContext.Provider>
  );
}

/**
 * Hook to access slide editor context
 */
export function useSlideEditor(): SlideEditorContextValue {
  const context = useContext(SlideEditorContext);
  if (!context) {
    throw new Error("useSlideEditor must be used within SlideEditorProvider");
  }
  return context;
}

/**
 * Hook to access slide editor with null check (for optional usage)
 */
export function useSlideEditorOptional(): SlideEditorContextValue | null {
  return useContext(SlideEditorContext);
}
