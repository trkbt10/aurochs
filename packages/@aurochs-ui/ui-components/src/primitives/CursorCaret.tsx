/**
 * @file CursorCaret component
 *
 * Renders a blinking cursor caret as an SVG line.
 * Shared across PPTX and DOCX text editors.
 */

import { useEffect, useState } from "react";
import { useCursorBlink } from "../hooks/useCursorBlink";

export type CursorCaretProps = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly isBlinking: boolean;
  readonly color?: string;
  readonly strokeWidth?: number;
};

/**
 * Renders a blinking cursor caret as an SVG line.
 *
 * The cursor blinks when isBlinking is true and becomes solid during input.
 * Visibility resets when cursor position changes to provide visual feedback.
 */
export function CursorCaret({
  x,
  y,
  height,
  isBlinking,
  color = "#000",
  strokeWidth = 1.5,
}: CursorCaretProps) {
  const blinkVisible = useCursorBlink(isBlinking);
  const [visible, setVisible] = useState(true);

  // Reset visibility when cursor position changes
  useEffect(() => {
    setVisible(true);
  }, [x, y]);

  if (!visible || !blinkVisible) {
    return null;
  }

  return (
    <line
      x1={x}
      y1={y}
      x2={x}
      y2={y + height}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  );
}
