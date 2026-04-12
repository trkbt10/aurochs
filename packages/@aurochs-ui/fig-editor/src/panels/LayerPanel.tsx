/**
 * @file Layer panel
 *
 * Shows the layer tree for the active page.
 * Uses react-editor-ui's LayerItem component (SoT for layer item rendering).
 * Format-specific details (icon, label) are injected via props.
 */

import { useCallback, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
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
// Icon helpers
// =============================================================================

const ICON_PROPS = { size: iconTokens.size.sm, strokeWidth: iconTokens.strokeWidth };

function getNodeIcon(type: string): ReactNode {
  switch (type) {
    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
      return <RectIcon {...ICON_PROPS} />;
    case "GROUP":
      return <FolderIcon {...ICON_PROPS} />;
    case "TEXT":
      return <TextBoxIcon {...ICON_PROPS} />;
    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return <RectIcon {...ICON_PROPS} />;
    case "ELLIPSE":
      return <EllipseIcon {...ICON_PROPS} />;
    case "VECTOR":
    case "LINE":
      return <LineIcon {...ICON_PROPS} />;
    case "STAR":
      return <StarIcon {...ICON_PROPS} />;
    case "INSTANCE":
      return <DiamondIcon {...ICON_PROPS} />;
    default:
      return <UnknownShapeIcon {...ICON_PROPS} />;
  }
}

// =============================================================================
// Recursive layer tree
// =============================================================================

type LayerTreeProps = {
  readonly nodes: readonly FigDesignNode[];
  readonly depth: number;
};

function LayerTree({ nodes, depth }: LayerTreeProps) {
  const { nodeSelection, dispatch } = useFigEditor();

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

        return (
          <div key={node.id}>
            <LayerItem
              id={node.id}
              label={node.name}
              icon={getNodeIcon(node.type)}
              depth={depth}
              selected={selected}
              dimmed={!node.visible}
              hasChildren={hasChildren}
              onPointerDown={handlePointerDown(node.id as FigNodeId)}
              showVisibilityToggle={false}
              showLockToggle={false}
            />
            {hasChildren && (
              <LayerTree nodes={node.children!} depth={depth + 1} />
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
 */
export function LayerPanel() {
  const { activePage } = useFigEditor();

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
        <div role="tree" aria-label="Layers">
          <LayerTree nodes={activePage.children} depth={0} />
        </div>
      )}
    </OptionalPropertySection>
  );
}
