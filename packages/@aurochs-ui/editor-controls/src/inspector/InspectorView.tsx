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
import { colorTokens, spacingTokens, fontTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";
import { BoundingBoxOverlay } from "./BoundingBoxOverlay";
import { InspectorTreePanel } from "./InspectorTreePanel";
import { CategoryLegend } from "./CategoryLegend";
import { NodeTooltip } from "./NodeTooltip";

// =============================================================================
// Props
// =============================================================================

export type InspectorViewProps = {
  readonly registry: NodeCategoryRegistry;
  readonly boxes: readonly InspectorBoxInfo[];
  readonly treeRoot: InspectorTreeNode;
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly showHiddenNodes: boolean;
  readonly children: React.ReactNode;
  readonly isRendering?: boolean;
  readonly legendOrder?: readonly string[];
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
    gap: spacingTokens.md,
    minHeight: 0,
  },
  content: {
    display: "flex",
    flex: 1,
    gap: spacingTokens.md,
    minHeight: 0,
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
    position: "relative" as const,
    backgroundColor: colorTokens.background.primary,
    borderRadius: radiusTokens.lg,
    border: `1px solid ${colorTokens.border.subtle}`,
    minHeight: 0,
  },
  transformLayer: {
    transformOrigin: "0 0",
    position: "relative" as const,
  },
  emptyState: {
    padding: spacingTokens.xl,
    textAlign: "center" as const,
    color: colorTokens.text.tertiary,
  },
  treePanel: {
    flexShrink: 0,
    overflow: "hidden",
    backgroundColor: colorTokens.background.secondary,
    borderRadius: radiusTokens.lg,
    border: `1px solid ${colorTokens.border.subtle}`,
    minHeight: 0,
  },
  zoomIndicator: {
    position: "absolute" as const,
    bottom: spacingTokens.sm,
    right: spacingTokens.sm,
    padding: `${spacingTokens.xs} ${spacingTokens.sm}`,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: colorTokens.text.inverse,
    borderRadius: radiusTokens.sm,
    fontSize: fontTokens.size.sm,
    cursor: "pointer",
    userSelect: "none" as const,
    zIndex: 10,
  },
};

// =============================================================================
// Component
// =============================================================================

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

  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);

  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const hoveredBox: InspectorBoxInfo | null = useMemo(
    () => (hoveredNodeId ? (boxes.find((b) => b.nodeId === hoveredNodeId) ?? null) : null),
    [boxes, hoveredNodeId],
  );

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHighlightedNodeId(null);
  }, [treeRoot]);

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
        setPan((prevPan) => {
          const contentX = (cursorX - prevPan.x) / prevZoom;
          const contentY = (cursorY - prevPan.y) / prevZoom;
          return { x: cursorX - contentX * newZoom, y: cursorY - contentY * newZoom };
        });
        return newZoom;
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y + dy });
    };
    const handleMouseUp = () => { isDraggingRef.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleViewportMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left + TOOLTIP_OFFSET, y: e.clientY - rect.top + TOOLTIP_OFFSET });
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setHighlightedNodeId((prev) => (prev === nodeId || nodeId === "" ? null : nodeId));
  }, []);

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

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
      <CategoryLegend registry={registry} order={legendOrder} />

      <div style={viewStyles.content}>
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
          <div style={transformStyle}>
            {isRendering ? (
              <div style={viewStyles.emptyState}>Rendering...</div>
            ) : (
              children
            )}
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

          {hoveredBox && tooltipPos && !isDraggingRef.current && (
            <NodeTooltip box={hoveredBox} registry={registry} x={tooltipPos.x} y={tooltipPos.y} />
          )}

          <div style={viewStyles.zoomIndicator} onClick={handleZoomReset} title="Click to reset zoom">
            {Math.round(zoom * 100)}%
          </div>
        </div>

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
