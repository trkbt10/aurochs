/**
 * @file DocxTextInputFrame component
 *
 * Hidden textarea for capturing native text input/IME events during DOCX editing.
 */

import {
  useEffect,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

export type DocxTextInputFrameProps = {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly onSelect: () => void;
  readonly onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly onCompositionStart: () => void;
  readonly onCompositionEnd: () => void;
  readonly onBlur: () => void;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
};

const HIDDEN_TEXTAREA_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  resize: "none",
  border: "none",
  outline: "none",
  overflow: "hidden",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  caretColor: "transparent",
  pointerEvents: "auto",
  padding: 0,
  margin: 0,
  cursor: "text",
  // Prevent iOS auto-zoom on focus (requires font-size >= 16px)
  fontSize: 16,
};

function clampSelection(value: string, start: number, end: number): readonly [number, number] {
  const max = value.length;
  const clampedStart = Math.max(0, Math.min(start, max));
  const clampedEnd = Math.max(0, Math.min(end, max));
  return clampedStart <= clampedEnd
    ? [clampedStart, clampedEnd]
    : [clampedEnd, clampedStart];
}

export function DocxTextInputFrame({
  value,
  selectionStart,
  selectionEnd,
  onChange,
  onSelect,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onBlur,
  textareaRef,
}: DocxTextInputFrameProps): ReactNode {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.focus();
    const [start, end] = clampSelection(value, selectionStart, selectionEnd);
    textarea.setSelectionRange(start, end);
  }, [textareaRef, value, selectionStart, selectionEnd]);

  return (
    <textarea
      ref={textareaRef}
      data-testid="docx-text-edit-textarea"
      className="docx-text-input-frame"
      style={HIDDEN_TEXTAREA_STYLE}
      value={value}
      onChange={onChange}
      onSelect={onSelect}
      onKeyDown={onKeyDown}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      onBlur={onBlur}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
    />
  );
}
