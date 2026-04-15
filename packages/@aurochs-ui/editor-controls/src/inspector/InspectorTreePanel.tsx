/**
 * @file Hierarchical tree browser for inspecting node structure.
 *
 * Renders a collapsible tree of InspectorTreeNode items with category-colored
 * type badges, dimensions, and opacity. Supports highlight/hover interaction
 * that syncs with BoundingBoxOverlay.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspectorTreeNode, NodeCategoryRegistry } from "@aurochs-ui/editor-core/inspector-types";
import { resolveNodeColor } from "@aurochs-ui/editor-core/inspector-types";

// =============================================================================
// Props
// =============================================================================

export type InspectorTreePanelProps = {
  /** Root node of the tree */
  readonly rootNode: InspectorTreeNode;
  /** Category registry for color resolution */
  readonly registry: NodeCategoryRegistry;
  /** Currently highlighted (selected) node ID */
  readonly highlightedNodeId: string | null;
  /** Currently hovered node ID */
  readonly hoveredNodeId: string | null;
  /** Called when a node is hovered (null = hover out) */
  readonly onNodeHover: (nodeId: string | null) => void;
  /** Called when a node is clicked */
  readonly onNodeClick: (nodeId: string) => void;
  /** Whether to show hidden (invisible) nodes */
  readonly showHiddenNodes: boolean;
};

// =============================================================================
// Styles
// =============================================================================

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

// =============================================================================
// Tree node helpers
// =============================================================================

/**
 * Collect node IDs at depth 0 and 1 for initial expansion.
 */
function collectInitialExpanded(node: InspectorTreeNode): Set<string> {
  const ids = new Set<string>();
  ids.add(node.id);
  for (const child of node.children) {
    ids.add(child.id);
  }
  return ids;
}

/**
 * Find ancestor node IDs from root to the target node (excluding target itself).
 * Returns empty array if target is not found.
 */
function findAncestorIds(root: InspectorTreeNode, targetId: string): string[] {
  const path: string[] = [];

  function dfs(node: InspectorTreeNode): boolean {
    if (node.id === targetId) return true;
    for (const child of node.children) {
      if (dfs(child)) {
        path.push(node.id);
        return true;
      }
    }
    return false;
  }

  dfs(root);
  return path;
}

// =============================================================================
// Recursive TreeNode component
// =============================================================================

type TreeNodeInternalProps = {
  readonly node: InspectorTreeNode;
  readonly depth: number;
  readonly expandedNodes: Set<string>;
  readonly onToggle: (nodeId: string) => void;
  readonly registry: NodeCategoryRegistry;
  readonly highlightedNodeId: string | null;
  readonly hoveredNodeId: string | null;
  readonly onNodeHover: (nodeId: string | null) => void;
  readonly onNodeClick: (nodeId: string) => void;
  readonly showHiddenNodes: boolean;
};

function TreeNodeRow({
  node,
  depth,
  expandedNodes,
  onToggle,
  registry,
  highlightedNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeClick,
  showHiddenNodes,
}: TreeNodeInternalProps) {
  const color = resolveNodeColor(registry, node.nodeType);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isHighlighted = node.id === highlightedNodeId;
  const isHovered = node.id === hoveredNodeId;
  const isHidden = !node.visible;

  const visibleChildren = useMemo(() => {
    if (showHiddenNodes) return node.children;
    return node.children.filter((c) => c.visible);
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
        data-node-id={node.id}
        style={rowStyle}
        onMouseEnter={() => onNodeHover(node.id)}
        onMouseLeave={() => onNodeHover(null)}
        onClick={() => onNodeClick(node.id)}
      >
        {/* Expand/collapse toggle */}
        <span
          style={treeStyles.toggle}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? (isExpanded ? "\u25BE" : "\u25B8") : ""}
        </span>

        {/* Type badge */}
        <span style={{ ...treeStyles.badge, background: color }}>{node.nodeType}</span>

        {/* Node name */}
        <span
          style={{
            ...treeStyles.name,
            color: isHidden ? "#555" : "#e2e8f0",
            fontStyle: isHidden ? "italic" : "normal",
          }}
        >
          {node.name}
        </span>

        {/* Size */}
        {(node.width > 0 || node.height > 0) && (
          <span style={treeStyles.dim}>
            {Math.round(node.width)}x{Math.round(node.height)}
          </span>
        )}

        {/* Opacity */}
        {node.opacity < 1 && (
          <span style={treeStyles.dim}>{Math.round(node.opacity * 100)}%</span>
        )}
      </div>

      {/* Children */}
      {isExpanded &&
        visibleChildren.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedNodes={expandedNodes}
            onToggle={onToggle}
            registry={registry}
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

// =============================================================================
// Main component
// =============================================================================

/**
 * Hierarchical tree panel for inspecting node structure.
 *
 * Features:
 * - Collapsible tree with category-colored type badges
 * - Dimensions and opacity display
 * - Auto-expand and auto-scroll to highlighted node
 * - Hidden node filtering
 * - Synchronized highlight/hover with BoundingBoxOverlay
 */
export function InspectorTreePanel({
  rootNode,
  registry,
  highlightedNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeClick,
  showHiddenNodes,
}: InspectorTreePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() =>
    collectInitialExpanded(rootNode),
  );

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

  // Expand ancestors of highlighted node so it's visible in the tree
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
      <TreeNodeRow
        node={rootNode}
        depth={0}
        expandedNodes={expandedNodes}
        onToggle={handleToggle}
        registry={registry}
        highlightedNodeId={highlightedNodeId}
        hoveredNodeId={hoveredNodeId}
        onNodeHover={onNodeHover}
        onNodeClick={onNodeClick}
        showHiddenNodes={showHiddenNodes}
      />
    </div>
  );
}
