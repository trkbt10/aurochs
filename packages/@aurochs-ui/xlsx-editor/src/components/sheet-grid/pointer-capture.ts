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
  // lib.dom types these as non-optional methods, but certain test DOMs
  // (notably older jsdom builds) omit them. A plain `typeof` probe on
  // the declared properties is enough at runtime — no cast required
  // because HTMLElement already exposes the identifiers at the type
  // level.
  return (
    typeof el.setPointerCapture === "function" &&
    typeof el.releasePointerCapture === "function"
  );
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
