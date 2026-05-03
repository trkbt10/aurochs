/**
 * @file Layer panel
 *
 * Shows the layer tree for the active page.
 * Uses react-editor-ui's LayerItem component (SoT for layer item rendering).
 *
 * INSTANCE nodes and their children (inherited from SYMBOL) are highlighted
 * with Figma's purple accent color to visually distinguish inherited elements.
 */

import { createContext, useCallback, useContext, useState, type ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";
import { useFigEditor } from "../context/FigEditorContext";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { isSelected } from "@aurochs-ui/editor-core/selection";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { LayerItem } from "react-editor-ui/LayerItem";
import {
  FrameIcon,
  RectIcon,
  EllipseIcon,
  TextBoxIcon,
  LineIcon,
  StarIcon,
  FolderIcon,
  DiamondIcon,
  UnknownShapeIcon,
} from "@aurochs-ui/ui-components/icons";
import { iconTokens, colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { resolveLayerNodePresentation, type LayerNodeBadge } from "./layer-node-presentation";
import { allowsFigUserOperation, type FigUserOperationDomain } from "../context/fig-editor/user-operation";
import { useFigOperationDomain } from "../context/use-fig-operation-domain";

// =============================================================================
// Icon helpers
// =============================================================================

const ICON_PROPS = { size: iconTokens.size.sm, strokeWidth: iconTokens.strokeWidth };

function getNodeIcon(type: FigDesignNode["type"], color: string | undefined): ReactNode {
  const props = color ? { ...ICON_PROPS, color } : ICON_PROPS;

  switch (type) {
    case "FRAME":
      return <FrameIcon {...props} />;
    case "COMPONENT":
    case "COMPONENT_SET":
      return <RectIcon {...props} />;
    case "GROUP":
      return <FolderIcon {...props} />;
    case "TEXT":
      return <TextBoxIcon {...props} />;
    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return <RectIcon {...props} />;
    case "ELLIPSE":
      return <EllipseIcon {...props} />;
    case "VECTOR":
    case "LINE":
      return <LineIcon {...props} />;
    case "STAR":
      return <StarIcon {...props} />;
    case "INSTANCE":
      return <DiamondIcon {...props} />;
    default:
      return <UnknownShapeIcon {...props} />;
  }
}

// =============================================================================
// Layer badges / row styling
// =============================================================================

const layerBadgeBaseStyle: CSSProperties = {
  display: "inline-block",
  fontSize: "9px",
  lineHeight: "14px",
  padding: "0 4px",
  borderRadius: "3px",
  fontWeight: 600,
  letterSpacing: "0.02em",
};

function LayerBadge({ label, color }: LayerNodeBadge) {
  return (
    <span
      style={{
        ...layerBadgeBaseStyle,
        backgroundColor: `${color}1f`,
        color,
      }}
    >
      {label}
    </span>
  );
}

const renameInputStyle: CSSProperties = {
  width: "100%",
  height: 20,
  border: `1px solid ${colorTokens.selection.primary}`,
  borderRadius: 3,
  fontSize: fontTokens.size.md,
  padding: "0 4px",
  outline: "none",
};

// =============================================================================
// Expansion state context
// =============================================================================

/**
 * Expansion state is managed at the LayerPanel level and provided via context
 * to all recursive LayerTree instances. This prevents expansion state from
 * being lost when a parent LayerTree re-renders and remounts its children.
 */
type ExpansionState = {
  readonly expandedIds: ReadonlySet<string>;
  readonly toggle: (id: string) => void;
};

const ExpansionContext = createContext<ExpansionState>({
  expandedIds: new Set(),
  toggle: () => {},
});

function useExpansion(): ExpansionState {
  return useContext(ExpansionContext);
}

// =============================================================================
// Recursive layer tree
// =============================================================================

type LayerTreeProps = {
  readonly nodes: readonly FigDesignNode[];
  readonly depth: number;
  readonly operationDomain: FigUserOperationDomain;
  /**
   * Whether this subtree is inside an INSTANCE node.
   * When true, all children are rendered with the instance accent color
   * to indicate they are inherited from a SYMBOL/COMPONENT.
   */
  readonly isInstanceContext: boolean;
};

function LayerTree({ nodes, depth, operationDomain, isInstanceContext }: LayerTreeProps) {
  const { nodeSelection, dispatch } = useFigEditor();
  const { expandedIds, toggle } = useExpansion();
  const [editingId, setEditingId] = useState<FigNodeId | null>(null);
  const [editingName, setEditingName] = useState("");
  const canSelectNode = allowsFigUserOperation(operationDomain, "select-node");
  const canRenameNode = allowsFigUserOperation(operationDomain, "update-property");

  const handlePointerDown = useCallback(
    (nodeId: FigNodeId) => (e: ReactPointerEvent) => {
      if (!canSelectNode) {
        return;
      }
      const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
      dispatch({
        type: "SELECT_NODE",
        nodeId,
        addToSelection,
      });
    },
    [canSelectNode, dispatch],
  );

  const beginRename = useCallback((node: FigDesignNode) => {
    if (!canRenameNode) {
      return;
    }
    setEditingId(node.id);
    setEditingName(node.name);
  }, [canRenameNode]);

  const commitRename = useCallback((nodeId: FigNodeId) => {
    if (!canRenameNode) {
      setEditingId(null);
      return;
    }
    const name = editingName.trim();
    if (name.length > 0) {
      dispatch({ type: "RENAME_NODE", nodeId, name, source: "layer-panel" });
    }
    setEditingId(null);
  }, [canRenameNode, dispatch, editingName]);

  const handleRenameKeyDown = useCallback((nodeId: FigNodeId) => (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        commitRename(nodeId);
        break;
      case "Escape":
        setEditingId(null);
        break;
    }
  }, [commitRename]);

  return (
    <>
      {[...nodes].reverse().map((node) => {
        const selected = isSelected(nodeSelection, node.id);
        const hasChildren = node.children != null && node.children.length > 0;
        const expanded = expandedIds.has(node.id);
        const isInstance = node.type === "INSTANCE";
        const childIsInstanceContext = isInstanceContext || isInstance;
        const isEditing = editingId === node.id;
        const presentation = resolveLayerNodePresentation(node.type, isInstanceContext);
        const badge = presentation.badge ? <LayerBadge {...presentation.badge} /> : undefined;

        if (isEditing) {
          return (
            <div key={node.id} style={presentation.rowStyle}>
              <div style={{ paddingLeft: 8 + depth * 16, paddingRight: 6, paddingTop: 2, paddingBottom: 2 }}>
                <input
                  autoFocus
                  value={editingName}
                  aria-label={`Rename ${node.name}`}
                  style={renameInputStyle}
                  onChange={(e) => setEditingName(e.currentTarget.value)}
                  onBlur={() => commitRename(node.id)}
                  onKeyDown={handleRenameKeyDown(node.id)}
                />
              </div>
            </div>
          );
        }

        return (
          <div key={node.id} style={presentation.rowStyle}>
            <div onDoubleClick={() => beginRename(node)}>
              <LayerItem
                id={node.id}
                label={node.name}
                icon={getNodeIcon(node.type, presentation.iconColor)}
                depth={depth}
                selected={selected}
                dimmed={!node.visible}
                hasChildren={hasChildren}
                expanded={expanded}
                onToggle={hasChildren ? () => toggle(node.id) : undefined}
                onPointerDown={canSelectNode ? handlePointerDown(node.id) : undefined}
                showVisibilityToggle={false}
                showLockToggle={false}
                badge={badge}
              />
            </div>
            {hasChildren && expanded && (
              <LayerTree nodes={node.children!} depth={depth + 1} operationDomain={operationDomain} isInstanceContext={childIsInstanceContext} />
            )}
          </div>
        );
      })}
    </>
  );
}

function buildLayerContent({
  children,
  expandedIds,
  toggleExpand,
  operationDomain,
}: {
  readonly children: readonly FigDesignNode[];
  readonly expandedIds: ReadonlySet<string>;
  readonly toggleExpand: (id: string) => void;
  readonly operationDomain: FigUserOperationDomain;
}): ReactNode {
  if (children.length === 0) {
    return (
      <div style={{ padding: `${spacingTokens.xl} ${spacingTokens.lg}`, textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.lg }}>
        Empty page
      </div>
    );
  }
  return (
    <ExpansionContext.Provider value={{ expandedIds, toggle: toggleExpand }}>
      <div role="tree" aria-label="Layers">
        <LayerTree nodes={children} depth={0} operationDomain={operationDomain} isInstanceContext={false} />
      </div>
    </ExpansionContext.Provider>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Layer tree panel for the fig editor.
 *
 * Expansion state is managed here via ExpansionContext so that
 * recursive LayerTree components share a single stable state store.
 */
export function LayerPanel() {
  const { activePage } = useFigEditor();
  const operationDomain = useFigOperationDomain();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (!activePage) {
    return (
      <OptionalPropertySection title="Layers" badge={0} defaultExpanded>
        <div style={{ padding: `${spacingTokens.xl} ${spacingTokens.lg}`, textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.lg }}>
          No page selected
        </div>
      </OptionalPropertySection>
    );
  }

  const layerContent = buildLayerContent({
    children: activePage.children,
    expandedIds,
    toggleExpand,
    operationDomain,
  });

  return (
    <OptionalPropertySection title="Layers" badge={activePage.children.length} defaultExpanded>
      {layerContent}
    </OptionalPropertySection>
  );
}
