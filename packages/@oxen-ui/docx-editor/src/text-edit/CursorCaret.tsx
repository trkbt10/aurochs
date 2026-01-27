/**
 * @file CursorCaret component
 *
 * Renders a blinking caret cursor as an SVG line.
 */

import { useEffect, useState, type ReactNode } from "react";

// 530ms間隔で点滅（標準的なカーソル点滅速度）
const BLINK_INTERVAL = 530;

export type CursorCaretProps = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly isBlinking: boolean;
  readonly color?: string;
};

function useCursorBlink(isBlinking: boolean): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isBlinking) {
      setVisible(true);
      return;
    }

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, BLINK_INTERVAL);

    return () => clearInterval(interval);
  }, [isBlinking]);

  return visible;
}

export function CursorCaret({
  x,
  y,
  height,
  isBlinking,
  color = "var(--text-inverse)",
}: CursorCaretProps): ReactNode {
  const visible = useCursorBlink(isBlinking);

  if (!visible) {
    return null;
  }

  return (
    <line
      x1={x}
      y1={y}
      x2={x}
      y2={y + height}
      stroke={color}
      strokeWidth={1}
    />
  );
}

