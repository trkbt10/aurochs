/** @file AutoLayout property section. */

import { useCallback } from "react";
import type { AutoLayoutProps, FigDesignNode } from "@aurochs/fig/domain";
import type { KiwiEnumValue } from "@aurochs/fig/types";
import { STACK_ALIGN_VALUES, STACK_MODE_VALUES, type StackAlign, type StackMode } from "@aurochs/fig/constants";
import { toEnumValue } from "@aurochs/fig/constants";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { Toggle } from "@aurochs-ui/ui-components/primitives/Toggle";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import type { FigEditorAction } from "../../../context/fig-editor/types";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../../properties/property-mutation-target";

type AutoLayoutSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

type EditableAutoLayout = Required<Pick<AutoLayoutProps, "stackMode" | "stackPadding">> & Omit<AutoLayoutProps, "stackMode" | "stackPadding">;

const modeOptions: readonly SelectOption<StackMode>[] = [
  { value: "NONE", label: "None" },
  { value: "HORIZONTAL", label: "Horizontal" },
  { value: "VERTICAL", label: "Vertical" },
  { value: "WRAP", label: "Wrap" },
];

const alignOptions: readonly SelectOption<StackAlign>[] = [
  { value: "MIN", label: "Min" },
  { value: "CENTER", label: "Center" },
  { value: "MAX", label: "Max" },
  { value: "STRETCH", label: "Stretch" },
  { value: "BASELINE", label: "Baseline" },
  { value: "SPACE_BETWEEN", label: "Space between" },
];

function enumName<T extends string>(val: KiwiEnumValue | undefined, fallback: T): T {
  return (val?.name ?? fallback) as T;
}

/** Panel section for viewing and editing auto layout properties of a Figma node. */
export function AutoLayoutSection({ node, target, dispatch }: AutoLayoutSectionProps) {
  const layout: EditableAutoLayout = {
    stackMode: node.autoLayout?.stackMode ?? toEnumValue("NONE", STACK_MODE_VALUES)!,
    stackSpacing: node.autoLayout?.stackSpacing ?? 0,
    stackPadding: node.autoLayout?.stackPadding ?? { top: 0, right: 0, bottom: 0, left: 0 },
    stackPrimaryAlignItems: node.autoLayout?.stackPrimaryAlignItems ?? toEnumValue("MIN", STACK_ALIGN_VALUES),
    stackCounterAlignItems: node.autoLayout?.stackCounterAlignItems ?? toEnumValue("MIN", STACK_ALIGN_VALUES),
    stackPrimaryAlignContent: node.autoLayout?.stackPrimaryAlignContent,
    stackWrap: node.autoLayout?.stackWrap ?? false,
    stackCounterSpacing: node.autoLayout?.stackCounterSpacing,
    itemReverseZIndex: node.autoLayout?.itemReverseZIndex,
  };

  const updateAutoLayout = useCallback(
    (updater: (layout: EditableAutoLayout) => AutoLayoutProps | undefined) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (current) => ({ ...current, autoLayout: updater({
          stackMode: current.autoLayout?.stackMode ?? toEnumValue("NONE", STACK_MODE_VALUES)!,
          stackSpacing: current.autoLayout?.stackSpacing ?? 0,
          stackPadding: current.autoLayout?.stackPadding ?? { top: 0, right: 0, bottom: 0, left: 0 },
          stackPrimaryAlignItems: current.autoLayout?.stackPrimaryAlignItems ?? toEnumValue("MIN", STACK_ALIGN_VALUES),
          stackCounterAlignItems: current.autoLayout?.stackCounterAlignItems ?? toEnumValue("MIN", STACK_ALIGN_VALUES),
          stackPrimaryAlignContent: current.autoLayout?.stackPrimaryAlignContent,
          stackWrap: current.autoLayout?.stackWrap ?? false,
          stackCounterSpacing: current.autoLayout?.stackCounterSpacing,
          itemReverseZIndex: current.autoLayout?.itemReverseZIndex,
        }) }),
      }));
    },
    [dispatch, target],
  );

  const updateMode = useCallback((mode: StackMode) => {
    updateAutoLayout((current) => {
      if (mode === "NONE") {
        return undefined;
      }
      return { ...current, stackMode: toEnumValue(mode, STACK_MODE_VALUES)! };
    });
  }, [updateAutoLayout]);

  const updateGap = useCallback((value: number) => {
    updateAutoLayout((current) => ({ ...current, stackSpacing: value }));
  }, [updateAutoLayout]);

  const updatePadding = useCallback((side: keyof EditableAutoLayout["stackPadding"], value: number) => {
    updateAutoLayout((current) => ({ ...current, stackPadding: { ...current.stackPadding, [side]: value } }));
  }, [updateAutoLayout]);

  const updatePrimaryAlign = useCallback((align: StackAlign) => {
    updateAutoLayout((current) => ({ ...current, stackPrimaryAlignItems: toEnumValue(align, STACK_ALIGN_VALUES) }));
  }, [updateAutoLayout]);

  const updateCounterAlign = useCallback((align: StackAlign) => {
    updateAutoLayout((current) => ({ ...current, stackCounterAlignItems: toEnumValue(align, STACK_ALIGN_VALUES) }));
  }, [updateAutoLayout]);

  const updatePrimaryAlignContent = useCallback((align: StackAlign) => {
    updateAutoLayout((current) => ({ ...current, stackPrimaryAlignContent: toEnumValue(align, STACK_ALIGN_VALUES) }));
  }, [updateAutoLayout]);

  const updateWrap = useCallback((checked: boolean) => {
    updateAutoLayout((current) => ({ ...current, stackWrap: checked }));
  }, [updateAutoLayout]);

  const updateCounterSpacing = useCallback((value: number) => {
    updateAutoLayout((current) => ({ ...current, stackCounterSpacing: value }));
  }, [updateAutoLayout]);

  const updateReverseZIndex = useCallback((checked: boolean) => {
    updateAutoLayout((current) => ({ ...current, itemReverseZIndex: checked }));
  }, [updateAutoLayout]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldGroup label="Mode">
        <Select value={enumName(layout.stackMode, "NONE")} onChange={updateMode} options={modeOptions} ariaLabel="Auto layout mode" />
      </FieldGroup>
      {enumName(layout.stackMode, "NONE") !== "NONE" && (
        <>
          <FieldRow>
            <FieldGroup label="Gap" inline labelWidth={40}>
              <Input type="number" ariaLabel="Auto layout gap" value={layout.stackSpacing ?? 0} onChange={(v) => updateGap(v as number)} />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Top" inline labelWidth={28}>
              <Input type="number" ariaLabel="Auto layout padding top" value={layout.stackPadding.top} onChange={(v) => updatePadding("top", v as number)} />
            </FieldGroup>
            <FieldGroup label="Right" inline labelWidth={36}>
              <Input type="number" ariaLabel="Auto layout padding right" value={layout.stackPadding.right} onChange={(v) => updatePadding("right", v as number)} />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Bottom" inline labelWidth={44}>
              <Input type="number" ariaLabel="Auto layout padding bottom" value={layout.stackPadding.bottom} onChange={(v) => updatePadding("bottom", v as number)} />
            </FieldGroup>
            <FieldGroup label="Left" inline labelWidth={28}>
              <Input type="number" ariaLabel="Auto layout padding left" value={layout.stackPadding.left} onChange={(v) => updatePadding("left", v as number)} />
            </FieldGroup>
          </FieldRow>
          <FieldGroup label="Primary align">
            <Select value={enumName(layout.stackPrimaryAlignItems, "MIN")} onChange={updatePrimaryAlign} options={alignOptions} ariaLabel="Auto layout primary align" />
          </FieldGroup>
          <FieldGroup label="Counter align">
            <Select value={enumName(layout.stackCounterAlignItems, "MIN")} onChange={updateCounterAlign} options={alignOptions} ariaLabel="Auto layout counter align" />
          </FieldGroup>
          <FieldGroup label="Align content">
            <Select value={enumName(layout.stackPrimaryAlignContent, "MIN")} onChange={updatePrimaryAlignContent} options={alignOptions} ariaLabel="Auto layout align content" />
          </FieldGroup>
          <FieldRow>
            <FieldGroup label="Counter gap" inline labelWidth={78}>
              <Input type="number" ariaLabel="Auto layout counter gap" value={layout.stackCounterSpacing ?? 0} onChange={(v) => updateCounterSpacing(v as number)} />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <Toggle checked={Boolean(layout.stackWrap)} onChange={updateWrap} label="Wrap" />
            <Toggle checked={Boolean(layout.itemReverseZIndex)} onChange={updateReverseZIndex} label="Reverse Z" />
          </FieldRow>
        </>
      )}
    </div>
  );
}
