/**
 * @file TextEditContext - Context for text editing state
 *
 * Provides a React context for sharing text editing state between
 * the TextEditController and the PropertyPanel.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { TextBody, RunProperties, ParagraphProperties } from "@oxen/pptx/domain";
import type { TextEditState, StickyFormattingState, TextCursorState } from "../../slide/text-edit";
import type { TextSelectionContext } from "../../editors/text/text-property-extractor";

// =============================================================================
// Types
// =============================================================================

/**
 * Context value for text editing state.
 */
export type TextEditContextValue = {
  /** Current text edit state */
  readonly textEditState: TextEditState;

  /** Current TextBody (live, reflecting edits) */
  readonly currentTextBody: TextBody | undefined;

  /** Current selection context for property extraction */
  readonly selectionContext: TextSelectionContext;

  /** Current cursor state */
  readonly cursorState: TextCursorState | undefined;

  /** Apply run properties to current selection */
  readonly applyRunProperties: (props: Partial<RunProperties>) => void;

  /** Apply paragraph properties to selected paragraphs */
  readonly applyParagraphProperties: (props: Partial<ParagraphProperties>) => void;

  /** Toggle a boolean run property (bold, italic, etc.) */
  readonly toggleRunProperty: (
    propertyKey: keyof RunProperties,
    currentValue: boolean | undefined
  ) => void;

  /** Current sticky formatting state */
  readonly stickyFormatting: StickyFormattingState | undefined;

  /** Set sticky formatting */
  readonly setStickyFormatting: (props: RunProperties) => void;

  /** Clear sticky formatting */
  readonly clearStickyFormatting: () => void;
};

// =============================================================================
// Context
// =============================================================================

const TextEditContext = createContext<TextEditContextValue | null>(null);

/**
 * Hook to access text edit context.
 * Returns null if not in a TextEditContext.Provider.
 */
export function useTextEditContext(): TextEditContextValue | null {
  return useContext(TextEditContext);
}

/**
 * Hook to access text edit context with requirement check.
 * Throws if not in a TextEditContext.Provider.
 */
export function useRequiredTextEditContext(): TextEditContextValue {
  const context = useContext(TextEditContext);
  if (!context) {
    throw new Error("useRequiredTextEditContext must be used within a TextEditContextProvider");
  }
  return context;
}

// =============================================================================
// Provider Props
// =============================================================================

export type TextEditContextProviderProps = {
  readonly children: ReactNode;
  readonly value: TextEditContextValue;
};

/**
 * Provider component for text edit context.
 */
export function TextEditContextProvider({
  children,
  value,
}: TextEditContextProviderProps) {
  return (
    <TextEditContext.Provider value={value}>
      {children}
    </TextEditContext.Provider>
  );
}

// =============================================================================
// Factory for Context Value
// =============================================================================

export type CreateTextEditContextValueParams = {
  textEditState: TextEditState;
  currentTextBody: TextBody | undefined;
  selectionContext: TextSelectionContext;
  cursorState: TextCursorState | undefined;
  stickyFormatting: StickyFormattingState | undefined;
  onApplyRunProperties: (props: Partial<RunProperties>) => void;
  onApplyParagraphProperties: (props: Partial<ParagraphProperties>) => void;
  onToggleRunProperty: (propertyKey: keyof RunProperties, currentValue: boolean | undefined) => void;
  onSetStickyFormatting: (props: RunProperties) => void;
  onClearStickyFormatting: () => void;
};

/**
 * Create a context value from the given parameters.
 * Use this in the component that owns the text edit state.
 */
export function createTextEditContextValue(
  params: CreateTextEditContextValueParams
): TextEditContextValue {
  return {
    textEditState: params.textEditState,
    currentTextBody: params.currentTextBody,
    selectionContext: params.selectionContext,
    cursorState: params.cursorState,
    stickyFormatting: params.stickyFormatting,
    applyRunProperties: params.onApplyRunProperties,
    applyParagraphProperties: params.onApplyParagraphProperties,
    toggleRunProperty: params.onToggleRunProperty,
    setStickyFormatting: params.onSetStickyFormatting,
    clearStickyFormatting: params.onClearStickyFormatting,
  };
}

/**
 * Hook to create a memoized context value.
 * Updates only when dependencies change.
 */
export function useTextEditContextValue(
  params: CreateTextEditContextValueParams
): TextEditContextValue {
  return useMemo(
    () => createTextEditContextValue(params),
    [
      params.textEditState,
      params.currentTextBody,
      params.selectionContext,
      params.cursorState,
      params.stickyFormatting,
      params.onApplyRunProperties,
      params.onApplyParagraphProperties,
      params.onToggleRunProperty,
      params.onSetStickyFormatting,
      params.onClearStickyFormatting,
    ]
  );
}
