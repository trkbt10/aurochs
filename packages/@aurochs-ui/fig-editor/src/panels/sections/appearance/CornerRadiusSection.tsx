/**
 * @file Corner radius property section
 *
 * Shows corner radius editor for RECTANGLE, ROUNDED_RECTANGLE, and FRAME nodes.
 */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";
import {
  collapseToUniformCornerRadius,
  expandToIndividualCornerRadii,
  hasIndividualCornerRadii,
  isCornerRadiusEditableNode,
  resolveIndividualCornerRadii,
  resolveUniformCornerRadius,
  setIndividualCornerRadius,
  setUniformCornerRadius,
  type CornerRadiusIndex,
} from "./corner-radius-domain";

type CornerRadiusSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

const modeButtonStyle = {
  height: 26,
  minWidth: 72,
  border: "1px solid var(--border-subtle, #d0d0d0)",
  borderRadius: 4,
  background: "transparent",
  cursor: "pointer",
  fontSize: 11,
} as const;






/** Panel section for editing corner radius properties of a Figma node. */
export function CornerRadiusSection({ node, target, dispatch }: CornerRadiusSectionProps) {
  if (!isCornerRadiusEditableNode(node)) {
    return null;
  }

  const hasIndividualRadii = hasIndividualCornerRadii(node);
  const uniformRadius = resolveUniformCornerRadius(node);

  if (hasIndividualRadii) {
    const radii = resolveIndividualCornerRadii(node);
    const updateRadius = (index: CornerRadiusIndex, value: number) => dispatch(createPropertyTargetUpdateAction({
      target,
      updater: (n) => setIndividualCornerRadius(n, index, value),
    }));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <FieldRow>
          <FieldGroup label="TL" inline labelWidth={20}>
            <Input type="number" value={radii[0]} min={0} step={1} width={56}
              onChange={(v) => updateRadius(0, v as number)}
            />
          </FieldGroup>
          <FieldGroup label="TR" inline labelWidth={20}>
            <Input type="number" value={radii[1]} min={0} step={1} width={56}
              onChange={(v) => updateRadius(1, v as number)}
            />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup label="BL" inline labelWidth={20}>
            <Input type="number" value={radii[3]} min={0} step={1} width={56}
              onChange={(v) => updateRadius(3, v as number)}
            />
          </FieldGroup>
          <FieldGroup label="BR" inline labelWidth={20}>
            <Input type="number" value={radii[2]} min={0} step={1} width={56}
              onChange={(v) => updateRadius(2, v as number)}
            />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <button
            type="button"
            aria-label="Use uniform corner radius"
            title="Use uniform corner radius"
            style={modeButtonStyle}
            onClick={() => dispatch(createPropertyTargetUpdateAction({
              target,
              updater: collapseToUniformCornerRadius,
            }))}
          >
            Uniform
          </button>
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
            dispatch(createPropertyTargetUpdateAction({
              target,
              updater: (n) => setUniformCornerRadius(n, v as number),
            }));
          }}
          width={80}
        />
      </FieldGroup>
      <button
        type="button"
        aria-label="Use individual corner radii"
        title="Use individual corner radii"
        style={modeButtonStyle}
        onClick={() => dispatch(createPropertyTargetUpdateAction({
          target,
          updater: expandToIndividualCornerRadii,
        }))}
      >
        Corners
      </button>
    </FieldRow>
  );
}
