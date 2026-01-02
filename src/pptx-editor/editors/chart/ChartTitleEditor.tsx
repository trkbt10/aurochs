/**
 * @file ChartTitleEditor - Editor for ChartTitle type
 *
 * Edits chart title including text, layout, overlay, and shape properties.
 * @see ECMA-376 Part 1, Section 21.2.2.211 (title)
 */

import { useCallback, type CSSProperties } from "react";
import { Toggle } from "../../ui/primitives";
import { Accordion, FieldGroup, FieldRow } from "../../ui/layout";
import { TextBodyEditor, createDefaultTextBody } from "../text";
import { ChartShapePropertiesEditor } from "./ChartShapePropertiesEditor";
import { LayoutEditor } from "./LayoutEditor";
import type { ChartTitle, Layout, ChartShapeProperties } from "../../../pptx/domain/chart";
import type { TextBody } from "../../../pptx/domain/text";
import type { EditorProps } from "../../types";

export type ChartTitleEditorProps = EditorProps<ChartTitle | undefined> & {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

export function ChartTitleEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: ChartTitleEditorProps) {
  const title = value ?? {};

  const updateField = useCallback(
    <K extends keyof ChartTitle>(field: K, newValue: ChartTitle[K]) => {
      onChange({ ...title, [field]: newValue });
    },
    [title, onChange]
  );

  const handleTextBodyChange = useCallback(
    (textBody: TextBody) => {
      updateField("textBody", textBody);
    },
    [updateField]
  );

  const handleLayoutChange = useCallback(
    (layout: Layout | undefined) => {
      updateField("layout", layout);
    },
    [updateField]
  );

  const handleShapePropertiesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      updateField("shapeProperties", shapeProperties);
    },
    [updateField]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      <FieldRow>
        <FieldGroup label="Overlay" style={{ flex: 1 }}>
          <Toggle
            checked={title.overlay ?? false}
            onChange={(v) => updateField("overlay", v)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <Accordion title="Text" defaultExpanded={false}>
        <TextBodyEditor
          value={title.textBody ?? createDefaultTextBody()}
          onChange={handleTextBodyChange}
          disabled={disabled}
        />
      </Accordion>

      <Accordion title="Layout" defaultExpanded={false}>
        <LayoutEditor
          value={title.layout}
          onChange={handleLayoutChange}
          disabled={disabled}
        />
      </Accordion>

      <Accordion title="Shape Properties" defaultExpanded={false}>
        <ChartShapePropertiesEditor
          value={title.shapeProperties}
          onChange={handleShapePropertiesChange}
          disabled={disabled}
        />
      </Accordion>
    </div>
  );
}

/**
 * Create default chart title
 */
export function createDefaultChartTitle(): ChartTitle {
  return {
    textBody: createDefaultTextBody(),
    overlay: false,
  };
}
