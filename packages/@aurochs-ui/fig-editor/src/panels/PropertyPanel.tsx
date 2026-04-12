/**
 * @file Property panel
 *
 * Right panel displaying properties of the selected node.
 */

import { useFigEditor } from "../context/FigEditorContext";
import { TransformSection } from "./sections/TransformSection";
import { FillSection } from "./sections/FillSection";
import { StrokeSection } from "./sections/StrokeSection";

/**
 * Property panel for the fig editor.
 *
 * Shows property editors when a node is selected,
 * or a message prompting selection when nothing is selected.
 */
export function PropertyPanel() {
  const { primaryNode, dispatch } = useFigEditor();

  if (!primaryNode) {
    return (
      <div style={{ padding: 16, color: "#999", fontSize: 12, textAlign: "center" }}>
        Select a layer to edit its properties
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 12px", overflow: "auto" }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
        {primaryNode.name}
        <span style={{ color: "#999", fontWeight: 400, marginLeft: 8 }}>
          {primaryNode.type}
        </span>
      </div>

      <TransformSection node={primaryNode} dispatch={dispatch} />

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "4px 0" }} />

      <FillSection node={primaryNode} dispatch={dispatch} />

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "4px 0" }} />

      <StrokeSection node={primaryNode} dispatch={dispatch} />
    </div>
  );
}
