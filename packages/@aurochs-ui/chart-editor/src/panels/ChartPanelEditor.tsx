/**
 * @file Purpose-oriented chart panel editor
 *
 * Organizes chart editing by user intent rather than ECMA-376 property structure.
 * Sections are ordered by frequency of use:
 *
 * 1. Title & Legend — most immediately visible elements
 * 2. Series — the core chart data and type
 * 3. Axes — axis labels, formatting, scale
 * 4. Appearance — styling, 3D, plot area
 * 5. Advanced — protection, print, pivot, external data
 *
 * Each section is collapsible. Only "Title & Legend" is expanded by default
 * so the user sees the most common controls first without scrolling.
 */

import React, { useCallback, type CSSProperties } from "react";
import { spacingTokens, fontTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import { Button, Input, Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import type {
  Chart,
  ChartTitle,
  Legend,
  Axis,
  ChartSeries,
  ChartShapeProperties,
  DataTable,
} from "@aurochs-office/chart/domain";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";

import { ChartTitleEditor } from "../chart/ChartTitleEditor";
import { LegendEditor, createDefaultLegend } from "../chart/LegendEditor";
import { AxisEditor, createDefaultCategoryAxis } from "../chart/AxisEditor";
import { ChartSeriesEditor, createDefaultBarChartSeries } from "../chart/ChartSeriesEditor";
import { ChartShapePropertiesEditor } from "../chart/ChartShapePropertiesEditor";
import { LayoutEditor } from "../chart/LayoutEditor";
import { View3DEditor } from "../chart/View3DEditor";
import { DataTableEditor } from "../chart/DataTableEditor";
import { ChartProtectionEditor } from "../chart/ChartProtectionEditor";
import { ChartEditorAdaptersBoundary, type ChartEditorAdapters } from "../adapters";

// =============================================================================
// Types
// =============================================================================

export type ChartPanelEditorProps = EditorProps<Chart> & {
  readonly adapters?: ChartEditorAdapters;
};

// =============================================================================
// Styles
// =============================================================================

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacingTokens.xs,
};

const listHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `${spacingTokens.xs} 0`,
  fontSize: fontTokens.size.xs,
  color: colorTokens.text.secondary,
};

// =============================================================================
// Options
// =============================================================================

const dispBlanksAsOptions: SelectOption<NonNullable<Chart["dispBlanksAs"]>>[] = [
  { value: "gap", label: "Gap" },
  { value: "zero", label: "Zero" },
  { value: "span", label: "Span" },
];

// =============================================================================
// Helpers
// =============================================================================

function buildLegendContent(props: { legend: Legend | undefined; onChange: (l: Legend) => void; disabled: boolean | undefined }): React.JSX.Element {
  if (props.legend) {
    return <LegendEditor value={props.legend} onChange={props.onChange} disabled={props.disabled} />;
  }
  return (
    <Button variant="ghost" onClick={() => props.onChange(createDefaultLegend())} disabled={props.disabled}>
      Add Legend
    </Button>
  );
}

// =============================================================================
// Component
// =============================================================================






/** Panel editor component for all chart properties and visual options. */
export function ChartPanelEditor({ value, onChange, disabled, adapters }: ChartPanelEditorProps) {
  const updateField = useCallback(
    <K extends keyof Chart>(field: K, newValue: Chart[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange],
  );

  const updatePlotArea = useCallback(
    <K extends keyof Chart["plotArea"]>(field: K, newValue: Chart["plotArea"][K]) => {
      onChange({ ...value, plotArea: { ...value.plotArea, [field]: newValue } });
    },
    [value, onChange],
  );

  // ── Title & Legend callbacks ──
  const handleTitleChange = useCallback(
    (title: ChartTitle | undefined) => updateField("title", title),
    [updateField],
  );
  const handleLegendChange = useCallback(
    (legend: Legend) => updateField("legend", legend),
    [updateField],
  );

  // ── Series callbacks ──
  const handleChartSeriesChange = useCallback(
    (index: number, cs: ChartSeries) => {
      const next = [...value.plotArea.charts];
      next[index] = cs;
      updatePlotArea("charts", next);
    },
    [value.plotArea.charts, updatePlotArea],
  );
  const handleAddChartSeries = useCallback(() => {
    updatePlotArea("charts", [...value.plotArea.charts, createDefaultBarChartSeries()]);
  }, [value.plotArea.charts, updatePlotArea]);
  const handleRemoveChartSeries = useCallback(
    (index: number) => {
      updatePlotArea("charts", value.plotArea.charts.filter((_, i) => i !== index));
    },
    [value.plotArea.charts, updatePlotArea],
  );

  // ── Axes callbacks ──
  const handleAxisChange = useCallback(
    (index: number, axis: Axis) => {
      const next = [...value.plotArea.axes];
      next[index] = axis;
      updatePlotArea("axes", next);
    },
    [value.plotArea.axes, updatePlotArea],
  );
  const handleAddAxis = useCallback(() => {
    const newId = value.plotArea.axes.length > 0 ? Math.max(...value.plotArea.axes.map((a) => a.id)) + 1 : 1;
    updatePlotArea("axes", [
      ...value.plotArea.axes,
      { ...createDefaultCategoryAxis(), id: newId },
    ]);
  }, [value.plotArea.axes, updatePlotArea]);
  const handleRemoveAxis = useCallback(
    (index: number) => {
      updatePlotArea("axes", value.plotArea.axes.filter((_, i) => i !== index));
    },
    [value.plotArea.axes, updatePlotArea],
  );

  const legendContent = buildLegendContent({ legend: value.legend, onChange: handleLegendChange, disabled });

  return (
    <ChartEditorAdaptersBoundary adapters={adapters}>
      {/* ════════════════════════════════════════════════════════════════════
          Section 1: Title & Legend
          Most common edits — expanded by default
          ════════════════════════════════════════════════════════════════════ */}
      <OptionalPropertySection title="Title & Legend" defaultExpanded>
        <OptionalPropertySection title="Chart Title" defaultExpanded={false}>
          <ChartTitleEditor value={value.title} onChange={handleTitleChange} disabled={disabled} />
        </OptionalPropertySection>

        <OptionalPropertySection title="Legend" defaultExpanded={false}>
          {legendContent}
        </OptionalPropertySection>

        <FieldRow>
          <FieldGroup label="Display Blanks As" style={{ flex: 1 }}>
            <Select
              value={value.dispBlanksAs ?? "gap"}
              onChange={(v) => updateField("dispBlanksAs", v as Chart["dispBlanksAs"])}
              options={dispBlanksAsOptions}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Style" style={{ flex: 1 }}>
            <Input
              type="number"
              value={value.style?.toString() ?? ""}
              onChange={(v) => updateField("style", v ? Number(v) : undefined)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </OptionalPropertySection>

      {/* ════════════════════════════════════════════════════════════════════
          Section 2: Series
          Core data — collapsed by default (opens to per-series editors)
          ════════════════════════════════════════════════════════════════════ */}
      <OptionalPropertySection title={`Series (${value.plotArea.charts.length})`} defaultExpanded={false}>
        <div style={listHeaderStyle}>
          <span />
          <Button variant="ghost" onClick={handleAddChartSeries} disabled={disabled}>Add</Button>
        </div>
        {value.plotArea.charts.map((chartSeries, index) => (
          <OptionalPropertySection
            key={`${chartSeries.type}-${chartSeries.index}`}
            title={`${chartSeries.type} [${chartSeries.index}]`}
            defaultExpanded={false}
          >
            <div style={sectionHeaderStyle}>
              <span />
              <Button variant="ghost" onClick={() => handleRemoveChartSeries(index)} disabled={disabled}>Remove</Button>
            </div>
            <ChartSeriesEditor value={chartSeries} onChange={(cs) => handleChartSeriesChange(index, cs)} disabled={disabled} />
          </OptionalPropertySection>
        ))}
      </OptionalPropertySection>

      {/* ════════════════════════════════════════════════════════════════════
          Section 3: Axes
          ════════════════════════════════════════════════════════════════════ */}
      <OptionalPropertySection title={`Axes (${value.plotArea.axes.length})`} defaultExpanded={false}>
        <div style={listHeaderStyle}>
          <span />
          <Button variant="ghost" onClick={handleAddAxis} disabled={disabled}>Add</Button>
        </div>
        {value.plotArea.axes.map((axis, index) => (
          <OptionalPropertySection key={axis.id} title={`${axis.type} — ${axis.position}`} defaultExpanded={false}>
            <div style={sectionHeaderStyle}>
              <span />
              <Button variant="ghost" onClick={() => handleRemoveAxis(index)} disabled={disabled}>Remove</Button>
            </div>
            <AxisEditor value={axis} onChange={(a) => handleAxisChange(index, a)} disabled={disabled} />
          </OptionalPropertySection>
        ))}
      </OptionalPropertySection>

      {/* ════════════════════════════════════════════════════════════════════
          Section 4: Appearance
          3D, surfaces, plot area styling
          ════════════════════════════════════════════════════════════════════ */}
      <OptionalPropertySection title="Appearance" defaultExpanded={false}>
        <FieldRow>
          <FieldGroup label="Rounded Corners" style={{ flex: 1 }}>
            <Toggle checked={value.roundedCorners ?? false} onChange={(v) => updateField("roundedCorners", v)} disabled={disabled} />
          </FieldGroup>
          <FieldGroup label="Plot Visible Only" style={{ flex: 1 }}>
            <Toggle checked={value.plotVisOnly ?? true} onChange={(v) => updateField("plotVisOnly", v)} disabled={disabled} />
          </FieldGroup>
        </FieldRow>

        <OptionalPropertySection title="Plot Area" defaultExpanded={false}>
          <OptionalPropertySection title="Layout" defaultExpanded={false}>
            <LayoutEditor value={value.plotArea.layout} onChange={(l) => updatePlotArea("layout", l)} disabled={disabled} />
          </OptionalPropertySection>
          <OptionalPropertySection title="Shape Properties" defaultExpanded={false}>
            <ChartShapePropertiesEditor
              value={value.plotArea.shapeProperties}
              onChange={(sp: ChartShapeProperties | undefined) => updatePlotArea("shapeProperties", sp)}
              disabled={disabled}
            />
          </OptionalPropertySection>
        </OptionalPropertySection>

        <OptionalPropertySection title="3D View" defaultExpanded={false}>
          <View3DEditor value={value.view3D} onChange={(v) => updateField("view3D", v)} disabled={disabled} />
        </OptionalPropertySection>

        <OptionalPropertySection title="Data Table" defaultExpanded={false}>
          <DataTableEditor value={value.plotArea.dataTable} onChange={(dt: DataTable | undefined) => updatePlotArea("dataTable", dt)} disabled={disabled} />
        </OptionalPropertySection>
      </OptionalPropertySection>

      {/* ════════════════════════════════════════════════════════════════════
          Section 5: Advanced
          Rarely used properties — collapsed
          ════════════════════════════════════════════════════════════════════ */}
      <OptionalPropertySection title="Advanced" defaultExpanded={false}>
        <FieldRow>
          <FieldGroup label="Auto Title Deleted" style={{ flex: 1 }}>
            <Toggle checked={value.autoTitleDeleted ?? false} onChange={(v) => updateField("autoTitleDeleted", v)} disabled={disabled} />
          </FieldGroup>
          <FieldGroup label="Show Labels Over Max" style={{ flex: 1 }}>
            <Toggle checked={value.showDataLabelsOverMax ?? false} onChange={(v) => updateField("showDataLabelsOverMax", v)} disabled={disabled} />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup label="Date 1904 System" style={{ flex: 1 }}>
            <Toggle checked={value.date1904 ?? false} onChange={(v) => updateField("date1904", v)} disabled={disabled} />
          </FieldGroup>
        </FieldRow>

        <OptionalPropertySection title="Protection" defaultExpanded={false}>
          <ChartProtectionEditor value={value.protection} onChange={(p) => updateField("protection", p)} disabled={disabled} />
        </OptionalPropertySection>

        <OptionalPropertySection title="External Data" defaultExpanded={false}>
          <FieldRow>
            <FieldGroup label="Resource ID" style={{ flex: 1 }}>
              <Input
                type="text"
                value={value.externalData?.resourceId ?? ""}
                onChange={(v) => updateField("externalData", v ? { ...value.externalData, resourceId: String(v) } : undefined)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Auto Update" style={{ flex: 1 }}>
              <Toggle
                checked={value.externalData?.autoUpdate ?? false}
                onChange={(v) => updateField("externalData", value.externalData ? { ...value.externalData, autoUpdate: v } : undefined)}
                disabled={disabled || !value.externalData?.resourceId}
              />
            </FieldGroup>
          </FieldRow>
        </OptionalPropertySection>
      </OptionalPropertySection>
    </ChartEditorAdaptersBoundary>
  );
}
