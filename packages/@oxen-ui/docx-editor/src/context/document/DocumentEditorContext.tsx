/**
 * @file Document editor context
 *
 * Provides document editor state and actions to child components.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import type { DocxDocument, DocxBlockContent } from "@oxen/docx/domain/document";
import type { DocxEditorState, DocxEditorAction, TextEditState, EditorMode } from "./editor/types";
import { reducer, createInitialState } from "./editor/reducer/reducer";
import { canUndo as canUndoHistory, canRedo as canRedoHistory } from "./state/history";

// =============================================================================
// Context Value Type
// =============================================================================

/**
 * Document editor context value type.
 */
export type DocumentEditorContextValue = {
  /** Full editor state */
  readonly state: DocxEditorState;
  /** Dispatch action to update state */
  readonly dispatch: (action: DocxEditorAction) => void;
  /** Current document */
  readonly document: DocxDocument;
  /** Selected block content elements */
  readonly selectedElements: readonly DocxBlockContent[];
  /** Primary selected element (for property editing) */
  readonly primaryElement: DocxBlockContent | undefined;
  /** Can undo last action */
  readonly canUndo: boolean;
  /** Can redo undone action */
  readonly canRedo: boolean;
  /** Text editing state */
  readonly textEdit: TextEditState;
  /** Editor mode */
  readonly editorMode: EditorMode;
};

// =============================================================================
// Context
// =============================================================================

const DocumentEditorContext = createContext<DocumentEditorContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

/**
 * Provider for document editor context.
 */
export function DocumentEditorProvider({
  children,
  initialDocument,
}: {
  readonly children: ReactNode;
  readonly initialDocument: DocxDocument;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    initialDocument,
    createInitialState
  );

  const document = state.documentHistory.present;

  const selectedElements = useMemo(() => {
    const elements: DocxBlockContent[] = [];
    for (const elementId of state.selection.element.selectedIds) {
      const index = parseInt(elementId, 10);
      if (!Number.isNaN(index) && index >= 0 && index < document.body.content.length) {
        elements.push(document.body.content[index]);
      }
    }
    return elements;
  }, [document.body.content, state.selection.element.selectedIds]);

  const primaryElement = useMemo(() => {
    const primaryId = state.selection.element.primaryId;
    if (!primaryId) {
      return undefined;
    }
    const index = parseInt(primaryId, 10);
    if (Number.isNaN(index) || index < 0 || index >= document.body.content.length) {
      return undefined;
    }
    return document.body.content[index];
  }, [document.body.content, state.selection.element.primaryId]);

  const canUndo = canUndoHistory(state.documentHistory);
  const canRedo = canRedoHistory(state.documentHistory);
  const textEdit = state.textEdit;
  const editorMode = state.mode;

  const value = useMemo<DocumentEditorContextValue>(
    () => ({
      state,
      dispatch,
      document,
      selectedElements,
      primaryElement,
      canUndo,
      canRedo,
      textEdit,
      editorMode,
    }),
    [state, document, selectedElements, primaryElement, canUndo, canRedo, textEdit, editorMode]
  );

  return (
    <DocumentEditorContext.Provider value={value}>
      {children}
    </DocumentEditorContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access document editor context.
 *
 * @throws Error if used outside DocumentEditorProvider
 */
export function useDocumentEditor(): DocumentEditorContextValue {
  const context = useContext(DocumentEditorContext);
  if (!context) {
    throw new Error("useDocumentEditor must be used within DocumentEditorProvider");
  }
  return context;
}

/**
 * Hook to access document editor with null check (for optional usage).
 */
export function useDocumentEditorOptional(): DocumentEditorContextValue | null {
  return useContext(DocumentEditorContext);
}
