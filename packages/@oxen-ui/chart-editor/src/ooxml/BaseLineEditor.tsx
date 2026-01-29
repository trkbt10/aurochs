/**
 * @file BaseLineEditor
 */

import { useCallback, type CSSProperties } from "react";
import type { BaseLine } from "@oxen-office/ooxml/domain/line";
import { px } from "@oxen-office/ooxml/domain/units";
import type { EditorProps } from "@oxen-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { Input, Select } from "@oxen-ui/ui-components/primitives";
import { BaseFillEditor, createNoFill } from "./BaseFillEditor";

export type BaseLineEditorProps = EditorProps<BaseLine> & {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const capOptions: Array<{ value: BaseLine["cap"]; label: string }> = [
  { value: "flat", label: "Flat" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
];






export function BaseLineEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: BaseLineEditorProps) {
  const handleWidthChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      const safe = Number.isFinite(num) ? Math.max(0, num) : 0;
      onChange({ ...value, width: px(safe) });
    },
    [onChange, value],
  );

  const handleCapChange = useCallback(
    (v: string) => {
      if (v === "round" || v === "square" || v === "flat") {
        onChange({ ...value, cap: v });
      }
    },
    [onChange, value],
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldRow>
        <FieldGroup label="Width (px)" style={{ flex: 1 }}>
          <Input
            type="number"
            value={value.width}
            onChange={handleWidthChange}
            disabled={disabled}
            min={0}
          />
        </FieldGroup>
        <FieldGroup label="Cap" style={{ flex: 1 }}>
          <Select
            value={value.cap}
            onChange={handleCapChange}
            options={capOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Fill">
        <BaseFillEditor
          value={value.fill ?? createNoFill()}
          onChange={(fill) => onChange({ ...value, fill })}
          disabled={disabled}
        />
      </FieldGroup>
    </div>
  );
}






export function createDefaultBaseLine(): BaseLine {
  return {
    width: px(1),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: createNoFill(),
    dash: "solid",
    join: "miter",
  };
}
