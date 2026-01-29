/**
 * @file BaseFillEditor
 */

import { useCallback, type CSSProperties } from "react";
import type { BaseFill } from "@oxen-office/ooxml/domain/fill";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { Input, Select } from "@oxen-ui/ui-components/primitives";
import { createSrgbColor, normalizeHex6 } from "./hex-color";

export type BaseFillEditorProps = EditorProps<BaseFill> & {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const fillTypeOptions: SelectOption<BaseFill["type"]>[] = [
  { value: "noFill", label: "No Fill" },
  { value: "solidFill", label: "Solid" },
];






export function BaseFillEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: BaseFillEditorProps) {
  const handleTypeChange = useCallback(
    (v: string) => {
      if (v === "solidFill") {
        onChange({ type: "solidFill", color: createSrgbColor("000000") });
        return;
      }
      onChange({ type: "noFill" });
    },
    [onChange],
  );

  const handleHexChange = useCallback(
    (v: string | number) => {
      const hex = normalizeHex6(String(v));
      if (value.type !== "solidFill") {
        return;
      }
      onChange({
        ...value,
        color: createSrgbColor(hex),
      });
    },
    [value, onChange],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldRow>
        <FieldGroup label="Type" style={{ flex: 1 }}>
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      {value.type === "solidFill" && value.color.spec.type === "srgb" && (
        <FieldRow>
          <FieldGroup label="Color (hex)" style={{ flex: 1 }}>
            <Input
              value={value.color.spec.value}
              onChange={handleHexChange}
              disabled={disabled}
              placeholder="RRGGBB"
            />
          </FieldGroup>
        </FieldRow>
      )}
    </div>
  );
}






export function createNoFill(): BaseFill {
  return { type: "noFill" };
}

