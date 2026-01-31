/**
 * @file Pointer utilities
 *
 * Shared helpers for pointer interactions across editors.
 */

export type PrimaryPointerEventLike = {
  readonly pointerType: string;
  readonly button: number;
  readonly buttons: number;
};

export type PrimaryMouseEventLike = {
  readonly button: number;
};

export type TextSelectionDirection = "forward" | "backward" | "none" | null;

export type TextareaSelectionLike = {
  readonly selectionDirection: TextSelectionDirection;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
  setSelectionRange(start: number, end: number, direction?: Exclude<TextSelectionDirection, null>): void;
};


























/**
 * Check if the event represents a primary pointer action (left click or touch).
 */
export function isPrimaryPointerAction(event: PrimaryPointerEventLike): boolean {
  if (event.pointerType === "mouse") {
    return event.button === 0;
  }
  return event.button === 0 || (event.buttons & 1) === 1;
}


























/**
 * Check if the mouse event represents a primary action (left click).
 */
export function isPrimaryMouseAction(event: PrimaryMouseEventLike): boolean {
  return event.button === 0;
}


























/**
 * Get the anchor position of a textarea selection.
 */
export function getSelectionAnchor(textarea: TextareaSelectionLike): number {
  if (textarea.selectionDirection === "backward") {
    return textarea.selectionEnd ?? 0;
  }
  return textarea.selectionStart ?? 0;
}


























/**
 * Apply a selection range to a textarea element.
 */
export function applySelectionRange(params: {
  readonly textarea: TextareaSelectionLike;
  readonly anchorOffset: number;
  readonly focusOffset: number;
}): void {
  const { textarea, anchorOffset, focusOffset } = params;
  const start = Math.min(anchorOffset, focusOffset);
  const end = Math.max(anchorOffset, focusOffset);
  const direction = focusOffset < anchorOffset ? "backward" : "forward";
  textarea.setSelectionRange(start, end, direction);
}
