/**
 * @file Transform property section
 *
 * Edits position (x, y), size (width, height), and rotation of the selected node.
 */

import { useCallback } from "react";
import type { FigDesignNode, FigNodeId } from "@aurochs-builder/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";

type TransformSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

/**
 * Transform property editor section.
 */
export function TransformSection({ node, dispatch }: TransformSectionProps) {
  const x = Math.round(node.transform.m02 * 100) / 100;
  const y = Math.round(node.transform.m12 * 100) / 100;
  const w = Math.round(node.size.x * 100) / 100;
  const h = Math.round(node.size.y * 100) / 100;
  const rotation = Math.round(
    Math.atan2(node.transform.m10, node.transform.m00) * (180 / Math.PI) * 100,
  ) / 100;

  const updateTransform = useCallback(
    (field: "x" | "y" | "w" | "h" | "rotation", value: number) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => {
          switch (field) {
            case "x":
              return { ...n, transform: { ...n.transform, m02: value } };
            case "y":
              return { ...n, transform: { ...n.transform, m12: value } };
            case "w":
              return { ...n, size: { ...n.size, x: value } };
            case "h":
              return { ...n, size: { ...n.size, y: value } };
            case "rotation": {
              const rad = (value * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              return {
                ...n,
                transform: {
                  ...n.transform,
                  m00: cos,
                  m01: -sin,
                  m10: sin,
                  m11: cos,
                },
              };
            }
            default:
              return n;
          }
        },
      });
    },
    [dispatch, node.id],
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "8px 0" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        <span style={{ width: 16, color: "#888" }}>X</span>
        <input
          type="number"
          value={x}
          onChange={(e) => updateTransform("x", Number(e.target.value))}
          style={{ width: "100%", fontSize: 12, padding: "2px 4px" }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        <span style={{ width: 16, color: "#888" }}>Y</span>
        <input
          type="number"
          value={y}
          onChange={(e) => updateTransform("y", Number(e.target.value))}
          style={{ width: "100%", fontSize: 12, padding: "2px 4px" }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        <span style={{ width: 16, color: "#888" }}>W</span>
        <input
          type="number"
          value={w}
          onChange={(e) => updateTransform("w", Number(e.target.value))}
          style={{ width: "100%", fontSize: 12, padding: "2px 4px" }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        <span style={{ width: 16, color: "#888" }}>H</span>
        <input
          type="number"
          value={h}
          onChange={(e) => updateTransform("h", Number(e.target.value))}
          style={{ width: "100%", fontSize: 12, padding: "2px 4px" }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, gridColumn: "span 2" }}>
        <span style={{ width: 16, color: "#888" }}>R</span>
        <input
          type="number"
          value={rotation}
          onChange={(e) => updateTransform("rotation", Number(e.target.value))}
          style={{ width: "100%", fontSize: 12, padding: "2px 4px" }}
        />
        <span style={{ color: "#888" }}>°</span>
      </label>
    </div>
  );
}
