export function startWindowPointerDrag(params: {
  readonly pointerId: number;
  readonly onMove?: (e: PointerEvent) => void;
  readonly onUp?: (e: PointerEvent) => void;
  readonly onCancel?: (e: PointerEvent) => void;
}): () => void {
  const { pointerId, onMove, onUp, onCancel } = params;

  let active = true;

  const cleanup = (): void => {
    if (!active) {
      return;
    }
    active = false;
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

