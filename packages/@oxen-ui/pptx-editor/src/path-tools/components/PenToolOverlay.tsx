/**
 * @file Pen tool overlay component
 *
 * Main overlay component for pen tool that combines path preview,
 * anchor points, and control handles.
 */

import React, { useCallback } from "react";
import type { DrawingPath, ModifierKeys } from "../types";
import { getModifierKeys } from "../types";
import { AnchorPoint, PreviewAnchorPoint } from "./AnchorPoint";
import { HandlePair } from "./ControlHandle";
import { PathPreview, PreviewSegment } from "./PathPreview";
import { usePenTool } from "../hooks/usePenTool";

// =============================================================================
// Types
// =============================================================================

/**
 * Pen tool overlay props
 */
export type PenToolOverlayProps = {
  /** Slide width in pixels */
  readonly slideWidth: number;
  /** Slide height in pixels */
  readonly slideHeight: number;
  /** Called when a path is committed */
  readonly onCommit: (path: DrawingPath) => void;
  /** Called when drawing is cancelled */
  readonly onCancel: () => void;
  /** Whether the tool is active */
  readonly isActive: boolean;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Pen tool overlay component
 *
 * Renders on top of the slide canvas to show the path being drawn.
 */
export function PenToolOverlay({
  slideWidth,
  slideHeight,
  onCommit,
  onCancel,
  isActive,
}: PenToolOverlayProps): React.ReactElement | null {
  const {
    state,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onAnchorPointerDown,
    onAnchorHover,
    onKeyDown,
    hasActivePath,
  } = usePenTool({
    onCommit,
    onCancel,
  });

  const { path, hoverPointIndex, previewPoint } = state;

  // Convert client coordinates to SVG/slide coordinates
  const clientToSlideCoords = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      // Account for viewBox scaling
      const scaleX = slideWidth / rect.width;
      const scaleY = slideHeight / rect.height;
      const scale = Math.min(scaleX, scaleY);

      // Calculate the offset due to preserveAspectRatio="xMidYMid meet"
      const scaledWidth = slideWidth / scale;
      const scaledHeight = slideHeight / scale;
      const offsetX = (rect.width - scaledWidth) / 2;
      const offsetY = (rect.height - scaledHeight) / 2;

      const x = (clientX - rect.left - offsetX) * scale;
      const y = (clientY - rect.top - offsetY) * scale;

      return { x, y };
    },
    [slideWidth, slideHeight]
  );

  // Handle pointer down on the overlay
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const { x, y } = clientToSlideCoords(e.clientX, e.clientY, rect);
      const modifiers = getModifierKeys(e);

      onCanvasPointerDown(x, y, modifiers);
    },
    [isActive, onCanvasPointerDown, clientToSlideCoords]
  );

  // Handle pointer move on the overlay
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const { x, y } = clientToSlideCoords(e.clientX, e.clientY, rect);
      const modifiers = getModifierKeys(e);

      onCanvasPointerMove(x, y, modifiers);
    },
    [isActive, onCanvasPointerMove, clientToSlideCoords]
  );

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive) {
        return;
      }
      onKeyDown(e);
    },
    [isActive, onKeyDown]
  );

  if (!isActive) {
    return null;
  }

  const lastPoint = path.points.length > 0 ? path.points[path.points.length - 1] : undefined;

  return (
    <svg
      viewBox={`0 0 ${slideWidth} ${slideHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        cursor: "crosshair",
        pointerEvents: "all",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={onCanvasPointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Path preview (committed segments) */}
      {path.points.length > 1 && (
        <PathPreview path={path} isDashed={false} />
      )}

      {/* Preview segment to cursor */}
      {lastPoint && previewPoint && !path.isClosed && (
        <PreviewSegment
          from={lastPoint}
          to={previewPoint}
        />
      )}

      {/* Preview anchor at cursor */}
      {previewPoint && !path.isClosed && path.points.length > 0 && (
        <PreviewAnchorPoint x={previewPoint.x} y={previewPoint.y} />
      )}

      {/* Anchor points */}
      {path.points.map((point, index) => (
        <React.Fragment key={index}>
          {/* Handles for this point */}
          <HandlePair
            anchorX={point.x as number}
            anchorY={point.y as number}
            handleIn={point.handleIn ? { x: point.handleIn.x as number, y: point.handleIn.y as number } : undefined}
            handleOut={point.handleOut ? { x: point.handleOut.x as number, y: point.handleOut.y as number } : undefined}
          />

          {/* Anchor point */}
          <AnchorPoint
            x={point.x as number}
            y={point.y as number}
            index={index}
            pointType={point.type}
            isSelected={index === path.points.length - 1}
            isFirst={index === 0}
            isHovered={hoverPointIndex === index}
            onPointerDown={(e) => onAnchorPointerDown(index, e)}
            onPointerEnter={() => onAnchorHover(index)}
            onPointerLeave={() => onAnchorHover(undefined)}
          />
        </React.Fragment>
      ))}
    </svg>
  );
}

/**
 * Simple pen tool overlay for use in reducer-based state management
 *
 * This version takes state and callbacks as props instead of using the hook internally.
 */
export function PenToolOverlayControlled({
  path,
  hoverPointIndex,
  previewPoint,
  slideWidth,
  slideHeight,
  isActive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onAnchorPointerDown,
  onAnchorHover,
}: {
  readonly path: DrawingPath;
  readonly hoverPointIndex: number | undefined;
  readonly previewPoint: { x: number; y: number } | undefined;
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly isActive: boolean;
  readonly onPointerDown: (x: number, y: number, modifiers: ModifierKeys) => void;
  readonly onPointerMove: (x: number, y: number, modifiers: ModifierKeys) => void;
  readonly onPointerUp: () => void;
  readonly onAnchorPointerDown: (index: number, e: React.PointerEvent) => void;
  readonly onAnchorHover: (index: number | undefined) => void;
}): React.ReactElement | null {
  // Convert client coordinates to SVG/slide coordinates
  const clientToSlideCoords = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      // Account for viewBox scaling
      const scaleX = slideWidth / rect.width;
      const scaleY = slideHeight / rect.height;
      const scale = Math.min(scaleX, scaleY);

      // Calculate the offset due to preserveAspectRatio="xMidYMid meet"
      const scaledWidth = slideWidth / scale;
      const scaledHeight = slideHeight / scale;
      const offsetX = (rect.width - scaledWidth) / 2;
      const offsetY = (rect.height - scaledHeight) / 2;

      const x = (clientX - rect.left - offsetX) * scale;
      const y = (clientY - rect.top - offsetY) * scale;

      return { x, y };
    },
    [slideWidth, slideHeight]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const { x, y } = clientToSlideCoords(e.clientX, e.clientY, rect);
      const modifiers = getModifierKeys(e);

      onPointerDown(x, y, modifiers);
    },
    [isActive, onPointerDown, clientToSlideCoords]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const { x, y } = clientToSlideCoords(e.clientX, e.clientY, rect);
      const modifiers = getModifierKeys(e);

      onPointerMove(x, y, modifiers);
    },
    [isActive, onPointerMove, clientToSlideCoords]
  );

  if (!isActive) {
    return null;
  }

  const lastPoint = path.points.length > 0 ? path.points[path.points.length - 1] : undefined;

  return (
    <svg
      viewBox={`0 0 ${slideWidth} ${slideHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        cursor: "crosshair",
        pointerEvents: "all",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={onPointerUp}
      tabIndex={0}
    >
      {/* Path preview (committed segments) */}
      {path.points.length > 1 && (
        <PathPreview path={path} isDashed={false} />
      )}

      {/* Preview segment to cursor */}
      {lastPoint && previewPoint && !path.isClosed && (
        <PreviewSegment
          from={lastPoint}
          to={previewPoint}
        />
      )}

      {/* Preview anchor at cursor */}
      {previewPoint && !path.isClosed && path.points.length > 0 && (
        <PreviewAnchorPoint x={previewPoint.x} y={previewPoint.y} />
      )}

      {/* Anchor points */}
      {path.points.map((point, index) => (
        <React.Fragment key={index}>
          {/* Handles for this point */}
          <HandlePair
            anchorX={point.x as number}
            anchorY={point.y as number}
            handleIn={point.handleIn ? { x: point.handleIn.x as number, y: point.handleIn.y as number } : undefined}
            handleOut={point.handleOut ? { x: point.handleOut.x as number, y: point.handleOut.y as number } : undefined}
          />

          {/* Anchor point */}
          <AnchorPoint
            x={point.x as number}
            y={point.y as number}
            index={index}
            pointType={point.type}
            isSelected={index === path.points.length - 1}
            isFirst={index === 0}
            isHovered={hoverPointIndex === index}
            onPointerDown={(e) => onAnchorPointerDown(index, e)}
            onPointerEnter={() => onAnchorHover(index)}
            onPointerLeave={() => onAnchorHover(undefined)}
          />
        </React.Fragment>
      ))}
    </svg>
  );
}
