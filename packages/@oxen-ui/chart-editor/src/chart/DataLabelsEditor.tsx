/**
 * @file DataLabelsEditor - Editor for DataLabels type
 *
 * Edits data label display settings including visibility flags, position, separator,
 * shape properties, text properties, and leader lines.
 * @see ECMA-376 Part 1, Section 21.2.2.49 (dLbls)
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select, Toggle } from "@oxen-ui/ui-components/primitives";
import { Accordion, FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { TextBodyEditor, createDefaultTextBody } from "../text";
import { ChartShapePropertiesEditor } from "./ChartShapePropertiesEditor";
import { LayoutEditor } from "./LayoutEditor";
import type {
  DataLabels,
  DataLabel,
  ChartShapeProperties,
  Layout,
} from "@oxen-office/chart/domain";
import type { TextBody } from "@oxen-office/chart/domain/text";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";

export type DataLabelsEditorProps = EditorProps<DataLabels> & {
  readonly style?: CSSProperties;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const positionOptions: SelectOption<NonNullable<DataLabels["position"]>>[] = [
  { value: "ctr", label: "Center" },
  { value: "t", label: "Top" },
  { value: "b", label: "Bottom" },
  { value: "l", label: "Left" },
  { value: "r", label: "Right" },
  { value: "inEnd", label: "Inside End" },
  { value: "inBase", label: "Inside Base" },
  { value: "outEnd", label: "Outside End" },
  { value: "bestFit", label: "Best Fit" },
];

/**
 * Editor for chart data labels.
 */
export function DataLabelsEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: DataLabelsEditorProps) {
  const updateField = useCallback(
    <K extends keyof DataLabels>(field: K, newValue: DataLabels[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange]
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

  const handleLeaderLinesChange = useCallback(
    (leaderLines: ChartShapeProperties | undefined) => {
      const lines = leaderLines ? { shapeProperties: leaderLines } : undefined;
      updateField("leaderLines", lines);
    },
    [updateField]
  );

  const handleLabelChange = useCallback(
    (index: number, label: DataLabel) => {
      const labels = [...(value.labels ?? [])];
      labels[index] = label;
      updateField("labels", labels);
    },
    [value.labels, updateField]
  );

  const handleAddLabel = useCallback(() => {
    const labels = [...(value.labels ?? [])];
    const newLabel: DataLabel = {
      idx: labels.length,
    };
    labels.push(newLabel);
    updateField("labels", labels);
  }, [value.labels, updateField]);

  const handleRemoveLabel = useCallback(
    (index: number) => {
      const labels = (value.labels ?? []).filter((_, i) => i !== index);
      updateField("labels", labels);
    },
    [value.labels, updateField]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Display options */}
      <>
        <FieldRow>
          <FieldGroup label="Show Value" style={{ flex: 1 }}>
            <Toggle
              checked={value.showVal ?? false}
              onChange={(v) => updateField("showVal", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Category" style={{ flex: 1 }}>
            <Toggle
              checked={value.showCatName ?? false}
              onChange={(v) => updateField("showCatName", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Show Series Name" style={{ flex: 1 }}>
            <Toggle
              checked={value.showSerName ?? false}
              onChange={(v) => updateField("showSerName", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Percent" style={{ flex: 1 }}>
            <Toggle
              checked={value.showPercent ?? false}
              onChange={(v) => updateField("showPercent", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Show Bubble Size" style={{ flex: 1 }}>
            <Toggle
              checked={value.showBubbleSize ?? false}
              onChange={(v) => updateField("showBubbleSize", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Legend Key" style={{ flex: 1 }}>
            <Toggle
              checked={value.showLegendKey ?? false}
              onChange={(v) => updateField("showLegendKey", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Show Leader Lines" style={{ flex: 1 }}>
            <Toggle
              checked={value.showLeaderLines ?? false}
              onChange={(v) => updateField("showLeaderLines", v)}
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

      {/* Position and formatting */}
      <>
        <FieldRow>
          <FieldGroup label="Position" style={{ flex: 1 }}>
            <Select
              value={value.position ?? "ctr"}
              onChange={(v) =>
                updateField("position", v as DataLabels["position"])
              }
              options={positionOptions}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Separator" style={{ flex: 1 }}>
            <Input
              type="text"
              value={value.separator ?? ", "}
              onChange={(v) => updateField("separator", String(v))}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Number Format" style={{ flex: 1 }}>
            <Input
              type="text"
              value={value.numFormat ?? ""}
              onChange={(v) => updateField("numFormat", String(v) || undefined)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </>

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

      {/* Leader Lines */}
      {value.showLeaderLines && (
        <Accordion title="Leader Lines" defaultExpanded={false}>
          <ChartShapePropertiesEditor
            value={value.leaderLines?.shapeProperties}
            onChange={handleLeaderLinesChange}
            disabled={disabled}
          />
        </Accordion>
      )}

      {/* Individual Data Labels */}
      <Accordion
        title={`Data Labels (${value.labels?.length ?? 0})`}
        defaultExpanded={false}
      >
        <>
          <button
            type="button"
            onClick={handleAddLabel}
            disabled={disabled}
            style={{
              padding: "6px 12px",
              marginBottom: "8px",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            Add Label
          </button>
        </>
        {(value.labels ?? []).map((label, index) => (
          <Accordion
            key={label.idx}
            title={`Label ${label.idx}`}
            defaultExpanded={false}
          >
            <DataLabelEditor
              value={label}
              onChange={(l) => handleLabelChange(index, l)}
              onRemove={() => handleRemoveLabel(index)}
              disabled={disabled}
            />
          </Accordion>
        ))}
      </Accordion>
    </div>
  );
}

/**
 * Single Data Label Editor
 * @see ECMA-376 Part 1, Section 21.2.2.47 (dLbl)
 */
type DataLabelEditorProps = EditorProps<DataLabel> & {
  readonly onRemove: () => void;
};

function DataLabelEditor({
  value,
  onChange,
  onRemove,
  disabled,
}: DataLabelEditorProps) {
  const updateField = useCallback(
    <K extends keyof DataLabel>(field: K, newValue: DataLabel[K]) => {
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

  const handleTextChange = useCallback(
    (text: TextBody) => {
      updateField("text", text);
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

        <FieldRow>
          <FieldGroup label="Position" style={{ flex: 1 }}>
            <Select
              value={value.position ?? "ctr"}
              onChange={(v) =>
                updateField("position", v as DataLabel["position"])
              }
              options={positionOptions}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Show Value" style={{ flex: 1 }}>
            <Toggle
              checked={value.showVal ?? false}
              onChange={(v) => updateField("showVal", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Category" style={{ flex: 1 }}>
            <Toggle
              checked={value.showCatName ?? false}
              onChange={(v) => updateField("showCatName", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Show Series Name" style={{ flex: 1 }}>
            <Toggle
              checked={value.showSerName ?? false}
              onChange={(v) => updateField("showSerName", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Percent" style={{ flex: 1 }}>
            <Toggle
              checked={value.showPercent ?? false}
              onChange={(v) => updateField("showPercent", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Show Bubble Size" style={{ flex: 1 }}>
            <Toggle
              checked={value.showBubbleSize ?? false}
              onChange={(v) => updateField("showBubbleSize", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Legend Key" style={{ flex: 1 }}>
            <Toggle
              checked={value.showLegendKey ?? false}
              onChange={(v) => updateField("showLegendKey", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Separator" style={{ flex: 1 }}>
            <Input
              type="text"
              value={value.separator ?? ", "}
              onChange={(v) => updateField("separator", String(v))}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Number Format" style={{ flex: 1 }}>
            <Input
              type="text"
              value={value.numFormat ?? ""}
              onChange={(v) =>
                updateField("numFormat", String(v) || undefined)
              }
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

      {/* Custom Text */}
      <Accordion title="Custom Text" defaultExpanded={false}>
        <TextBodyEditor
          value={value.text ?? createDefaultTextBody()}
          onChange={handleTextChange}
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

      <>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          style={{
            padding: "6px 12px",
            cursor: disabled ? "not-allowed" : "pointer",
            color: "red",
          }}
        >
          Remove Label
        </button>
      </>
    </div>
  );
}

/**
 * Create default data labels
 */
export function createDefaultDataLabels(): DataLabels {
  return {
    showVal: true,
    showCatName: false,
    showSerName: false,
    showPercent: false,
    showBubbleSize: false,
    showLegendKey: false,
    showLeaderLines: false,
    position: "ctr",
    separator: ", ",
  };
}
