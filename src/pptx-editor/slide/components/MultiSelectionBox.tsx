/**
 * @file Multi-selection box component
 *
 * Renders a combined bounding box around multiple selected shapes.
 * This box has resize and rotate handles for group manipulation.
 */

import type { ResizeHandlePosition } from "../types";
import { ResizeHandle } from "./ResizeHandle";
import { RotateHandle } from "./RotateHandle";

// =============================================================================
// Types
// =============================================================================

export type MultiSelectionBoxProps = {
  /** X position */
  readonly x: number;
  /** Y position */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
  /** Handle resize start */
  readonly onResizeStart?: (handle: ResizeHandlePosition, e: React.PointerEvent) => void;
  /** Handle rotate start */
  readonly onRotateStart?: (e: React.PointerEvent) => void;
};

// =============================================================================
// Constants
// =============================================================================

const MULTI_SELECTION_COLOR = "#ff6600";
const MULTI_SELECTION_STROKE_WIDTH = 2;
const ROTATE_HANDLE_OFFSET = 24;

// =============================================================================
// Component
// =============================================================================

/**
 * Combined selection box for multiple shapes.
 *
 * Shows a dashed bounding box with resize handles and rotation handle.
 * Used when more than one shape is selected.
 */
export function MultiSelectionBox({
  x,
  y,
  width,
  height,
  onResizeStart,
  onRotateStart,
}: MultiSelectionBoxProps) {
  return (
    <g>
      {/* Combined bounding box - dashed to indicate multi-selection */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={MULTI_SELECTION_COLOR}
        strokeWidth={MULTI_SELECTION_STROKE_WIDTH}
        strokeDasharray="6 3"
        pointerEvents="none"
      />

      {/* Corner resize handles */}
      <ResizeHandle
        position="nw"
        x={x}
        y={y}
        onPointerDown={(e) => onResizeStart?.("nw", e)}
      />
      <ResizeHandle
        position="ne"
        x={x + width}
        y={y}
        onPointerDown={(e) => onResizeStart?.("ne", e)}
      />
      <ResizeHandle
        position="se"
        x={x + width}
        y={y + height}
        onPointerDown={(e) => onResizeStart?.("se", e)}
      />
      <ResizeHandle
        position="sw"
        x={x}
        y={y + height}
        onPointerDown={(e) => onResizeStart?.("sw", e)}
      />

      {/* Edge resize handles */}
      <ResizeHandle
        position="n"
        x={x + width / 2}
        y={y}
        onPointerDown={(e) => onResizeStart?.("n", e)}
      />
      <ResizeHandle
        position="e"
        x={x + width}
        y={y + height / 2}
        onPointerDown={(e) => onResizeStart?.("e", e)}
      />
      <ResizeHandle
        position="s"
        x={x + width / 2}
        y={y + height}
        onPointerDown={(e) => onResizeStart?.("s", e)}
      />
      <ResizeHandle
        position="w"
        x={x}
        y={y + height / 2}
        onPointerDown={(e) => onResizeStart?.("w", e)}
      />

      {/* Rotate handle */}
      <line
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y - ROTATE_HANDLE_OFFSET}
        stroke={MULTI_SELECTION_COLOR}
        strokeWidth={1}
        pointerEvents="none"
      />
      <RotateHandle
        x={x + width / 2}
        y={y - ROTATE_HANDLE_OFFSET}
        onPointerDown={onRotateStart}
      />
    </g>
  );
}
