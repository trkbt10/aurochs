/**
 * @file Fig editor React context
 *
 * Provides the FigEditorProvider and useFigEditor hook.
 * Follows the same fine-grained memoization pattern as PresentationEditorContext.
 */

import { createContext, useContext, useReducer, useMemo } from "react";
import type { ReactNode } from "react";
import type { FigDesignDocument, FigDesignNode, FigNodeId } from "@aurochs-builder/fig/types";
import { findNodeById } from "@aurochs-builder/fig/node-ops";
import { canUndo, canRedo } from "@aurochs-ui/editor-core/history";
import type { FigEditorContextValue, FigEditorAction } from "./fig-editor/types";
import { figEditorReducer, createFigEditorState } from "./fig-editor/reducer/reducer";

// =============================================================================
// Context
// =============================================================================

const FigEditorContext = createContext<FigEditorContextValue | null>(null);

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

  // Memoize context value with fine-grained dependencies
  const contextValue = useMemo<FigEditorContextValue>(
    () => ({
      dispatch,
      document,
      activePage,
      activePageId,
      selectedNodes,
      primaryNode,
      nodeSelection,
      drag,
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
      drag,
      clipboard,
      state.documentHistory,
      creationMode,
      textEdit,
    ],
  );

  return (
    <FigEditorContext.Provider value={contextValue}>
      {children}
    </FigEditorContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Access the fig editor context.
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
