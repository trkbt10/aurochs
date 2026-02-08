/**
 * @file Path preview component
 *
 * Renders SVG path preview for the drawing in progress.
 * Internal component - not exported from the public API.
 */

import React from "react";
import type { DrawingPath, PathAnchorPoint } from "../../types";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

/**
 * Path preview props
 */
export type PathPreviewProps = {
  /** The drawing path to preview */
  readonly path: DrawingPath;
  /** Optional preview point (cursor position for next segment) */
  readonly previewPoint?: { x: number; y: number };
  /** Stroke color */
  readonly strokeColor?: string;
  /** Stroke width */
  readonly strokeWidth?: number;
  /** Whether to show as dashed (for incomplete path) */
  readonly isDashed?: boolean;
};

// =============================================================================
// Path Data Generation
// =============================================================================

/**
 * Generate SVG path data from a DrawingPath
 */
function generatePathData(path: DrawingPath, previewPoint?: { x: number; y: number }): string {
  const { points, isClosed } = path;
  if (points.length === 0) {
    return "";
  }

  const parts: string[] = [];

  // Move to first point
  parts.push(`M ${points[0].x} ${points[0].y}`);

  // Draw segments between points
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    parts.push(generateSegmentData(prev, curr));
  }

  // Add preview segment if provided
  if (previewPoint && points.length > 0 && !isClosed) {
    const last = points[points.length - 1];
    // Simple line to preview point (no bezier handles yet)
    if (last.handleOut) {
      // If the last point has a handle, use a bezier curve
      parts.push(
        `C ${last.handleOut.x} ${last.handleOut.y} ${previewPoint.x} ${previewPoint.y} ${previewPoint.x} ${previewPoint.y}`,
      );
    } else {
      parts.push(`L ${previewPoint.x} ${previewPoint.y}`);
    }
  }

  // Close path if needed
  if (isClosed && points.length > 1) {
    const last = points[points.length - 1];
    const first = points[0];

    // Add closing segment
    if (last.handleOut || first.handleIn) {
      const ctrl1 = last.handleOut ?? { x: last.x, y: last.y };
      const ctrl2 = first.handleIn ?? { x: first.x, y: first.y };
      parts.push(`C ${ctrl1.x} ${ctrl1.y} ${ctrl2.x} ${ctrl2.y} ${first.x} ${first.y}`);
    }
    parts.push("Z");
  }

  return parts.join(" ");
}

/**
 * Generate SVG segment data between two anchor points
 */
function generateSegmentData(from: PathAnchorPoint, to: PathAnchorPoint): string {
  // If either point has handles, use cubic bezier
  if (from.handleOut || to.handleIn) {
    const ctrl1 = from.handleOut ?? { x: from.x, y: from.y };
    const ctrl2 = to.handleIn ?? { x: to.x, y: to.y };
    return `C ${ctrl1.x} ${ctrl1.y} ${ctrl2.x} ${ctrl2.y} ${to.x} ${to.y}`;
  }

  // Otherwise, straight line
  return `L ${to.x} ${to.y}`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Path preview component
 *
 * Renders the path as an SVG path element with fill and stroke.
 */
export function PathPreview({
  path,
  previewPoint,
  strokeColor = colorTokens.selection.primary,
  strokeWidth = 2,
  isDashed = false,
}: PathPreviewProps): React.ReactElement | null {
  const pathData = generatePathData(path, previewPoint);

  if (!pathData) {
    return null;
  }

  return (
    <path
      d={pathData}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={isDashed ? "6 4" : undefined}
      pointerEvents="none"
    />
  );
}

/**
 * Preview segment component
 *
 * Renders a preview of the segment being drawn (from last point to cursor).
 */
export function PreviewSegment({
  from,
  to,
  strokeColor = colorTokens.selection.secondary,
}: {
  readonly from: PathAnchorPoint;
  readonly to: { x: number; y: number };
  readonly strokeColor?: string;
}): React.ReactElement {
  // If the from point has a handle, show a curved preview
  if (from.handleOut) {
    const pathData = `M ${from.x} ${from.y} C ${from.handleOut.x} ${from.handleOut.y} ${to.x} ${to.y} ${to.x} ${to.y}`;
    return (
      <path d={pathData} fill="none" stroke={strokeColor} strokeWidth={1} strokeDasharray="4 4" pointerEvents="none" />
    );
  }

  // Otherwise, show a straight line preview
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={strokeColor}
      strokeWidth={1}
      strokeDasharray="4 4"
      pointerEvents="none"
    />
  );
}

/**
 * Pencil stroke preview
 *
 * Renders raw pencil points as a polyline for preview.
 */
export function PencilStrokePreview({
  points,
  strokeColor = colorTokens.selection.primary,
  strokeWidth = 2,
}: {
  readonly points: readonly { x: number; y: number }[];
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
}): React.ReactElement | null {
  if (points.length < 2) {
    return null;
  }

  const pathData = points.map((pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `L ${pt.x} ${pt.y}`)).join(" ");

  return (
    <path
      d={pathData}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    />
  );
}
