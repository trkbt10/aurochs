/**
 * @file Text edit input handlers hook
 *
 * Manages textarea input, IME composition, selection syncing, and save-on-unmount.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type MutableRefObject,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { TextBody } from "@oxen/pptx/domain";
import type { LayoutResult } from "@oxen/pptx-render/text-layout";
import {
  offsetToCursorPosition,
  cursorPositionToCoordinates,
  selectionToRects,
  isSamePosition,
  type CursorPosition,
  type TextSelection,
} from "../input-support/cursor";
import type { CursorState, CompositionState, SelectionChangeEvent } from "./types";

type UseTextEditInputArgs = {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly currentTextBody: TextBody;
  readonly layoutResult: LayoutResult;
  readonly composition: CompositionState;
  readonly currentText: string;
  readonly setCurrentText: Dispatch<SetStateAction<string>>;
  readonly onComplete: (text: string) => void;
  readonly onSelectionChange?: (event: SelectionChangeEvent) => void;
  readonly onSelectionSnapshot?: (snapshot: {
    readonly start: number;
    readonly end: number;
    readonly direction: HTMLTextAreaElement["selectionDirection"];
  }) => void;
  readonly selectionGuardRef?: MutableRefObject<boolean>;
  readonly setCursorState: Dispatch<SetStateAction<CursorState>>;
  readonly finishedRef: MutableRefObject<boolean>;
  readonly initialTextRef: MutableRefObject<string>;
};

type UseTextEditInputResult = {
  readonly handleChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly updateCursorPosition: () => void;
};

function areRectsEqual(
  left: CursorState["selectionRects"],
  right: CursorState["selectionRects"],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (
      (a.x as number) !== (b.x as number) ||
      (a.y as number) !== (b.y as number) ||
      (a.width as number) !== (b.width as number) ||
      (a.height as number) !== (b.height as number)
    ) {
      return false;
    }
  }
  return true;
}

function areCursorCoordsEqual(
  left: CursorState["cursor"],
  right: CursorState["cursor"],
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    (left.x as number) === (right.x as number) &&
    (left.y as number) === (right.y as number) &&
    (left.height as number) === (right.height as number)
  );
}

function areSelectionsEqual(
  left: TextSelection | undefined,
  right: TextSelection | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    isSamePosition(left.start, right.start) &&
    isSamePosition(left.end, right.end)
  );
}






export function useTextEditInput({
  textareaRef,
  currentTextBody,
  layoutResult,
  composition,
  currentText,
  setCurrentText,
  onComplete,
  onSelectionChange,
  onSelectionSnapshot,
  selectionGuardRef,
  setCursorState,
  finishedRef,
  initialTextRef,
}: UseTextEditInputArgs): UseTextEditInputResult {
  if (!textareaRef) {
    throw new Error("useTextEditInput requires textareaRef.");
  }
  if (!currentTextBody) {
    throw new Error("useTextEditInput requires currentTextBody.");
  }
  if (!layoutResult) {
    throw new Error("useTextEditInput requires layoutResult.");
  }
  if (!setCurrentText) {
    throw new Error("useTextEditInput requires setCurrentText.");
  }
  if (!onComplete) {
    throw new Error("useTextEditInput requires onComplete.");
  }
  if (!setCursorState) {
    throw new Error("useTextEditInput requires setCursorState.");
  }
  if (!finishedRef) {
    throw new Error("useTextEditInput requires finishedRef.");
  }
  if (!initialTextRef) {
    throw new Error("useTextEditInput requires initialTextRef.");
  }

  const lastSelectionRef = useRef<{
    textBody: TextBody;
    cursorPosition: CursorPosition | undefined;
    selection: TextSelection | undefined;
  } | null>(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [textareaRef]);

  // Update cursor position and report selection changes
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    if (selectionGuardRef?.current) {
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    onSelectionSnapshot?.({
      start: selectionStart,
      end: selectionEnd,
      direction: textarea.selectionDirection,
    });
    const hasSelection = selectionStart !== selectionEnd;

    if (hasSelection) {
      const startPos = offsetToCursorPosition(currentTextBody, selectionStart);
      const endPos = offsetToCursorPosition(currentTextBody, selectionEnd);
      const rects = selectionToRects({ start: startPos, end: endPos }, layoutResult);

      const nextCursorState: CursorState = {
        cursor: undefined,
        selectionRects: rects,
        isBlinking: false,
      };

      // Report selection change
      if (onSelectionChange) {
        const selection: TextSelection = { start: startPos, end: endPos };
        const lastSelection = lastSelectionRef.current;
        if (
          !lastSelection ||
          lastSelection.textBody !== currentTextBody ||
          !areSelectionsEqual(lastSelection.selection, selection)
        ) {
          lastSelectionRef.current = {
            textBody: currentTextBody,
            cursorPosition: undefined,
            selection,
          };
          onSelectionChange({
            textBody: currentTextBody,
            cursorPosition: undefined,
            selection,
          });
        }
      }

      setCursorState((prev) => {
        if (
          prev.cursor === undefined &&
          areRectsEqual(prev.selectionRects, nextCursorState.selectionRects) &&
          prev.isBlinking === nextCursorState.isBlinking
        ) {
          return prev;
        }
        return nextCursorState;
      });
    } else {
      const cursorPos = offsetToCursorPosition(currentTextBody, selectionStart);
      const coords = cursorPositionToCoordinates(cursorPos, layoutResult);

      const nextCursorState: CursorState = {
        cursor: coords,
        selectionRects: [],
        isBlinking: !composition.isComposing,
      };

      // Report cursor position change
      if (onSelectionChange) {
        const lastSelection = lastSelectionRef.current;
        const isSameCursor =
          lastSelection?.cursorPosition !== undefined &&
          isSamePosition(lastSelection.cursorPosition, cursorPos);
        if (
          !lastSelection ||
          lastSelection.textBody !== currentTextBody ||
          !isSameCursor ||
          lastSelection.selection !== undefined
        ) {
          lastSelectionRef.current = {
            textBody: currentTextBody,
            cursorPosition: cursorPos,
            selection: undefined,
          };
          onSelectionChange({
            textBody: currentTextBody,
            cursorPosition: cursorPos,
            selection: undefined,
          });
        }
      }

      setCursorState((prev) => {
        if (
          areCursorCoordsEqual(prev.cursor, nextCursorState.cursor) &&
          prev.selectionRects.length === 0 &&
          prev.isBlinking === nextCursorState.isBlinking
        ) {
          return prev;
        }
        return nextCursorState;
      });
    }
  }, [
    textareaRef,
    currentTextBody,
    layoutResult,
    composition.isComposing,
    onSelectionChange,
    onSelectionSnapshot,
    selectionGuardRef,
    setCursorState,
  ]);

  // Handle selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      updateCursorPosition();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateCursorPosition]);

  // Update cursor on layout changes
  useEffect(() => {
    updateCursorPosition();
  }, [layoutResult, updateCursorPosition]);

  // Handle text changes
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCurrentText(newText);
    requestAnimationFrame(() => {
      updateCursorPosition();
    });
  }, [setCurrentText, updateCursorPosition]);

  // Ref to track latest values for unmount callback
  const latestRef = useRef({
    currentText,
    initialText: initialTextRef.current,
    onComplete,
  });
  latestRef.current = {
    currentText,
    initialText: initialTextRef.current,
    onComplete,
  };

  // Save text on unmount
  useEffect(() => {
    return () => {
      if (finishedRef.current) {
        return;
      }
      const { currentText: text, initialText, onComplete: complete } = latestRef.current;
      if (text !== initialText) {
        complete(text);
      }
    };
  }, [finishedRef]);

  return {
    handleChange,
    updateCursorPosition,
  };
}
