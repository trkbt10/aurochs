/**
 * @file Fig editor React context
 *
 * Provides the FigEditorProvider and useFigEditor hook.
 * Follows the same fine-grained memoization pattern as PresentationEditorContext.
 *
 * ## Performance: Context Splitting
 *
 * Drag state (which updates at 40-60Hz during interactions) is separated into
 * its own context (FigDragContext) so that high-frequency drag preview updates
 * do NOT cause re-renders in components that only consume the main editor
 * context (PropertyPanel, LayerPanel, Toolbar, etc.).
 *
 * Only FigEditorCanvas subscribes to FigDragContext via useFigDrag().
 */

import { createContext, useContext, useReducer, useMemo } from "react";
import type { ReactNode } from "react";
import type { FigDesignDocument, FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { DragState } from "@aurochs-ui/editor-core/drag-state";
import { findNodeById } from "@aurochs-builder/fig/node-ops";
import { canUndo, canRedo } from "@aurochs-ui/editor-core/history";
import type { FigEditorContextValue, FigEditorAction } from "./fig-editor/types";
import { figEditorReducer, createFigEditorState } from "./fig-editor/reducer/reducer";

// =============================================================================
// Context — Main (low-frequency: document, selection, clipboard, etc.)
// =============================================================================

const FigEditorContext = createContext<FigEditorContextValue | null>(null);

// =============================================================================
// Context — Drag (high-frequency: updates every mouse move during drag)
// =============================================================================

type FigDragContextValue = {
  readonly drag: DragState<FigNodeId>;
  readonly dispatch: (action: FigEditorAction) => void;
};

const FigDragContext = createContext<FigDragContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

type FigEditorProviderProps = {
  readonly initialDocument: FigDesignDocument;
  readonly children: ReactNode;
};

/**
 * Fig editor context provider.
 *
 * Wraps children with editor state management.
 * Fine-grained memoization prevents unnecessary re-renders.
 *
 * Drag state is provided via a separate FigDragContext so that
 * high-frequency preview updates (PREVIEW_MOVE, PREVIEW_RESIZE,
 * PREVIEW_ROTATE) only re-render drag consumers (the canvas),
 * not panels/toolbar/layer tree.
 */
export function FigEditorProvider({ initialDocument, children }: FigEditorProviderProps) {
  const [state, dispatch] = useReducer(figEditorReducer, initialDocument, createFigEditorState);

  const document = state.documentHistory.present;
  const { activePageId, nodeSelection, drag, clipboard, creationMode, textEdit } = state;

  // Compute active page
  const activePage = useMemo(
    () => document.pages.find((p) => p.id === activePageId),
    [document.pages, activePageId],
  );

  // Compute selected nodes
  const selectedNodes = useMemo(() => {
    if (!activePage || nodeSelection.selectedIds.length === 0) {
      return [] as readonly FigDesignNode[];
    }
    const result: FigDesignNode[] = [];
    for (const id of nodeSelection.selectedIds) {
      const node = findNodeById(activePage.children, id);
      if (node) {
        result.push(node);
      }
    }
    return result;
  }, [activePage, nodeSelection.selectedIds]);

  // Compute primary node
  const primaryNode = useMemo(() => {
    if (!activePage || !nodeSelection.primaryId) {
      return undefined;
    }
    return findNodeById(activePage.children, nodeSelection.primaryId);
  }, [activePage, nodeSelection.primaryId]);

  // Main context value — excludes drag (drag changes don't trigger re-renders here)
  const contextValue = useMemo<FigEditorContextValue>(
    () => ({
      dispatch,
      document,
      activePage,
      activePageId,
      selectedNodes,
      primaryNode,
      nodeSelection,
      clipboard,
      canUndo: canUndo(state.documentHistory),
      canRedo: canRedo(state.documentHistory),
      creationMode,
      textEdit,
    }),
    [
      dispatch,
      document,
      activePage,
      activePageId,
      selectedNodes,
      primaryNode,
      nodeSelection,
      clipboard,
      state.documentHistory,
      creationMode,
      textEdit,
    ],
  );

  // Drag context value — only consumers of useFigDrag() re-render on drag changes
  const dragContextValue = useMemo<FigDragContextValue>(
    () => ({ drag, dispatch }),
    [drag, dispatch],
  );

  return (
    <FigEditorContext.Provider value={contextValue}>
      <FigDragContext.Provider value={dragContextValue}>
        {children}
      </FigDragContext.Provider>
    </FigEditorContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Access the fig editor context (main state: document, selection, etc.).
 *
 * This context does NOT include drag state. Components that need drag state
 * (typically only the canvas) should use `useFigDrag()` in addition.
 * This separation ensures that high-frequency drag updates don't cause
 * re-renders in panels, toolbar, layer tree, etc.
 *
 * Must be used within a FigEditorProvider.
 */
export function useFigEditor(): FigEditorContextValue {
  const ctx = useContext(FigEditorContext);
  if (!ctx) {
    throw new Error("useFigEditor must be used within a FigEditorProvider");
  }
  return ctx;
}

/**
 * Access the fig editor context (optional).
 * Returns null if not within a FigEditorProvider.
 */
export function useFigEditorOptional(): FigEditorContextValue | null {
  return useContext(FigEditorContext);
}

/**
 * Access drag state separately from the main editor context.
 *
 * Drag state updates at mouse-move frequency (40-60Hz) during interactions.
 * Only components that actually need drag state for rendering (e.g., the
 * canvas with selection box preview) should subscribe to this context.
 *
 * Must be used within a FigEditorProvider.
 */
export function useFigDrag(): FigDragContextValue {
  const ctx = useContext(FigDragContext);
  if (!ctx) {
    throw new Error("useFigDrag must be used within a FigEditorProvider");
  }
  return ctx;
}
