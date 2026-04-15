/**
 * @file Inspector view container.
 *
 * Integrates BoundingBoxOverlay, InspectorTreePanel, CategoryLegend, and NodeTooltip
 * into a complete inspector experience with pan/zoom viewport.
 *
 * This is a convenience component for the common case. Each sub-component
 * can also be used independently for custom layouts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspectorBoxInfo, InspectorTreeNode, NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";
import { BoundingBoxOverlay } from "./BoundingBoxOverlay";
import { InspectorTreePanel } from "./InspectorTreePanel";
import { CategoryLegend } from "./CategoryLegend";
import { NodeTooltip } from "./NodeTooltip";

// =============================================================================
// Props
// =============================================================================

export type InspectorViewProps = {
  /** Category registry for color resolution (DI) */
  readonly registry: NodeCategoryRegistry;
  /** Bounding boxes to display in the overlay */
  readonly boxes: readonly InspectorBoxInfo[];
  /** Root node for the tree panel */
  readonly treeRoot: InspectorTreeNode;
  /** Content width in logical units */
  readonly contentWidth: number;
  /** Content height in logical units */
  readonly contentHeight: number;
  /** Whether to show hidden nodes */
  readonly showHiddenNodes: boolean;
  /**
   * Content to render in the viewport (e.g. SVG preview).
   * Rendered underneath the bounding box overlay.
   */
  readonly children: React.ReactNode;
  /** Whether the content is currently rendering (shows loading state) */
  readonly isRendering?: boolean;
  /**
   * Category IDs to display in the legend, in order.
   * If omitted, all categories from the registry are displayed.
   */
  readonly legendOrder?: readonly string[];
  /** Width of the tree panel in CSS pixels. Default: 380 */
  readonly treePanelWidth?: number;
};

// =============================================================================
// Constants
// =============================================================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;
const ZOOM_SENSITIVITY = 0.001;
const TOOLTIP_OFFSET = 12;

// =============================================================================
// Styles
// =============================================================================

const viewStyles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    gap: "12px",
    minHeight: 0,
  },
  content: {
    display: "flex",
    flex: 1,
    gap: "16px",
    minHeight: 0,
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
    position: "relative" as const,
    background: "#fff",
    borderRadius: "12px",
    minHeight: 0,
  },
  transformLayer: {
    transformOrigin: "0 0",
    position: "relative" as const,
  },
  emptyState: {
    padding: "40px",
    textAlign: "center" as const,
    color: "#64748b",
  },
  treePanel: {
    flexShrink: 0,
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    minHeight: 0,
  },
  zoomIndicator: {
    position: "absolute" as const,
    bottom: "8px",
    right: "8px",
    padding: "4px 10px",
    background: "rgba(0, 0, 0, 0.6)",
    color: "#94a3b8",
    borderRadius: "4px",
    fontSize: "11px",
    cursor: "pointer",
    userSelect: "none" as const,
    zIndex: 10,
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Complete inspector view with viewport, overlay, tree panel, legend, and tooltip.
 *
 * Features:
 * - Wheel zoom (cursor-centric)
 * - Space+drag or middle-click pan
 * - Double-click to reset zoom/pan
 * - Synchronized highlight/hover between overlay and tree
 * - Tooltip on hover
 * - Zoom indicator (click to reset)
 */
export function InspectorView({
  registry,
  boxes,
  treeRoot,
  contentWidth,
  contentHeight,
  showHiddenNodes,
  children,
  isRendering = false,
  legendOrder,
  treePanelWidth = 380,
}: InspectorViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Interaction state
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan/zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);

  // Tooltip position
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Hovered box for tooltip
  const hoveredBox: InspectorBoxInfo | null = useMemo(
    () => (hoveredNodeId ? (boxes.find((b) => b.nodeId === hoveredNodeId) ?? null) : null),
    [boxes, hoveredNodeId],
  );

  // Reset state when content changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHighlightedNodeId(null);
  }, [treeRoot]);

  // Track Space key for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Wheel zoom (passive: false to allow preventDefault)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * factor));

        // Adjust pan so cursor stays over the same content point
        setPan((prevPan) => {
          const contentX = (cursorX - prevPan.x) / prevZoom;
          const contentY = (cursorY - prevPan.y) / prevZoom;
          return {
            x: cursorX - contentX * newZoom,
            y: cursorY - contentY * newZoom,
          };
        });

        return newZoom;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Pan drag (mouse move/up on window)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Start pan drag
  const handleViewportMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const isMiddle = e.button === 1;
      const isSpaceDrag = e.button === 0 && spaceHeldRef.current;

      if (isMiddle || isSpaceDrag) {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        panStartRef.current = { x: pan.x, y: pan.y };
        e.preventDefault();
      }
    },
    [pan],
  );

  // Double-click to reset
  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Tooltip tracking
  const handleViewportMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + TOOLTIP_OFFSET,
      y: e.clientY - rect.top + TOOLTIP_OFFSET,
    });
  }, []);

  // Node interaction
  const handleNodeClick = useCallback((nodeId: string) => {
    setHighlightedNodeId((prev) => (prev === nodeId || nodeId === "" ? null : nodeId));
  }, []);

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  // Zoom indicator reset
  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const transformStyle: React.CSSProperties = {
    ...viewStyles.transformLayer,
    transform: `scale(${zoom})`,
    marginLeft: pan.x,
    marginTop: pan.y,
    width: contentWidth,
    height: contentHeight,
  };

  return (
    <div style={viewStyles.container}>
      {/* Legend */}
      <CategoryLegend registry={registry} order={legendOrder} />

      {/* Content */}
      <div style={viewStyles.content}>
        {/* Viewport */}
        <div
          ref={viewportRef}
          style={{
            ...viewStyles.viewport,
            cursor: spaceHeldRef.current || isDraggingRef.current ? "grabbing" : "default",
          }}
          onMouseDown={handleViewportMouseDown}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleViewportMouseMove}
        >
          {/* Transform layer */}
          <div style={transformStyle}>
            {/* User-provided content (e.g. SVG preview) */}
            {isRendering ? (
              <div style={viewStyles.emptyState}>Rendering...</div>
            ) : (
              children
            )}

            {/* Inspector overlay (stacked on top) */}
            <BoundingBoxOverlay
              boxes={boxes}
              registry={registry}
              viewportWidth={contentWidth}
              viewportHeight={contentHeight}
              highlightedNodeId={highlightedNodeId}
              hoveredNodeId={hoveredNodeId}
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Tooltip (fixed to viewport, outside transform) */}
          {hoveredBox && tooltipPos && !isDraggingRef.current && (
            <NodeTooltip
              box={hoveredBox}
              registry={registry}
              x={tooltipPos.x}
              y={tooltipPos.y}
            />
          )}

          {/* Zoom indicator */}
          <div style={viewStyles.zoomIndicator} onClick={handleZoomReset} title="Click to reset zoom">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Tree panel */}
        <div style={{ ...viewStyles.treePanel, width: treePanelWidth }}>
          <InspectorTreePanel
            rootNode={treeRoot}
            registry={registry}
            highlightedNodeId={highlightedNodeId}
            hoveredNodeId={hoveredNodeId}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            showHiddenNodes={showHiddenNodes}
          />
        </div>
      </div>
    </div>
  );
}
