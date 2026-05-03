/** @file Child layout constraints property section. */

import { useCallback } from "react";
import type { FigDesignNode, LayoutConstraints } from "@aurochs/fig/domain";
import type { KiwiEnumValue } from "@aurochs/fig/types";
import {
  CONSTRAINT_TYPE_VALUES,
  STACK_ALIGN_VALUES,
  STACK_POSITIONING_VALUES,
  STACK_SIZING_VALUES,
  type ConstraintType,
  type StackAlign,
  type StackPositioning,
  type StackSizing,
} from "@aurochs/fig/constants";
import { toEnumValue } from "@aurochs/fig/constants";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

type LayoutConstraintsSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

type EditableLayoutConstraints = Required<
  Pick<
    LayoutConstraints,
    | "stackPositioning"
    | "stackPrimarySizing"
    | "stackCounterSizing"
    | "horizontalConstraint"
    | "verticalConstraint"
    | "stackChildPrimaryGrow"
  >
> & Pick<LayoutConstraints, "stackChildAlignSelf">;

const positioningOptions: readonly SelectOption<StackPositioning>[] = [
  { value: "AUTO", label: "Auto" },
  { value: "ABSOLUTE", label: "Absolute" },
];

const sizingOptions: readonly SelectOption<StackSizing>[] = [
  { value: "FIXED", label: "Fixed" },
  { value: "FILL", label: "Fill" },
  { value: "HUG", label: "Hug" },
];

const constraintOptions: readonly SelectOption<ConstraintType>[] = [
  { value: "MIN", label: "Min" },
  { value: "CENTER", label: "Center" },
  { value: "MAX", label: "Max" },
  { value: "STRETCH", label: "Stretch" },
  { value: "SCALE", label: "Scale" },
];

const alignSelfOptions: readonly SelectOption<StackAlign>[] = [
  { value: "MIN", label: "Auto" },
  { value: "CENTER", label: "Center" },
  { value: "MAX", label: "Max" },
  { value: "STRETCH", label: "Stretch" },
  { value: "BASELINE", label: "Baseline" },
];

function enumName<T extends string>(val: KiwiEnumValue | undefined, fallback: T): T {
  return (val?.name ?? fallback) as T;
}

function withDefaults(constraints: LayoutConstraints | undefined): EditableLayoutConstraints {
  return {
    stackPositioning: constraints?.stackPositioning ?? toEnumValue("AUTO", STACK_POSITIONING_VALUES)!,
    stackPrimarySizing: constraints?.stackPrimarySizing ?? toEnumValue("FIXED", STACK_SIZING_VALUES)!,
    stackCounterSizing: constraints?.stackCounterSizing ?? toEnumValue("FIXED", STACK_SIZING_VALUES)!,
    horizontalConstraint: constraints?.horizontalConstraint ?? toEnumValue("MIN", CONSTRAINT_TYPE_VALUES)!,
    verticalConstraint: constraints?.verticalConstraint ?? toEnumValue("MIN", CONSTRAINT_TYPE_VALUES)!,
    stackChildAlignSelf: constraints?.stackChildAlignSelf,
    stackChildPrimaryGrow: constraints?.stackChildPrimaryGrow ?? 0,
  };
}

/** Edit child sizing/position constraints consumed by AutoLayout and fixed frames. */
export function LayoutConstraintsSection({ node, target, dispatch }: LayoutConstraintsSectionProps) {
  const constraints = withDefaults(node.layoutConstraints);

  const updateConstraints = useCallback(
    (updater: (current: EditableLayoutConstraints) => LayoutConstraints) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (current) => ({
          ...current,
          layoutConstraints: updater(withDefaults(current.layoutConstraints)),
        }),
      }));
    },
    [dispatch, target],
  );

  const updatePositioning = useCallback((value: StackPositioning) => {
    updateConstraints((current) => ({
      ...current,
      stackPositioning: toEnumValue(value, STACK_POSITIONING_VALUES)!,
    }));
  }, [updateConstraints]);

  const updatePrimarySizing = useCallback((value: StackSizing) => {
    updateConstraints((current) => ({
      ...current,
      stackPrimarySizing: toEnumValue(value, STACK_SIZING_VALUES)!,
    }));
  }, [updateConstraints]);

  const updateCounterSizing = useCallback((value: StackSizing) => {
    updateConstraints((current) => ({
      ...current,
      stackCounterSizing: toEnumValue(value, STACK_SIZING_VALUES)!,
    }));
  }, [updateConstraints]);

  const updateHorizontalConstraint = useCallback((value: ConstraintType) => {
    updateConstraints((current) => ({
      ...current,
      horizontalConstraint: toEnumValue(value, CONSTRAINT_TYPE_VALUES)!,
    }));
  }, [updateConstraints]);

  const updateVerticalConstraint = useCallback((value: ConstraintType) => {
    updateConstraints((current) => ({
      ...current,
      verticalConstraint: toEnumValue(value, CONSTRAINT_TYPE_VALUES)!,
    }));
  }, [updateConstraints]);

  const updateAlignSelf = useCallback((value: StackAlign) => {
    updateConstraints((current) => ({
      ...current,
      stackChildAlignSelf: value === "MIN" ? undefined : toEnumValue(value, STACK_ALIGN_VALUES),
    }));
  }, [updateConstraints]);

  const updateGrow = useCallback((value: number) => {
    updateConstraints((current) => ({
      ...current,
      stackChildPrimaryGrow: value,
    }));
  }, [updateConstraints]);

  const positioning: StackPositioning = enumName(constraints.stackPositioning, "AUTO" as StackPositioning);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldGroup label="Position">
        <Select value={positioning} onChange={updatePositioning} options={positioningOptions} ariaLabel="Layout position" />
      </FieldGroup>
      <FieldRow>
        <FieldGroup label="Primary fit" inline labelWidth={70}>
          <Select value={enumName(constraints.stackPrimarySizing, "FIXED")} onChange={updatePrimarySizing} options={sizingOptions} ariaLabel="Layout primary fit" />
        </FieldGroup>
        <FieldGroup label="Counter fit" inline labelWidth={70}>
          <Select value={enumName(constraints.stackCounterSizing, "FIXED")} onChange={updateCounterSizing} options={sizingOptions} ariaLabel="Layout counter fit" />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="Align self" inline labelWidth={70}>
          <Select value={enumName(constraints.stackChildAlignSelf, "MIN" as StackAlign)} onChange={updateAlignSelf} options={alignSelfOptions} ariaLabel="Layout align self" />
        </FieldGroup>
        <FieldGroup label="Grow" inline labelWidth={44}>
          <Input type="number" ariaLabel="Layout grow" value={constraints.stackChildPrimaryGrow} onChange={(v) => updateGrow(v as number)} />
        </FieldGroup>
      </FieldRow>
      {positioning === "ABSOLUTE" && (
        <FieldRow>
          <FieldGroup label="Horizontal" inline labelWidth={70}>
            <Select value={enumName(constraints.horizontalConstraint, "MIN")} onChange={updateHorizontalConstraint} options={constraintOptions} ariaLabel="Layout horizontal constraint" />
          </FieldGroup>
          <FieldGroup label="Vertical" inline labelWidth={70}>
            <Select value={enumName(constraints.verticalConstraint, "MIN")} onChange={updateVerticalConstraint} options={constraintOptions} ariaLabel="Layout vertical constraint" />
          </FieldGroup>
        </FieldRow>
      )}
    </div>
  );
}
