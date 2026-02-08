/**
 * @file Inspector mode container - renders SVG preview with bounding box overlay,
 * CSS-based pan/zoom, tooltip, zoom indicator, and tree panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FigNode } from "@aurochs/fig/types";
import { CATEGORY_COLORS, CATEGORY_LABELS, type NodeCategory } from "./inspector-constants";
import { getCategoryColor } from "./inspector-constants";
import { InspectorOverlay, collectBoxes, getRootNormalizationTransform, type BoxInfo } from "./InspectorOverlay";
import { InspectorTreeView } from "./InspectorTreeView";

type Props = {
  readonly frameNode: FigNode;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly showHiddenNodes: boolean;
  readonly svgHtml: string;
  readonly isRendering: boolean;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;
const ZOOM_SENSITIVITY = 0.001;

const LEGEND_CATEGORIES: NodeCategory[] = ["container", "instance", "shape", "text", "structural", "special"];

const viewStyles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    gap: "12px",
    minHeight: 0,
  },
  legend: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap" as const,
    padding: "8px 12px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#94a3b8",
  },
  legendSwatch: {
    width: "12px",
    height: "12px",
    borderRadius: "3px",
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
  svgContainer: {
    display: "block",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center" as const,
    color: "#64748b",
  },
  treePanel: {
    width: "380px",
    flexShrink: 0,
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    minHeight: 0,
  },
  tooltip: {
    position: "absolute" as const,
    pointerEvents: "none" as const,
    background: "rgba(0, 0, 0, 0.85)",
    color: "#e2e8f0",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    whiteSpace: "nowrap" as const,
    zIndex: 10,
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  tooltipType: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: "3px",
    color: "#fff",
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

export function InspectorView({ frameNode, frameWidth, frameHeight, showHiddenNodes, svgHtml, isRendering }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Inspector interaction state
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan/zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);

  // Tooltip
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Boxes for tooltip lookup (normalized to match SVG rendering)
  const initialTransform = useMemo(() => getRootNormalizationTransform(frameNode), [frameNode]);
  const boxes = useMemo(
    () => collectBoxes(frameNode, initialTransform, showHiddenNodes),
    [frameNode, initialTransform, showHiddenNodes],
  );

  const hoveredBox: BoxInfo | null = useMemo(
    () => (hoveredNodeId ? (boxes.find((b) => b.nodeId === hoveredNodeId) ?? null) : null),
    [boxes, hoveredNodeId],
  );

  // Reset zoom/pan when frame changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHighlightedNodeId(null);
  }, [frameNode]);

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

      // Cursor position relative to viewport (CSS pixels)
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * factor));

        // Adjust pan so cursor stays over the same content point
        // Content point under cursor: (cursorX - pan.x) / prevZoom
        // After zoom, to keep same point: newPan.x = cursorX - contentX * newZoom
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
    setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 });
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
    width: frameWidth,
    height: frameHeight,
  };

  return (
    <div style={viewStyles.container}>
      {/* Legend */}
      <div style={viewStyles.legend}>
        {LEGEND_CATEGORIES.map((cat) => (
          <div key={cat} style={viewStyles.legendItem}>
            <div style={{ ...viewStyles.legendSwatch, background: CATEGORY_COLORS[cat] }} />
            <span>{CATEGORY_LABELS[cat]}</span>
          </div>
        ))}
      </div>

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
            {/* Rendered SVG preview */}
            {isRendering ? (
              <div style={viewStyles.emptyState}>Rendering...</div>
            ) : (
              <div style={viewStyles.svgContainer} dangerouslySetInnerHTML={{ __html: svgHtml }} />
            )}

            {/* Inspector overlay (stacked on top) */}
            <InspectorOverlay
              frameNode={frameNode}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              highlightedNodeId={highlightedNodeId}
              hoveredNodeId={hoveredNodeId}
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}
              showHiddenNodes={showHiddenNodes}
            />
          </div>

          {/* Tooltip (fixed to viewport, outside transform) */}
          {hoveredBox && tooltipPos && !isDraggingRef.current && (
            <div style={{ ...viewStyles.tooltip, left: tooltipPos.x, top: tooltipPos.y }}>
              <span
                style={{
                  ...viewStyles.tooltipType,
                  background: getCategoryColor(hoveredBox.nodeType),
                }}
              >
                {hoveredBox.nodeType}
              </span>
              <span>{hoveredBox.nodeName}</span>
              <span style={{ color: "#64748b" }}>
                {Math.round(hoveredBox.width)}x{Math.round(hoveredBox.height)}
              </span>
            </div>
          )}

          {/* Zoom indicator */}
          <div style={viewStyles.zoomIndicator} onClick={handleZoomReset} title="Click to reset zoom">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Tree panel */}
        <div style={viewStyles.treePanel}>
          <InspectorTreeView
            rootNode={frameNode}
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
