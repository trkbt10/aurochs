/**
 * @file Shared text edit handlers hook
 *
 * Single source of truth for text edit commit/cancel logic
 * used by both pptx-editor and potx-editor.
 */

import { useCallback, useMemo } from "react";
import type { TextBody } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { getPlainText } from "@aurochs-ui/editor-core/text-edit";
import type { TextEditState } from "./input-support/state";
import { isTextEditActive } from "./input-support/state";
import { mergeTextIntoBody, extractDefaultRunProperties } from "./input-support/text-body-merge";

// =============================================================================
// Types
// =============================================================================

export type UseTextEditHandlersOptions = {
  readonly textEditState: TextEditState;
  readonly onCommit: (shapeId: ShapeId, textBody: TextBody) => void;
  readonly onExit: () => void;
};

export type TextEditHandlers = {
  readonly handleTextEditComplete: (newText: string) => void;
  readonly handleTextEditCancel: () => void;
  readonly editingShapeId: ShapeId | undefined;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Shared hook for text edit commit/cancel logic.
 *
 * Encapsulates the common pattern:
 * - If text unchanged → exit without commit
 * - If text changed → merge into TextBody preserving formatting → commit
 * - Cancel → exit without commit
 */
export function useTextEditHandlers({
  textEditState,
  onCommit,
  onExit,
}: UseTextEditHandlersOptions): TextEditHandlers {
  const handleTextEditComplete = useCallback(
    (newText: string) => {
      if (isTextEditActive(textEditState)) {
        if (getPlainText(textEditState.initialTextBody) === newText) {
          onExit();
          return;
        }
        const defaultRunProperties = extractDefaultRunProperties(textEditState.initialTextBody);
        const newTextBody = mergeTextIntoBody({ originalBody: textEditState.initialTextBody, newText, defaultRunProperties });
        onCommit(textEditState.shapeId, newTextBody);
      }
      onExit();
    },
    [textEditState, onCommit, onExit],
  );

  const handleTextEditCancel = useCallback(() => {
    onExit();
  }, [onExit]);

  const editingShapeId = useMemo(
    () => (isTextEditActive(textEditState) ? textEditState.shapeId : undefined),
    [textEditState],
  );

  return { handleTextEditComplete, handleTextEditCancel, editingShapeId };
}
