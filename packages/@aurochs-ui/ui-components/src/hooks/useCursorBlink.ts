/**
 * @file Cursor blink hook
 *
 * Shared hook for blinking cursor carets in text editors.
 */

import { useEffect, useState } from "react";

/** Standard cursor blink interval (530ms). */
const CURSOR_BLINK_INTERVAL_MS = 530;

/**
 * Toggle visibility at a standard blink rate.
 *
 * Returns `true` when the cursor should be visible.
 * When `isBlinking` is false, always returns `true` (solid cursor during input).
 */
export function useCursorBlink(isBlinking: boolean): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isBlinking) {
      setVisible(true);
      return;
    }

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, CURSOR_BLINK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isBlinking]);

  return visible;
}
