/**
 * @file ChartShapePropertiesEditor - Editor for ChartShapeProperties type
 *
 * Edits fill, line, and effects for chart elements.
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 */

import { useCallback, type CSSProperties } from "react";
import { FieldGroup } from "../../ui/layout";
import { FillEditor, createNoFill } from "../color/FillEditor";
import { LineEditor, createDefaultLine } from "../../ui/line";
import type { ChartShapeProperties } from "../../../pptx/domain/chart";
import type { Fill, Line } from "../../../pptx/domain/color/types";
import type { EditorProps } from "../../types";

export type ChartShapePropertiesEditorProps = EditorProps<
  ChartShapeProperties | undefined
> & {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

/**
 * Editor for chart shape properties.
 */
export function ChartShapePropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: ChartShapePropertiesEditorProps) {
  const props = value ?? {};

  const updateField = useCallback(
    <K extends keyof ChartShapeProperties>(
      field: K,
      newValue: ChartShapeProperties[K]
    ) => {
      onChange({ ...props, [field]: newValue });
    },
    [props, onChange]
  );

  const handleFillChange = useCallback(
    (fill: Fill | undefined) => {
      updateField("fill", fill);
    },
    [updateField]
  );

  const handleLineChange = useCallback(
    (line: Line) => {
      updateField("line", line);
    },
    [updateField]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldGroup label="Fill">
        <FillEditor
          value={props.fill ?? createNoFill()}
          onChange={handleFillChange}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldGroup label="Line">
        <LineEditor
          value={props.line ?? createDefaultLine()}
          onChange={handleLineChange}
          disabled={disabled}
        />
      </FieldGroup>
    </div>
  );
}

/**
 * Create default chart shape properties
 */
export function createDefaultChartShapeProperties(): ChartShapeProperties {
  return {};
}
