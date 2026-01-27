/**
 * @file Cursor Caret Component
 *
 * Renders a blinking cursor caret in the text editing overlay.
 */

import { useEffect, useState } from "react";
import type { CursorCoordinates } from "../input-support/cursor";

// =============================================================================
// Constants
// =============================================================================

/**
 * Cursor blink interval in milliseconds.
 */
const CURSOR_BLINK_INTERVAL_MS = 530;

// =============================================================================
// Types
// =============================================================================

export type CursorCaretProps = {
  readonly cursor: CursorCoordinates | undefined;
  readonly isBlinking: boolean;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a blinking cursor caret as an SVG line.
 *
 * The cursor blinks when isBlinking is true and becomes solid during input.
 * Visibility resets when cursor position changes to provide visual feedback.
 */
export function CursorCaret({ cursor, isBlinking }: CursorCaretProps) {
  const [visible, setVisible] = useState(true);

  // Blink effect
  useEffect(() => {
    if (!isBlinking || !cursor) {
      setVisible(true);
      return;
    }

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, CURSOR_BLINK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isBlinking, cursor]);

  // Reset visibility when cursor changes
  useEffect(() => {
    setVisible(true);
  }, [cursor?.x, cursor?.y]);

  if (!cursor || !visible) {
    return null;
  }

  return (
    <line
      x1={cursor.x as number}
      y1={cursor.y as number}
      x2={cursor.x as number}
      y2={(cursor.y as number) + (cursor.height as number)}
      stroke="#000"
      strokeWidth={1.5}
    />
  );
}
