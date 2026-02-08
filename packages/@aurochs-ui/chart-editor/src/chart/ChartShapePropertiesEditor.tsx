/**
 * @file ChartShapePropertiesEditor - Editor for ChartShapeProperties type
 */

import { useCallback, type CSSProperties } from "react";
import type { ChartShapeProperties } from "@aurochs-office/chart/domain";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { BaseFillEditor, createNoFill, BaseLineEditor, createDefaultBaseLine } from "../ooxml";
import { ChartEditorAdaptersBoundary, useChartEditorAdapters, type ChartEditorAdapters } from "../adapters";

export type ChartShapePropertiesEditorProps = EditorProps<ChartShapeProperties | undefined> & {
  readonly style?: CSSProperties;
  readonly adapters?: ChartEditorAdapters;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

/**
 * Editor component for ChartShapeProperties.
 */
export function ChartShapePropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  adapters,
}: ChartShapePropertiesEditorProps) {
  const inheritedAdapters = useChartEditorAdapters();
  const resolvedAdapters = adapters ?? inheritedAdapters;
  const override = resolvedAdapters?.shapeProperties;
  if (override) {
    return (
      <ChartEditorAdaptersBoundary adapters={resolvedAdapters}>
        {override.renderEditor({ value, onChange, disabled, className, style })}
      </ChartEditorAdaptersBoundary>
    );
  }

  const props = value ?? {};

  const updateField = useCallback(
    <K extends keyof ChartShapeProperties>(field: K, newValue: ChartShapeProperties[K]) => {
      onChange({ ...props, [field]: newValue });
    },
    [props, onChange],
  );

  return (
    <ChartEditorAdaptersBoundary adapters={resolvedAdapters}>
      <div style={{ ...containerStyle, ...style }} className={className}>
        <FieldGroup label="Fill">
          <BaseFillEditor
            value={props.fill ?? createNoFill()}
            onChange={(fill) => updateField("fill", fill)}
            disabled={disabled}
          />
        </FieldGroup>

        <FieldGroup label="Line">
          <BaseLineEditor
            value={props.line ?? createDefaultBaseLine()}
            onChange={(line) => updateField("line", line)}
            disabled={disabled}
          />
        </FieldGroup>
      </div>
    </ChartEditorAdaptersBoundary>
  );
}

/**
 * Create a default ChartShapeProperties object.
 */
export function createDefaultChartShapeProperties(): ChartShapeProperties {
  return {};
}
