/**
 * @file SlideLayoutEditor — p:sldLayout metadata (shared by PPTX slides and POTX layouts)
 *
 * PPTX: show the layout dropdown (`LayoutSelector`) by default.
 * POTX: use `showInlineLayoutPicker` for the same thumbnail grid in-panel, or hide both pickers when the left rail is the only switcher.
 */

import { useCallback } from "react";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import type { Background } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
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
  SLIDE_LAYOUT_TYPE_LABELS,
  slideLayoutOptionalBooleanToSelectValue,
  slideLayoutSelectValueToOptionalBoolean,
  slideLayoutTrimmedOptionalString,
  slideLayoutTypeSelectOptions,
  type SlideLayoutOptionalBooleanSelectValue,
} from "./slide-layout-metadata";
import { LayoutSelector } from "./LayoutSelector";
import { LayoutThumbnailPickerGrid } from "./LayoutThumbnailPickerGrid";
import { useLayoutThumbnails } from "./use-layout-thumbnails";

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

const DEFAULT_SLIDE_SIZE: SlideSize = { width: px(9144000 / 914.4), height: px(6858000 / 914.4) };

function layoutTypeBaseHint(showLayoutPartPickers: boolean): string {
  if (showLayoutPartPickers) {
    return "ST_SlideLayoutType (schema). The layout part is the slide layout file — pick it above.";
  }
  return "ST_SlideLayoutType (schema).";
}

function layoutTypeFieldHint(type: SlideLayoutType | undefined, baseHint: string): string {
  if (type === undefined) {
    return baseHint;
  }
  return `${baseHint} (${SLIDE_LAYOUT_TYPE_LABELS[type]}).`;
}

export type SlideLayoutEditorProps = EditorProps<SlideLayoutAttributes> & {
  /** When true (default), show `LayoutSelector` for switching layout part (PPTX slide). */
  readonly showLayoutPicker?: boolean;
  /**
   * When true, show an always-visible thumbnail grid for choosing the layout part (POTX layout tab).
   * Uses the same previews as the dropdown; theme overrides apply when the optional preview props are set.
   */
  readonly showInlineLayoutPicker?: boolean;
  /** When false, hide “Show Master Placeholder Animations” (POTX export path may not round-trip yet). */
  readonly includeShowMasterPhAnimField?: boolean;
  readonly layoutPath?: string;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly onLayoutChange: (layoutPath: string) => void;
  readonly slideSize?: SlideSize;
  readonly presentationFile?: PackageFile;
  /** Optional theme overrides for layout thumbnails (POTX master / theme state). */
  readonly layoutPreviewColorContext?: ColorContext;
  readonly layoutPreviewFontScheme?: FontScheme;
  readonly layoutPreviewMasterBackground?: Background;
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
  showInlineLayoutPicker = false,
  includeShowMasterPhAnimField = true,
  layoutPath,
  layoutOptions,
  onLayoutChange,
  slideSize,
  presentationFile,
  layoutPreviewColorContext,
  layoutPreviewFontScheme,
  layoutPreviewMasterBackground,
}: SlideLayoutEditorProps) {
  const attrs = value ?? {};
  const slideSizeResolved = slideSize ?? DEFAULT_SLIDE_SIZE;
  const layoutThumbnails = useLayoutThumbnails({
    presentationFile,
    layoutOptions,
    slideSize: slideSizeResolved,
    colorContext: layoutPreviewColorContext,
    fontScheme: layoutPreviewFontScheme,
    masterBackground: layoutPreviewMasterBackground,
  });
  const hasSourceLayouts = layoutOptions.length > 0;
  const layoutTypeHint = layoutTypeBaseHint(showLayoutPicker || showInlineLayoutPicker);

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
            layouts={layoutThumbnails}
            hasSourceOptions={hasSourceLayouts}
            onChange={handleLayoutSelect}
            slideSize={slideSizeResolved}
            disabled={disabled || !hasSourceLayouts}
          />
        </FieldGroup>
      )}
      {showInlineLayoutPicker && (
        <FieldGroup label="Layout parts">
          <LayoutThumbnailPickerGrid
            layouts={layoutThumbnails}
            selectedPath={layoutPath}
            slideSize={slideSizeResolved}
            variant="inspector"
            onSelect={handleLayoutSelect}
            disabled={disabled || !hasSourceLayouts}
            hasSourceOptions={hasSourceLayouts}
          />
        </FieldGroup>
      )}

      <FieldGroup label="Layout Type" hint={layoutTypeFieldHint(attrs.type, layoutTypeHint)}>
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
