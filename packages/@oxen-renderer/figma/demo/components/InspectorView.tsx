/**
 * @file Inspector mode container - orchestrates overlay and tree view
 */

import { useCallback, useState } from "react";
import type { FigNode } from "@oxen/fig/types";
import { CATEGORY_COLORS, CATEGORY_LABELS, type NodeCategory } from "./inspector-constants";
import { InspectorOverlay } from "./InspectorOverlay";
import { InspectorTreeView } from "./InspectorTreeView";

type Props = {
  readonly frameNode: FigNode;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly showHiddenNodes: boolean;
};

const LEGEND_CATEGORIES: NodeCategory[] = [
  "container",
  "instance",
  "shape",
  "text",
  "structural",
  "special",
];

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
  overlayPanel: {
    flex: 1,
    overflow: "auto",
    background: "#1a1a2e",
    borderRadius: "12px",
    padding: "16px",
    minHeight: 0,
  },
  treePanel: {
    width: "380px",
    flexShrink: 0,
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    minHeight: 0,
  },
};

export function InspectorView({
  frameNode,
  frameWidth,
  frameHeight,
  showHiddenNodes,
}: Props) {
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const handleNodeClick = useCallback((nodeId: string) => {
    setHighlightedNodeId((prev) => (prev === nodeId || nodeId === "" ? null : nodeId));
  }, []);

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

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
        {/* Overlay panel */}
        <div style={viewStyles.overlayPanel}>
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
