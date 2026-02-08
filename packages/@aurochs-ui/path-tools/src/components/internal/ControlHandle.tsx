/**
 * @file Control handle component
 *
 * Renders a bezier control handle with direction line from anchor to handle.
 * Internal component - not exported from the public API.
 */

import React from "react";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

/**
 * Control handle props
 */
export type ControlHandleProps = {
  /** Anchor point X coordinate */
  readonly anchorX: number;
  /** Anchor point Y coordinate */
  readonly anchorY: number;
  /** Handle X coordinate */
  readonly handleX: number;
  /** Handle Y coordinate */
  readonly handleY: number;
  /** Which side of the anchor this handle is on */
  readonly side: "in" | "out";
  /** Whether this handle is selected */
  readonly isSelected: boolean;
  /** Pointer down handler for dragging */
  readonly onPointerDown?: (e: React.PointerEvent) => void;
};

// =============================================================================
// Constants
// =============================================================================

const HANDLE_SIZE = {
  default: 6,
  selected: 8,
};

const HANDLE_COLORS = {
  fill: {
    default: "white",
    selected: colorTokens.selection.secondary,
  },
  stroke: colorTokens.selection.secondary,
  line: colorTokens.selection.secondary,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Control handle component
 *
 * Renders:
 * - A dashed line from the anchor to the handle
 * - A small circle at the handle position
 */
export function ControlHandle({
  anchorX,
  anchorY,
  handleX,
  handleY,
  side,
  isSelected,
  onPointerDown,
}: ControlHandleProps): React.ReactElement {
  const size = isSelected ? HANDLE_SIZE.selected : HANDLE_SIZE.default;
  const halfSize = size / 2;

  const fill = isSelected ? HANDLE_COLORS.fill.selected : HANDLE_COLORS.fill.default;

  return (
    <g data-handle-side={side} style={{ cursor: "pointer" }}>
      {/* Direction line from anchor to handle */}
      <line
        x1={anchorX}
        y1={anchorY}
        x2={handleX}
        y2={handleY}
        stroke={HANDLE_COLORS.line}
        strokeWidth={1}
        strokeDasharray="3 3"
        pointerEvents="none"
      />
      {/* Handle circle - hit area (larger, invisible) */}
      <circle
        cx={handleX}
        cy={handleY}
        r={halfSize + 4}
        fill="transparent"
        stroke="none"
        onPointerDown={onPointerDown}
      />
      {/* Handle circle - visual */}
      <circle
        cx={handleX}
        cy={handleY}
        r={halfSize}
        fill={fill}
        stroke={HANDLE_COLORS.stroke}
        strokeWidth={1}
        onPointerDown={onPointerDown}
      />
    </g>
  );
}

/**
 * Handle pair component
 *
 * Renders both handles (in and out) for an anchor point if they exist.
 */
export function HandlePair({
  anchorX,
  anchorY,
  handleIn,
  handleOut,
  selectedSide,
  onHandlePointerDown,
  onHandleInPointerDown,
  onHandleOutPointerDown,
}: {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly handleIn?: { x: number; y: number };
  readonly handleOut?: { x: number; y: number };
  readonly selectedSide?: "in" | "out";
  /** Legacy callback for both handles */
  readonly onHandlePointerDown?: (side: "in" | "out", e: React.PointerEvent) => void;
  /** Specific callback for handleIn */
  readonly onHandleInPointerDown?: (e: React.PointerEvent) => void;
  /** Specific callback for handleOut */
  readonly onHandleOutPointerDown?: (e: React.PointerEvent) => void;
}): React.ReactElement {
  return (
    <g>
      {handleIn && (
        <ControlHandle
          anchorX={anchorX}
          anchorY={anchorY}
          handleX={handleIn.x}
          handleY={handleIn.y}
          side="in"
          isSelected={selectedSide === "in"}
          onPointerDown={
            onHandleInPointerDown ?? (onHandlePointerDown ? (e) => onHandlePointerDown("in", e) : undefined)
          }
        />
      )}
      {handleOut && (
        <ControlHandle
          anchorX={anchorX}
          anchorY={anchorY}
          handleX={handleOut.x}
          handleY={handleOut.y}
          side="out"
          isSelected={selectedSide === "out"}
          onPointerDown={
            onHandleOutPointerDown ?? (onHandlePointerDown ? (e) => onHandlePointerDown("out", e) : undefined)
          }
        />
      )}
    </g>
  );
}
