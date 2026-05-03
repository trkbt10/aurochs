/**
 * @file Transform property section
 *
 * Edits position (x, y), size (width, height), and rotation of the selected node.
 * Uses Input from ui-components and FieldGroup/FieldRow from ui-components/layout.
 */

import { useCallback } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { extractRotationDeg, computePreRotationTopLeft, buildRotatedTransform } from "../../../context/fig-editor/rotation";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { createPropertyPrimaryUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

// =============================================================================
// Types
// =============================================================================

type TransformSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Transform property editor section.
 */
export function TransformSection({ node, target, dispatch }: TransformSectionProps) {
  const { x: preRotX, y: preRotY } = computePreRotationTopLeft(node.transform, node.size.x, node.size.y);
  const x = Math.round(preRotX * 100) / 100;
  const y = Math.round(preRotY * 100) / 100;
  const w = Math.round(node.size.x * 100) / 100;
  const h = Math.round(node.size.y * 100) / 100;
  const rotation = Math.round(extractRotationDeg(node.transform) * 100) / 100;
  const originX = Math.round((node.transformOrigin?.x ?? node.size.x / 2) * 100) / 100;
  const originY = Math.round((node.transformOrigin?.y ?? node.size.y / 2) * 100) / 100;

  const updateTransform = useCallback(
    (field: "x" | "y" | "w" | "h" | "rotation" | "originX" | "originY", value: number) => {
      dispatch(createPropertyPrimaryUpdateAction({
        target,
        updater: (n) => {
          switch (field) {
            case "x":
            case "y": {
              // User edits pre-rotation top-left. Derive m02/m12 via rotation SoT.
              const currentAngle = extractRotationDeg(n.transform);
              const { x: curX, y: curY } = computePreRotationTopLeft(n.transform, n.size.x, n.size.y);
              const newX = field === "x" ? value : curX;
              const newY = field === "y" ? value : curY;
              const newCx = newX + n.size.x / 2;
              const newCy = newY + n.size.y / 2;
              const radians = (currentAngle * Math.PI) / 180;
              const cos = Math.cos(radians);
              const sin = Math.sin(radians);
              const halfW = n.size.x / 2;
              const halfH = n.size.y / 2;
              return {
                ...n,
                transform: {
                  m00: cos, m01: -sin,
                  m02: newCx - cos * halfW + sin * halfH,
                  m10: sin, m11: cos,
                  m12: newCy - sin * halfW - cos * halfH,
                },
              };
            }
            case "w":
              return { ...n, size: { ...n.size, x: value } };
            case "h":
              return { ...n, size: { ...n.size, y: value } };
            case "rotation":
              return {
                ...n,
                transform: buildRotatedTransform({ currentTransform: n.transform, width: n.size.x, height: n.size.y, newAngleDeg: value, origin: n.transformOrigin }),
              };
            case "originX":
              return { ...n, transformOrigin: { x: value, y: n.transformOrigin?.y ?? n.size.y / 2 } };
            case "originY":
              return { ...n, transformOrigin: { x: n.transformOrigin?.x ?? n.size.x / 2, y: value } };
            default:
              return n;
          }
        },
      }));
    },
    [dispatch, target],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldRow>
        <FieldGroup label="X" inline labelWidth={16}>
          <Input
            type="number"
            ariaLabel="X"
            value={x}
            onChange={(v) => updateTransform("x", v as number)}
          />
        </FieldGroup>
        <FieldGroup label="Y" inline labelWidth={16}>
          <Input
            type="number"
            ariaLabel="Y"
            value={y}
            onChange={(v) => updateTransform("y", v as number)}
          />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="W" inline labelWidth={16}>
          <Input
            type="number"
            ariaLabel="Width"
            value={w}
            onChange={(v) => updateTransform("w", v as number)}
          />
        </FieldGroup>
        <FieldGroup label="H" inline labelWidth={16}>
          <Input
            type="number"
            ariaLabel="Height"
            value={h}
            onChange={(v) => updateTransform("h", v as number)}
          />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="R" inline labelWidth={16}>
          <Input
            type="number"
            ariaLabel="Rotation"
            value={rotation}
            onChange={(v) => updateTransform("rotation", v as number)}
            suffix="°"
          />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="OX" inline labelWidth={24}>
          <Input
            type="number"
            ariaLabel="Origin X"
            value={originX}
            onChange={(v) => updateTransform("originX", v as number)}
          />
        </FieldGroup>
        <FieldGroup label="OY" inline labelWidth={24}>
          <Input
            type="number"
            ariaLabel="Origin Y"
            value={originY}
            onChange={(v) => updateTransform("originY", v as number)}
          />
        </FieldGroup>
      </FieldRow>
    </div>
  );
}
