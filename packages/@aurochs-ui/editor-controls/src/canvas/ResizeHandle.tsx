/**
 * @file Resize handle component
 *
 * A draggable handle for resizing shapes.
 * Uses design tokens for consistent styling.
 */

import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";
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
  /** Current viewport scale; keeps the handle's screen size constant. */
  readonly viewportScale?: number;
  /** Pointer down handler */
  readonly onPointerDown?: (e: React.PointerEvent) => void;
};

// =============================================================================
// Constants
// =============================================================================

const HANDLE_SIZE = 8;
const HANDLE_FILL = colorTokens.background.primary;
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
export function ResizeHandle({ position, x, y, viewportScale = 1, onPointerDown }: ResizeHandleProps) {
  const safeScale = viewportScale > 0 ? viewportScale : 1;
  const size = HANDLE_SIZE / safeScale;
  const halfSize = size / 2;
  const cursor = CURSOR_MAP[position];

  return (
    <rect
      x={x - halfSize}
      y={y - halfSize}
      width={size}
      height={size}
      fill={HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={HANDLE_STROKE_WIDTH / safeScale}
      style={{ cursor }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPointerDown?.(e);
      }}
    />
  );
}
