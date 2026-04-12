/**
 * @file Fill property section
 *
 * Displays and edits the fill paints of a selected node.
 */

import type { FigDesignNode, FigNodeId } from "@aurochs-builder/fig/types";
import type { FigPaint, FigColor } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";

type FillSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

function colorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToColor(hex: string): FigColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: 1,
  };
}

function getPaintColor(paint: FigPaint): FigColor | undefined {
  if ("color" in paint && paint.color) {
    return paint.color;
  }
  return undefined;
}

function getPaintTypeLabel(paint: FigPaint): string {
  const type = typeof paint.type === "string" ? paint.type : paint.type?.name;
  switch (type) {
    case "SOLID": return "Solid";
    case "GRADIENT_LINEAR": return "Linear";
    case "GRADIENT_RADIAL": return "Radial";
    case "GRADIENT_ANGULAR": return "Angular";
    case "GRADIENT_DIAMOND": return "Diamond";
    case "IMAGE": return "Image";
    default: return String(type);
  }
}

/**
 * Fill property editor section.
 */
export function FillSection({ node, dispatch }: FillSectionProps) {
  const fills = node.fills;

  function updateFillColor(fillIndex: number, color: FigColor): void {
    dispatch({
      type: "UPDATE_NODE",
      nodeId: node.id,
      updater: (n) => {
        const newFills = [...n.fills];
        const fill = newFills[fillIndex];
        if (fill && "color" in fill) {
          newFills[fillIndex] = { ...fill, color } as FigPaint;
        }
        return { ...n, fills: newFills };
      },
    });
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#666" }}>Fill</div>
      {fills.length === 0 && (
        <div style={{ fontSize: 12, color: "#999" }}>No fills</div>
      )}
      {fills.map((fill, i) => {
        const color = getPaintColor(fill);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#888", minWidth: 50 }}>
              {getPaintTypeLabel(fill)}
            </span>
            {color && (
              <input
                type="color"
                value={colorToHex(color)}
                onChange={(e) => updateFillColor(i, hexToColor(e.target.value))}
                style={{ width: 24, height: 24, border: "none", cursor: "pointer" }}
              />
            )}
            {color && (
              <span style={{ fontSize: 11, fontFamily: "monospace" }}>
                {colorToHex(color)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
