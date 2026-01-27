/**
 * @file Rotate handle component
 *
 * A draggable handle for rotating shapes.
 * Uses design tokens for consistent styling.
 */

import { colorTokens } from "@oxen-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type RotateHandleProps = {
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

const HANDLE_RADIUS = 5;
const HANDLE_FILL = colorTokens.text.primary;
const HANDLE_STROKE = colorTokens.selection.primary;
const HANDLE_STROKE_WIDTH = 1;

// =============================================================================
// Component
// =============================================================================

/**
 * A rotate handle for shape manipulation.
 */
export function RotateHandle({
  x,
  y,
  onPointerDown,
}: RotateHandleProps) {
  return (
    <g>
      {/* Rotate icon circle */}
      <circle
        cx={x}
        cy={y}
        r={HANDLE_RADIUS}
        fill={HANDLE_FILL}
        stroke={HANDLE_STROKE}
        strokeWidth={HANDLE_STROKE_WIDTH}
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onPointerDown?.(e);
        }}
      />
      {/* Rotation arrow icon */}
      <path
        d={`M ${x - 2} ${y} A 2 2 0 1 1 ${x + 2} ${y}`}
        fill="none"
        stroke={HANDLE_STROKE}
        strokeWidth={0.8}
        pointerEvents="none"
      />
      <path
        d={`M ${x + 1} ${y - 1.5} L ${x + 2} ${y} L ${x + 3} ${y - 1}`}
        fill="none"
        stroke={HANDLE_STROKE}
        strokeWidth={0.8}
        pointerEvents="none"
      />
    </g>
  );
}
