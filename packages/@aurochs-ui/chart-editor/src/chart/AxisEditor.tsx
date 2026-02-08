/**
 * @file AxisEditor - Editor for Axis type
 *
 * Edits axis properties including position, orientation, tick marks, gridlines,
 * title, shape properties, and type-specific settings.
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 * @see ECMA-376 Part 1, Section 21.2.2.43 (dateAx)
 * @see ECMA-376 Part 1, Section 21.2.2.175 (serAx)
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { Accordion, FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { PercentEditor } from "../primitives";
import { TextBodyEditor, createDefaultTextBody } from "../text";
import { ChartShapePropertiesEditor } from "./ChartShapePropertiesEditor";
import { ChartTitleEditor } from "./ChartTitleEditor";
import { pct } from "@aurochs-office/drawing-ml/domain/units";
import type {
  Axis,
  AxisPosition,
  AxisOrientation,
  TickMark,
  TickLabelPosition,
  Crosses,
  CrossBetween,
  CategoryAxis,
  ValueAxis,
  DateAxis,
  SeriesAxis,
  ChartTitle,
  ChartShapeProperties,
  DisplayUnits,
} from "@aurochs-office/chart/domain";
import type { TextBody } from "@aurochs-office/chart/domain/text";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { ChartEditorAdaptersBoundary, type ChartEditorAdapters } from "../adapters";

export type AxisEditorProps = EditorProps<Axis> & {
  readonly style?: CSSProperties;
  readonly adapters?: ChartEditorAdapters;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const axisTypeOptions: SelectOption<Axis["type"]>[] = [
  { value: "catAx", label: "Category" },
  { value: "valAx", label: "Value" },
  { value: "dateAx", label: "Date" },
  { value: "serAx", label: "Series" },
];

const positionOptions: SelectOption<AxisPosition>[] = [
  { value: "b", label: "Bottom" },
  { value: "t", label: "Top" },
  { value: "l", label: "Left" },
  { value: "r", label: "Right" },
];

const orientationOptions: SelectOption<AxisOrientation>[] = [
  { value: "minMax", label: "Min to Max" },
  { value: "maxMin", label: "Max to Min" },
];

const tickMarkOptions: SelectOption<TickMark>[] = [
  { value: "none", label: "None" },
  { value: "in", label: "Inside" },
  { value: "out", label: "Outside" },
  { value: "cross", label: "Cross" },
];

const tickLabelPositionOptions: SelectOption<TickLabelPosition>[] = [
  { value: "nextTo", label: "Next To Axis" },
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
  { value: "none", label: "None" },
];

const crossesOptions: SelectOption<Crosses>[] = [
  { value: "autoZero", label: "Auto Zero" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const crossBetweenOptions: SelectOption<CrossBetween>[] = [
  { value: "between", label: "Between" },
  { value: "midCat", label: "Mid Category" },
];

const labelAlignmentOptions: SelectOption<NonNullable<CategoryAxis["labelAlignment"]>>[] = [
  { value: "ctr", label: "Center" },
  { value: "l", label: "Left" },
  { value: "r", label: "Right" },
];

const timeUnitOptions: SelectOption<NonNullable<DateAxis["baseTimeUnit"]>>[] = [
  { value: "days", label: "Days" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

const builtInUnitOptions: SelectOption<NonNullable<DisplayUnits["builtInUnit"]>>[] = [
  { value: "hundreds", label: "Hundreds" },
  { value: "thousands", label: "Thousands" },
  { value: "tenThousands", label: "Ten Thousands" },
  { value: "hundredThousands", label: "Hundred Thousands" },
  { value: "millions", label: "Millions" },
  { value: "tenMillions", label: "Ten Millions" },
  { value: "hundredMillions", label: "Hundred Millions" },
  { value: "billions", label: "Billions" },
  { value: "trillions", label: "Trillions" },
];

/**
 * Editor for chart axes.
 */
export function AxisEditor({ value, onChange, disabled, className, style, adapters }: AxisEditorProps) {
  const updateField = useCallback(
    <K extends keyof Axis>(field: K, newValue: Axis[K]) => {
      onChange({ ...value, [field]: newValue } as Axis);
    },
    [value, onChange],
  );

  const updateCatField = useCallback(
    <K extends keyof CategoryAxis>(field: K, newValue: CategoryAxis[K]) => {
      if (value.type === "catAx") {
        onChange({ ...value, [field]: newValue } as Axis);
      }
    },
    [value, onChange],
  );

  const updateValField = useCallback(
    <K extends keyof ValueAxis>(field: K, newValue: ValueAxis[K]) => {
      if (value.type === "valAx") {
        onChange({ ...value, [field]: newValue } as Axis);
      }
    },
    [value, onChange],
  );

  const updateDateField = useCallback(
    <K extends keyof DateAxis>(field: K, newValue: DateAxis[K]) => {
      if (value.type === "dateAx") {
        onChange({ ...value, [field]: newValue } as Axis);
      }
    },
    [value, onChange],
  );

  const updateSerField = useCallback(
    <K extends keyof SeriesAxis>(field: K, newValue: SeriesAxis[K]) => {
      if (value.type === "serAx") {
        onChange({ ...value, [field]: newValue } as Axis);
      }
    },
    [value, onChange],
  );

  const handleTitleChange = useCallback(
    (title: ChartTitle | undefined) => {
      updateField("title", title);
    },
    [updateField],
  );

  const handleShapePropertiesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      updateField("shapeProperties", shapeProperties);
    },
    [updateField],
  );

  const handleTextPropertiesChange = useCallback(
    (textProperties: TextBody) => {
      updateField("textProperties", textProperties);
    },
    [updateField],
  );

  const handleMajorGridlinesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      const lines = shapeProperties ? { shapeProperties } : undefined;
      updateField("majorGridlines", lines);
    },
    [updateField],
  );

  const handleMinorGridlinesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      const lines = shapeProperties ? { shapeProperties } : undefined;
      updateField("minorGridlines", lines);
    },
    [updateField],
  );

  const handleDispUnitsChange = useCallback(
    <K extends keyof DisplayUnits>(field: K, newValue: DisplayUnits[K]) => {
      if (value.type === "valAx") {
        const current = (value as ValueAxis).dispUnits ?? {};
        updateValField("dispUnits", { ...current, [field]: newValue });
      }
    },
    [value, updateValField],
  );

  return (
    <ChartEditorAdaptersBoundary adapters={adapters}>
      <div style={{ ...containerStyle, ...style }} className={className}>
        {/* Axis type and basic settings */}
        <>
          <FieldRow>
            <FieldGroup label="Axis Type" style={{ flex: 1 }}>
              <Select
                value={value.type}
                onChange={(v) => updateField("type", v as Axis["type"])}
                options={axisTypeOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Position" style={{ flex: 1 }}>
              <Select
                value={value.position}
                onChange={(v) => updateField("position", v as AxisPosition)}
                options={positionOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="ID" style={{ flex: 1 }}>
              <Input
                type="number"
                value={value.id}
                onChange={(v) => updateField("id", Number(v))}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Cross Axis ID" style={{ flex: 1 }}>
              <Input
                type="number"
                value={value.crossAxisId}
                onChange={(v) => updateField("crossAxisId", Number(v))}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Orientation" style={{ flex: 1 }}>
              <Select
                value={value.orientation}
                onChange={(v) => updateField("orientation", v as AxisOrientation)}
                options={orientationOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Delete" style={{ flex: 1 }}>
              <Toggle checked={value.delete ?? false} onChange={(v) => updateField("delete", v)} disabled={disabled} />
            </FieldGroup>
          </FieldRow>
        </>

        {/* Tick marks */}
        <>
          <FieldRow>
            <FieldGroup label="Major Tick Mark" style={{ flex: 1 }}>
              <Select
                value={value.majorTickMark}
                onChange={(v) => updateField("majorTickMark", v as TickMark)}
                options={tickMarkOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Minor Tick Mark" style={{ flex: 1 }}>
              <Select
                value={value.minorTickMark}
                onChange={(v) => updateField("minorTickMark", v as TickMark)}
                options={tickMarkOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Tick Label Position" style={{ flex: 1 }}>
              <Select
                value={value.tickLabelPosition}
                onChange={(v) => updateField("tickLabelPosition", v as TickLabelPosition)}
                options={tickLabelPositionOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>

        {/* Cross axis settings */}
        <>
          <FieldRow>
            <FieldGroup label="Crosses" style={{ flex: 1 }}>
              <Select
                value={value.crosses ?? "autoZero"}
                onChange={(v) => updateField("crosses", v as Crosses)}
                options={crossesOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Crosses At" style={{ flex: 1 }}>
              <Input
                type="number"
                value={value.crossesAt ?? ""}
                onChange={(v) => updateField("crossesAt", v ? Number(v) : undefined)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
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

        {/* Title */}
        <Accordion title="Axis Title" defaultExpanded={false}>
          <ChartTitleEditor value={value.title} onChange={handleTitleChange} disabled={disabled} />
        </Accordion>

        {/* Gridlines */}
        <Accordion title="Major Gridlines" defaultExpanded={false}>
          <ChartShapePropertiesEditor
            value={value.majorGridlines?.shapeProperties}
            onChange={handleMajorGridlinesChange}
            disabled={disabled}
          />
        </Accordion>

        <Accordion title="Minor Gridlines" defaultExpanded={false}>
          <ChartShapePropertiesEditor
            value={value.minorGridlines?.shapeProperties}
            onChange={handleMinorGridlinesChange}
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

        {/* Category Axis specific settings */}
        {value.type === "catAx" && (
          <>
            <FieldRow>
              <FieldGroup label="Auto" style={{ flex: 1 }}>
                <Toggle
                  checked={(value as CategoryAxis).auto ?? false}
                  onChange={(v) => updateCatField("auto", v)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Label Alignment" style={{ flex: 1 }}>
                <Select
                  value={(value as CategoryAxis).labelAlignment ?? "ctr"}
                  onChange={(v) => updateCatField("labelAlignment", v as CategoryAxis["labelAlignment"])}
                  options={labelAlignmentOptions}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Label Offset" style={{ flex: 1 }}>
                <PercentEditor
                  value={(value as CategoryAxis).labelOffset ?? pct(100)}
                  onChange={(v) => updateCatField("labelOffset", v)}
                  disabled={disabled}
                  min={0}
                  max={1000}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Tick Label Skip" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as CategoryAxis).tickLabelSkip ?? ""}
                  onChange={(v) => updateCatField("tickLabelSkip", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Tick Mark Skip" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as CategoryAxis).tickMarkSkip ?? ""}
                  onChange={(v) => updateCatField("tickMarkSkip", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="No Multi-Level Labels" style={{ flex: 1 }}>
                <Toggle
                  checked={(value as CategoryAxis).noMultiLevelLabels ?? false}
                  onChange={(v) => updateCatField("noMultiLevelLabels", v)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
          </>
        )}

        {/* Value Axis specific settings */}
        {value.type === "valAx" && (
          <>
            <FieldRow>
              <FieldGroup label="Cross Between" style={{ flex: 1 }}>
                <Select
                  value={(value as ValueAxis).crossBetween ?? "between"}
                  onChange={(v) => updateValField("crossBetween", v as CrossBetween)}
                  options={crossBetweenOptions}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Log Base" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as ValueAxis).logBase ?? ""}
                  onChange={(v) => updateValField("logBase", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Min" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as ValueAxis).min ?? ""}
                  onChange={(v) => updateValField("min", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Max" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as ValueAxis).max ?? ""}
                  onChange={(v) => updateValField("max", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Major Unit" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as ValueAxis).majorUnit ?? ""}
                  onChange={(v) => updateValField("majorUnit", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Minor Unit" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as ValueAxis).minorUnit ?? ""}
                  onChange={(v) => updateValField("minorUnit", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            {/* Display Units */}
            <Accordion title="Display Units" defaultExpanded={false}>
              <FieldRow>
                <FieldGroup label="Built-in Unit" style={{ flex: 1 }}>
                  <Select
                    value={(value as ValueAxis).dispUnits?.builtInUnit ?? "thousands"}
                    onChange={(v) => handleDispUnitsChange("builtInUnit", v as DisplayUnits["builtInUnit"])}
                    options={builtInUnitOptions}
                    disabled={disabled}
                  />
                </FieldGroup>
                <FieldGroup label="Custom Unit" style={{ flex: 1 }}>
                  <Input
                    type="number"
                    value={(value as ValueAxis).dispUnits?.customUnit ?? ""}
                    onChange={(v) => handleDispUnitsChange("customUnit", v ? Number(v) : undefined)}
                    disabled={disabled}
                  />
                </FieldGroup>
              </FieldRow>
              <Accordion title="Display Units Label" defaultExpanded={false}>
                <ChartTitleEditor
                  value={(value as ValueAxis).dispUnits?.dispUnitsLbl}
                  onChange={(title) => handleDispUnitsChange("dispUnitsLbl", title)}
                  disabled={disabled}
                />
              </Accordion>
            </Accordion>
          </>
        )}

        {/* Date Axis specific settings */}
        {value.type === "dateAx" && (
          <>
            <FieldRow>
              <FieldGroup label="Auto" style={{ flex: 1 }}>
                <Toggle
                  checked={(value as DateAxis).auto ?? false}
                  onChange={(v) => updateDateField("auto", v)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Base Time Unit" style={{ flex: 1 }}>
                <Select
                  value={(value as DateAxis).baseTimeUnit ?? "days"}
                  onChange={(v) => updateDateField("baseTimeUnit", v as DateAxis["baseTimeUnit"])}
                  options={timeUnitOptions}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Major Time Unit" style={{ flex: 1 }}>
                <Select
                  value={(value as DateAxis).majorTimeUnit ?? "days"}
                  onChange={(v) => updateDateField("majorTimeUnit", v as DateAxis["majorTimeUnit"])}
                  options={timeUnitOptions}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Minor Time Unit" style={{ flex: 1 }}>
                <Select
                  value={(value as DateAxis).minorTimeUnit ?? "days"}
                  onChange={(v) => updateDateField("minorTimeUnit", v as DateAxis["minorTimeUnit"])}
                  options={timeUnitOptions}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Major Unit" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as DateAxis).majorUnit ?? ""}
                  onChange={(v) => updateDateField("majorUnit", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Minor Unit" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as DateAxis).minorUnit ?? ""}
                  onChange={(v) => updateDateField("minorUnit", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>

            <FieldRow>
              <FieldGroup label="Min" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as DateAxis).min ?? ""}
                  onChange={(v) => updateDateField("min", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Max" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as DateAxis).max ?? ""}
                  onChange={(v) => updateDateField("max", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
          </>
        )}

        {/* Series Axis specific settings */}
        {value.type === "serAx" && (
          <>
            <FieldRow>
              <FieldGroup label="Tick Label Skip" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as SeriesAxis).tickLabelSkip ?? ""}
                  onChange={(v) => updateSerField("tickLabelSkip", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Tick Mark Skip" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={(value as SeriesAxis).tickMarkSkip ?? ""}
                  onChange={(v) => updateSerField("tickMarkSkip", v ? Number(v) : undefined)}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
          </>
        )}
      </div>
    </ChartEditorAdaptersBoundary>
  );
}

/**
 * Create default category axis
 */
export function createDefaultCategoryAxis(): CategoryAxis {
  return {
    type: "catAx",
    id: 1,
    position: "b",
    orientation: "minMax",
    majorTickMark: "out",
    minorTickMark: "none",
    tickLabelPosition: "nextTo",
    crossAxisId: 2,
    crosses: "autoZero",
  };
}

/**
 * Create default value axis
 */
export function createDefaultValueAxis(): ValueAxis {
  return {
    type: "valAx",
    id: 2,
    position: "l",
    orientation: "minMax",
    majorTickMark: "out",
    minorTickMark: "none",
    tickLabelPosition: "nextTo",
    crossAxisId: 1,
    crosses: "autoZero",
  };
}

/**
 * Create default axis (category axis)
 */
export function createDefaultAxis(): Axis {
  return createDefaultCategoryAxis();
}
