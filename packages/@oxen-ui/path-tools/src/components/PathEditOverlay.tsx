/**
 * @file Path edit overlay component
 *
 * Overlay component for editing existing paths.
 */

import React, { useCallback, useEffect } from "react";
import type { DrawingPath, Point, ModifierKeys } from "../types";
import { getModifierKeys } from "../types";
import { AnchorPoint } from "./internal/AnchorPoint";
import { HandlePair } from "./internal/ControlHandle";
import { PathPreview } from "./internal/PathPreview";
import { usePathEdit } from "../hooks/usePathEdit";

type PathPoint = DrawingPath["points"][number];
type PathHandle = NonNullable<PathPoint["handleIn"]>;

function shiftHandle(args: { readonly handle: PathHandle; readonly dx: number; readonly dy: number }): PathHandle {
  const { handle, dx, dy } = args;
  return {
    x: handle.x + dx,
    y: handle.y + dy,
  };
}

function shiftOptionalHandle(args: { readonly handle: PathHandle | undefined; readonly dx: number; readonly dy: number }): PathHandle | undefined {
  const { handle, dx, dy } = args;
  if (!handle) {
    return undefined;
  }
  return shiftHandle({ handle, dx, dy });
}

function shiftPathPoint(args: { readonly point: PathPoint; readonly dx: number; readonly dy: number }): PathPoint {
  const { point, dx, dy } = args;
  return {
    ...point,
    x: point.x + dx,
    y: point.y + dy,
    handleIn: shiftOptionalHandle({ handle: point.handleIn, dx, dy }),
    handleOut: shiftOptionalHandle({ handle: point.handleOut, dx, dy }),
  };
}

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
  const handleCommit = useCallback(
    (editedPath: DrawingPath) => {
      const unoffsetPath: DrawingPath = {
        ...editedPath,
        points: editedPath.points.map((point) => shiftPathPoint({ point, dx: -offsetX, dy: -offsetY })),
      };
      onCommit(unoffsetPath);
    },
    [offsetX, offsetY, onCommit],
  );

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
    onCommit: handleCommit,
    onCancel,
  });

  const { path, selectedPoints, hoverPointIndex } = state;

  // Initialize path when component mounts or initialPath changes
  useEffect(() => {
    if (isActive) {
      // Offset the path points by the shape position
      const offsetPath: DrawingPath = {
        ...initialPath,
        points: initialPath.points.map((point) => shiftPathPoint({ point, dx: offsetX, dy: offsetY })),
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
            anchorX={point.x}
            anchorY={point.y}
            handleIn={point.handleIn ? { x: point.handleIn.x, y: point.handleIn.y } : undefined}
            handleOut={point.handleOut ? { x: point.handleOut.x, y: point.handleOut.y } : undefined}
            onHandleInPointerDown={(e) => onHandlePointerDown(index, "in", e)}
            onHandleOutPointerDown={(e) => onHandlePointerDown(index, "out", e)}
          />

          {/* Anchor point */}
          <AnchorPoint
            x={point.x}
            y={point.y}
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
        Enter: Commit | Escape: Cancel | Delete: Remove selected | Alt+Click: Toggle smooth/corner
      </text>
    </svg>
  );
}

/**
 * Controlled path edit overlay for use in reducer-based state management
 *
 * This version takes state and callbacks as props instead of using the hook internally.
 */
export function PathEditOverlayControlled({
  path,
  selectedPoints,
  hoverPointIndex,
  slideWidth,
  slideHeight,
  isActive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onAnchorPointerDown,
  onHandlePointerDown,
  onAnchorHover,
}: {
  readonly path: DrawingPath;
  readonly selectedPoints: readonly number[];
  readonly hoverPointIndex: number | undefined;
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly isActive: boolean;
  readonly onPointerDown: (x: number, y: number, modifiers: ModifierKeys) => void;
  readonly onPointerMove: (x: number, y: number, modifiers: ModifierKeys) => void;
  readonly onPointerUp: () => void;
  readonly onAnchorPointerDown: (index: number, e: React.PointerEvent) => void;
  readonly onHandlePointerDown: (index: number, side: "in" | "out", e: React.PointerEvent) => void;
  readonly onAnchorHover: (index: number | undefined) => void;
}): React.ReactElement | null {
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
      onPointerUp={onPointerUp}
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
            anchorX={point.x}
            anchorY={point.y}
            handleIn={point.handleIn ? { x: point.handleIn.x, y: point.handleIn.y } : undefined}
            handleOut={point.handleOut ? { x: point.handleOut.x, y: point.handleOut.y } : undefined}
            onHandleInPointerDown={(e) => onHandlePointerDown(index, "in", e)}
            onHandleOutPointerDown={(e) => onHandlePointerDown(index, "out", e)}
          />

          {/* Anchor point */}
          <AnchorPoint
            x={point.x}
            y={point.y}
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
    </svg>
  );
}
