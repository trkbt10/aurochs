/**
 * @file Path edit overlay component
 *
 * Overlay component for editing existing custom geometry paths.
 */

import React, { useCallback, useEffect } from "react";
import { px } from "@oxen/ooxml/domain/units";
import type { DrawingPath, ModifierKeys } from "../types";
import { getModifierKeys } from "../types";
import { AnchorPoint } from "./AnchorPoint";
import { HandlePair } from "./ControlHandle";
import { PathPreview } from "./PathPreview";
import { usePathEdit } from "../hooks/usePathEdit";

// =============================================================================
// Types
// =============================================================================

/**
 * Path edit overlay props
 */
export type PathEditOverlayProps = {
  /** Initial path to edit */
  readonly initialPath: DrawingPath;
  /** Shape X offset (for positioning) */
  readonly offsetX: number;
  /** Shape Y offset (for positioning) */
  readonly offsetY: number;
  /** Slide width in pixels */
  readonly slideWidth: number;
  /** Slide height in pixels */
  readonly slideHeight: number;
  /** Called when the path is committed */
  readonly onCommit: (path: DrawingPath) => void;
  /** Called when editing is cancelled */
  readonly onCancel: () => void;
  /** Whether the overlay is active */
  readonly isActive: boolean;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Path edit overlay component
 *
 * Renders on top of the slide canvas to allow editing of existing paths.
 */
export function PathEditOverlay({
  initialPath,
  offsetX,
  offsetY,
  slideWidth,
  slideHeight,
  onCommit,
  onCancel,
  isActive,
}: PathEditOverlayProps): React.ReactElement | null {
  const {
    state,
    initializePath,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onAnchorPointerDown,
    onHandlePointerDown,
    onAnchorHover,
    onKeyDown,
  } = usePathEdit({
    onCommit,
    onCancel,
  });

  const { path, selectedPoints, hoverPointIndex } = state;

  // Initialize path when component mounts or initialPath changes
  useEffect(() => {
    if (isActive) {
      // Offset the path points by the shape position
      const offsetPath: DrawingPath = {
        ...initialPath,
        points: initialPath.points.map((point) => ({
          ...point,
          x: px((point.x as number) + offsetX),
          y: px((point.y as number) + offsetY),
          handleIn: point.handleIn
            ? {
                x: px((point.handleIn.x as number) + offsetX),
                y: px((point.handleIn.y as number) + offsetY),
              }
            : undefined,
          handleOut: point.handleOut
            ? {
                x: px((point.handleOut.x as number) + offsetX),
                y: px((point.handleOut.y as number) + offsetY),
              }
            : undefined,
        })),
      };
      initializePath(offsetPath);
    }
  }, [isActive, initialPath, offsetX, offsetY, initializePath]);

  // Convert client coordinates to SVG/slide coordinates
  const clientToSlideCoords = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const scaleX = slideWidth / rect.width;
      const scaleY = slideHeight / rect.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledWidth = slideWidth / scale;
      const scaledHeight = slideHeight / scale;
      const offsetXCalc = (rect.width - scaledWidth) / 2;
      const offsetYCalc = (rect.height - scaledHeight) / 2;

      const x = (clientX - rect.left - offsetXCalc) * scale;
      const y = (clientY - rect.top - offsetYCalc) * scale;

      return { x, y };
    },
    [slideWidth, slideHeight]
  );

  // Handle pointer down on the overlay
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) {return;}
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
      if (!isActive) {return;}

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
      if (!isActive) {return;}
      onKeyDown(e);
    },
    [isActive, onKeyDown]
  );

  // Handle commit - remove offset before returning
  const handleCommit = useCallback(
    (editedPath: DrawingPath) => {
      const unoffsetPath: DrawingPath = {
        ...editedPath,
        points: editedPath.points.map((point) => ({
          ...point,
          x: px((point.x as number) - offsetX),
          y: px((point.y as number) - offsetY),
          handleIn: point.handleIn
            ? {
                x: px((point.handleIn.x as number) - offsetX),
                y: px((point.handleIn.y as number) - offsetY),
              }
            : undefined,
          handleOut: point.handleOut
            ? {
                x: px((point.handleOut.x as number) - offsetX),
                y: px((point.handleOut.y as number) - offsetY),
              }
            : undefined,
        })),
      };
      onCommit(unoffsetPath);
    },
    [offsetX, offsetY, onCommit]
  );

  if (!isActive) {
    return null;
  }

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
        cursor: "default",
        pointerEvents: "all",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={onCanvasPointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Path preview */}
      {path.points.length > 1 && (
        <PathPreview path={path} isDashed={false} />
      )}

      {/* Anchor points and handles */}
      {path.points.map((point, index) => (
        <React.Fragment key={index}>
          {/* Handles for this point */}
          <HandlePair
            anchorX={point.x as number}
            anchorY={point.y as number}
            handleIn={point.handleIn ? { x: point.handleIn.x as number, y: point.handleIn.y as number } : undefined}
            handleOut={point.handleOut ? { x: point.handleOut.x as number, y: point.handleOut.y as number } : undefined}
            onHandleInPointerDown={(e) => onHandlePointerDown(index, "in", e)}
            onHandleOutPointerDown={(e) => onHandlePointerDown(index, "out", e)}
          />

          {/* Anchor point */}
          <AnchorPoint
            x={point.x as number}
            y={point.y as number}
            index={index}
            pointType={point.type}
            isSelected={selectedPoints.includes(index)}
            isFirst={index === 0}
            isHovered={hoverPointIndex === index}
            onPointerDown={(e) => onAnchorPointerDown(index, e)}
            onPointerEnter={() => onAnchorHover(index)}
            onPointerLeave={() => onAnchorHover(undefined)}
          />
        </React.Fragment>
      ))}

      {/* Instructions overlay */}
      <text
        x={10}
        y={slideHeight - 10}
        fill="rgba(255,255,255,0.7)"
        fontSize={12}
        style={{ pointerEvents: "none" }}
      >
        Enter: 確定 | Escape: キャンセル | Delete: 選択ポイント削除 | Alt+クリック: スムーズ/コーナー切替
      </text>
    </svg>
  );
}
