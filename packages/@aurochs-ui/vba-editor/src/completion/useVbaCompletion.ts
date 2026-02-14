/**
 * @file VBA Completion Hook
 *
 * State management for IntelliSense completion.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { VbaProcedure } from "@aurochs-office/vba";
import type { CompletionState, CompletionItem, CompletionContext } from "./types";
import { INITIAL_COMPLETION_STATE } from "./types";
import {
  detectCompletionContext,
  collectCompletions,
  applyCompletion,
} from "./vba-completion";

// =============================================================================
// Types
// =============================================================================

export type UseVbaCompletionArgs = {
  /** Current source code */
  readonly source: string | undefined;
  /** Current cursor offset */
  readonly cursorOffset: number;
  /** Procedures in current module */
  readonly procedures: readonly VbaProcedure[];
  /** Callback when source is updated */
  readonly onSourceUpdate: (source: string, cursorOffset: number) => void;
};

export type UseVbaCompletionResult = {
  /** Current completion state */
  readonly state: CompletionState;
  /** Accept currently highlighted completion */
  readonly accept: () => void;
  /** Dismiss completion popup */
  readonly dismiss: () => void;
  /** Move highlight up or down */
  readonly moveHighlight: (delta: number) => void;
  /** Trigger completion manually (Ctrl+Space) */
  readonly triggerManually: () => void;
  /** Handle character input for auto-trigger */
  readonly handleInput: (char: string) => void;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing VBA completion state.
 */
export function useVbaCompletion(args: UseVbaCompletionArgs): UseVbaCompletionResult {
  const { source, cursorOffset, procedures, onSourceUpdate } = args;

  const [state, setState] = useState<CompletionState>(INITIAL_COMPLETION_STATE);

  // Track previous source for change detection
  const prevSourceRef = useRef<string | undefined>(source);
  const prevOffsetRef = useRef<number>(cursorOffset);

  // Update completion when source changes (typing)
  useEffect(() => {
    const prevSource = prevSourceRef.current;
    const prevOffset = prevOffsetRef.current;
    prevSourceRef.current = source;
    prevOffsetRef.current = cursorOffset;

    if (!source) {
      if (state.isOpen) {
        setState(INITIAL_COMPLETION_STATE);
      }
      return;
    }

    // If popup is open, update items based on new context
    if (state.isOpen) {
      const context = detectCompletionContext(source, cursorOffset, "typing");

      if (!context) {
        // Close if context is invalid
        setState(INITIAL_COMPLETION_STATE);
        return;
      }

      // If prefix changed significantly (not just appending), update items
      const items = collectCompletions(context, source, procedures);

      if (items.length === 0) {
        setState(INITIAL_COMPLETION_STATE);
        return;
      }

      setState((prev) => ({
        ...prev,
        items,
        context,
        highlightedIndex: 0,
      }));
    } else {
      // Check for auto-trigger (typing identifier)
      // Only trigger if we added characters (not deleted)
      if (prevSource && source.length > prevSource.length && cursorOffset > prevOffset) {
        const addedChar = source[cursorOffset - 1];

        // Auto-trigger after "." or when typing identifier
        if (addedChar === ".") {
          const context = detectCompletionContext(source, cursorOffset, "dot");
          if (context) {
            const items = collectCompletions(context, source, procedures);
            if (items.length > 0) {
              setState({
                isOpen: true,
                items,
                context,
                highlightedIndex: 0,
              });
            }
          }
        } else if (/[a-zA-Z]/.test(addedChar)) {
          // Trigger after typing 2+ identifier characters
          const context = detectCompletionContext(source, cursorOffset, "typing");
          if (context && context.prefix.length >= 2) {
            const items = collectCompletions(context, source, procedures);
            if (items.length > 0) {
              setState({
                isOpen: true,
                items,
                context,
                highlightedIndex: 0,
              });
            }
          }
        }
      }
    }
  }, [source, cursorOffset, procedures, state.isOpen]);

  // Trigger manually
  const triggerManually = useCallback(() => {
    if (!source) {
      return;
    }

    const context = detectCompletionContext(source, cursorOffset, "manual");
    if (!context) {
      return;
    }

    const items = collectCompletions(context, source, procedures);
    if (items.length === 0) {
      return;
    }

    setState({
      isOpen: true,
      items,
      context,
      highlightedIndex: 0,
    });
  }, [source, cursorOffset, procedures]);

  // Accept completion
  const accept = useCallback(() => {
    if (!state.isOpen || !state.context || !source) {
      return;
    }

    const item = state.items[state.highlightedIndex];
    if (!item) {
      return;
    }

    const { text, cursorOffset: newCursorOffset } = applyCompletion(
      source,
      state.context,
      item,
    );

    onSourceUpdate(text, newCursorOffset);
    setState(INITIAL_COMPLETION_STATE);
  }, [state, source, onSourceUpdate]);

  // Dismiss
  const dismiss = useCallback(() => {
    setState(INITIAL_COMPLETION_STATE);
  }, []);

  // Move highlight
  const moveHighlight = useCallback((delta: number) => {
    setState((prev) => {
      if (!prev.isOpen || prev.items.length === 0) {
        return prev;
      }

      let newIndex = prev.highlightedIndex + delta;

      // Wrap around
      if (newIndex < 0) {
        newIndex = prev.items.length - 1;
      } else if (newIndex >= prev.items.length) {
        newIndex = 0;
      }

      return {
        ...prev,
        highlightedIndex: newIndex,
      };
    });
  }, []);

  // Handle input character (for explicit trigger checking)
  const handleInput = useCallback((_char: string) => {
    // Auto-triggering is handled in useEffect based on source changes
    // This can be used for explicit character-based triggers if needed
  }, []);

  return {
    state,
    accept,
    dismiss,
    moveHighlight,
    triggerManually,
    handleInput,
  };
}
