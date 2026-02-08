/**
 * @file SlideLayoutEditor - Editor for slide layout attributes
 */

import { useCallback } from "react";
import type { SlideSize, PresentationFile } from "@aurochs-office/pptx/domain";
import type { SlideLayoutType } from "@aurochs-office/pptx/domain/slide/types";
import type { SlideLayoutAttributes } from "@aurochs-office/pptx/parser/slide/layout-parser";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { Select } from "@aurochs-ui/ui-components/primitives/Select";
import { LayoutSelector } from "../../ui/primitives";

export type SlideLayoutEditorProps = EditorProps<SlideLayoutAttributes> & {
  readonly layoutPath?: string;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly onLayoutChange: (layoutPath: string) => void;
  readonly slideSize?: SlideSize;
  readonly presentationFile?: PresentationFile;
};

type OptionalBooleanValue = "" | "true" | "false";

const layoutTypeOptions: SelectOption<string>[] = [
  { value: "", label: "Default" },
  { value: "title", label: "Title" },
  { value: "tx", label: "Text" },
  { value: "twoColTx", label: "Two Column Text" },
  { value: "tbl", label: "Table" },
  { value: "txAndChart", label: "Text + Chart" },
  { value: "chartAndTx", label: "Chart + Text" },
  { value: "dgm", label: "Diagram" },
  { value: "chart", label: "Chart" },
  { value: "txAndClipArt", label: "Text + Clip Art" },
  { value: "clipArtAndTx", label: "Clip Art + Text" },
  { value: "titleOnly", label: "Title Only" },
  { value: "blank", label: "Blank" },
  { value: "txAndObj", label: "Text + Object" },
  { value: "objAndTx", label: "Object + Text" },
  { value: "objOnly", label: "Object Only" },
  { value: "obj", label: "Object" },
  { value: "txAndMedia", label: "Text + Media" },
  { value: "mediaAndTx", label: "Media + Text" },
  { value: "objOverTx", label: "Object over Text" },
  { value: "txOverObj", label: "Text over Object" },
  { value: "txAndTwoObj", label: "Text + Two Objects" },
  { value: "twoObjAndTx", label: "Two Objects + Text" },
  { value: "twoObjOverTx", label: "Two Objects over Text" },
  { value: "fourObj", label: "Four Objects" },
  { value: "vertTx", label: "Vertical Text" },
  { value: "clipArtAndVertTx", label: "Clip Art + Vertical Text" },
  { value: "vertTitleAndTx", label: "Vertical Title + Text" },
  { value: "vertTitleAndTxOverChart", label: "Vertical Title + Text over Chart" },
  { value: "twoObj", label: "Two Objects" },
  { value: "objAndTwoObj", label: "Object + Two Objects" },
  { value: "twoObjAndObj", label: "Two Objects + Object" },
  { value: "cust", label: "Custom" },
  { value: "secHead", label: "Section Header" },
  { value: "twoTxTwoObj", label: "Two Text Two Objects" },
  { value: "objTx", label: "Object + Text" },
  { value: "picTx", label: "Picture + Text" },
];

const optionalBooleanOptions: SelectOption<OptionalBooleanValue>[] = [
  { value: "", label: "Default" },
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

function toOptionalBoolean(value: boolean | undefined): OptionalBooleanValue {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  return "";
}

function fromOptionalBoolean(value: OptionalBooleanValue): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function updateOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Editor for slide layout attributes.
 */
export function SlideLayoutEditor({
  value,
  onChange,
  disabled,
  className,
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

      <FieldGroup label="Layout Type">
        <Select
          value={(attrs.type ?? "") as string}
          onChange={(next) => handleFieldChange("type", (next || undefined) as SlideLayoutType | undefined)}
          options={layoutTypeOptions}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldGroup label="Name">
        <Input
          value={attrs.name ?? ""}
          onChange={(next) => handleFieldChange("name", updateOptionalString(String(next)))}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldGroup label="Matching Name">
        <Input
          value={attrs.matchingName ?? ""}
          onChange={(next) => handleFieldChange("matchingName", updateOptionalString(String(next)))}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Show Master Shapes" style={{ flex: 1 }}>
          <Select
            value={toOptionalBoolean(attrs.showMasterShapes)}
            onChange={(next) => handleFieldChange("showMasterShapes", fromOptionalBoolean(next))}
            options={optionalBooleanOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Show Master Placeholder Animations" style={{ flex: 1 }}>
          <Select
            value={toOptionalBoolean(attrs.showMasterPhAnim)}
            onChange={(next) => handleFieldChange("showMasterPhAnim", fromOptionalBoolean(next))}
            options={optionalBooleanOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Preserve" style={{ flex: 1 }}>
          <Select
            value={toOptionalBoolean(attrs.preserve)}
            onChange={(next) => handleFieldChange("preserve", fromOptionalBoolean(next))}
            options={optionalBooleanOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="User Drawn" style={{ flex: 1 }}>
          <Select
            value={toOptionalBoolean(attrs.userDrawn)}
            onChange={(next) => handleFieldChange("userDrawn", fromOptionalBoolean(next))}
            options={optionalBooleanOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </div>
  );
}
