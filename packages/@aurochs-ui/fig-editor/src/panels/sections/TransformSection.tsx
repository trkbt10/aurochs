/**
 * @file Transform property section
 *
 * Edits position (x, y), size (width, height), and rotation of the selected node.
 * Uses Input from ui-components and FieldGroup/FieldRow from ui-components/layout.
 */

import { useCallback } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";

// =============================================================================
// Types
// =============================================================================

type TransformSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================

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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldRow>
        <FieldGroup label="X" inline labelWidth={16}>
          <Input
            type="number"
            value={x}
            onChange={(v) => updateTransform("x", v as number)}
          />
        </FieldGroup>
        <FieldGroup label="Y" inline labelWidth={16}>
          <Input
            type="number"
            value={y}
            onChange={(v) => updateTransform("y", v as number)}
          />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="W" inline labelWidth={16}>
          <Input
            type="number"
            value={w}
            onChange={(v) => updateTransform("w", v as number)}
          />
        </FieldGroup>
        <FieldGroup label="H" inline labelWidth={16}>
          <Input
            type="number"
            value={h}
            onChange={(v) => updateTransform("h", v as number)}
          />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="R" inline labelWidth={16}>
          <Input
            type="number"
            value={rotation}
            onChange={(v) => updateTransform("rotation", v as number)}
            suffix="°"
          />
        </FieldGroup>
      </FieldRow>
    </div>
  );
}
