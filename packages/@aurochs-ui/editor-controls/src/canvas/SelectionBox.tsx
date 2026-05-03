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

import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";
import type { SelectionBoxVariant } from "./types";
import { ResizeHandle } from "./ResizeHandle";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

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
  /** Current viewport scale; selection chrome stays screen-sized. */
  readonly viewportScale?: number;
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
const ROTATE_HIT_SLOP = 12;

/**
 * Variant-specific styling
 */
const VARIANT_STYLES: Record<
  SelectionBoxVariant,
  {
    color: string;
    strokeDasharray: string;
    showHandles: boolean;
  }
> = {
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
  viewportScale = 1,
  onResizeStart,
  onRotateStart,
}: SelectionBoxProps) {
  const style = VARIANT_STYLES[variant];
  const safeScale = viewportScale > 0 ? viewportScale : 1;
  const rotateHitSlop = ROTATE_HIT_SLOP / safeScale;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  function getTransform(rotation: number, centerX: number, centerY: number): string | undefined {
    if (rotation === 0) {
      return undefined;
    }
    return `rotate(${rotation}, ${centerX}, ${centerY})`;
  }

  const transform = getTransform(rotation, centerX, centerY);

  // Determine if handles should be shown
  function shouldShowHandle(variant: SelectionBoxVariant, showFlag: boolean): boolean {
    if (variant !== "primary") {
      return style.showHandles;
    }
    return style.showHandles && showFlag;
  }

  const shouldShowResizeHandles = shouldShowHandle(variant, showResizeHandles);
  const shouldShowRotateHandle = shouldShowHandle(variant, showRotateHandle);

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
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />

      {/* Figma-like rotation zones: grab just outside any edge instead of a visible top arrow. */}
      {shouldShowRotateHandle && (
        <g
          fill="none"
          stroke="transparent"
          strokeWidth={rotateHitSlop}
          style={{ cursor: "grab" }}
          pointerEvents="stroke"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRotateStart?.(e);
          }}
        >
          <line x1={x} y1={y - rotateHitSlop / 2} x2={x + width} y2={y - rotateHitSlop / 2} />
          <line x1={x + width + rotateHitSlop / 2} y1={y} x2={x + width + rotateHitSlop / 2} y2={y + height} />
          <line x1={x} y1={y + height + rotateHitSlop / 2} x2={x + width} y2={y + height + rotateHitSlop / 2} />
          <line x1={x - rotateHitSlop / 2} y1={y} x2={x - rotateHitSlop / 2} y2={y + height} />
        </g>
      )}

      {/* Resize handles */}
      {shouldShowResizeHandles && (
        <>
          {/* Corner handles */}
          <ResizeHandle position="nw" x={x} y={y} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("nw", e)} />
          <ResizeHandle position="ne" x={x + width} y={y} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("ne", e)} />
          <ResizeHandle position="se" x={x + width} y={y + height} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("se", e)} />
          <ResizeHandle position="sw" x={x} y={y + height} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("sw", e)} />

          {/* Edge handles */}
          <ResizeHandle position="n" x={x + width / 2} y={y} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("n", e)} />
          <ResizeHandle position="e" x={x + width} y={y + height / 2} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("e", e)} />
          <ResizeHandle position="s" x={x + width / 2} y={y + height} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("s", e)} />
          <ResizeHandle position="w" x={x} y={y + height / 2} viewportScale={safeScale} onPointerDown={(e) => onResizeStart?.("w", e)} />
        </>
      )}
    </g>
  );
}
