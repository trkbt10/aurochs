/**
 * @file Pointer capture helpers
 *
 * Provides safe wrappers around `setPointerCapture`/`releasePointerCapture` for environments where
 * the methods may not exist (e.g., certain test DOM implementations).
 */

type PointerCaptureTarget = HTMLElement & {
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
};

function isPointerCaptureTarget(el: HTMLElement): el is PointerCaptureTarget {
  const maybe = el as unknown as { setPointerCapture?: unknown; releasePointerCapture?: unknown };
  return typeof maybe.setPointerCapture === "function" && typeof maybe.releasePointerCapture === "function";
}

/**
 * Attempt to set pointer capture on `el` for `pointerId`. No-ops when unsupported.
 */
export function safeSetPointerCapture(el: HTMLElement, pointerId: number): void {
  if (!isPointerCaptureTarget(el)) {
    return;
  }
  el.setPointerCapture(pointerId);
}

/**
 * Attempt to release pointer capture on `el` for `pointerId`. No-ops when unsupported.
 */
export function safeReleasePointerCapture(el: HTMLElement, pointerId: number): void {
  if (!isPointerCaptureTarget(el)) {
    return;
  }
  el.releasePointerCapture(pointerId);
}
