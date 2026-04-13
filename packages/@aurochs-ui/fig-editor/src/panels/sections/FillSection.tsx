/**
 * @file Fill property section
 *
 * Edits the fill paints of a selected node.
 * Supports: solid color editing, opacity, add/remove fills.
 *
 * Each fill entry shows:
 * - Color swatch with native color picker
 * - Hex color value
 * - Opacity slider
 * - Remove button
 *
 * Uses UPDATE_NODE action with immutable updater functions.
 */

import { useCallback, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigPaint, FigColor, KiwiEnumValue } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { FieldRow } from "@aurochs-ui/ui-components/layout";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";

// =============================================================================
// Color helpers
// =============================================================================

function colorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToColor(hex: string, alpha = 1): FigColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: alpha,
  };
}

function getPaintColor(paint: FigPaint): FigColor | undefined {
  if ("color" in paint && paint.color) {
    return paint.color;
  }
  return undefined;
}

function getPaintOpacity(paint: FigPaint): number {
  if ("opacity" in paint && typeof paint.opacity === "number") {
    return paint.opacity;
  }
  return 1;
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
    default: return String(type ?? "Solid");
  }
}

/** Default solid white fill for new fills */
function createDefaultSolidFill(): FigPaint {
  return {
    type: { value: 0, name: "SOLID" } as KiwiEnumValue,
    color: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
    opacity: 1,
    visible: true,
  } as FigPaint;
}

// =============================================================================
// Styles
// =============================================================================

const fillRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 0",
};

const swatchStyle: CSSProperties = {
  width: 24,
  height: 24,
  border: `1px solid ${colorTokens.border.strong}`,
  borderRadius: 4,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

const hexStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontFamily: "monospace",
  color: colorTokens.text.secondary,
  minWidth: 60,
};

const typeStyle: CSSProperties = {
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.tertiary,
  minWidth: 36,
};

const removeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 2,
  color: colorTokens.text.tertiary,
  lineHeight: 0,
  flexShrink: 0,
};

const addButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: `1px dashed ${colorTokens.border.primary}`,
  borderRadius: 4,
  cursor: "pointer",
  padding: "4px 8px",
  color: colorTokens.text.secondary,
  fontSize: fontTokens.size.sm,
  width: "100%",
  justifyContent: "center",
};

const emptyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

// =============================================================================
// Props
// =============================================================================

type FillSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================

export function FillSection({ node, dispatch }: FillSectionProps) {
  const fills = node.fills;

  const updateFill = useCallback(
    (fillIndex: number, updater: (fill: FigPaint) => FigPaint) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => {
          const newFills = [...n.fills];
          const fill = newFills[fillIndex];
          if (fill) {
            newFills[fillIndex] = updater(fill);
          }
          return { ...n, fills: newFills };
        },
      });
    },
    [dispatch, node.id],
  );

  const updateFillColor = useCallback(
    (fillIndex: number, hex: string) => {
      updateFill(fillIndex, (fill) => {
        const currentColor = getPaintColor(fill);
        const alpha = currentColor?.a ?? 1;
        return { ...fill, color: hexToColor(hex, alpha) } as FigPaint;
      });
    },
    [updateFill],
  );

  const updateFillOpacity = useCallback(
    (fillIndex: number, opacity: number) => {
      updateFill(fillIndex, (fill) => ({ ...fill, opacity } as FigPaint));
    },
    [updateFill],
  );

  const removeFill = useCallback(
    (fillIndex: number) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => ({
          ...n,
          fills: n.fills.filter((_, i) => i !== fillIndex),
        }),
      });
    },
    [dispatch, node.id],
  );

  const addFill = useCallback(() => {
    dispatch({
      type: "UPDATE_NODE",
      nodeId: node.id,
      updater: (n) => ({
        ...n,
        fills: [...n.fills, createDefaultSolidFill()],
      }),
    });
  }, [dispatch, node.id]);

  return (
    <div style={emptyStyle}>
      {fills.map((fill, i) => {
        const color = getPaintColor(fill);
        const opacity = getPaintOpacity(fill);
        const typeLabel = getPaintTypeLabel(fill);

        return (
          <div key={i} style={fillRowStyle}>
            <span style={typeStyle}>{typeLabel}</span>
            {color && (
              <input
                type="color"
                value={colorToHex(color)}
                onChange={(e) => updateFillColor(i, e.target.value)}
                style={swatchStyle}
              />
            )}
            {color && (
              <span style={hexStyle}>{colorToHex(color).toUpperCase()}</span>
            )}
            <Input
              type="number"
              value={Math.round(opacity * 100)}
              min={0}
              max={100}
              step={1}
              onChange={(v) => updateFillOpacity(i, (v as number) / 100)}
              width={48}
              suffix="%"
            />
            <button
              type="button"
              style={removeButtonStyle}
              onClick={() => removeFill(i)}
              title="Remove fill"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        );
      })}

      <button type="button" style={addButtonStyle} onClick={addFill}>
        <AddIcon size={12} />
        Add fill
      </button>
    </div>
  );
}
