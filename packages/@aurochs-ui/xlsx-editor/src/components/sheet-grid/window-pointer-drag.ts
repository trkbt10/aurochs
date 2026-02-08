/**
 * @file Pointer drag helpers for spreadsheet UI
 *
 * Provides a small abstraction for pointer-based drags that are tracked via `window` listeners.
 * The handlers are filtered by `pointerId` so concurrent pointers do not interfere.
 */

/**
 * Start a pointer drag sequence by attaching `pointermove`/`pointerup`/`pointercancel` to `window`.
 *
 * Returns a cleanup function that removes listeners. `onUp`/`onCancel` are invoked after cleanup.
 */
export function startWindowPointerDrag(params: {
  readonly pointerId: number;
  readonly onMove?: (e: PointerEvent) => void;
  readonly onUp?: (e: PointerEvent) => void;
  readonly onCancel?: (e: PointerEvent) => void;
}): () => void {
  const { pointerId, onMove, onUp, onCancel } = params;

  const state = { active: true };

  const cleanup = (): void => {
    if (!state.active) {
      return;
    }
    state.active = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerCancel);
  };

  const handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) {
      return;
    }
    onMove?.(e);
  };

  const handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) {
      return;
    }
    cleanup();
    onUp?.(e);
  };

  const handlePointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) {
      return;
    }
    cleanup();
    onCancel?.(e);
  };

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerCancel);

  return cleanup;
}
