/**
 * @file Hierarchical tree browser for inspecting Figma node structure
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FigNode } from "@aurochs/fig/types";
import { guidToString, getNodeType } from "@aurochs/fig/parser";
import { getCategoryColor, getNodeCategory, CATEGORY_COLORS } from "./inspector-constants";

type Props = {
  readonly rootNode: FigNode;
  readonly highlightedNodeId: string | null;
  readonly hoveredNodeId: string | null;
  readonly onNodeHover: (nodeId: string | null) => void;
  readonly onNodeClick: (nodeId: string) => void;
  readonly showHiddenNodes: boolean;
};

/**
 * Collect node IDs at depth 0 and 1 for initial expansion
 */
function collectInitialExpanded(node: FigNode): Set<string> {
  const ids = new Set<string>();
  ids.add(guidToString(node.guid));
  for (const child of node.children ?? []) {
    ids.add(guidToString(child.guid));
  }
  return ids;
}

const treeStyles = {
  container: {
    padding: "8px 0",
    fontSize: "13px",
    overflowY: "auto" as const,
    height: "100%",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    paddingTop: "3px",
    paddingBottom: "3px",
    paddingRight: "8px",
    cursor: "pointer",
    borderLeftWidth: "2px",
    borderLeftStyle: "solid" as const,
    borderLeftColor: "transparent",
    transition: "background 0.1s ease",
  },
  toggle: {
    width: "16px",
    textAlign: "center" as const,
    fontSize: "10px",
    color: "#666",
    userSelect: "none" as const,
    cursor: "pointer",
    flexShrink: 0,
  },
  badge: {
    fontSize: "10px",
    padding: "1px 5px",
    borderRadius: "3px",
    fontWeight: 600,
    color: "#fff",
    flexShrink: 0,
  },
  name: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    fontSize: "13px",
  },
  dim: {
    color: "#64748b",
    fontSize: "11px",
    flexShrink: 0,
  },
};

type TreeNodeProps = {
  readonly node: FigNode;
  readonly depth: number;
  readonly expandedNodes: Set<string>;
  readonly onToggle: (nodeId: string) => void;
  readonly highlightedNodeId: string | null;
  readonly hoveredNodeId: string | null;
  readonly onNodeHover: (nodeId: string | null) => void;
  readonly onNodeClick: (nodeId: string) => void;
  readonly showHiddenNodes: boolean;
};

function TreeNode({
  node,
  depth,
  expandedNodes,
  onToggle,
  highlightedNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeClick,
  showHiddenNodes,
}: TreeNodeProps) {
  const nodeId = guidToString(node.guid);
  const nodeType = getNodeType(node);
  const color = getCategoryColor(nodeType);
  const nodeData = node as Record<string, unknown>;
  const size = nodeData.size as { x?: number; y?: number } | undefined;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandedNodes.has(nodeId);
  const isHighlighted = nodeId === highlightedNodeId;
  const isHovered = nodeId === hoveredNodeId;
  const isHidden = node.visible === false;

  const visibleChildren = useMemo(() => {
    if (!node.children) return [];
    if (showHiddenNodes) return node.children;
    return node.children.filter((c) => c.visible !== false);
  }, [node.children, showHiddenNodes]);

  const rowStyle: React.CSSProperties = {
    ...treeStyles.row,
    paddingLeft: depth * 16 + 8,
    background: isHighlighted ? `${color}22` : isHovered ? `${color}11` : "transparent",
    borderLeftColor: isHighlighted ? color : "transparent",
  };

  return (
    <>
      <div
        data-node-id={nodeId}
        style={rowStyle}
        onMouseEnter={() => onNodeHover(nodeId)}
        onMouseLeave={() => onNodeHover(null)}
        onClick={() => onNodeClick(nodeId)}
      >
        {/* Expand/collapse toggle */}
        <span
          style={treeStyles.toggle}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(nodeId);
          }}
        >
          {hasChildren ? (isExpanded ? "\u25BE" : "\u25B8") : ""}
        </span>

        {/* Type badge */}
        <span style={{ ...treeStyles.badge, background: color }}>{nodeType}</span>

        {/* Node name */}
        <span
          style={{
            ...treeStyles.name,
            color: isHidden ? "#555" : "#e2e8f0",
            fontStyle: isHidden ? "italic" : "normal",
          }}
        >
          {node.name ?? "(unnamed)"}
        </span>

        {/* Size */}
        {size && (
          <span style={treeStyles.dim}>
            {Math.round(size.x ?? 0)}x{Math.round(size.y ?? 0)}
          </span>
        )}

        {/* Opacity */}
        {node.opacity !== undefined && node.opacity < 1 && (
          <span style={treeStyles.dim}>{Math.round(node.opacity * 100)}%</span>
        )}
      </div>

      {/* Children */}
      {isExpanded &&
        visibleChildren.map((child) => (
          <TreeNode
            key={guidToString(child.guid)}
            node={child}
            depth={depth + 1}
            expandedNodes={expandedNodes}
            onToggle={onToggle}
            highlightedNodeId={highlightedNodeId}
            hoveredNodeId={hoveredNodeId}
            onNodeHover={onNodeHover}
            onNodeClick={onNodeClick}
            showHiddenNodes={showHiddenNodes}
          />
        ))}
    </>
  );
}

export function InspectorTreeView({
  rootNode,
  highlightedNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeClick,
  showHiddenNodes,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => collectInitialExpanded(rootNode));

  // Reset expanded nodes when root changes
  useEffect(() => {
    setExpandedNodes(collectInitialExpanded(rootNode));
  }, [rootNode]);

  // Auto-scroll highlighted node into view
  useEffect(() => {
    if (!highlightedNodeId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-node-id="${highlightedNodeId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedNodeId]);

  // Expand ancestors of highlighted node so it's visible
  useEffect(() => {
    if (!highlightedNodeId) return;

    const ancestorIds = findAncestorIds(rootNode, highlightedNodeId);
    if (ancestorIds.length === 0) return;

    setExpandedNodes((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ancestorIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [highlightedNodeId, rootNode]);

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  return (
    <div ref={containerRef} style={treeStyles.container}>
      <TreeNode
        node={rootNode}
        depth={0}
        expandedNodes={expandedNodes}
        onToggle={handleToggle}
        highlightedNodeId={highlightedNodeId}
        hoveredNodeId={hoveredNodeId}
        onNodeHover={onNodeHover}
        onNodeClick={onNodeClick}
        showHiddenNodes={showHiddenNodes}
      />
    </div>
  );
}

/**
 * Find ancestor node IDs from root to the target node (excluding target itself)
 */
function findAncestorIds(root: FigNode, targetId: string): string[] {
  const path: string[] = [];

  function dfs(node: FigNode): boolean {
    const nodeId = guidToString(node.guid);
    if (nodeId === targetId) return true;

    for (const child of node.children ?? []) {
      if (dfs(child)) {
        path.push(nodeId);
        return true;
      }
    }
    return false;
  }

  dfs(root);
  return path;
}
