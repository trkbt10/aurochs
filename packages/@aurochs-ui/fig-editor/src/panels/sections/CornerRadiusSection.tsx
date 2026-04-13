/**
 * @file Corner radius property section
 *
 * Shows corner radius editor for RECTANGLE, ROUNDED_RECTANGLE, and FRAME nodes.
 */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";

type CornerRadiusSectionProps = {
  readonly node: FigDesignNode;
  readonly dispatch: (action: FigEditorAction) => void;
};

const CORNER_RADIUS_TYPES = new Set([
  "RECTANGLE", "ROUNDED_RECTANGLE", "FRAME", "COMPONENT", "SYMBOL",
]);

export function CornerRadiusSection({ node, dispatch }: CornerRadiusSectionProps) {
  if (!CORNER_RADIUS_TYPES.has(node.type)) {
    return null;
  }

  const hasIndividualRadii = node.rectangleCornerRadii && node.rectangleCornerRadii.length === 4;
  const uniformRadius = node.cornerRadius ?? 0;

  if (hasIndividualRadii) {
    const radii = node.rectangleCornerRadii!;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <FieldRow>
          <FieldGroup label="TL" inline labelWidth={20}>
            <Input type="number" value={radii[0]} min={0} step={1} width={56}
              onChange={(v) => dispatch({
                type: "UPDATE_NODE",
                nodeId: node.id,
                updater: (n) => ({
                  ...n,
                  rectangleCornerRadii: [v as number, radii[1], radii[2], radii[3]],
                }),
              })}
            />
          </FieldGroup>
          <FieldGroup label="TR" inline labelWidth={20}>
            <Input type="number" value={radii[1]} min={0} step={1} width={56}
              onChange={(v) => dispatch({
                type: "UPDATE_NODE",
                nodeId: node.id,
                updater: (n) => ({
                  ...n,
                  rectangleCornerRadii: [radii[0], v as number, radii[2], radii[3]],
                }),
              })}
            />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup label="BL" inline labelWidth={20}>
            <Input type="number" value={radii[3]} min={0} step={1} width={56}
              onChange={(v) => dispatch({
                type: "UPDATE_NODE",
                nodeId: node.id,
                updater: (n) => ({
                  ...n,
                  rectangleCornerRadii: [radii[0], radii[1], radii[2], v as number],
                }),
              })}
            />
          </FieldGroup>
          <FieldGroup label="BR" inline labelWidth={20}>
            <Input type="number" value={radii[2]} min={0} step={1} width={56}
              onChange={(v) => dispatch({
                type: "UPDATE_NODE",
                nodeId: node.id,
                updater: (n) => ({
                  ...n,
                  rectangleCornerRadii: [radii[0], radii[1], v as number, radii[3]],
                }),
              })}
            />
          </FieldGroup>
        </FieldRow>
      </div>
    );
  }

  return (
    <FieldRow>
      <FieldGroup label="Radius" inline labelWidth={50}>
        <Input
          type="number"
          value={uniformRadius}
          min={0}
          step={1}
          onChange={(v) => {
            dispatch({
              type: "UPDATE_NODE",
              nodeId: node.id,
              updater: (n) => ({ ...n, cornerRadius: v as number }),
            });
          }}
          width={80}
        />
      </FieldGroup>
    </FieldRow>
  );
}
