/** @file Variant property metadata controls. */

import type { FigDesignNode, FigNodeId, VariantPropSpec } from "@aurochs/fig/domain";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { createPropertyPrimaryUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

type VariantPropertiesSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

/** Edit COMPONENT variant values backed by Kiwi `variantPropSpecs`. */
export function VariantPropertiesSection({ node, target, dispatch }: VariantPropertiesSectionProps) {
  const specs = node.variantPropSpecs ?? [];

  if (specs.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {specs.map((spec, index) => (
        <FieldGroup key={spec.propDefId} label={`Variant ${index + 1}`}>
          <Input
            type="text"
            ariaLabel={`Variant value ${index + 1}`}
            value={spec.value}
            onChange={(value) => {
              dispatch(createPropertyPrimaryUpdateAction({
                target,
                updater: (current) => ({
                  ...current,
                  variantPropSpecs: updateVariantPropSpec({
                    specs: current.variantPropSpecs ?? [],
                    propDefId: spec.propDefId,
                    value: String(value),
                  }),
                }),
              }));
            }}
          />
        </FieldGroup>
      ))}
    </div>
  );
}

function updateVariantPropSpec({
  specs,
  propDefId,
  value,
}: {
  readonly specs: readonly VariantPropSpec[];
  readonly propDefId: FigNodeId;
  readonly value: string;
}): FigDesignNode["variantPropSpecs"] {
  return specs.map((spec) => {
    if (spec.propDefId === propDefId) {
      return { ...spec, value };
    }
    return spec;
  });
}
