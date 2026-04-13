/**
 * @file Stroke property section
 *
 * Displays stroke weight and color of the selected node.
 */

import type { CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigPaint, FigColor } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";

type StrokeSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

function colorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function getStrokeColor(paint: FigPaint): FigColor | undefined {
  if ("color" in paint && paint.color) {
    return paint.color;
  }
  return undefined;
}

function getStrokeAlignLabel(align: unknown): string {
  if (!align) return "";
  if (typeof align === "string") return align;
  if (typeof align === "object" && "name" in (align as object)) {
    return (align as { name: string }).name;
  }
  return "";
}

const hexLabel: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontFamily: "monospace",
  color: colorTokens.text.secondary,
};

export function StrokeSection({ node, dispatch }: StrokeSectionProps) {
  const strokeWeight = typeof node.strokeWeight === "number" ? node.strokeWeight : 0;
  const hasStrokes = node.strokes.length > 0 || strokeWeight > 0;

  if (!hasStrokes) {
    return (
      <div style={{ fontSize: fontTokens.size.md, color: colorTokens.text.tertiary }}>
        No strokes
      </div>
    );
  }

  const strokePaint = node.strokes.length > 0 ? node.strokes[0] : undefined;
  const strokeColor = strokePaint ? getStrokeColor(strokePaint) : undefined;
  const alignLabel = getStrokeAlignLabel(node.strokeAlign);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <FieldRow>
        <FieldGroup label="Weight" inline labelWidth={50}>
          <Input
            type="number"
            value={strokeWeight}
            min={0}
            step={0.5}
            onChange={(v) => {
              dispatch({
                type: "UPDATE_NODE",
                nodeId: node.id,
                updater: (n) => ({ ...n, strokeWeight: v as number }),
              });
            }}
            width={80}
          />
        </FieldGroup>
      </FieldRow>
      {strokeColor && (
        <FieldRow gap={8}>
          <input
            type="color"
            value={colorToHex(strokeColor)}
            onChange={() => { /* TODO: stroke color edit */ }}
            style={{ width: 24, height: 24, border: "none", cursor: "pointer", padding: 0, background: "none" }}
          />
          <span style={hexLabel}>{colorToHex(strokeColor)}</span>
        </FieldRow>
      )}
      {alignLabel && (
        <div style={{ fontSize: fontTokens.size.xs, color: colorTokens.text.tertiary }}>
          Align: {alignLabel}
        </div>
      )}
    </div>
  );
}
