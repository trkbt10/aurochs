/**
 * @file GeometryEditor - Editor for Geometry union type
 *
 * Supports PresetGeometry and displays CustomGeometry (read-only).
 * Pure content - no container styling. Consumer wraps in Section/Accordion.
 */

import { useCallback } from "react";
import { Input, Select, Toggle } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import type {
  Geometry,
  PresetGeometry,
  CustomGeometry,
  TextRect,
} from "../../../pptx/domain/shape";
import type { AdjustValue } from "../../../pptx/domain/types";
import type { EditorProps, SelectOption } from "../../types";

export type GeometryEditorProps = EditorProps<Geometry>;

type GeometryType = Geometry["type"];

const geometryTypeOptions: SelectOption<GeometryType>[] = [
  { value: "preset", label: "Preset Shape" },
  { value: "custom", label: "Custom Shape" },
];

/**
 * Common preset shape types organized by category
 */
const PRESET_SHAPE_CATEGORIES = {
  "Basic Shapes": [
    { value: "rect", label: "Rectangle" },
    { value: "roundRect", label: "Rounded Rectangle" },
    { value: "snip1Rect", label: "Snip 1 Rectangle" },
    { value: "snip2DiagRect", label: "Snip 2 Diagonal Rectangle" },
    { value: "ellipse", label: "Ellipse" },
    { value: "triangle", label: "Triangle" },
    { value: "rtTriangle", label: "Right Triangle" },
    { value: "parallelogram", label: "Parallelogram" },
    { value: "trapezoid", label: "Trapezoid" },
    { value: "diamond", label: "Diamond" },
    { value: "pentagon", label: "Pentagon" },
    { value: "hexagon", label: "Hexagon" },
    { value: "octagon", label: "Octagon" },
    { value: "plus", label: "Plus" },
    { value: "cross", label: "Cross" },
    { value: "star4", label: "4-Point Star" },
    { value: "star5", label: "5-Point Star" },
    { value: "star6", label: "6-Point Star" },
  ],
  "Arrows": [
    { value: "rightArrow", label: "Right Arrow" },
    { value: "leftArrow", label: "Left Arrow" },
    { value: "upArrow", label: "Up Arrow" },
    { value: "downArrow", label: "Down Arrow" },
    { value: "leftRightArrow", label: "Left-Right Arrow" },
    { value: "upDownArrow", label: "Up-Down Arrow" },
    { value: "bentArrow", label: "Bent Arrow" },
    { value: "uturnArrow", label: "U-Turn Arrow" },
    { value: "chevron", label: "Chevron" },
    { value: "homePlate", label: "Home Plate" },
  ],
  "Callouts": [
    { value: "wedgeRectCallout", label: "Rectangle Callout" },
    { value: "wedgeRoundRectCallout", label: "Rounded Rectangle Callout" },
    { value: "wedgeEllipseCallout", label: "Ellipse Callout" },
    { value: "cloudCallout", label: "Cloud Callout" },
  ],
  "Block Arrows": [
    { value: "notchedRightArrow", label: "Notched Right Arrow" },
    { value: "stripedRightArrow", label: "Striped Right Arrow" },
    { value: "circularArrow", label: "Circular Arrow" },
    { value: "curvedRightArrow", label: "Curved Right Arrow" },
    { value: "curvedLeftArrow", label: "Curved Left Arrow" },
  ],
  "Flowchart": [
    { value: "flowChartProcess", label: "Process" },
    { value: "flowChartDecision", label: "Decision" },
    { value: "flowChartInputOutput", label: "Input/Output" },
    { value: "flowChartTerminator", label: "Terminator" },
    { value: "flowChartDocument", label: "Document" },
    { value: "flowChartConnector", label: "Connector" },
  ],
  "Equation Shapes": [
    { value: "mathPlus", label: "Plus" },
    { value: "mathMinus", label: "Minus" },
    { value: "mathMultiply", label: "Multiply" },
    { value: "mathDivide", label: "Divide" },
    { value: "mathEqual", label: "Equal" },
  ],
  "Lines": [
    { value: "line", label: "Line" },
    { value: "lineInv", label: "Line Inverse" },
    { value: "straightConnector1", label: "Straight Connector" },
    { value: "bentConnector2", label: "Bent Connector" },
    { value: "bentConnector3", label: "Bent Connector 3" },
    { value: "curvedConnector2", label: "Curved Connector" },
    { value: "curvedConnector3", label: "Curved Connector 3" },
  ],
} as const;

/**
 * Flatten preset options for select
 */
const presetShapeOptions: SelectOption<string>[] = Object.entries(PRESET_SHAPE_CATEGORIES).flatMap(
  ([category, shapes]) => [
    { value: `__category_${category}`, label: `── ${category} ──`, disabled: true },
    ...shapes,
  ]
);

const fieldStyle = { flex: 1 };

const infoStyle = {
  color: "var(--text-tertiary)",
  fontSize: "12px",
};

function createDefaultPresetGeometry(): PresetGeometry {
  return {
    type: "preset",
    preset: "rect",
    adjustValues: [],
  };
}

function createDefaultCustomGeometry(): CustomGeometry {
  return {
    type: "custom",
    paths: [],
    adjustValues: [],
    adjustHandles: [],
    guides: [],
    connectionSites: [],
  };
}

function createGeometryForType(type: GeometryType): Geometry {
  switch (type) {
    case "preset":
      return createDefaultPresetGeometry();
    case "custom":
      return createDefaultCustomGeometry();
  }
}

/**
 * Sub-editor for adjust values. Pure content.
 */
function AdjustValuesEditor({
  values,
  onChange,
  disabled,
}: {
  values: readonly AdjustValue[];
  onChange: (values: AdjustValue[]) => void;
  disabled?: boolean;
}) {
  if (values.length === 0) {
    return null;
  }

  const handleChange = (index: number, newValue: number) => {
    const updated = values.map((v, i) =>
      i === index ? { ...v, value: newValue } : v
    );
    onChange(updated as AdjustValue[]);
  };

  return (
    <>
      {values.map((adj, index) => (
        <FieldGroup key={adj.name} label={adj.name}>
          <Input
            type="number"
            value={adj.value}
            onChange={(v) => handleChange(index, typeof v === "number" ? v : parseFloat(String(v)) || 0)}
            disabled={disabled}
          />
        </FieldGroup>
      ))}
    </>
  );
}

/**
 * Sub-editor for TextRect. Pure content.
 * @see ECMA-376 Part 1, Section 20.1.9.22 (rect)
 */
function TextRectEditor({
  value,
  onChange,
  disabled,
}: {
  value: TextRect;
  onChange: (v: TextRect) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <FieldRow>
        <FieldGroup label="Left" style={fieldStyle}>
          <Input
            value={value.left}
            onChange={(v) => onChange({ ...value, left: String(v) })}
            disabled={disabled}
            placeholder="e.g., l, 0"
          />
        </FieldGroup>
        <FieldGroup label="Top" style={fieldStyle}>
          <Input
            value={value.top}
            onChange={(v) => onChange({ ...value, top: String(v) })}
            disabled={disabled}
            placeholder="e.g., t, 0"
          />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="Right" style={fieldStyle}>
          <Input
            value={value.right}
            onChange={(v) => onChange({ ...value, right: String(v) })}
            disabled={disabled}
            placeholder="e.g., r, w"
          />
        </FieldGroup>
        <FieldGroup label="Bottom" style={fieldStyle}>
          <Input
            value={value.bottom}
            onChange={(v) => onChange({ ...value, bottom: String(v) })}
            disabled={disabled}
            placeholder="e.g., b, h"
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

function createDefaultTextRect(): TextRect {
  return {
    left: "l",
    top: "t",
    right: "r",
    bottom: "b",
  };
}

/**
 * Geometry editor. Pure content - no containers.
 */
export function GeometryEditor({
  value,
  onChange,
  disabled,
}: GeometryEditorProps) {
  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createGeometryForType(newType as GeometryType));
    },
    [onChange]
  );

  const renderPresetEditor = () => {
    const preset = value as PresetGeometry;
    return (
      <>
        <FieldGroup label="Shape">
          <Select
            value={preset.preset}
            onChange={(newPreset) =>
              onChange({ ...preset, preset: newPreset })
            }
            options={presetShapeOptions}
            disabled={disabled}
          />
        </FieldGroup>
        {preset.adjustValues.length > 0 && (
          <FieldGroup label="Adjust Values">
            <AdjustValuesEditor
              values={preset.adjustValues}
              onChange={(adjustValues) =>
                onChange({ ...preset, adjustValues })
              }
              disabled={disabled}
            />
          </FieldGroup>
        )}
      </>
    );
  };

  const renderCustomEditor = () => {
    const custom = value as CustomGeometry;

    const handleTextRectToggle = (enabled: boolean) => {
      if (enabled) {
        onChange({ ...custom, textRect: createDefaultTextRect() });
      } else {
        const { textRect: _textRect, ...rest } = custom;
        void _textRect;
        onChange(rest as CustomGeometry);
      }
    };

    return (
      <>
        <FieldGroup label="Info">
          <span style={infoStyle}>
            {custom.paths.length} path(s)
            {custom.guides.length > 0 && `, ${custom.guides.length} guide(s)`}
            {custom.connectionSites.length > 0 &&
              `, ${custom.connectionSites.length} site(s)`}
          </span>
        </FieldGroup>

        {custom.adjustValues.length > 0 && (
          <FieldGroup label="Adjust Values">
            <AdjustValuesEditor
              values={custom.adjustValues}
              onChange={(adjustValues) =>
                onChange({ ...custom, adjustValues })
              }
              disabled={disabled}
            />
          </FieldGroup>
        )}

        {/* TextRect */}
        <Toggle
          checked={!!custom.textRect}
          onChange={handleTextRectToggle}
          label="Text Rectangle"
          disabled={disabled}
        />
        {custom.textRect && (
          <TextRectEditor
            value={custom.textRect}
            onChange={(textRect) => onChange({ ...custom, textRect })}
            disabled={disabled}
          />
        )}
      </>
    );
  };

  return (
    <>
      <FieldGroup label="Type">
        <Select
          value={value.type}
          onChange={handleTypeChange}
          options={geometryTypeOptions}
          disabled={disabled}
        />
      </FieldGroup>
      {value.type === "preset" && renderPresetEditor()}
      {value.type === "custom" && renderCustomEditor()}
    </>
  );
}

/**
 * Create a default geometry (preset rectangle)
 */
export function createDefaultGeometry(): Geometry {
  return createDefaultPresetGeometry();
}
