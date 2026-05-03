/** @file COMPONENT_SET variant authoring controls. */

import type { ComponentPropertyDef, FigDesignNode, FigNodeId, VariantPropSpec } from "@aurochs/fig/domain";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { createPropertyPrimaryUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

type ComponentSetVariantsSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

/** Edit variant definitions and child component variant values on a COMPONENT_SET. */
export function ComponentSetVariantsSection({ node, target, dispatch }: ComponentSetVariantsSectionProps) {
  if (node.type !== "COMPONENT_SET") {
    return null;
  }

  const variantDefs = (node.componentPropertyDefs ?? []).filter((def) => def.type === "VARIANT");
  const componentChildren = (node.children ?? []).filter((child) => child.type === "COMPONENT");

  if (variantDefs.length === 0 && componentChildren.length === 0) {
    return <div>No variants defined</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {variantDefs.map((def, index) => (
        <FieldRow key={def.id}>
          <FieldGroup label={`Property ${index + 1}`} inline labelWidth={80}>
            <Input
              type="text"
              ariaLabel={`Variant property name ${index + 1}`}
              value={def.name}
              onChange={(value) => {
                dispatch(createPropertyPrimaryUpdateAction({
                  target,
                  updater: (current) => updateVariantDefName(current, def.id, String(value)),
                }));
              }}
            />
          </FieldGroup>
        </FieldRow>
      ))}
      {componentChildren.flatMap((child) => variantDefs.map((def, index) => {
        const spec = findVariantSpec(child.variantPropSpecs ?? [], def.id);
        return (
          <FieldRow key={`${child.id}:${def.id}`}>
            <FieldGroup label={`${child.name} ${def.name}`} inline labelWidth={140}>
              <Input
                type="text"
                ariaLabel={`Variant ${child.name} value ${index + 1}`}
                value={spec?.value ?? ""}
                onChange={(value) => {
                  dispatch(createPropertyPrimaryUpdateAction({
                    target,
                    updater: (current) => updateChildVariantValue({
                      node: current,
                      childId: child.id,
                      propDefId: def.id,
                      value: String(value),
                    }),
                  }));
                }}
              />
            </FieldGroup>
          </FieldRow>
        );
      }))}
    </div>
  );
}

function updateVariantDefName(node: FigDesignNode, defId: FigNodeId, name: string): FigDesignNode {
  return {
    ...node,
    componentPropertyDefs: (node.componentPropertyDefs ?? []).map((def) => (
      def.id === defId ? { ...def, name } satisfies ComponentPropertyDef : def
    )),
  };
}

function updateChildVariantValue({
  node,
  childId,
  propDefId,
  value,
}: {
  readonly node: FigDesignNode;
  readonly childId: FigNodeId;
  readonly propDefId: FigNodeId;
  readonly value: string;
}): FigDesignNode {
  return {
    ...node,
    children: (node.children ?? []).map((child) => {
      if (child.id !== childId) {
        return child;
      }
      return {
        ...child,
        variantPropSpecs: updateVariantSpecs(child.variantPropSpecs ?? [], propDefId, value),
      };
    }),
  };
}

function updateVariantSpecs(
  specs: readonly VariantPropSpec[],
  propDefId: FigNodeId,
  value: string,
): readonly VariantPropSpec[] {
  const exists = specs.some((spec) => spec.propDefId === propDefId);
  if (!exists) {
    return [...specs, { propDefId, value }];
  }
  return specs.map((spec) => (
    spec.propDefId === propDefId ? { ...spec, value } : spec
  ));
}

function findVariantSpec(specs: readonly VariantPropSpec[], propDefId: FigNodeId): VariantPropSpec | undefined {
  return specs.find((spec) => spec.propDefId === propDefId);
}
