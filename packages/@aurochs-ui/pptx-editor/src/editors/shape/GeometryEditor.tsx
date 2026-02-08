/**
 * @file GeometryEditor - Editor for Geometry union type
 *
 * Supports PresetGeometry and displays CustomGeometry (read-only).
 * Pure content - no container styling. Consumer wraps in Section/Accordion.
 */

import { useCallback, useMemo } from "react";
import { Input, Select, Toggle, SearchableSelect } from "@aurochs-ui/ui-components/primitives";
import type {
  SearchableSelectOption,
  SearchableSelectItemProps,
} from "@aurochs-ui/ui-components/primitives/SearchableSelect";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { ShapePreview } from "../../ui/shape-preview";
import type { Geometry, PresetGeometry, CustomGeometry, TextRect } from "@aurochs-office/pptx/domain/shape";
import type { AdjustValue } from "@aurochs-office/pptx/domain/types";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";

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
  Arrows: [
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
  Callouts: [
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
  Flowchart: [
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
  Lines: [
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
 * Build searchable select options from categories
 */
function buildPresetShapeOptions(): SearchableSelectOption<string>[] {
  return Object.entries(PRESET_SHAPE_CATEGORIES).flatMap(([category, shapes]) =>
    shapes.map((shape) => ({
      value: shape.value,
      label: shape.label,
      group: category,
      keywords: [shape.value],
    })),
  );
}

const presetShapeOptions = buildPresetShapeOptions();

const fieldStyle = { flex: 1 };

const infoStyle = {
  color: "var(--text-tertiary)",
  fontSize: "12px",
};

const shapeItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const shapeLabelStyle = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
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
 * Render a preset shape item with preview
 */
function renderShapeItem({ option }: SearchableSelectItemProps<string>) {
  return (
    <div style={shapeItemStyle}>
      <ShapePreview preset={option.value} size={20} />
      <span style={shapeLabelStyle}>{option.label}</span>
    </div>
  );
}

/**
 * Render the selected shape value with preview
 */
function renderShapeValue(option: SearchableSelectOption<string>) {
  return (
    <div style={shapeItemStyle}>
      <ShapePreview preset={option.value} size={16} />
      <span style={shapeLabelStyle}>{option.label}</span>
    </div>
  );
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
    const updated = values.map((v, i) => (i === index ? { ...v, value: newValue } : v));
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
 * Preset shape editor with searchable dropdown
 */
function PresetShapeEditor({
  value,
  onChange,
  disabled,
}: {
  value: PresetGeometry;
  onChange: (v: Geometry) => void;
  disabled?: boolean;
}) {
  const handlePresetChange = useCallback(
    (newPreset: string) => {
      onChange({ ...value, preset: newPreset });
    },
    [value, onChange],
  );

  return (
    <>
      <FieldGroup label="Shape">
        <SearchableSelect
          value={value.preset}
          onChange={handlePresetChange}
          options={presetShapeOptions}
          renderItem={renderShapeItem}
          renderValue={renderShapeValue}
          searchPlaceholder="Search shapes..."
          disabled={disabled}
          dropdownWidth={260}
          maxHeight={360}
        />
      </FieldGroup>
      {value.adjustValues && value.adjustValues.length > 0 && (
        <FieldGroup label="Adjust Values">
          <AdjustValuesEditor
            values={value.adjustValues}
            onChange={(adjustValues) => onChange({ ...value, adjustValues })}
            disabled={disabled}
          />
        </FieldGroup>
      )}
    </>
  );
}

/**
 * Custom geometry editor (read-only info display)
 */
function CustomGeometryEditor({
  value,
  onChange,
  disabled,
}: {
  value: CustomGeometry;
  onChange: (v: Geometry) => void;
  disabled?: boolean;
}) {
  const infoSummary = useMemo(() => {
    const infoParts = [`${value.paths?.length ?? 0} path(s)`];
    if (value.guides?.length) {
      infoParts.push(`${value.guides.length} guide(s)`);
    }
    if (value.connectionSites?.length) {
      infoParts.push(`${value.connectionSites.length} site(s)`);
    }
    return infoParts.join(", ");
  }, [value]);

  const handleTextRectToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        onChange({ ...value, textRect: createDefaultTextRect() });
      } else {
        const { textRect: _textRect, ...rest } = value;
        void _textRect;
        onChange(rest as CustomGeometry);
      }
    },
    [value, onChange],
  );

  return (
    <>
      <FieldGroup label="Info">
        <span style={infoStyle}>{infoSummary}</span>
      </FieldGroup>

      {value.adjustValues && value.adjustValues.length > 0 && (
        <FieldGroup label="Adjust Values">
          <AdjustValuesEditor
            values={value.adjustValues}
            onChange={(adjustValues) => onChange({ ...value, adjustValues })}
            disabled={disabled}
          />
        </FieldGroup>
      )}

      {/* TextRect */}
      <Toggle checked={!!value.textRect} onChange={handleTextRectToggle} label="Text Rectangle" disabled={disabled} />
      {value.textRect && (
        <TextRectEditor
          value={value.textRect}
          onChange={(textRect) => onChange({ ...value, textRect })}
          disabled={disabled}
        />
      )}
    </>
  );
}

/**
 * Geometry editor. Pure content - no containers.
 */
export function GeometryEditor({ value, onChange, disabled }: GeometryEditorProps) {
  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createGeometryForType(newType as GeometryType));
    },
    [onChange],
  );

  return (
    <>
      <FieldGroup label="Type">
        <Select value={value.type} onChange={handleTypeChange} options={geometryTypeOptions} disabled={disabled} />
      </FieldGroup>
      {value.type === "preset" && <PresetShapeEditor value={value} onChange={onChange} disabled={disabled} />}
      {value.type === "custom" && <CustomGeometryEditor value={value} onChange={onChange} disabled={disabled} />}
    </>
  );
}

/**
 * Create a default geometry (preset rectangle)
 */
export function createDefaultGeometry(): Geometry {
  return createDefaultPresetGeometry();
}
