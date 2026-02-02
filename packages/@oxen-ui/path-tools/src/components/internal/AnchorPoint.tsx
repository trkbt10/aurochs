/**
 * @file Anchor point component
 *
 * Renders an anchor point for path editing with selection and hover states.
 * Internal component - not exported from the public API.
 */

import React from "react";
import type { AnchorPointType } from "../../types";
import { colorTokens } from "@oxen-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

/**
 * Anchor point props
 */
export type AnchorPointProps = {
  /** X coordinate */
  readonly x: number;
  /** Y coordinate */
  readonly y: number;
  /** Point index */
  readonly index: number;
  /** Point type (smooth or corner) */
  readonly pointType: AnchorPointType;
  /** Whether this point is selected */
  readonly isSelected: boolean;
  /** Whether this is the first point (can close path) */
  readonly isFirst: boolean;
  /** Whether the mouse is hovering over this point */
  readonly isHovered: boolean;
  /** Pointer down handler */
  readonly onPointerDown?: (e: React.PointerEvent) => void;
  /** Pointer enter handler */
  readonly onPointerEnter?: () => void;
  /** Pointer leave handler */
  readonly onPointerLeave?: () => void;
};

// =============================================================================
// Constants
// =============================================================================

const ANCHOR_SIZE = {
  default: 8,
  selected: 10,
  hovered: 9,
};

const ANCHOR_COLORS = {
  fill: {
    default: "white",
    selected: colorTokens.selection.primary,
    hovered: colorTokens.selection.secondary,
    firstHovered: "#00cc66", // Green to indicate close path
  },
  stroke: {
    default: colorTokens.selection.primary,
    selected: colorTokens.selection.primary,
    firstHovered: "#00cc66",
  },
};

function getAnchorSize(args: { readonly isSelected: boolean; readonly isHovered: boolean }): number {
  const { isSelected, isHovered } = args;
  if (isSelected) {
    return ANCHOR_SIZE.selected;
  }
  if (isHovered) {
    return ANCHOR_SIZE.hovered;
  }
  return ANCHOR_SIZE.default;
}

function getAnchorFill(args: { readonly isSelected: boolean; readonly isFirst: boolean; readonly isHovered: boolean }): string {
  const { isSelected, isFirst, isHovered } = args;
  if (isSelected) {
    return ANCHOR_COLORS.fill.selected;
  }
  if (isFirst && isHovered) {
    return ANCHOR_COLORS.fill.firstHovered;
  }
  if (isHovered) {
    return ANCHOR_COLORS.fill.hovered;
  }
  return ANCHOR_COLORS.fill.default;
}

function getAnchorStroke(args: { readonly isSelected: boolean; readonly isFirst: boolean; readonly isHovered: boolean }): string {
  const { isSelected, isFirst, isHovered } = args;
  if (isFirst && isHovered) {
    return ANCHOR_COLORS.stroke.firstHovered;
  }
  if (isSelected) {
    return ANCHOR_COLORS.stroke.selected;
  }
  return ANCHOR_COLORS.stroke.default;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Anchor point component
 *
 * Renders as:
 * - Square for corner points
 * - Diamond (rotated square) for smooth points
 * - Filled when selected, hollow when not
 */
export function AnchorPoint({
  x,
  y,
  index,
  pointType,
  isSelected,
  isFirst,
  isHovered,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: AnchorPointProps): React.ReactElement {
  // Determine size
  const size = getAnchorSize({ isSelected, isHovered });
  const halfSize = size / 2;

  // Determine colors
  const fill = getAnchorFill({ isSelected, isFirst, isHovered });

  const stroke = getAnchorStroke({ isSelected, isFirst, isHovered });

  // Rotation for smooth points (diamond shape)
  const rotation = pointType === "smooth" ? 45 : 0;

  return (
    <g
      data-anchor-index={index}
      style={{ cursor: "pointer" }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* Hit area (larger, invisible) */}
      <rect
        x={x - halfSize - 4}
        y={y - halfSize - 4}
        width={size + 8}
        height={size + 8}
        fill="transparent"
        stroke="none"
      />
      {/* Visual anchor point */}
      <rect
        x={x - halfSize}
        y={y - halfSize}
        width={size}
        height={size}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        transform={rotation !== 0 ? `rotate(${rotation} ${x} ${y})` : undefined}
      />
    </g>
  );
}

/**
 * Anchor point for the current drawing preview
 * Shows where the next point will be placed
 */
export function PreviewAnchorPoint({
  x,
  y,
}: {
  readonly x: number;
  readonly y: number;
}): React.ReactElement {
  const size = ANCHOR_SIZE.default;
  const halfSize = size / 2;

  return (
    <rect
      x={x - halfSize}
      y={y - halfSize}
      width={size}
      height={size}
      fill="transparent"
      stroke={colorTokens.selection.secondary}
      strokeWidth={1}
      strokeDasharray="2 2"
      pointerEvents="none"
    />
  );
}
