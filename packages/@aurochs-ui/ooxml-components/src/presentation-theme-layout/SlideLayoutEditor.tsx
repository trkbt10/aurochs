/**
 * @file SlideLayoutEditor — p:sldLayout メタデータ編集（PPTX スライド / POTX レイアウト共通）
 *
 * PPTX 向けはドロップダウン付きレイアウトピッカー（`LayoutSelector`）を表示。
 * POTX では左パネルでレイアウトを選ぶため `showLayoutPicker={false}` で属性フォームのみにする。
 */

import { useCallback } from "react";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import type { PackageFile } from "@aurochs-office/opc";
import type { SlideLayoutType } from "@aurochs-office/pptx/domain/slide/types";
import type { SlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import {
  SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS,
  slideLayoutOptionalBooleanToSelectValue,
  slideLayoutSelectValueToOptionalBoolean,
  slideLayoutTrimmedOptionalString,
  slideLayoutTypeSelectOptions,
  type SlideLayoutOptionalBooleanSelectValue,
} from "./slide-layout-metadata";
import { LayoutSelector } from "./LayoutSelector";

type MasterSpFieldsProps = {
  readonly attrs: SlideLayoutAttributes;
  readonly disabled: boolean | undefined;
  readonly includePhAnim: boolean;
  readonly onFieldChange: <K extends keyof SlideLayoutAttributes>(
    field: K,
    nextValue: SlideLayoutAttributes[K],
  ) => void;
};

function LayoutMasterSpFields({ attrs, disabled, includePhAnim, onFieldChange }: MasterSpFieldsProps) {
  const showMasterShapesSelect = (
    <Select
      value={slideLayoutOptionalBooleanToSelectValue(attrs.showMasterShapes)}
      onChange={(next) =>
        onFieldChange(
          "showMasterShapes",
          slideLayoutSelectValueToOptionalBoolean(next as SlideLayoutOptionalBooleanSelectValue),
        )
      }
      options={SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS}
      disabled={disabled}
    />
  );

  if (!includePhAnim) {
    return <FieldGroup label="Show Master Shapes">{showMasterShapesSelect}</FieldGroup>;
  }

  return (
    <FieldRow>
      <FieldGroup label="Show Master Shapes" style={{ flex: 1 }}>
        {showMasterShapesSelect}
      </FieldGroup>
      <FieldGroup label="Show Master Placeholder Animations" style={{ flex: 1 }}>
        <Select
          value={slideLayoutOptionalBooleanToSelectValue(attrs.showMasterPhAnim)}
          onChange={(next) =>
            onFieldChange(
              "showMasterPhAnim",
              slideLayoutSelectValueToOptionalBoolean(next as SlideLayoutOptionalBooleanSelectValue),
            )
          }
          options={SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>
    </FieldRow>
  );
}

export type SlideLayoutEditorProps = EditorProps<SlideLayoutAttributes> & {
  /** When true (default), show `LayoutSelector` for switching layout part (PPTX slide). */
  readonly showLayoutPicker?: boolean;
  /** When false, hide “Show Master Placeholder Animations” (POTX export path may not round-trip yet). */
  readonly includeShowMasterPhAnimField?: boolean;
  readonly layoutPath?: string;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly onLayoutChange: (layoutPath: string) => void;
  readonly slideSize?: SlideSize;
  readonly presentationFile?: PackageFile;
};

/**
 * Editor for slide layout attributes (shared by PPTX and POTX editors).
 */
export function SlideLayoutEditor({
  value,
  onChange,
  disabled,
  className,
  showLayoutPicker = true,
  includeShowMasterPhAnimField = true,
  layoutPath,
  layoutOptions,
  onLayoutChange,
  slideSize,
  presentationFile,
}: SlideLayoutEditorProps) {
  const attrs = value ?? {};

  const handleFieldChange = useCallback(
    <K extends keyof SlideLayoutAttributes>(field: K, nextValue: SlideLayoutAttributes[K]) => {
      onChange({ ...attrs, [field]: nextValue });
    },
    [attrs, onChange],
  );

  const handleLayoutSelect = useCallback(
    (nextLayoutPath: string) => {
      if (!nextLayoutPath) {
        return;
      }
      onLayoutChange(nextLayoutPath);
    },
    [onLayoutChange],
  );

  return (
    <div className={className}>
      {showLayoutPicker && (
        <FieldGroup label="Layout">
          <LayoutSelector
            value={layoutPath}
            options={layoutOptions}
            onChange={handleLayoutSelect}
            slideSize={slideSize}
            presentationFile={presentationFile}
            disabled={disabled || layoutOptions.length === 0}
          />
        </FieldGroup>
      )}

      <FieldGroup label="Layout Type">
        <Select
          value={(attrs.type ?? "") as string}
          onChange={(next) => handleFieldChange("type", (next || undefined) as SlideLayoutType | undefined)}
          options={slideLayoutTypeSelectOptions(true)}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldGroup label="Name">
        <Input
          value={attrs.name ?? ""}
          onChange={(next) => handleFieldChange("name", slideLayoutTrimmedOptionalString(String(next)))}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldGroup label="Matching Name">
        <Input
          value={attrs.matchingName ?? ""}
          onChange={(next) => handleFieldChange("matchingName", slideLayoutTrimmedOptionalString(String(next)))}
          disabled={disabled}
        />
      </FieldGroup>

      <LayoutMasterSpFields
        attrs={attrs}
        disabled={disabled}
        includePhAnim={includeShowMasterPhAnimField}
        onFieldChange={handleFieldChange}
      />

      <FieldRow>
        <FieldGroup label="Preserve" style={{ flex: 1 }}>
          <Select
            value={slideLayoutOptionalBooleanToSelectValue(attrs.preserve)}
            onChange={(next) =>
              handleFieldChange(
                "preserve",
                slideLayoutSelectValueToOptionalBoolean(next as SlideLayoutOptionalBooleanSelectValue),
              )
            }
            options={SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="User Drawn" style={{ flex: 1 }}>
          <Select
            value={slideLayoutOptionalBooleanToSelectValue(attrs.userDrawn)}
            onChange={(next) =>
              handleFieldChange(
                "userDrawn",
                slideLayoutSelectValueToOptionalBoolean(next as SlideLayoutOptionalBooleanSelectValue),
              )
            }
            options={SLIDE_LAYOUT_OPTIONAL_BOOLEAN_SELECT_OPTIONS}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </div>
  );
}
