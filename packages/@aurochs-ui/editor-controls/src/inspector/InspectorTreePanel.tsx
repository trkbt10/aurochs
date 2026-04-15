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
import { colorTokens, fontTokens, spacingTokens, radiusTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Props
// =============================================================================

export type InspectorTreePanelProps = {
  readonly rootNode: InspectorTreeNode;
  readonly registry: NodeCategoryRegistry;
  readonly highlightedNodeId: string | null;
  readonly hoveredNodeId: string | null;
  readonly onNodeHover: (nodeId: string | null) => void;
  readonly onNodeClick: (nodeId: string) => void;
  readonly showHiddenNodes: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const treeStyles = {
  container: {
    padding: `${spacingTokens.sm} 0`,
    fontSize: fontTokens.size.lg,
    overflowY: "auto" as const,
    height: "100%",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: spacingTokens["xs-plus"],
    paddingTop: "3px",
    paddingBottom: "3px",
    paddingRight: spacingTokens.sm,
    cursor: "pointer",
    borderLeftWidth: "2px",
    borderLeftStyle: "solid" as const,
    borderLeftColor: "transparent",
    transition: "background 0.1s ease",
  },
  toggle: {
    width: "16px",
    textAlign: "center" as const,
    fontSize: fontTokens.size.xs,
    color: colorTokens.text.tertiary,
    userSelect: "none" as const,
    cursor: "pointer",
    flexShrink: 0,
  },
  badge: {
    fontSize: fontTokens.size.xs,
    padding: `1px ${spacingTokens.xs}`,
    borderRadius: radiusTokens.xs,
    fontWeight: fontTokens.weight.semibold,
    color: colorTokens.text.inverse,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    fontSize: fontTokens.size.lg,
  },
  dim: {
    color: colorTokens.text.tertiary,
    fontSize: fontTokens.size.sm,
    flexShrink: 0,
  },
};

// =============================================================================
// Tree node helpers
// =============================================================================

function collectInitialExpanded(node: InspectorTreeNode): Set<string> {
  const ids = new Set<string>();
  ids.add(node.id);
  for (const child of node.children) {
    ids.add(child.id);
  }
  return ids;
}

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
    background: isHighlighted
      ? `color-mix(in srgb, ${color} 15%, transparent)`
      : isHovered
        ? `color-mix(in srgb, ${color} 8%, transparent)`
        : "transparent",
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
        <span
          style={treeStyles.toggle}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? (isExpanded ? "\u25BE" : "\u25B8") : ""}
        </span>

        <span style={{ ...treeStyles.badge, background: color }}>{node.nodeType}</span>

        <span
          style={{
            ...treeStyles.name,
            color: isHidden ? colorTokens.text.tertiary : colorTokens.text.primary,
            fontStyle: isHidden ? "italic" : "normal",
          }}
        >
          {node.name}
        </span>

        {(node.width > 0 || node.height > 0) && (
          <span style={treeStyles.dim}>
            {Math.round(node.width)}x{Math.round(node.height)}
          </span>
        )}

        {node.opacity < 1 && (
          <span style={treeStyles.dim}>{Math.round(node.opacity * 100)}%</span>
        )}
      </div>

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

  useEffect(() => {
    setExpandedNodes(collectInitialExpanded(rootNode));
  }, [rootNode]);

  useEffect(() => {
    if (!highlightedNodeId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-node-id="${highlightedNodeId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedNodeId]);

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
