/** @file Node export settings editor. */

import { useCallback, type CSSProperties } from "react";
import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigExportSetting, KiwiEnumValue } from "@aurochs/fig/types";
import type { FigEditorAction } from "../../context/fig-editor/types";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { colorTokens, fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import { AddIcon, CloseIcon } from "@aurochs-ui/ui-components/icons";
import { createPropertyTargetUpdateAction, type PropertyMutationTarget } from "../property-mutation-target";

type ExportFormat = "PNG" | "JPG" | "SVG" | "PDF";

type ExportSettingsSectionProps = {
  readonly node: FigDesignNode;
  readonly target: PropertyMutationTarget;
  readonly dispatch: (action: FigEditorAction) => void;
};

const exportFormatOptions: readonly SelectOption<ExportFormat>[] = [
  { value: "PNG", label: "PNG" },
  { value: "JPG", label: "JPG" },
  { value: "SVG", label: "SVG" },
  { value: "PDF", label: "PDF" },
];

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 0",
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

const removeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 2,
  color: colorTokens.text.tertiary,
  lineHeight: 0,
  flexShrink: 0,
};

/** Edit Figma export presets on the selected node. */
export function ExportSettingsSection({ node, target, dispatch }: ExportSettingsSectionProps) {
  const settings = node.exportSettings ?? [];

  const updateSettings = useCallback(
    (updater: (settings: readonly FigExportSetting[]) => readonly FigExportSetting[]) => {
      dispatch(createPropertyTargetUpdateAction({
        target,
        updater: (n) => ({ ...n, exportSettings: updater(n.exportSettings ?? []) }),
      }));
    },
    [dispatch, target],
  );

  const updateSetting = useCallback(
    (index: number, updater: (setting: FigExportSetting) => FigExportSetting) => {
      updateSettings((current) => current.map((setting, i) => i === index ? updater(setting) : setting));
    },
    [updateSettings],
  );

  const addSetting = useCallback(() => {
    updateSettings((current) => [...current, createDefaultExportSetting()]);
  }, [updateSettings]);

  const removeSetting = useCallback((index: number) => {
    updateSettings((current) => current.filter((_, i) => i !== index));
  }, [updateSettings]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {settings.map((setting, index) => (
        <div key={index} style={rowStyle}>
          <Select
            value={resolveExportFormat(setting)}
            onChange={(format) => updateSetting(index, (current) => ({ ...current, imageType: makeExportImageType(format) }))}
            options={exportFormatOptions}
            ariaLabel={`Export format ${index + 1}`}
          />
          <Input
            type="text"
            ariaLabel={`Export suffix ${index + 1}`}
            value={setting.suffix ?? ""}
            placeholder="@2x"
            onChange={(value) => updateSetting(index, (current) => ({ ...current, suffix: String(value) }))}
            width={70}
          />
          <Input
            type="number"
            ariaLabel={`Export scale ${index + 1}`}
            value={resolveExportScale(setting)}
            min={0.01}
            step={0.25}
            onChange={(value) => updateSetting(index, (current) => ({ ...current, constraint: makeScaleConstraint(value as number) }))}
            width={64}
            suffix="x"
          />
          <button type="button" style={removeButtonStyle} onClick={() => removeSetting(index)} title="Remove export setting">
            <CloseIcon size={12} />
          </button>
        </div>
      ))}
      <button type="button" style={addButtonStyle} onClick={addSetting}>
        <AddIcon size={12} />
        Add export preset
      </button>
    </div>
  );
}

function createDefaultExportSetting(): FigExportSetting {
  return {
    suffix: "",
    imageType: makeExportImageType("PNG"),
    constraint: makeScaleConstraint(1),
  };
}

function resolveExportFormat(setting: FigExportSetting): ExportFormat {
  const name = setting.imageType?.name;
  if (name === "JPG" || name === "SVG" || name === "PDF") {
    return name;
  }
  return "PNG";
}

function resolveExportScale(setting: FigExportSetting): number {
  const value = setting.constraint?.value;
  return typeof value === "number" && value > 0 ? value : 1;
}

function makeExportImageType(format: ExportFormat): KiwiEnumValue {
  return { name: format, value: exportFormatOptions.findIndex((option) => option.value === format) };
}

function makeScaleConstraint(value: number): FigExportSetting["constraint"] {
  return { type: { name: "SCALE", value: 0 }, value };
}
