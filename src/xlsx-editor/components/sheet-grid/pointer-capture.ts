type PointerCaptureTarget = HTMLElement & {
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
};

function isPointerCaptureTarget(el: HTMLElement): el is PointerCaptureTarget {
  const maybe = el as unknown as { setPointerCapture?: unknown; releasePointerCapture?: unknown };
  return typeof maybe.setPointerCapture === "function" && typeof maybe.releasePointerCapture === "function";
}

export function safeSetPointerCapture(el: HTMLElement, pointerId: number): void {
  if (!isPointerCaptureTarget(el)) {
    return;
  }
  el.setPointerCapture(pointerId);
}

export function safeReleasePointerCapture(el: HTMLElement, pointerId: number): void {
  if (!isPointerCaptureTarget(el)) {
    return;
  }
  el.releasePointerCapture(pointerId);
}

