/**
 * @file Layer panel
 *
 * Shows the layer tree for the active page.
 * Uses react-editor-ui's LayerItem component (SoT for layer item rendering).
 *
 * INSTANCE nodes and their children (inherited from SYMBOL) are highlighted
 * with Figma's purple accent color to visually distinguish inherited elements.
 */

import { createContext, useCallback, useContext, useState, type ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useFigEditor } from "../context/FigEditorContext";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { isSelected } from "@aurochs-ui/editor-core/selection";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { LayerItem } from "react-editor-ui/LayerItem";
import {
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

// =============================================================================
// Instance highlight color
// =============================================================================

/**
 * Figma uses purple (#9747FF) for component instance indicators.
 * We use a slightly muted variant for the icon tint and a very subtle
 * background tint for layer rows that are inside an INSTANCE scope.
 */
const INSTANCE_COLOR = "#9747FF";
const INSTANCE_BG_TINT = "rgba(151, 71, 255, 0.06)";
const INSTANCE_ICON_COLOR = "#9747FF";

// =============================================================================
// Icon helpers
// =============================================================================

const ICON_PROPS = { size: iconTokens.size.sm, strokeWidth: iconTokens.strokeWidth };

function getNodeIcon(type: string, isInstanceContext: boolean): ReactNode {
  // Instance-context nodes get a purple tint on their icon
  const color = isInstanceContext ? INSTANCE_ICON_COLOR : undefined;
  const props = color ? { ...ICON_PROPS, color } : ICON_PROPS;

  switch (type) {
    case "FRAME":
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
      // INSTANCE nodes always get the purple diamond icon
      return <DiamondIcon {...ICON_PROPS} color={INSTANCE_COLOR} />;
    default:
      return <UnknownShapeIcon {...props} />;
  }
}

// =============================================================================
// Instance badge
// =============================================================================

const instanceBadgeStyle: CSSProperties = {
  display: "inline-block",
  fontSize: "9px",
  lineHeight: "14px",
  padding: "0 4px",
  borderRadius: "3px",
  backgroundColor: "rgba(151, 71, 255, 0.12)",
  color: INSTANCE_COLOR,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

function InstanceBadge() {
  return <span style={instanceBadgeStyle}>Instance</span>;
}

// =============================================================================
// Layer item wrapper for instance context tint
// =============================================================================

const instanceRowStyle: CSSProperties = {
  backgroundColor: INSTANCE_BG_TINT,
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
  /**
   * Whether this subtree is inside an INSTANCE node.
   * When true, all children are rendered with the instance accent color
   * to indicate they are inherited from a SYMBOL/COMPONENT.
   */
  readonly isInstanceContext: boolean;
};

function LayerTree({ nodes, depth, isInstanceContext }: LayerTreeProps) {
  const { nodeSelection, dispatch } = useFigEditor();
  const { expandedIds, toggle } = useExpansion();

  const handlePointerDown = useCallback(
    (nodeId: FigNodeId) => (e: ReactPointerEvent) => {
      const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
      dispatch({
        type: "SELECT_NODE",
        nodeId,
        addToSelection,
      });
    },
    [dispatch],
  );

  return (
    <>
      {[...nodes].reverse().map((node) => {
        const selected = isSelected(nodeSelection, node.id);
        const hasChildren = node.children != null && node.children.length > 0;
        const expanded = expandedIds.has(node.id);
        const isInstance = node.type === "INSTANCE";
        const childIsInstanceContext = isInstanceContext || isInstance;

        return (
          <div key={node.id} style={childIsInstanceContext ? instanceRowStyle : undefined}>
            <LayerItem
              id={node.id}
              label={node.name}
              icon={getNodeIcon(node.type, isInstanceContext)}
              depth={depth}
              selected={selected}
              dimmed={!node.visible}
              hasChildren={hasChildren}
              expanded={expanded}
              onToggle={hasChildren ? () => toggle(node.id) : undefined}
              onPointerDown={handlePointerDown(node.id as FigNodeId)}
              showVisibilityToggle={false}
              showLockToggle={false}
              badge={isInstance ? <InstanceBadge /> : undefined}
            />
            {hasChildren && expanded && (
              <LayerTree nodes={node.children!} depth={depth + 1} isInstanceContext={childIsInstanceContext} />
            )}
          </div>
        );
      })}
    </>
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

  return (
    <OptionalPropertySection title="Layers" badge={activePage.children.length} defaultExpanded>
      {activePage.children.length === 0 ? (
        <div style={{ padding: `${spacingTokens.xl} ${spacingTokens.lg}`, textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.lg }}>
          Empty page
        </div>
      ) : (
        <ExpansionContext.Provider value={{ expandedIds, toggle: toggleExpand }}>
          <div role="tree" aria-label="Layers">
            <LayerTree nodes={activePage.children} depth={0} isInstanceContext={false} />
          </div>
        </ExpansionContext.Provider>
      )}
    </OptionalPropertySection>
  );
}
