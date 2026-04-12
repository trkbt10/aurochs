/**
 * @file Layer panel
 *
 * Shows the layer tree for the active page.
 */

import { useFigEditor } from "../context/FigEditorContext";
import type { FigDesignNode, FigNodeId } from "@aurochs-builder/fig/types";
import { isSelected } from "@aurochs-ui/editor-core/selection";

/**
 * Layer tree panel for the fig editor.
 */
export function LayerPanel() {
  const { activePage, nodeSelection, dispatch } = useFigEditor();

  if (!activePage) {
    return <div style={{ padding: 16, color: "#999", fontSize: 12 }}>No page selected</div>;
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 8 }}>Layers</div>
      {activePage.children.length === 0 && (
        <div style={{ fontSize: 12, color: "#999" }}>Empty page</div>
      )}
      <LayerTree nodes={activePage.children} depth={0} />
    </div>
  );
}

function LayerTree({ nodes, depth }: { nodes: readonly FigDesignNode[]; depth: number }) {
  const { nodeSelection, dispatch } = useFigEditor();

  return (
    <>
      {[...nodes].reverse().map((node) => {
        const selected = isSelected(nodeSelection, node.id);
        return (
          <div key={node.id}>
            <div
              onClick={() =>
                dispatch({
                  type: "SELECT_NODE",
                  nodeId: node.id,
                  addToSelection: false,
                })
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 4px",
                paddingLeft: depth * 16 + 4,
                fontSize: 12,
                cursor: "pointer",
                borderRadius: 3,
                backgroundColor: selected ? "#e8e8ff" : "transparent",
                opacity: node.visible ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 10, color: "#aaa", width: 20 }}>
                {getNodeIcon(node.type)}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {node.name}
              </span>
            </div>
            {node.children && node.children.length > 0 && (
              <LayerTree nodes={node.children} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </>
  );
}

function getNodeIcon(type: string): string {
  switch (type) {
    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
      return "#";
    case "GROUP":
      return "G";
    case "TEXT":
      return "T";
    case "RECTANGLE":
    case "ROUNDED_RECTANGLE":
      return "\u25A1";
    case "ELLIPSE":
      return "\u25CB";
    case "VECTOR":
    case "LINE":
      return "/";
    case "STAR":
      return "\u2605";
    case "INSTANCE":
      return "\u25C7";
    default:
      return "\u2022";
  }
}
