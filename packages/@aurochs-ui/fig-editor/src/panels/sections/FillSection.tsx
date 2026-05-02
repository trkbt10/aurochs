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
import type { FigPaint, FigColor, FigPaintType, FigGradientStop } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";

import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
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

/** Default solid white fill for new fills */
function createDefaultSolidFill(): FigPaint {
  return {
    type: "SOLID",
    color: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
    opacity: 1,
    visible: true,
  };
}

const paintTypeOptions: readonly SelectOption<FigPaint["type"]>[] = [
  { value: "SOLID", label: "Solid" },
  { value: "GRADIENT_LINEAR", label: "Linear" },
  { value: "GRADIENT_RADIAL", label: "Radial" },
  { value: "GRADIENT_ANGULAR", label: "Angular" },
  { value: "GRADIENT_DIAMOND", label: "Diamond" },
  { value: "IMAGE", label: "Image" },
];

function createDefaultGradientFill(type: Extract<FigPaintType, `GRADIENT_${string}`>): FigPaint {
  return {
    type,
    visible: true,
    opacity: 1,
    gradientStops: [
      { position: 0, color: { r: 0.2, g: 0.45, b: 1, a: 1 } },
      { position: 1, color: { r: 0.8, g: 0.25, b: 0.9, a: 1 } },
    ],
    gradientHandlePositions: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0, y: 1 },
    ],
  };
}

function createDefaultImageFill(): FigPaint {
  return {
    type: "IMAGE",
    visible: true,
    opacity: 1,
    imageRef: "",
    scaleMode: "FILL",
  };
}

function createDefaultPaint(type: FigPaint["type"]): FigPaint {
  if (type === "SOLID") {
    return createDefaultSolidFill();
  }
  if (type === "IMAGE") {
    return createDefaultImageFill();
  }
  return createDefaultGradientFill(type);
}

function getGradientStops(paint: FigPaint): readonly FigGradientStop[] {
  if (paint.type === "SOLID" || paint.type === "IMAGE") {
    return [];
  }
  return paint.gradientStops ?? paint.stops ?? [];
}

// =============================================================================
// Styles
// =============================================================================

const fillRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "4px 0",
};

const paintHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
};

const paintInlineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
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






/** Panel section for viewing and editing fill paints of a Figma node. */
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

  const updateFillType = useCallback(
    (fillIndex: number, type: FigPaint["type"]) => {
      updateFill(fillIndex, (fill) => ({ ...createDefaultPaint(type), opacity: getPaintOpacity(fill), visible: fill.visible }));
    },
    [updateFill],
  );

  const updateGradientStopColor = useCallback(
    (fillIndex: number, stopIndex: number, hex: string) => {
      updateFill(fillIndex, (fill) => {
        const stops = getGradientStops(fill);
        if (stops.length === 0) { return fill; }
        const nextStops = stops.map((stop, i) => i === stopIndex ? { ...stop, color: hexToColor(hex, stop.color.a) } : stop);
        return { ...fill, gradientStops: nextStops, stops: nextStops } as FigPaint;
      });
    },
    [updateFill],
  );

  const updateImageRef = useCallback(
    (fillIndex: number, imageRef: string) => {
      updateFill(fillIndex, (fill) => ({ ...fill, imageRef } as FigPaint));
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
        const gradientStops = getGradientStops(fill);

        return (
          <div key={i} style={fillRowStyle}>
            <div style={paintHeaderStyle}>
              <Select value={fill.type} onChange={(type) => updateFillType(i, type)} options={paintTypeOptions} />
              <Input
                type="number"
                value={Math.round(opacity * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => updateFillOpacity(i, (v as number) / 100)}
                width={52}
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
            {color && (
              <div style={paintInlineStyle}>
                <input
                  type="color"
                  value={colorToHex(color)}
                  onChange={(e) => updateFillColor(i, e.target.value)}
                  style={swatchStyle}
                />
                <span style={hexStyle}>{colorToHex(color).toUpperCase()}</span>
              </div>
            )}
            {gradientStops.length > 0 && (
              <div style={paintInlineStyle}>
                {gradientStops.map((stop, stopIndex) => (
                  <input
                    key={stopIndex}
                    aria-label={`Gradient stop ${stopIndex + 1}`}
                    type="color"
                    value={colorToHex(stop.color)}
                    onChange={(e) => updateGradientStopColor(i, stopIndex, e.target.value)}
                    style={swatchStyle}
                  />
                ))}
              </div>
            )}
            {fill.type === "IMAGE" && (
              <Input
                type="text"
                value={fill.imageRef ?? ""}
                placeholder="imageRef"
                onChange={(v) => updateImageRef(i, String(v))}
              />
            )}
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
