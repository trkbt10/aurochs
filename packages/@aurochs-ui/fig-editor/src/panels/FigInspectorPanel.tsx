/**
 * @file Inspector tree panel for fig editor.
 *
 * Renders an InspectorTreePanel using the active page's node tree
 * from FigEditorContext. Designed to be placed in an EditorShell panel slot.
 *
 * This is a "drop-in" panel that works alongside LayerPanel, PropertyPanel,
 * etc. Editor builders can include or exclude it as needed.
 *
 * @example
 * ```tsx
 * // Custom editor composition with inspector panel
 * <FigEditorProvider initialDocument={doc}>
 *   <EditorShell panels={[
 *     { id: "layers", position: "left", content: <LayerPanel /> },
 *     { id: "inspector-tree", position: "right", content: <FigInspectorPanel /> },
 *   ]}>
 *     <CanvasArea><FigEditorCanvas /></CanvasArea>
 *   </EditorShell>
 * </FigEditorProvider>
 * ```
 */

import { useMemo, type CSSProperties } from "react";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { InspectorTreePanel } from "@aurochs-ui/editor-controls/inspector";
import { CategoryLegend } from "@aurochs-ui/editor-controls/inspector";
import { useFigEditor } from "../context/FigEditorContext";
import { FIG_NODE_CATEGORY_REGISTRY, FIG_LEGEND_ORDER } from "../inspector/fig-node-categories";
import { designNodeToInspectorTree } from "../inspector/fig-inspector-adapter";

// =============================================================================
// Props
// =============================================================================

export type FigInspectorPanelProps = {
  /** Whether to show hidden (invisible) nodes. Default: false */
  readonly showHiddenNodes?: boolean;
  /** Currently highlighted node ID (controlled). If omitted, managed internally. */
  readonly highlightedNodeId?: string | null;
  /** Called when a node is highlighted */
  readonly onNodeHighlight?: (nodeId: string | null) => void;
  /** Called when a node is hovered */
  readonly onNodeHover?: (nodeId: string | null) => void;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  gap: spacingTokens.sm,
  overflow: "hidden",
};

const treeWrapperStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
};

const emptyStyle: CSSProperties = {
  padding: spacingTokens.xl,
  textAlign: "center",
  color: colorTokens.text.tertiary,
  fontSize: fontTokens.size.md,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Inspector tree panel for the fig editor.
 *
 * Reads the active page from FigEditorContext and renders an InspectorTreePanel
 * with the Fig node category registry. Optionally synchronizes highlight state
 * with external components (e.g. BoundingBoxOverlay on the canvas).
 */
export function FigInspectorPanel({
  showHiddenNodes = false,
  highlightedNodeId: controlledHighlightedId,
  onNodeHighlight,
  onNodeHover,
}: FigInspectorPanelProps) {
  const { activePage, nodeSelection, dispatch } = useFigEditor();

  // Convert active page children to inspector tree
  const treeRoot = useMemo(() => {
    if (!activePage || activePage.children.length === 0) return null;

    // Wrap page children in a virtual root node
    return {
      id: activePage.id,
      name: activePage.name,
      nodeType: "CANVAS",
      width: 0,
      height: 0,
      opacity: 1,
      visible: true,
      children: activePage.children.map(designNodeToInspectorTree),
    };
  }, [activePage]);

  // Use controlled highlight or fall back to editor selection
  const highlightedNodeId = controlledHighlightedId ?? nodeSelection.primaryId ?? null;

  const handleNodeClick = (nodeId: string) => {
    if (onNodeHighlight) {
      onNodeHighlight(highlightedNodeId === nodeId ? null : nodeId);
    } else {
      // Default: drive editor selection
      dispatch({ type: "SELECT_NODE", nodeId: nodeId as never, addToSelection: false });
    }
  };

  const handleNodeHover = (nodeId: string | null) => {
    onNodeHover?.(nodeId);
  };

  if (!treeRoot) {
    return <div style={emptyStyle}>No page selected</div>;
  }

  return (
    <div style={containerStyle}>
      <CategoryLegend registry={FIG_NODE_CATEGORY_REGISTRY} order={FIG_LEGEND_ORDER} />
      <div style={treeWrapperStyle}>
        <InspectorTreePanel
          rootNode={treeRoot}
          registry={FIG_NODE_CATEGORY_REGISTRY}
          highlightedNodeId={highlightedNodeId}
          hoveredNodeId={null}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          showHiddenNodes={showHiddenNodes}
        />
      </div>
    </div>
  );
}
