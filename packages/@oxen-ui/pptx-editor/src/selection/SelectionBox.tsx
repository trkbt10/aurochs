/**
 * @file Selection box component
 *
 * Renders a bounding box around selected shape(s).
 * Uses design tokens for consistent selection styling.
 *
 * Variants:
 * - primary: Solid line, primary color, handles shown (controllable)
 * - secondary: Dashed line "4 4", secondary color, no handles
 * - multi: Dashed line "6 3", secondary color, handles always shown
 */

import type { ResizeHandlePosition } from "../context/slide/state";
import { ResizeHandle } from "./ResizeHandle";
import { RotateHandle } from "./RotateHandle";
import { colorTokens } from "@oxen-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

/**
 * Selection box variant:
 * - primary: Single selected shape (with handles)
 * - secondary: Non-primary shape in multi-selection (no handles)
 * - multi: Combined bounding box for multi-selection (with handles)
 */
export type SelectionBoxVariant = "primary" | "secondary" | "multi";

export type SelectionBoxProps = {
  /** X position */
  readonly x: number;
  /** Y position */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
  /** Rotation in degrees (default: 0) */
  readonly rotation?: number;
  /** Selection variant */
  readonly variant: SelectionBoxVariant;
  /** Whether resize handles are shown (only for primary variant, default: true) */
  readonly showResizeHandles?: boolean;
  /** Whether rotate handle is shown (only for primary variant, default: true) */
  readonly showRotateHandle?: boolean;
  /** Handle resize start */
  readonly onResizeStart?: (handle: ResizeHandlePosition, e: React.PointerEvent) => void;
  /** Handle rotate start */
  readonly onRotateStart?: (e: React.PointerEvent) => void;
};

// =============================================================================
// Constants
// =============================================================================

const SELECTION_COLOR_PRIMARY = colorTokens.selection.primary;
const SELECTION_COLOR_SECONDARY = colorTokens.selection.secondary;
const SELECTION_STROKE_WIDTH = 2;
const ROTATE_HANDLE_OFFSET = 24;

/**
 * Variant-specific styling
 */
const VARIANT_STYLES: Record<SelectionBoxVariant, {
  color: string;
  strokeDasharray: string;
  showHandles: boolean;
}> = {
  primary: {
    color: SELECTION_COLOR_PRIMARY,
    strokeDasharray: "none",
    showHandles: true, // controllable via props
  },
  secondary: {
    color: SELECTION_COLOR_SECONDARY,
    strokeDasharray: "4 4",
    showHandles: false,
  },
  multi: {
    color: SELECTION_COLOR_SECONDARY,
    strokeDasharray: "6 3",
    showHandles: true, // always shown
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Selection box around shape(s).
 *
 * Shows a bounding box with optional resize and rotation handles.
 */
export function SelectionBox({
  x,
  y,
  width,
  height,
  rotation = 0,
  variant,
  showResizeHandles = true,
  showRotateHandle = true,
  onResizeStart,
  onRotateStart,
}: SelectionBoxProps) {
  const style = VARIANT_STYLES[variant];
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const transform = rotation !== 0
    ? `rotate(${rotation}, ${centerX}, ${centerY})`
    : undefined;

  // Determine if handles should be shown
  const shouldShowResizeHandles = variant === "primary"
    ? style.showHandles && showResizeHandles
    : style.showHandles;
  const shouldShowRotateHandle = variant === "primary"
    ? style.showHandles && showRotateHandle
    : style.showHandles;

  return (
    <g transform={transform}>
      {/* Bounding box */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={style.color}
        strokeWidth={SELECTION_STROKE_WIDTH}
        strokeDasharray={style.strokeDasharray}
        pointerEvents="none"
      />

      {/* Resize handles */}
      {shouldShowResizeHandles && (
        <>
          {/* Corner handles */}
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

          {/* Edge handles */}
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
        </>
      )}

      {/* Rotate handle */}
      {shouldShowRotateHandle && (
        <>
          {/* Line from top center to rotate handle */}
          <line
            x1={x + width / 2}
            y1={y}
            x2={x + width / 2}
            y2={y - ROTATE_HANDLE_OFFSET}
            stroke={style.color}
            strokeWidth={1}
            pointerEvents="none"
          />
          <RotateHandle
            x={x + width / 2}
            y={y - ROTATE_HANDLE_OFFSET}
            onPointerDown={onRotateStart}
          />
        </>
      )}
    </g>
  );
}
