/**
 * @file BaseLineEditor
 */

import { useCallback, type CSSProperties } from "react";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Input, Select } from "@aurochs-ui/ui-components/primitives";
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

/**
 * Editor component for BaseLine properties.
 */
export function BaseLineEditor({ value, onChange, disabled, className, style }: BaseLineEditorProps) {
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
          <Input type="number" value={value.width} onChange={handleWidthChange} disabled={disabled} min={0} />
        </FieldGroup>
        <FieldGroup label="Cap" style={{ flex: 1 }}>
          <Select value={value.cap} onChange={handleCapChange} options={capOptions} disabled={disabled} />
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

/**
 * Create a default BaseLine with standard values.
 */
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
