/**
 * @file Fill property section
 *
 * Displays and edits the fill paints of a selected node.
 * Uses shared UI components for layout and design tokens for styling.
 */

import type { CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigPaint, FigColor } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { FieldRow } from "@aurochs-ui/ui-components/layout";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

type FillSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Color conversion helpers
// =============================================================================

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

// =============================================================================
// Styles
// =============================================================================

const emptyStyle: CSSProperties = {
  fontSize: fontTokens.size.md,
  color: colorTokens.text.tertiary,
};

const typeLabel: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.secondary,
  minWidth: 50,
};

const hexLabel: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontFamily: "monospace",
  color: colorTokens.text.secondary,
};

// =============================================================================
// Component
// =============================================================================

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

  if (fills.length === 0) {
    return <div style={emptyStyle}>No fills</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {fills.map((fill, i) => {
        const color = getPaintColor(fill);
        return (
          <FieldRow key={i} gap={8}>
            <span style={typeLabel}>{getPaintTypeLabel(fill)}</span>
            {color && (
              <input
                type="color"
                value={colorToHex(color)}
                onChange={(e) => updateFillColor(i, hexToColor(e.target.value))}
                style={{ width: 24, height: 24, border: "none", cursor: "pointer", padding: 0, background: "none" }}
              />
            )}
            {color && (
              <span style={hexLabel}>{colorToHex(color)}</span>
            )}
          </FieldRow>
        );
      })}
    </div>
  );
}
