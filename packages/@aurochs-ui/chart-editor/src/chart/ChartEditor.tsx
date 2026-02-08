/**
 * @file ChartEditor - Editor for Chart type
 *
 * Top-level chart editor combining title, legend, plot area, axes, series,
 * 3D settings, surfaces, protection, and print settings.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.27 (chartSpace)
 */

import { useCallback, type CSSProperties } from "react";
import { Button, Input, Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { Accordion, FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { PercentEditor, DegreesEditor } from "../primitives";
import { LegendEditor, createDefaultLegend } from "./LegendEditor";
import { AxisEditor, createDefaultCategoryAxis, createDefaultValueAxis } from "./AxisEditor";
import { ChartSeriesEditor, createDefaultBarChartSeries } from "./ChartSeriesEditor";
import { ChartTitleEditor } from "./ChartTitleEditor";
import { ChartShapePropertiesEditor } from "./ChartShapePropertiesEditor";
import { LayoutEditor } from "./LayoutEditor";
import { pct, deg } from "@aurochs-office/drawing-ml/domain/units";
import type {
  Chart,
  ChartTitle,
  Legend,
  Axis,
  ChartSeries,
  PlotArea,
  View3D,
  ChartSurface,
  DataTable,
  ChartProtection,
  PrintSettings,
  PageMargins,
  PageSetup,
  HeaderFooter,
  ChartShapeProperties,
  Layout,
  PivotFormats,
  PivotFormat,
  PivotSource,
  PictureOptions,
  PictureFormat,
} from "@aurochs-office/chart/domain";
import type { TextBody } from "@aurochs-office/chart/domain/text";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { TextBodyEditor, createDefaultTextBody } from "../text";
import { ChartEditorAdaptersBoundary, type ChartEditorAdapters } from "../adapters";

export type ChartEditorProps = EditorProps<Chart> & {
  readonly style?: CSSProperties;
  readonly adapters?: ChartEditorAdapters;
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

// ============================================================================
// Option arrays
// ============================================================================

const dispBlanksAsOptions: SelectOption<NonNullable<Chart["dispBlanksAs"]>>[] = [
  { value: "gap", label: "Gap" },
  { value: "zero", label: "Zero" },
  { value: "span", label: "Span" },
];

const orientationOptions: SelectOption<NonNullable<PageSetup["orientation"]>>[] = [
  { value: "default", label: "Default" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

const pictureFormatOptions: SelectOption<PictureFormat>[] = [
  { value: "stretch", label: "Stretch" },
  { value: "stack", label: "Stack" },
  { value: "stackScale", label: "Stack Scale" },
];

// ============================================================================
// Main Editor
// ============================================================================

/**
 * Editor for chart configuration.
 */
export function ChartEditor({ value, onChange, disabled, className, style, adapters }: ChartEditorProps) {
  const updateField = useCallback(
    <K extends keyof Chart>(field: K, newValue: Chart[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange],
  );

  const updatePlotArea = useCallback(
    <K extends keyof PlotArea>(field: K, newValue: PlotArea[K]) => {
      onChange({
        ...value,
        plotArea: { ...value.plotArea, [field]: newValue },
      });
    },
    [value, onChange],
  );

  // Title handlers
  const handleTitleChange = useCallback(
    (title: ChartTitle | undefined) => {
      updateField("title", title);
    },
    [updateField],
  );

  // Legend handlers
  const handleLegendChange = useCallback(
    (legend: Legend) => {
      updateField("legend", legend);
    },
    [updateField],
  );

  // Axis handlers
  const handleAxisChange = useCallback(
    (index: number, axis: Axis) => {
      const newAxes = [...value.plotArea.axes];
      newAxes[index] = axis;
      updatePlotArea("axes", newAxes);
    },
    [value.plotArea.axes, updatePlotArea],
  );

  const handleAddAxis = useCallback(() => {
    const isEvenCount = value.plotArea.axes.length % 2 === 0;
    const newAxis = isEvenCount ? createDefaultCategoryAxis() : createDefaultValueAxis();
    updatePlotArea("axes", [...value.plotArea.axes, newAxis]);
  }, [value.plotArea.axes, updatePlotArea]);

  const handleRemoveAxis = useCallback(
    (index: number) => {
      const newAxes = value.plotArea.axes.filter((_, i) => i !== index);
      updatePlotArea("axes", newAxes);
    },
    [value.plotArea.axes, updatePlotArea],
  );

  // Chart series handlers
  const handleChartSeriesChange = useCallback(
    (index: number, chartSeries: ChartSeries) => {
      const newCharts = [...value.plotArea.charts];
      newCharts[index] = chartSeries;
      updatePlotArea("charts", newCharts);
    },
    [value.plotArea.charts, updatePlotArea],
  );

  const handleAddChartSeries = useCallback(() => {
    const newSeries = createDefaultBarChartSeries();
    updatePlotArea("charts", [...value.plotArea.charts, newSeries]);
  }, [value.plotArea.charts, updatePlotArea]);

  const handleRemoveChartSeries = useCallback(
    (index: number) => {
      const newCharts = value.plotArea.charts.filter((_, i) => i !== index);
      updatePlotArea("charts", newCharts);
    },
    [value.plotArea.charts, updatePlotArea],
  );

  // Plot area handlers
  const handlePlotAreaLayoutChange = useCallback(
    (layout: Layout | undefined) => {
      updatePlotArea("layout", layout);
    },
    [updatePlotArea],
  );

  const handlePlotAreaShapePropertiesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      updatePlotArea("shapeProperties", shapeProperties);
    },
    [updatePlotArea],
  );

  const handleDataTableChange = useCallback(
    (dataTable: DataTable | undefined) => {
      updatePlotArea("dataTable", dataTable);
    },
    [updatePlotArea],
  );

  // View3D handlers
  const handleView3DChange = useCallback(
    (view3D: View3D | undefined) => {
      updateField("view3D", view3D);
    },
    [updateField],
  );

  // Surface handlers
  const handleFloorChange = useCallback(
    (floor: ChartSurface | undefined) => {
      updateField("floor", floor);
    },
    [updateField],
  );

  const handleSideWallChange = useCallback(
    (sideWall: ChartSurface | undefined) => {
      updateField("sideWall", sideWall);
    },
    [updateField],
  );

  const handleBackWallChange = useCallback(
    (backWall: ChartSurface | undefined) => {
      updateField("backWall", backWall);
    },
    [updateField],
  );

  // Protection handlers
  const handleProtectionChange = useCallback(
    (protection: ChartProtection | undefined) => {
      updateField("protection", protection);
    },
    [updateField],
  );

  // Print settings handlers
  const handlePrintSettingsChange = useCallback(
    (printSettings: PrintSettings | undefined) => {
      updateField("printSettings", printSettings);
    },
    [updateField],
  );

  // Pivot formats handlers
  const handlePivotFormatsChange = useCallback(
    (pivotFormats: PivotFormats | undefined) => {
      updateField("pivotFormats", pivotFormats);
    },
    [updateField],
  );

  // Pivot source handlers
  const handlePivotSourceChange = useCallback(
    (pivotSource: PivotSource | undefined) => {
      updateField("pivotSource", pivotSource);
    },
    [updateField],
  );

  return (
    <ChartEditorAdaptersBoundary adapters={adapters}>
      <div style={{ ...containerStyle, ...style }} className={className}>
        {/* Display options */}
        <>
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

          <FieldRow>
            <FieldGroup label="Plot Visible Only" style={{ flex: 1 }}>
              <Toggle
                checked={value.plotVisOnly ?? true}
                onChange={(v) => updateField("plotVisOnly", v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Rounded Corners" style={{ flex: 1 }}>
              <Toggle
                checked={value.roundedCorners ?? false}
                onChange={(v) => updateField("roundedCorners", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Auto Title Deleted" style={{ flex: 1 }}>
              <Toggle
                checked={value.autoTitleDeleted ?? false}
                onChange={(v) => updateField("autoTitleDeleted", v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Show Labels Over Max" style={{ flex: 1 }}>
              <Toggle
                checked={value.showDataLabelsOverMax ?? false}
                onChange={(v) => updateField("showDataLabelsOverMax", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Date 1904 System" style={{ flex: 1 }}>
              <Toggle
                checked={value.date1904 ?? false}
                onChange={(v) => updateField("date1904", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>

        {/* Chart Title */}
        <Accordion title="Chart Title" defaultExpanded={false}>
          <ChartTitleEditor value={value.title} onChange={handleTitleChange} disabled={disabled} />
        </Accordion>

        {/* Legend */}
        <Accordion title="Legend" defaultExpanded={false}>
          {value.legend && <LegendEditor value={value.legend} onChange={handleLegendChange} disabled={disabled} />}
          {!value.legend && (
            <>
              <Button variant="ghost" onClick={() => updateField("legend", createDefaultLegend())} disabled={disabled}>
                Add Legend
              </Button>
            </>
          )}
        </Accordion>

        {/* View 3D */}
        <Accordion title="3D View" defaultExpanded={false}>
          <View3DEditor value={value.view3D} onChange={handleView3DChange} disabled={disabled} />
        </Accordion>

        {/* Surfaces (Floor, Side Wall, Back Wall) */}
        <Accordion title="3D Surfaces" defaultExpanded={false}>
          <Accordion title="Floor" defaultExpanded={false}>
            <ChartSurfaceEditor value={value.floor} onChange={handleFloorChange} disabled={disabled} />
          </Accordion>
          <Accordion title="Side Wall" defaultExpanded={false}>
            <ChartSurfaceEditor value={value.sideWall} onChange={handleSideWallChange} disabled={disabled} />
          </Accordion>
          <Accordion title="Back Wall" defaultExpanded={false}>
            <ChartSurfaceEditor value={value.backWall} onChange={handleBackWallChange} disabled={disabled} />
          </Accordion>
        </Accordion>

        {/* Plot Area */}
        <>
          <div style={headerRowStyle}>
            <span style={{ fontWeight: 500 }}>Plot Area</span>
          </div>

          <Accordion title="Layout" defaultExpanded={false}>
            <LayoutEditor value={value.plotArea.layout} onChange={handlePlotAreaLayoutChange} disabled={disabled} />
          </Accordion>

          <Accordion title="Shape Properties" defaultExpanded={false}>
            <ChartShapePropertiesEditor
              value={value.plotArea.shapeProperties}
              onChange={handlePlotAreaShapePropertiesChange}
              disabled={disabled}
            />
          </Accordion>

          <Accordion title="Data Table" defaultExpanded={false}>
            <DataTableEditor value={value.plotArea.dataTable} onChange={handleDataTableChange} disabled={disabled} />
          </Accordion>
        </>

        {/* Axes */}
        <>
          <div style={headerRowStyle}>
            <span>Axes ({value.plotArea.axes.length})</span>
            <Button variant="ghost" onClick={handleAddAxis} disabled={disabled}>
              Add
            </Button>
          </div>
          {value.plotArea.axes.map((axis, index) => (
            <Accordion key={axis.id} title={`${axis.type} - ${axis.position}`} defaultExpanded={false}>
              <div style={headerRowStyle}>
                <span />
                <Button variant="ghost" onClick={() => handleRemoveAxis(index)} disabled={disabled}>
                  Remove
                </Button>
              </div>
              <AxisEditor value={axis} onChange={(a) => handleAxisChange(index, a)} disabled={disabled} />
            </Accordion>
          ))}
        </>

        {/* Chart Series */}
        <>
          <div style={headerRowStyle}>
            <span>Chart Series ({value.plotArea.charts.length})</span>
            <Button variant="ghost" onClick={handleAddChartSeries} disabled={disabled}>
              Add
            </Button>
          </div>
          {value.plotArea.charts.map((chartSeries, index) => (
            <Accordion
              key={`${chartSeries.type}-${chartSeries.index}`}
              title={`${chartSeries.type} [${chartSeries.index}]`}
              defaultExpanded={false}
            >
              <div style={headerRowStyle}>
                <span />
                <Button variant="ghost" onClick={() => handleRemoveChartSeries(index)} disabled={disabled}>
                  Remove
                </Button>
              </div>
              <ChartSeriesEditor
                value={chartSeries}
                onChange={(cs) => handleChartSeriesChange(index, cs)}
                disabled={disabled}
              />
            </Accordion>
          ))}
        </>

        {/* Protection */}
        <Accordion title="Protection" defaultExpanded={false}>
          <ChartProtectionEditor value={value.protection} onChange={handleProtectionChange} disabled={disabled} />
        </Accordion>

        {/* Print Settings */}
        <Accordion title="Print Settings" defaultExpanded={false}>
          <PrintSettingsEditor value={value.printSettings} onChange={handlePrintSettingsChange} disabled={disabled} />
        </Accordion>

        {/* Pivot Formats */}
        <Accordion title="Pivot Formats" defaultExpanded={false}>
          <PivotFormatsEditor value={value.pivotFormats} onChange={handlePivotFormatsChange} disabled={disabled} />
        </Accordion>

        {/* Pivot Source */}
        <Accordion title="Pivot Source" defaultExpanded={false}>
          <PivotSourceEditor value={value.pivotSource} onChange={handlePivotSourceChange} disabled={disabled} />
        </Accordion>

        {/* External Data */}
        <Accordion title="External Data" defaultExpanded={false}>
          <>
            <FieldRow>
              <FieldGroup label="Resource ID" style={{ flex: 1 }}>
                <Input
                  type="text"
                  value={value.externalData?.resourceId ?? ""}
                  onChange={(v) =>
                    updateField("externalData", v ? { ...value.externalData, resourceId: String(v) } : undefined)
                  }
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
            <FieldRow>
              <FieldGroup label="Auto Update" style={{ flex: 1 }}>
                <Toggle
                  checked={value.externalData?.autoUpdate ?? false}
                  onChange={(v) =>
                    updateField(
                      "externalData",
                      value.externalData ? { ...value.externalData, autoUpdate: v } : undefined,
                    )
                  }
                  disabled={disabled || !value.externalData?.resourceId}
                />
              </FieldGroup>
            </FieldRow>
          </>
        </Accordion>

        {/* User Shapes */}
        <>
          <FieldRow>
            <FieldGroup label="User Shapes (Resource ID)" style={{ flex: 1 }}>
              <Input
                type="text"
                value={value.userShapes ?? ""}
                onChange={(v) => updateField("userShapes", String(v) || undefined)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      </div>
    </ChartEditorAdaptersBoundary>
  );
}

// ============================================================================
// Helper Editors
// ============================================================================

/**
 * View 3D Editor
 * @see ECMA-376 Part 1, Section 21.2.2.228 (view3D)
 */
type View3DEditorProps = EditorProps<View3D | undefined>;

function View3DEditor({ value, onChange, disabled }: View3DEditorProps) {
  const view = value ?? {};

  const updateField = useCallback(
    <K extends keyof View3D>(field: K, newValue: View3D[K]) => {
      onChange({ ...view, [field]: newValue });
    },
    [view, onChange],
  );

  return (
    <div style={containerStyle}>
      <>
        <FieldRow>
          <FieldGroup label="Rotation X" style={{ flex: 1 }}>
            <DegreesEditor
              value={view.rotX ?? deg(0)}
              onChange={(v) => updateField("rotX", v)}
              disabled={disabled}
              min={-90}
              max={90}
            />
          </FieldGroup>
          <FieldGroup label="Rotation Y" style={{ flex: 1 }}>
            <DegreesEditor
              value={view.rotY ?? deg(0)}
              onChange={(v) => updateField("rotY", v)}
              disabled={disabled}
              min={0}
              max={360}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Height Percent" style={{ flex: 1 }}>
            <PercentEditor
              value={view.hPercent ?? pct(100)}
              onChange={(v) => updateField("hPercent", v)}
              disabled={disabled}
              min={5}
              max={500}
            />
          </FieldGroup>
          <FieldGroup label="Depth Percent" style={{ flex: 1 }}>
            <PercentEditor
              value={view.depthPercent ?? pct(100)}
              onChange={(v) => updateField("depthPercent", v)}
              disabled={disabled}
              min={20}
              max={2000}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Perspective" style={{ flex: 1 }}>
            <Input
              type="number"
              value={view.perspective?.toString() ?? "30"}
              onChange={(v) => updateField("perspective", v ? Number(v) : undefined)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Right Angle Axes" style={{ flex: 1 }}>
            <Toggle checked={view.rAngAx ?? true} onChange={(v) => updateField("rAngAx", v)} disabled={disabled} />
          </FieldGroup>
        </FieldRow>
      </>
    </div>
  );
}

/**
 * Chart Surface Editor
 * @see ECMA-376 Part 1, Section 21.2.2.11 (backWall)
 */
type ChartSurfaceEditorProps = EditorProps<ChartSurface | undefined>;

function ChartSurfaceEditor({ value, onChange, disabled }: ChartSurfaceEditorProps) {
  const surface = value ?? {};

  const updateField = useCallback(
    <K extends keyof ChartSurface>(field: K, newValue: ChartSurface[K]) => {
      onChange({ ...surface, [field]: newValue });
    },
    [surface, onChange],
  );

  const handlePictureOptionsChange = useCallback(
    (pictureOptions: PictureOptions | undefined) => {
      updateField("pictureOptions", pictureOptions);
    },
    [updateField],
  );

  return (
    <div style={containerStyle}>
      <>
        <FieldRow>
          <FieldGroup label="Thickness" style={{ flex: 1 }}>
            <PercentEditor
              value={surface.thickness ?? pct(0)}
              onChange={(v) => updateField("thickness", v)}
              disabled={disabled}
              min={0}
              max={100}
            />
          </FieldGroup>
        </FieldRow>
      </>

      <Accordion title="Shape Properties" defaultExpanded={false}>
        <ChartShapePropertiesEditor
          value={surface.shapeProperties}
          onChange={(sp) => updateField("shapeProperties", sp)}
          disabled={disabled}
        />
      </Accordion>

      <Accordion title="Picture Options" defaultExpanded={false}>
        <PictureOptionsEditor
          value={surface.pictureOptions}
          onChange={handlePictureOptionsChange}
          disabled={disabled}
        />
      </Accordion>
    </div>
  );
}

/**
 * Picture Options Editor
 * @see ECMA-376 Part 1, Section 21.2.2.138 (pictureOptions)
 */
type PictureOptionsEditorProps = EditorProps<PictureOptions | undefined>;

function PictureOptionsEditor({ value, onChange, disabled }: PictureOptionsEditorProps) {
  const options = value ?? {};

  const updateField = useCallback(
    <K extends keyof PictureOptions>(field: K, newValue: PictureOptions[K]) => {
      onChange({ ...options, [field]: newValue });
    },
    [options, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Picture Format" style={{ flex: 1 }}>
          <Select
            value={options.pictureFormat ?? "stretch"}
            onChange={(v) => updateField("pictureFormat", v as PictureFormat)}
            options={pictureFormatOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Stack Unit" style={{ flex: 1 }}>
          <Input
            type="number"
            value={options.pictureStackUnit?.toString() ?? ""}
            onChange={(v) => updateField("pictureStackUnit", v ? Number(v) : undefined)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Apply to Front" style={{ flex: 1 }}>
          <Toggle
            checked={options.applyToFront ?? false}
            onChange={(v) => updateField("applyToFront", v)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Apply to Sides" style={{ flex: 1 }}>
          <Toggle
            checked={options.applyToSides ?? false}
            onChange={(v) => updateField("applyToSides", v)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Apply to End" style={{ flex: 1 }}>
          <Toggle
            checked={options.applyToEnd ?? false}
            onChange={(v) => updateField("applyToEnd", v)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Pivot Formats Editor
 * @see ECMA-376 Part 1, Section 21.2.2.143 (pivotFmts)
 */
type PivotFormatsEditorProps = EditorProps<PivotFormats | undefined>;

function PivotFormatsEditor({ value, onChange, disabled }: PivotFormatsEditorProps) {
  const formats = value?.formats ?? [];

  const handleFormatChange = useCallback(
    (index: number, format: PivotFormat) => {
      const newFormats = [...formats];
      newFormats[index] = format;
      onChange({ formats: newFormats });
    },
    [formats, onChange],
  );

  const handleAddFormat = useCallback(() => {
    const newFormat: PivotFormat = { idx: formats.length };
    onChange({ formats: [...formats, newFormat] });
  }, [formats, onChange]);

  const handleRemoveFormat = useCallback(
    (index: number) => {
      const newFormats = formats.filter((_, i) => i !== index);
      onChange(newFormats.length > 0 ? { formats: newFormats } : undefined);
    },
    [formats, onChange],
  );

  return (
    <div style={containerStyle}>
      <>
        <div style={headerRowStyle}>
          <span>Formats ({formats.length})</span>
          <Button variant="ghost" onClick={handleAddFormat} disabled={disabled}>
            Add
          </Button>
        </div>
      </>
      {formats.map((format, index) => (
        <Accordion key={format.idx} title={`Format ${format.idx}`} defaultExpanded={false}>
          <PivotFormatEditor
            value={format}
            onChange={(f) => handleFormatChange(index, f)}
            onRemove={() => handleRemoveFormat(index)}
            disabled={disabled}
          />
        </Accordion>
      ))}
    </div>
  );
}

/**
 * Pivot Format Editor
 * @see ECMA-376 Part 1, Section 21.2.2.142 (pivotFmt)
 */
type PivotFormatEditorProps = EditorProps<PivotFormat> & {
  readonly onRemove: () => void;
};

function PivotFormatEditor({ value, onChange, onRemove, disabled }: PivotFormatEditorProps) {
  const updateField = useCallback(
    <K extends keyof PivotFormat>(field: K, newValue: PivotFormat[K]) => {
      onChange({ ...value, [field]: newValue });
    },
    [value, onChange],
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
        </FieldRow>
      </>

      <Accordion title="Shape Properties" defaultExpanded={false}>
        <ChartShapePropertiesEditor
          value={value.shapeProperties}
          onChange={handleShapePropertiesChange}
          disabled={disabled}
        />
      </Accordion>

      <Accordion title="Text Properties" defaultExpanded={false}>
        <TextBodyEditor
          value={value.textProperties ?? createDefaultTextBody()}
          onChange={handleTextPropertiesChange}
          disabled={disabled}
        />
      </Accordion>

      <>
        <Button variant="ghost" onClick={onRemove} disabled={disabled} style={{ color: "var(--text-danger, #ef4444)" }}>
          Remove Format
        </Button>
      </>
    </div>
  );
}

/**
 * Pivot Source Editor
 * @see ECMA-376 Part 1, Section 21.2.2.144 (pivotSource)
 */
type PivotSourceEditorProps = EditorProps<PivotSource | undefined>;

function PivotSourceEditor({ value, onChange, disabled }: PivotSourceEditorProps) {
  const source = value ?? { name: "", fmtId: 0 };

  const updateField = useCallback(
    <K extends keyof PivotSource>(field: K, newValue: PivotSource[K]) => {
      onChange({ ...source, [field]: newValue });
    },
    [source, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Name" style={{ flex: 1 }}>
          <Input type="text" value={source.name} onChange={(v) => updateField("name", String(v))} disabled={disabled} />
        </FieldGroup>
        <FieldGroup label="Format ID" style={{ flex: 1 }}>
          <Input
            type="number"
            value={source.fmtId}
            onChange={(v) => updateField("fmtId", Number(v))}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Data Table Editor
 * @see ECMA-376 Part 1, Section 21.2.2.54 (dTable)
 */
type DataTableEditorProps = EditorProps<DataTable | undefined>;

function DataTableEditor({ value, onChange, disabled }: DataTableEditorProps) {
  const dataTable = value ?? {};

  const updateField = useCallback(
    <K extends keyof DataTable>(field: K, newValue: DataTable[K]) => {
      onChange({ ...dataTable, [field]: newValue });
    },
    [dataTable, onChange],
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

  return (
    <div style={containerStyle}>
      <>
        <FieldRow>
          <FieldGroup label="Show Horizontal Border" style={{ flex: 1 }}>
            <Toggle
              checked={dataTable.showHorzBorder ?? true}
              onChange={(v) => updateField("showHorzBorder", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Vertical Border" style={{ flex: 1 }}>
            <Toggle
              checked={dataTable.showVertBorder ?? true}
              onChange={(v) => updateField("showVertBorder", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Show Outline" style={{ flex: 1 }}>
            <Toggle
              checked={dataTable.showOutline ?? true}
              onChange={(v) => updateField("showOutline", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Show Keys" style={{ flex: 1 }}>
            <Toggle
              checked={dataTable.showKeys ?? true}
              onChange={(v) => updateField("showKeys", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </>

      <Accordion title="Shape Properties" defaultExpanded={false}>
        <ChartShapePropertiesEditor
          value={dataTable.shapeProperties}
          onChange={handleShapePropertiesChange}
          disabled={disabled}
        />
      </Accordion>

      <Accordion title="Text Properties" defaultExpanded={false}>
        <TextBodyEditor
          value={dataTable.textProperties ?? createDefaultTextBody()}
          onChange={handleTextPropertiesChange}
          disabled={disabled}
        />
      </Accordion>
    </div>
  );
}

/**
 * Chart Protection Editor
 * @see ECMA-376 Part 1, Section 21.2.2.149 (protection)
 */
type ChartProtectionEditorProps = EditorProps<ChartProtection | undefined>;

function ChartProtectionEditor({ value, onChange, disabled }: ChartProtectionEditorProps) {
  const protection = value ?? {};

  const updateField = useCallback(
    <K extends keyof ChartProtection>(field: K, newValue: ChartProtection[K]) => {
      onChange({ ...protection, [field]: newValue });
    },
    [protection, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Chart Object" style={{ flex: 1 }}>
          <Toggle
            checked={protection.chartObject ?? false}
            onChange={(v) => updateField("chartObject", v)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Data" style={{ flex: 1 }}>
          <Toggle checked={protection.data ?? false} onChange={(v) => updateField("data", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Formatting" style={{ flex: 1 }}>
          <Toggle
            checked={protection.formatting ?? false}
            onChange={(v) => updateField("formatting", v)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Selection" style={{ flex: 1 }}>
          <Toggle
            checked={protection.selection ?? false}
            onChange={(v) => updateField("selection", v)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="User Interface" style={{ flex: 1 }}>
          <Toggle
            checked={protection.userInterface ?? false}
            onChange={(v) => updateField("userInterface", v)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Print Settings Editor
 * @see ECMA-376 Part 1, Section 21.2.2.148 (printSettings)
 */
type PrintSettingsEditorProps = EditorProps<PrintSettings | undefined>;

function PrintSettingsEditor({ value, onChange, disabled }: PrintSettingsEditorProps) {
  const settings = value ?? {};

  const updateField = useCallback(
    <K extends keyof PrintSettings>(field: K, newValue: PrintSettings[K]) => {
      onChange({ ...settings, [field]: newValue });
    },
    [settings, onChange],
  );

  const handlePageMarginsChange = useCallback(
    (pageMargins: PageMargins | undefined) => {
      updateField("pageMargins", pageMargins);
    },
    [updateField],
  );

  const handlePageSetupChange = useCallback(
    (pageSetup: PageSetup | undefined) => {
      updateField("pageSetup", pageSetup);
    },
    [updateField],
  );

  const handleHeaderFooterChange = useCallback(
    (headerFooter: HeaderFooter | undefined) => {
      updateField("headerFooter", headerFooter);
    },
    [updateField],
  );

  return (
    <div style={containerStyle}>
      <Accordion title="Page Margins" defaultExpanded={false}>
        <PageMarginsEditor value={settings.pageMargins} onChange={handlePageMarginsChange} disabled={disabled} />
      </Accordion>

      <Accordion title="Page Setup" defaultExpanded={false}>
        <PageSetupEditor value={settings.pageSetup} onChange={handlePageSetupChange} disabled={disabled} />
      </Accordion>

      <Accordion title="Header/Footer" defaultExpanded={false}>
        <HeaderFooterEditor value={settings.headerFooter} onChange={handleHeaderFooterChange} disabled={disabled} />
      </Accordion>
    </div>
  );
}

/**
 * Page Margins Editor
 * @see ECMA-376 Part 1, Section 21.2.2.133 (pageMargins)
 */
type PageMarginsEditorProps = EditorProps<PageMargins | undefined>;

function PageMarginsEditor({ value, onChange, disabled }: PageMarginsEditorProps) {
  const margins = value ?? {
    left: 0.7,
    right: 0.7,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
  };

  const updateField = useCallback(
    <K extends keyof PageMargins>(field: K, newValue: PageMargins[K]) => {
      onChange({ ...margins, [field]: newValue });
    },
    [margins, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Left" style={{ flex: 1 }}>
          <Input
            type="number"
            value={margins.left.toString()}
            onChange={(v) => updateField("left", Number(v))}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Right" style={{ flex: 1 }}>
          <Input
            type="number"
            value={margins.right.toString()}
            onChange={(v) => updateField("right", Number(v))}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Top" style={{ flex: 1 }}>
          <Input
            type="number"
            value={margins.top.toString()}
            onChange={(v) => updateField("top", Number(v))}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Bottom" style={{ flex: 1 }}>
          <Input
            type="number"
            value={margins.bottom.toString()}
            onChange={(v) => updateField("bottom", Number(v))}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Header" style={{ flex: 1 }}>
          <Input
            type="number"
            value={margins.header.toString()}
            onChange={(v) => updateField("header", Number(v))}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Footer" style={{ flex: 1 }}>
          <Input
            type="number"
            value={margins.footer.toString()}
            onChange={(v) => updateField("footer", Number(v))}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Page Setup Editor
 * @see ECMA-376 Part 1, Section 21.2.2.134 (pageSetup)
 */
type PageSetupEditorProps = EditorProps<PageSetup | undefined>;

function PageSetupEditor({ value, onChange, disabled }: PageSetupEditorProps) {
  const setup = value ?? {};

  const updateField = useCallback(
    <K extends keyof PageSetup>(field: K, newValue: PageSetup[K]) => {
      onChange({ ...setup, [field]: newValue });
    },
    [setup, onChange],
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Orientation" style={{ flex: 1 }}>
          <Select
            value={setup.orientation ?? "default"}
            onChange={(v) => updateField("orientation", v as PageSetup["orientation"])}
            options={orientationOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Paper Size" style={{ flex: 1 }}>
          <Input
            type="number"
            value={setup.paperSize?.toString() ?? ""}
            onChange={(v) => updateField("paperSize", v ? Number(v) : undefined)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Paper Width" style={{ flex: 1 }}>
          <Input
            type="number"
            value={setup.paperWidth?.toString() ?? ""}
            onChange={(v) => updateField("paperWidth", v ? Number(v) : undefined)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Paper Height" style={{ flex: 1 }}>
          <Input
            type="number"
            value={setup.paperHeight?.toString() ?? ""}
            onChange={(v) => updateField("paperHeight", v ? Number(v) : undefined)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="First Page Number" style={{ flex: 1 }}>
          <Input
            type="number"
            value={setup.firstPageNumber?.toString() ?? ""}
            onChange={(v) => updateField("firstPageNumber", v ? Number(v) : undefined)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Copies" style={{ flex: 1 }}>
          <Input
            type="number"
            value={setup.copies?.toString() ?? "1"}
            onChange={(v) => updateField("copies", v ? Number(v) : 1)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Black and White" style={{ flex: 1 }}>
          <Toggle
            checked={setup.blackAndWhite ?? false}
            onChange={(v) => updateField("blackAndWhite", v)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Draft" style={{ flex: 1 }}>
          <Toggle checked={setup.draft ?? false} onChange={(v) => updateField("draft", v)} disabled={disabled} />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Use First Page Number" style={{ flex: 1 }}>
          <Toggle
            checked={setup.useFirstPageNumber ?? false}
            onChange={(v) => updateField("useFirstPageNumber", v)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Horizontal DPI" style={{ flex: 1 }}>
          <Input
            type="number"
            value={setup.horizontalDpi?.toString() ?? ""}
            onChange={(v) => updateField("horizontalDpi", v ? Number(v) : undefined)}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Vertical DPI" style={{ flex: 1 }}>
          <Input
            type="number"
            value={setup.verticalDpi?.toString() ?? ""}
            onChange={(v) => updateField("verticalDpi", v ? Number(v) : undefined)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Header/Footer Editor
 * @see ECMA-376 Part 1, Section 21.2.2.79 (headerFooter)
 */
type HeaderFooterEditorProps = EditorProps<HeaderFooter | undefined>;

function HeaderFooterEditor({ value, onChange, disabled }: HeaderFooterEditorProps) {
  const hf = value ?? {};

  const updateField = useCallback(
    <K extends keyof HeaderFooter>(field: K, newValue: HeaderFooter[K]) => {
      onChange({ ...hf, [field]: newValue });
    },
    [hf, onChange],
  );

  return (
    <div style={containerStyle}>
      <>
        <FieldRow>
          <FieldGroup label="Align with Margins" style={{ flex: 1 }}>
            <Toggle
              checked={hf.alignWithMargins ?? true}
              onChange={(v) => updateField("alignWithMargins", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Different Odd/Even" style={{ flex: 1 }}>
            <Toggle
              checked={hf.differentOddEven ?? false}
              onChange={(v) => updateField("differentOddEven", v)}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Different First" style={{ flex: 1 }}>
            <Toggle
              checked={hf.differentFirst ?? false}
              onChange={(v) => updateField("differentFirst", v)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </>

      <>
        <FieldRow>
          <FieldGroup label="Odd Header" style={{ flex: 1 }}>
            <Input
              type="text"
              value={hf.oddHeader ?? ""}
              onChange={(v) => updateField("oddHeader", String(v) || undefined)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
        <FieldRow>
          <FieldGroup label="Odd Footer" style={{ flex: 1 }}>
            <Input
              type="text"
              value={hf.oddFooter ?? ""}
              onChange={(v) => updateField("oddFooter", String(v) || undefined)}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </>

      {hf.differentOddEven && (
        <>
          <FieldRow>
            <FieldGroup label="Even Header" style={{ flex: 1 }}>
              <Input
                type="text"
                value={hf.evenHeader ?? ""}
                onChange={(v) => updateField("evenHeader", String(v) || undefined)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <FieldGroup label="Even Footer" style={{ flex: 1 }}>
              <Input
                type="text"
                value={hf.evenFooter ?? ""}
                onChange={(v) => updateField("evenFooter", String(v) || undefined)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {hf.differentFirst && (
        <>
          <FieldRow>
            <FieldGroup label="First Header" style={{ flex: 1 }}>
              <Input
                type="text"
                value={hf.firstHeader ?? ""}
                onChange={(v) => updateField("firstHeader", String(v) || undefined)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
          <FieldRow>
            <FieldGroup label="First Footer" style={{ flex: 1 }}>
              <Input
                type="text"
                value={hf.firstFooter ?? ""}
                onChange={(v) => updateField("firstFooter", String(v) || undefined)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default chart
 */
export function createDefaultChart(): Chart {
  return {
    plotArea: {
      charts: [createDefaultBarChartSeries()],
      axes: [createDefaultCategoryAxis(), createDefaultValueAxis()],
    },
    legend: createDefaultLegend(),
    dispBlanksAs: "gap",
    plotVisOnly: true,
    roundedCorners: false,
    autoTitleDeleted: false,
  };
}

/**
 * Create default view 3D
 */
export function createDefaultView3D(): View3D {
  return {
    rotX: deg(15),
    rotY: deg(20),
    hPercent: pct(100),
    depthPercent: pct(100),
    rAngAx: true,
    perspective: 30,
  };
}

/**
 * Create default chart surface
 */
export function createDefaultChartSurface(): ChartSurface {
  return {
    thickness: pct(0),
  };
}

/**
 * Create default data table
 */
export function createDefaultDataTable(): DataTable {
  return {
    showHorzBorder: true,
    showVertBorder: true,
    showOutline: true,
    showKeys: true,
  };
}

/**
 * Create default chart protection
 */
export function createDefaultChartProtection(): ChartProtection {
  return {
    chartObject: false,
    data: false,
    formatting: false,
    selection: false,
    userInterface: false,
  };
}

/**
 * Create default print settings
 */
export function createDefaultPrintSettings(): PrintSettings {
  return {
    pageMargins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
    pageSetup: {
      orientation: "default",
    },
  };
}
