/**
 * @file Resize handle component
 *
 * A draggable handle for resizing shapes.
 * Uses design tokens for consistent styling.
 */

import type { ResizeHandlePosition } from "../context/slide/state";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type ResizeHandleProps = {
  /** Handle position */
  readonly position: ResizeHandlePosition;
  /** X coordinate */
  readonly x: number;
  /** Y coordinate */
  readonly y: number;
  /** Pointer down handler */
  readonly onPointerDown?: (e: React.PointerEvent) => void;
};

// =============================================================================
// Constants
// =============================================================================

const HANDLE_SIZE = 8;
const HANDLE_FILL = colorTokens.text.primary;
const HANDLE_STROKE = colorTokens.selection.primary;
const HANDLE_STROKE_WIDTH = 1;

/**
 * Cursor styles for each handle position
 */
const CURSOR_MAP: Record<ResizeHandlePosition, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

// =============================================================================
// Component
// =============================================================================

/**
 * A resize handle for shape manipulation.
 */
export function ResizeHandle({ position, x, y, onPointerDown }: ResizeHandleProps) {
  const halfSize = HANDLE_SIZE / 2;
  const cursor = CURSOR_MAP[position];

  return (
    <rect
      x={x - halfSize}
      y={y - halfSize}
      width={HANDLE_SIZE}
      height={HANDLE_SIZE}
      fill={HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={HANDLE_STROKE_WIDTH}
      style={{ cursor }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPointerDown?.(e);
      }}
    />
  );
}
