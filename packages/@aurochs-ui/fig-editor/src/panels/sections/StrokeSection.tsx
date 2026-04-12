/**
 * @file Stroke property section
 */

import type { FigDesignNode } from "@aurochs-builder/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";

type StrokeSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

/**
 * Stroke property editor section.
 */
export function StrokeSection({ node, dispatch }: StrokeSectionProps) {
  const strokeWeight = typeof node.strokeWeight === "number" ? node.strokeWeight : 0;
  const hasStrokes = node.strokes.length > 0 || strokeWeight > 0;

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#666" }}>Stroke</div>
      {!hasStrokes && (
        <div style={{ fontSize: 12, color: "#999" }}>No strokes</div>
      )}
      {hasStrokes && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#888" }}>Weight</span>
          <input
            type="number"
            value={strokeWeight}
            min={0}
            step={0.5}
            onChange={(e) => {
              dispatch({
                type: "UPDATE_NODE",
                nodeId: node.id,
                updater: (n) => ({ ...n, strokeWeight: Number(e.target.value) }),
              });
            }}
            style={{ width: 60, fontSize: 12, padding: "2px 4px" }}
          />
        </div>
      )}
    </div>
  );
}
