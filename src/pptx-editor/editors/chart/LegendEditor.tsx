/**
 * @file LegendEditor - Editor for Legend type
 *
 * Edits legend position, overlay, layout, shape properties, text properties,
 * and per-entry formatting.
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 */

import { useCallback, type CSSProperties } from "react";
import { Button, Input, Select, Toggle } from "../../ui/primitives";
import { Accordion, FieldGroup, FieldRow } from "../../ui/layout";
import { TextBodyEditor, createDefaultTextBody } from "../text";
import { ChartShapePropertiesEditor } from "./ChartShapePropertiesEditor";
import { LayoutEditor } from "./LayoutEditor";
import type {
  Legend,
  LegendEntry,
  Layout,
  ChartShapeProperties,
} from "../../../pptx/domain/chart";
import type { TextBody } from "../../../pptx/domain/text";
import type { EditorProps, SelectOption } from "../../types";

export type LegendEditorProps = EditorProps<Legend> & {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const positionOptions: SelectOption<Legend["position"]>[] = [
  { value: "b", label: "Bottom" },
  { value: "t", label: "Top" },
  { value: "l", label: "Left" },
  { value: "r", label: "Right" },
  { value: "tr", label: "Top Right" },
];

/**
 * Editor for chart legend settings.
 */
export function LegendEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: LegendEditorProps) {
  const updateField = useCallback(
    <K extends keyof Legend>(field: K, newValue: Legend[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange]
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

  const handleTextPropertiesChange = useCallback(
    (textProperties: TextBody) => {
      updateField("textProperties", textProperties);
    },
    [updateField]
  );

  const handleEntryChange = useCallback(
    (index: number, entry: LegendEntry) => {
      const entries = [...(value.entries ?? [])];
      entries[index] = entry;
      updateField("entries", entries);
    },
    [value.entries, updateField]
  );

  const handleAddEntry = useCallback(() => {
    const entries = [...(value.entries ?? [])];
    const newEntry: LegendEntry = {
      idx: entries.length,
    };
    entries.push(newEntry);
    updateField("entries", entries);
  }, [value.entries, updateField]);

  const handleRemoveEntry = useCallback(
    (index: number) => {
      const entries = (value.entries ?? []).filter((_, i) => i !== index);
      updateField("entries", entries);
    },
    [value.entries, updateField]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Basic settings */}
      <>
        <FieldRow>
          <FieldGroup label="Position" style={{ flex: 1 }}>
            <Select
              value={value.position}
              onChange={(v) => updateField("position", v as Legend["position"])}
              options={positionOptions}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Overlay" style={{ flex: 1 }}>
            <Toggle
              checked={value.overlay ?? false}
              onChange={(v) => updateField("overlay", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </>

      {/* Layout */}
      <Accordion title="Layout" defaultExpanded={false}>
        <LayoutEditor
          value={value.layout}
          onChange={handleLayoutChange}
          disabled={disabled}
        />
      </Accordion>

      {/* Shape Properties */}
      <Accordion title="Shape Properties" defaultExpanded={false}>
        <ChartShapePropertiesEditor
          value={value.shapeProperties}
          onChange={handleShapePropertiesChange}
          disabled={disabled}
        />
      </Accordion>

      {/* Text Properties */}
      <Accordion title="Text Properties" defaultExpanded={false}>
        <TextBodyEditor
          value={value.textProperties ?? createDefaultTextBody()}
          onChange={handleTextPropertiesChange}
          disabled={disabled}
        />
      </Accordion>

      {/* Legend Entries */}
      <>
        <div style={headerRowStyle}>
          <span>Legend Entries ({value.entries?.length ?? 0})</span>
          <Button variant="ghost" onClick={handleAddEntry} disabled={disabled}>
            Add
          </Button>
        </div>
        {(value.entries ?? []).map((entry, index) => (
          <Accordion
            key={entry.idx}
            title={`Entry ${entry.idx}`}
            defaultExpanded={false}
          >
            <LegendEntryEditor
              value={entry}
              onChange={(e) => handleEntryChange(index, e)}
              onRemove={() => handleRemoveEntry(index)}
              disabled={disabled}
            />
          </Accordion>
        ))}
      </>
    </div>
  );
}

/**
 * Legend Entry Editor
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 */
type LegendEntryEditorProps = EditorProps<LegendEntry> & {
  readonly onRemove: () => void;
};

function LegendEntryEditor({
  value,
  onChange,
  onRemove,
  disabled,
}: LegendEntryEditorProps) {
  const updateField = useCallback(
    <K extends keyof LegendEntry>(field: K, newValue: LegendEntry[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange]
  );

  const handleTextPropertiesChange = useCallback(
    (textProperties: TextBody) => {
      updateField("textProperties", textProperties);
    },
    [updateField]
  );

  return (
    <div style={containerStyle}>
      <>
        <FieldRow>
          <FieldGroup label="Index" style={{ flex: 1 }}>
            <Input
              type="number"
              value={value.idx}
              onChange={(v) => updateField("idx", Number(v))}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Delete" style={{ flex: 1 }}>
            <Toggle
              checked={value.delete ?? false}
              onChange={(v) => updateField("delete", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </>

      <Accordion title="Text Properties" defaultExpanded={false}>
        <TextBodyEditor
          value={value.textProperties ?? createDefaultTextBody()}
          onChange={handleTextPropertiesChange}
          disabled={disabled}
        />
      </Accordion>

      <>
        <Button
          variant="ghost"
          onClick={onRemove}
          disabled={disabled}
          style={{ color: "var(--text-danger, #ef4444)" }}
        >
          Remove Entry
        </Button>
      </>
    </div>
  );
}

/**
 * Create default legend
 */
export function createDefaultLegend(): Legend {
  return {
    position: "r",
    overlay: false,
  };
}
