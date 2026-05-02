/**
 * @file Stroke property section
 *
 * Edits stroke paints and weight of a selected node.
 * Supports: stroke color editing, weight, opacity, add/remove strokes.
 */

import { useCallback, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigPaint, FigColor, FigPaintType, FigGradientStop } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
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

function getStrokeColor(paint: FigPaint): FigColor | undefined {
  if ("color" in paint && paint.color) {
    return paint.color;
  }
  return undefined;
}

function getStrokePaintOpacity(paint: FigPaint): number {
  if ("opacity" in paint && typeof paint.opacity === "number") {
    return paint.opacity;
  }
  return 1;
}

function getStrokeAlignLabel(align: FigDesignNode["strokeAlign"]): string {
  return align ?? "";
}

function createDefaultStrokePaint(): FigPaint {
  return {
    type: "SOLID",
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
  };
}

const strokePaintTypeOptions: readonly SelectOption<FigPaint["type"]>[] = [
  { value: "SOLID", label: "Solid" },
  { value: "GRADIENT_LINEAR", label: "Linear" },
  { value: "GRADIENT_RADIAL", label: "Radial" },
  { value: "GRADIENT_ANGULAR", label: "Angular" },
  { value: "GRADIENT_DIAMOND", label: "Diamond" },
  { value: "IMAGE", label: "Image" },
];

function createDefaultGradientStroke(type: Extract<FigPaintType, `GRADIENT_${string}`>): FigPaint {
  return {
    type,
    visible: true,
    opacity: 1,
    gradientStops: [
      { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 0.2, g: 0.45, b: 1, a: 1 } },
    ],
    gradientHandlePositions: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0, y: 1 },
    ],
  };
}

function createDefaultImageStroke(): FigPaint {
  return {
    type: "IMAGE",
    visible: true,
    opacity: 1,
    imageRef: "",
    scaleMode: "FILL",
  };
}

function createDefaultStrokePaintOfType(type: FigPaint["type"]): FigPaint {
  if (type === "SOLID") {
    return createDefaultStrokePaint();
  }
  if (type === "IMAGE") {
    return createDefaultImageStroke();
  }
  return createDefaultGradientStroke(type);
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

const strokeRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "4px 0",
};

const strokeHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
};

const strokeInlineStyle: CSSProperties = {
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

// =============================================================================
// Props
// =============================================================================

type StrokeSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================






/** Panel section for editing stroke properties of a Figma node. */
export function StrokeSection({ node, dispatch }: StrokeSectionProps) {
  const strokeWeight = typeof node.strokeWeight === "number" ? node.strokeWeight : 0;
  const strokes = node.strokes;
  const alignLabel = getStrokeAlignLabel(node.strokeAlign);

  const updateStrokeWeight = useCallback(
    (weight: number) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => ({ ...n, strokeWeight: weight }),
      });
    },
    [dispatch, node.id],
  );

  const updateStrokePaint = useCallback(
    (strokeIndex: number, updater: (paint: FigPaint) => FigPaint) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => {
          const newStrokes = [...n.strokes];
          const paint = newStrokes[strokeIndex];
          if (paint) {
            newStrokes[strokeIndex] = updater(paint);
          }
          return { ...n, strokes: newStrokes };
        },
      });
    },
    [dispatch, node.id],
  );

  const updateStrokeColor = useCallback(
    (strokeIndex: number, hex: string) => {
      updateStrokePaint(strokeIndex, (paint) => {
        const currentColor = getStrokeColor(paint);
        const alpha = currentColor?.a ?? 1;
        return { ...paint, color: hexToColor(hex, alpha) } as FigPaint;
      });
    },
    [updateStrokePaint],
  );

  const updateStrokeOpacity = useCallback(
    (strokeIndex: number, opacity: number) => {
      updateStrokePaint(strokeIndex, (paint) => ({ ...paint, opacity } as FigPaint));
    },
    [updateStrokePaint],
  );

  const updateStrokeType = useCallback(
    (strokeIndex: number, type: FigPaint["type"]) => {
      updateStrokePaint(strokeIndex, (paint) => ({ ...createDefaultStrokePaintOfType(type), opacity: getStrokePaintOpacity(paint), visible: paint.visible }));
    },
    [updateStrokePaint],
  );

  const updateGradientStopColor = useCallback(
    (strokeIndex: number, stopIndex: number, hex: string) => {
      updateStrokePaint(strokeIndex, (paint) => {
        const stops = getGradientStops(paint);
        if (stops.length === 0) { return paint; }
        const nextStops = stops.map((stop, i) => i === stopIndex ? { ...stop, color: hexToColor(hex, stop.color.a) } : stop);
        return { ...paint, gradientStops: nextStops, stops: nextStops } as FigPaint;
      });
    },
    [updateStrokePaint],
  );

  const updateImageRef = useCallback(
    (strokeIndex: number, imageRef: string) => {
      updateStrokePaint(strokeIndex, (paint) => ({ ...paint, imageRef } as FigPaint));
    },
    [updateStrokePaint],
  );

  const removeStroke = useCallback(
    (strokeIndex: number) => {
      dispatch({
        type: "UPDATE_NODE",
        nodeId: node.id,
        updater: (n) => ({
          ...n,
          strokes: n.strokes.filter((_, i) => i !== strokeIndex),
          strokeWeight: n.strokes.length <= 1 ? 0 : n.strokeWeight,
        }),
      });
    },
    [dispatch, node.id],
  );

  const addStroke = useCallback(() => {
    dispatch({
      type: "UPDATE_NODE",
      nodeId: node.id,
      updater: (n) => ({
        ...n,
        strokes: [...n.strokes, createDefaultStrokePaint()],
        strokeWeight: typeof n.strokeWeight === "number" && n.strokeWeight > 0 ? n.strokeWeight : 1,
      }),
    });
  }, [dispatch, node.id]);

  const hasContent = strokes.length > 0 || strokeWeight > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {hasContent && (
        <FieldRow>
          <FieldGroup label="Weight" inline labelWidth={50}>
            <Input
              type="number"
              value={strokeWeight}
              min={0}
              step={0.5}
              onChange={(v) => updateStrokeWeight(v as number)}
              width={60}
            />
          </FieldGroup>
          {alignLabel && (
            <span style={{ fontSize: fontTokens.size.xs, color: colorTokens.text.tertiary }}>
              {alignLabel}
            </span>
          )}
        </FieldRow>
      )}

      {strokes.map((stroke, i) => {
        const color = getStrokeColor(stroke);
        const opacity = getStrokePaintOpacity(stroke);
        const gradientStops = getGradientStops(stroke);

        return (
          <div key={i} style={strokeRowStyle}>
            <div style={strokeHeaderStyle}>
              <Select value={stroke.type} onChange={(type) => updateStrokeType(i, type)} options={strokePaintTypeOptions} />
              <Input
                type="number"
                value={Math.round(opacity * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(v) => updateStrokeOpacity(i, (v as number) / 100)}
                width={52}
                suffix="%"
              />
              <button
                type="button"
                style={removeButtonStyle}
                onClick={() => removeStroke(i)}
                title="Remove stroke"
              >
                <CloseIcon size={12} />
              </button>
            </div>
            {color && (
              <div style={strokeInlineStyle}>
                <input
                  type="color"
                  value={colorToHex(color)}
                  onChange={(e) => updateStrokeColor(i, e.target.value)}
                  style={swatchStyle}
                />
                <span style={hexStyle}>{colorToHex(color).toUpperCase()}</span>
              </div>
            )}
            {gradientStops.length > 0 && (
              <div style={strokeInlineStyle}>
                {gradientStops.map((stop, stopIndex) => (
                  <input
                    key={stopIndex}
                    aria-label={`Stroke gradient stop ${stopIndex + 1}`}
                    type="color"
                    value={colorToHex(stop.color)}
                    onChange={(e) => updateGradientStopColor(i, stopIndex, e.target.value)}
                    style={swatchStyle}
                  />
                ))}
              </div>
            )}
            {stroke.type === "IMAGE" && (
              <Input
                type="text"
                value={stroke.imageRef ?? ""}
                placeholder="imageRef"
                onChange={(v) => updateImageRef(i, String(v))}
              />
            )}
          </div>
        );
      })}

      <button type="button" style={addButtonStyle} onClick={addStroke}>
        <AddIcon size={12} />
        Add stroke
      </button>
    </div>
  );
}
