/**
 * @file ChartSeriesEditor - Editor for ChartSeries type
 *
 * Edits chart series properties including type-specific settings for all chart types:
 * - AreaChartSeries, BarChartSeries, LineChartSeries, PieChartSeries
 * - OfPieChartSeries, ScatterChartSeries, RadarChartSeries, BubbleChartSeries
 * - StockChartSeries, SurfaceChartSeries
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML Charts)
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select, Toggle } from "@oxen-ui/ui-components/primitives";
import { Accordion, FieldGroup, FieldRow } from "@oxen-ui/ui-components/layout";
import { PercentEditor, DegreesEditor } from "../primitives";
import { DataLabelsEditor, createDefaultDataLabels } from "./DataLabelsEditor";
import { ChartShapePropertiesEditor } from "./ChartShapePropertiesEditor";
import { pct, deg } from "@oxen-office/ooxml/domain/units";
import type {
  ChartSeries,
  BarChartSeries,
  LineChartSeries,
  PieChartSeries,
  AreaChartSeries,
  ScatterChartSeries,
  RadarChartSeries,
  BubbleChartSeries,
  OfPieChartSeries,
  StockChartSeries,
  SurfaceChartSeries,
  BarDirection,
  BarGrouping,
  Grouping,
  ScatterStyle,
  RadarStyle,
  OfPieType,
  OfPieSplitType,
  ChartShapeProperties,
  UpDownBars,
  SeriesText,
  BandFormat,
} from "@oxen-office/chart/domain";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";

export type ChartSeriesEditorProps = EditorProps<ChartSeries> & {
  readonly style?: CSSProperties;
  /** Show data labels editor */
  readonly showDataLabels?: boolean;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

// ============================================================================
// Option arrays
// ============================================================================

const chartTypeOptions: SelectOption<ChartSeries["type"]>[] = [
  { value: "barChart", label: "Bar Chart" },
  { value: "bar3DChart", label: "Bar 3D Chart" },
  { value: "lineChart", label: "Line Chart" },
  { value: "line3DChart", label: "Line 3D Chart" },
  { value: "pieChart", label: "Pie Chart" },
  { value: "pie3DChart", label: "Pie 3D Chart" },
  { value: "doughnutChart", label: "Doughnut Chart" },
  { value: "areaChart", label: "Area Chart" },
  { value: "area3DChart", label: "Area 3D Chart" },
  { value: "scatterChart", label: "Scatter Chart" },
  { value: "radarChart", label: "Radar Chart" },
  { value: "bubbleChart", label: "Bubble Chart" },
  { value: "stockChart", label: "Stock Chart" },
  { value: "surfaceChart", label: "Surface Chart" },
  { value: "surface3DChart", label: "Surface 3D Chart" },
  { value: "ofPieChart", label: "Pie of Pie Chart" },
];

const barDirectionOptions: SelectOption<BarDirection>[] = [
  { value: "bar", label: "Horizontal" },
  { value: "col", label: "Vertical" },
];

const barGroupingOptions: SelectOption<BarGrouping>[] = [
  { value: "clustered", label: "Clustered" },
  { value: "stacked", label: "Stacked" },
  { value: "percentStacked", label: "Percent Stacked" },
  { value: "standard", label: "Standard" },
];

const groupingOptions: SelectOption<Grouping>[] = [
  { value: "standard", label: "Standard" },
  { value: "stacked", label: "Stacked" },
  { value: "percentStacked", label: "Percent Stacked" },
];

const scatterStyleOptions: SelectOption<ScatterStyle>[] = [
  { value: "none", label: "None" },
  { value: "line", label: "Line" },
  { value: "lineMarker", label: "Line with Markers" },
  { value: "marker", label: "Markers Only" },
  { value: "smooth", label: "Smooth Line" },
  { value: "smoothMarker", label: "Smooth with Markers" },
];

const radarStyleOptions: SelectOption<RadarStyle>[] = [
  { value: "standard", label: "Standard" },
  { value: "marker", label: "With Markers" },
  { value: "filled", label: "Filled" },
];

const ofPieTypeOptions: SelectOption<OfPieType>[] = [
  { value: "pie", label: "Pie of Pie" },
  { value: "bar", label: "Bar of Pie" },
];

const ofPieSplitTypeOptions: SelectOption<OfPieSplitType>[] = [
  { value: "auto", label: "Auto" },
  { value: "cust", label: "Custom" },
  { value: "percent", label: "Percent" },
  { value: "pos", label: "Position" },
  { value: "val", label: "Value" },
];

const barShapeOptions: SelectOption<
  NonNullable<BarChartSeries["shape"]>
>[] = [
  { value: "box", label: "Box" },
  { value: "cone", label: "Cone" },
  { value: "coneToMax", label: "Cone to Max" },
  { value: "cylinder", label: "Cylinder" },
  { value: "pyramid", label: "Pyramid" },
  { value: "pyramidToMax", label: "Pyramid to Max" },
];

const sizeRepresentsOptions: SelectOption<
  NonNullable<BubbleChartSeries["sizeRepresents"]>
>[] = [
  { value: "area", label: "Area" },
  { value: "w", label: "Width" },
];

// ============================================================================
// Main Editor
// ============================================================================

/**
 * Editor for chart series properties.
 */
export function ChartSeriesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showDataLabels = true,
}: ChartSeriesEditorProps) {
  // Common update handlers
  const updateField = useCallback(
    <K extends keyof ChartSeries>(field: K, newValue: ChartSeries[K]) => {
      onChange({ ...value, [field]: newValue } as ChartSeries);
    },
    [value, onChange]
  );

  // Type-specific update handlers
  const updateBarField = useCallback(
    <K extends keyof BarChartSeries>(field: K, newValue: BarChartSeries[K]) => {
      if (value.type === "barChart" || value.type === "bar3DChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateLineField = useCallback(
    <K extends keyof LineChartSeries>(
      field: K,
      newValue: LineChartSeries[K]
    ) => {
      if (value.type === "lineChart" || value.type === "line3DChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateAreaField = useCallback(
    <K extends keyof AreaChartSeries>(
      field: K,
      newValue: AreaChartSeries[K]
    ) => {
      if (value.type === "areaChart" || value.type === "area3DChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updatePieField = useCallback(
    <K extends keyof PieChartSeries>(field: K, newValue: PieChartSeries[K]) => {
      if (
        value.type === "pieChart" ||
        value.type === "pie3DChart" ||
        value.type === "doughnutChart"
      ) {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateScatterField = useCallback(
    <K extends keyof ScatterChartSeries>(
      field: K,
      newValue: ScatterChartSeries[K]
    ) => {
      if (value.type === "scatterChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateRadarField = useCallback(
    <K extends keyof RadarChartSeries>(
      field: K,
      newValue: RadarChartSeries[K]
    ) => {
      if (value.type === "radarChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateBubbleField = useCallback(
    <K extends keyof BubbleChartSeries>(
      field: K,
      newValue: BubbleChartSeries[K]
    ) => {
      if (value.type === "bubbleChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateOfPieField = useCallback(
    <K extends keyof OfPieChartSeries>(
      field: K,
      newValue: OfPieChartSeries[K]
    ) => {
      if (value.type === "ofPieChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateStockField = useCallback(
    <K extends keyof StockChartSeries>(
      field: K,
      newValue: StockChartSeries[K]
    ) => {
      if (value.type === "stockChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  const updateSurfaceField = useCallback(
    <K extends keyof SurfaceChartSeries>(
      field: K,
      newValue: SurfaceChartSeries[K]
    ) => {
      if (value.type === "surfaceChart" || value.type === "surface3DChart") {
        onChange({ ...value, [field]: newValue } as ChartSeries);
      }
    },
    [value, onChange]
  );

  // Series text handlers
  const handleTxChange = useCallback(
    (tx: SeriesText | undefined) => {
      updateField("tx", tx);
    },
    [updateField]
  );

  const handleShapePropertiesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      updateField("shapeProperties", shapeProperties);
    },
    [updateField]
  );

  // Chart lines handlers
  const handleDropLinesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      const dropLines = shapeProperties ? { shapeProperties } : undefined;
      if (value.type === "lineChart" || value.type === "line3DChart") {
        updateLineField("dropLines", dropLines);
      } else if (value.type === "areaChart" || value.type === "area3DChart") {
        updateAreaField("dropLines", dropLines);
      } else if (value.type === "stockChart") {
        updateStockField("dropLines", dropLines);
      }
    },
    [value.type, updateLineField, updateAreaField, updateStockField]
  );

  const handleHiLowLinesChange = useCallback(
    (shapeProperties: ChartShapeProperties | undefined) => {
      const hiLowLines = shapeProperties ? { shapeProperties } : undefined;
      if (value.type === "lineChart" || value.type === "line3DChart") {
        updateLineField("hiLowLines", hiLowLines);
      } else if (value.type === "stockChart") {
        updateStockField("hiLowLines", hiLowLines);
      }
    },
    [value.type, updateLineField, updateStockField]
  );

  // UpDownBars handlers
  const handleUpDownBarsChange = useCallback(
    (upDownBars: UpDownBars | undefined) => {
      if (value.type === "lineChart" || value.type === "line3DChart") {
        updateLineField("upDownBars", upDownBars);
      } else if (value.type === "stockChart") {
        updateStockField("upDownBars", upDownBars);
      }
    },
    [value.type, updateLineField, updateStockField]
  );

  // Type checks
  const isBarChart = value.type === "barChart" || value.type === "bar3DChart";
  const isLineChart =
    value.type === "lineChart" || value.type === "line3DChart";
  const isAreaChart =
    value.type === "areaChart" || value.type === "area3DChart";
  const isPieChart =
    value.type === "pieChart" ||
    value.type === "pie3DChart" ||
    value.type === "doughnutChart";
  const isScatterChart = value.type === "scatterChart";
  const isRadarChart = value.type === "radarChart";
  const isBubbleChart = value.type === "bubbleChart";
  const isOfPieChart = value.type === "ofPieChart";
  const isStockChart = value.type === "stockChart";
  const isSurfaceChart =
    value.type === "surfaceChart" || value.type === "surface3DChart";
  const hasDropLines = isLineChart || isAreaChart || isStockChart;
  const hasHiLowLines = isLineChart || isStockChart;
  const hasUpDownBars = isLineChart || isStockChart;

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Chart type and common settings */}
      <>
        <FieldRow>
          <FieldGroup label="Chart Type" style={{ flex: 1 }}>
            <Select
              value={value.type}
              onChange={(v) => updateField("type", v as ChartSeries["type"])}
              options={chartTypeOptions}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Index" style={{ flex: 1 }}>
            <Input
              type="number"
              value={value.index.toString()}
              onChange={(v) => updateField("index", Number(v))}
              disabled={disabled}
            />
          </FieldGroup>
          <FieldGroup label="Order" style={{ flex: 1 }}>
            <Input
              type="number"
              value={value.order.toString()}
              onChange={(v) => updateField("order", Number(v))}
              disabled={disabled}
            />
          </FieldGroup>
        </FieldRow>
      </>

      {/* Series Text (tx) */}
      <Accordion title="Series Text" defaultExpanded={false}>
        <SeriesTextEditor
          value={value.tx}
          onChange={handleTxChange}
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

      {/* Bar chart specific settings */}
      {isBarChart && (
        <>
          <FieldRow>
            <FieldGroup label="Direction" style={{ flex: 1 }}>
              <Select
                value={(value as BarChartSeries).barDir}
                onChange={(v) => updateBarField("barDir", v as BarDirection)}
                options={barDirectionOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Grouping" style={{ flex: 1 }}>
              <Select
                value={(value as BarChartSeries).grouping}
                onChange={(v) => updateBarField("grouping", v as BarGrouping)}
                options={barGroupingOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Gap Width" style={{ flex: 1 }}>
              <PercentEditor
                value={(value as BarChartSeries).gapWidth ?? pct(150)}
                onChange={(v) => updateBarField("gapWidth", v)}
                disabled={disabled}
                min={0}
                max={500}
              />
            </FieldGroup>
            <FieldGroup label="Overlap" style={{ flex: 1 }}>
              <Input
                type="number"
                value={(value as BarChartSeries).overlap?.toString() ?? "0"}
                onChange={(v) =>
                  updateBarField("overlap", v ? Number(v) : undefined)
                }
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          {value.type === "bar3DChart" && (
            <>
              <FieldRow>
                <FieldGroup label="Gap Depth" style={{ flex: 1 }}>
                  <PercentEditor
                    value={(value as BarChartSeries).gapDepth ?? pct(150)}
                    onChange={(v) => updateBarField("gapDepth", v)}
                    disabled={disabled}
                    min={0}
                    max={500}
                  />
                </FieldGroup>
                <FieldGroup label="Shape" style={{ flex: 1 }}>
                  <Select
                    value={(value as BarChartSeries).shape ?? "box"}
                    onChange={(v) =>
                      updateBarField("shape", v as BarChartSeries["shape"])
                    }
                    options={barShapeOptions}
                    disabled={disabled}
                  />
                </FieldGroup>
              </FieldRow>
            </>
          )}

          <FieldRow>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as BarChartSeries).varyColors ?? false}
                onChange={(v) => updateBarField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {/* Line chart specific settings */}
      {isLineChart && (
        <>
          <FieldRow>
            <FieldGroup label="Grouping" style={{ flex: 1 }}>
              <Select
                value={(value as LineChartSeries).grouping}
                onChange={(v) => updateLineField("grouping", v as Grouping)}
                options={groupingOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          {value.type === "line3DChart" && (
            <FieldRow>
              <FieldGroup label="Gap Depth" style={{ flex: 1 }}>
                <PercentEditor
                  value={(value as LineChartSeries).gapDepth ?? pct(150)}
                  onChange={(v) => updateLineField("gapDepth", v)}
                  disabled={disabled}
                  min={0}
                  max={500}
                />
              </FieldGroup>
            </FieldRow>
          )}

          <FieldRow>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as LineChartSeries).varyColors ?? false}
                onChange={(v) => updateLineField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Smooth" style={{ flex: 1 }}>
              <Toggle
                checked={(value as LineChartSeries).smooth ?? false}
                onChange={(v) => updateLineField("smooth", v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Markers" style={{ flex: 1 }}>
              <Toggle
                checked={(value as LineChartSeries).marker ?? false}
                onChange={(v) => updateLineField("marker", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {/* Area chart specific settings */}
      {isAreaChart && (
        <>
          <FieldRow>
            <FieldGroup label="Grouping" style={{ flex: 1 }}>
              <Select
                value={(value as AreaChartSeries).grouping}
                onChange={(v) => updateAreaField("grouping", v as Grouping)}
                options={groupingOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          {value.type === "area3DChart" && (
            <FieldRow>
              <FieldGroup label="Gap Depth" style={{ flex: 1 }}>
                <PercentEditor
                  value={(value as AreaChartSeries).gapDepth ?? pct(150)}
                  onChange={(v) => updateAreaField("gapDepth", v)}
                  disabled={disabled}
                  min={0}
                  max={500}
                />
              </FieldGroup>
            </FieldRow>
          )}

          <FieldRow>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as AreaChartSeries).varyColors ?? false}
                onChange={(v) => updateAreaField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {/* Pie chart specific settings */}
      {isPieChart && (
        <>
          <FieldRow>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as PieChartSeries).varyColors ?? false}
                onChange={(v) => updatePieField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="First Slice Angle" style={{ flex: 1 }}>
              <DegreesEditor
                value={(value as PieChartSeries).firstSliceAng ?? deg(0)}
                onChange={(v) => updatePieField("firstSliceAng", v)}
                disabled={disabled}
                min={0}
                max={360}
              />
            </FieldGroup>
          </FieldRow>

          {value.type === "doughnutChart" && (
            <FieldRow>
              <FieldGroup label="Hole Size" style={{ flex: 1 }}>
                <PercentEditor
                  value={(value as PieChartSeries).holeSize ?? pct(50)}
                  onChange={(v) => updatePieField("holeSize", v)}
                  disabled={disabled}
                  min={10}
                  max={90}
                />
              </FieldGroup>
            </FieldRow>
          )}
        </>
      )}

      {/* Of-Pie chart specific settings */}
      {isOfPieChart && (
        <>
          <FieldRow>
            <FieldGroup label="Of Pie Type" style={{ flex: 1 }}>
              <Select
                value={(value as OfPieChartSeries).ofPieType}
                onChange={(v) => updateOfPieField("ofPieType", v as OfPieType)}
                options={ofPieTypeOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as OfPieChartSeries).varyColors ?? false}
                onChange={(v) => updateOfPieField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Gap Width" style={{ flex: 1 }}>
              <PercentEditor
                value={(value as OfPieChartSeries).gapWidth ?? pct(150)}
                onChange={(v) => updateOfPieField("gapWidth", v)}
                disabled={disabled}
                min={0}
                max={500}
              />
            </FieldGroup>
            <FieldGroup label="Second Pie Size" style={{ flex: 1 }}>
              <PercentEditor
                value={(value as OfPieChartSeries).secondPieSize ?? pct(75)}
                onChange={(v) => updateOfPieField("secondPieSize", v)}
                disabled={disabled}
                min={5}
                max={200}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Split Type" style={{ flex: 1 }}>
              <Select
                value={(value as OfPieChartSeries).splitType ?? "auto"}
                onChange={(v) =>
                  updateOfPieField("splitType", v as OfPieSplitType)
                }
                options={ofPieSplitTypeOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Split Position" style={{ flex: 1 }}>
              <Input
                type="number"
                value={
                  (value as OfPieChartSeries).splitPos?.toString() ?? ""
                }
                onChange={(v) =>
                  updateOfPieField("splitPos", v ? Number(v) : undefined)
                }
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          {/* Custom Split Points */}
          <Accordion title="Custom Split Points" defaultExpanded={false}>
            <>
              <FieldRow>
                <FieldGroup label="Custom Split Indices (comma-separated)" style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={(value as OfPieChartSeries).custSplit?.join(", ") ?? ""}
                    onChange={(v) => {
                      const str = String(v).trim();
                      if (!str) {
                        updateOfPieField("custSplit", undefined);
                      } else {
                        const indices = str.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
                        updateOfPieField("custSplit", indices.length > 0 ? indices : undefined);
                      }
                    }}
                    disabled={disabled}
                  />
                </FieldGroup>
              </FieldRow>
            </>
          </Accordion>

          <Accordion title="Series Lines" defaultExpanded={false}>
            <ChartShapePropertiesEditor
              value={(value as OfPieChartSeries).serLines?.shapeProperties}
              onChange={(sp) =>
                updateOfPieField(
                  "serLines",
                  sp ? { shapeProperties: sp } : undefined
                )
              }
              disabled={disabled}
            />
          </Accordion>
        </>
      )}

      {/* Scatter chart specific settings */}
      {isScatterChart && (
        <>
          <FieldRow>
            <FieldGroup label="Scatter Style" style={{ flex: 1 }}>
              <Select
                value={(value as ScatterChartSeries).scatterStyle}
                onChange={(v) =>
                  updateScatterField("scatterStyle", v as ScatterStyle)
                }
                options={scatterStyleOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as ScatterChartSeries).varyColors ?? false}
                onChange={(v) => updateScatterField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {/* Radar chart specific settings */}
      {isRadarChart && (
        <>
          <FieldRow>
            <FieldGroup label="Radar Style" style={{ flex: 1 }}>
              <Select
                value={(value as RadarChartSeries).radarStyle}
                onChange={(v) =>
                  updateRadarField("radarStyle", v as RadarStyle)
                }
                options={radarStyleOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as RadarChartSeries).varyColors ?? false}
                onChange={(v) => updateRadarField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {/* Bubble chart specific settings */}
      {isBubbleChart && (
        <>
          <FieldRow>
            <FieldGroup label="Bubble Scale" style={{ flex: 1 }}>
              <PercentEditor
                value={(value as BubbleChartSeries).bubbleScale ?? pct(100)}
                onChange={(v) => updateBubbleField("bubbleScale", v)}
                disabled={disabled}
                min={0}
                max={300}
              />
            </FieldGroup>
            <FieldGroup label="Size Represents" style={{ flex: 1 }}>
              <Select
                value={(value as BubbleChartSeries).sizeRepresents ?? "area"}
                onChange={(v) =>
                  updateBubbleField(
                    "sizeRepresents",
                    v as BubbleChartSeries["sizeRepresents"]
                  )
                }
                options={sizeRepresentsOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          <FieldRow>
            <FieldGroup label="Show Negative Bubbles" style={{ flex: 1 }}>
              <Toggle
                checked={(value as BubbleChartSeries).showNegBubbles ?? false}
                onChange={(v) => updateBubbleField("showNegBubbles", v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Vary Colors" style={{ flex: 1 }}>
              <Toggle
                checked={(value as BubbleChartSeries).varyColors ?? false}
                onChange={(v) => updateBubbleField("varyColors", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </>
      )}

      {/* Stock chart specific settings */}
      {isStockChart && (
        <>
          <span style={{ color: "var(--text-muted, #888)", fontSize: "12px" }}>
            Stock chart uses line series data
          </span>
        </>
      )}

      {/* Surface chart specific settings */}
      {isSurfaceChart && (
        <>
          <FieldRow>
            <FieldGroup label="Wireframe" style={{ flex: 1 }}>
              <Toggle
                checked={(value as SurfaceChartSeries).wireframe ?? false}
                onChange={(v) => updateSurfaceField("wireframe", v)}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>

          {/* Band Formats */}
          <Accordion title="Band Formats" defaultExpanded={false}>
            <BandFormatsEditor
              value={(value as SurfaceChartSeries).bandFormats}
              onChange={(bf) => updateSurfaceField("bandFormats", bf)}
              disabled={disabled}
            />
          </Accordion>
        </>
      )}

      {/* Drop Lines (for line, area, stock charts) */}
      {hasDropLines && (
        <Accordion title="Drop Lines" defaultExpanded={false}>
          <ChartShapePropertiesEditor
            value={
              (value as LineChartSeries | AreaChartSeries | StockChartSeries)
                .dropLines?.shapeProperties
            }
            onChange={handleDropLinesChange}
            disabled={disabled}
          />
        </Accordion>
      )}

      {/* Hi-Low Lines (for line, stock charts) */}
      {hasHiLowLines && (
        <Accordion title="Hi-Low Lines" defaultExpanded={false}>
          <ChartShapePropertiesEditor
            value={
              (value as LineChartSeries | StockChartSeries).hiLowLines
                ?.shapeProperties
            }
            onChange={handleHiLowLinesChange}
            disabled={disabled}
          />
        </Accordion>
      )}

      {/* Up/Down Bars (for line, stock charts) */}
      {hasUpDownBars && (
        <Accordion title="Up/Down Bars" defaultExpanded={false}>
          <UpDownBarsEditor
            value={
              (value as LineChartSeries | StockChartSeries).upDownBars
            }
            onChange={handleUpDownBarsChange}
            disabled={disabled}
          />
        </Accordion>
      )}

      {/* Data Labels */}
      {showDataLabels && (
        <Accordion title="Data Labels" defaultExpanded={false}>
          <DataLabelsEditor
            value={value.dataLabels ?? createDefaultDataLabels()}
            onChange={(v) => updateField("dataLabels", v)}
            disabled={disabled}
          />
        </Accordion>
      )}
    </div>
  );
}

// ============================================================================
// Helper Editors
// ============================================================================

/**
 * Series Text Editor
 * @see ECMA-376 Part 1, Section 21.2.2.218 (tx)
 */
type SeriesTextEditorProps = EditorProps<SeriesText | undefined>;

function SeriesTextEditor({
  value,
  onChange,
  disabled,
}: SeriesTextEditorProps) {
  const tx = value ?? {};

  const updateField = useCallback(
    <K extends keyof SeriesText>(field: K, newValue: SeriesText[K]) => {
      onChange({ ...tx, [field]: newValue });
    },
    [tx, onChange]
  );

  return (
    <>
      <FieldRow>
        <FieldGroup label="Value" style={{ flex: 1 }}>
          <Input
            type="text"
            value={tx.value ?? ""}
            onChange={(v) => updateField("value", String(v) || undefined)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
      <FieldRow>
        <FieldGroup label="Reference" style={{ flex: 1 }}>
          <Input
            type="text"
            value={tx.reference ?? ""}
            onChange={(v) => updateField("reference", String(v) || undefined)}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>
    </>
  );
}

/**
 * Up/Down Bars Editor
 * @see ECMA-376 Part 1, Section 21.2.2.220 (upDownBars)
 */
type UpDownBarsEditorProps = EditorProps<UpDownBars | undefined>;

function UpDownBarsEditor({
  value,
  onChange,
  disabled,
}: UpDownBarsEditorProps) {
  const bars = value ?? {};

  const updateField = useCallback(
    <K extends keyof UpDownBars>(field: K, newValue: UpDownBars[K]) => {
      onChange({ ...bars, [field]: newValue });
    },
    [bars, onChange]
  );

  return (
    <div style={containerStyle}>
      <>
        <FieldRow>
          <FieldGroup label="Gap Width" style={{ flex: 1 }}>
            <PercentEditor
              value={bars.gapWidth ?? pct(150)}
              onChange={(v) => updateField("gapWidth", v)}
              disabled={disabled}
              min={0}
              max={500}
            />
          </FieldGroup>
        </FieldRow>
      </>

      <Accordion title="Up Bars" defaultExpanded={false}>
        <ChartShapePropertiesEditor
          value={bars.upBars}
          onChange={(sp) => updateField("upBars", sp)}
          disabled={disabled}
        />
      </Accordion>

      <Accordion title="Down Bars" defaultExpanded={false}>
        <ChartShapePropertiesEditor
          value={bars.downBars}
          onChange={(sp) => updateField("downBars", sp)}
          disabled={disabled}
        />
      </Accordion>
    </div>
  );
}

/**
 * Band Formats Editor
 * @see ECMA-376 Part 1, Section 21.2.2.13 (bandFmt)
 */
type BandFormatsEditorProps = EditorProps<readonly BandFormat[] | undefined>;

function BandFormatsEditor({
  value,
  onChange,
  disabled,
}: BandFormatsEditorProps) {
  const bands = value ?? [];

  const handleBandChange = useCallback(
    (index: number, band: BandFormat) => {
      const newBands = [...bands];
      newBands[index] = band;
      onChange(newBands);
    },
    [bands, onChange]
  );

  const handleAddBand = useCallback(() => {
    const newBand: BandFormat = { idx: bands.length };
    onChange([...bands, newBand]);
  }, [bands, onChange]);

  const handleRemoveBand = useCallback(
    (index: number) => {
      const newBands = bands.filter((_, i) => i !== index);
      onChange(newBands.length > 0 ? newBands : undefined);
    },
    [bands, onChange]
  );

  return (
    <div style={containerStyle}>
      <>
        <button
          type="button"
          onClick={handleAddBand}
          disabled={disabled}
          style={{ padding: "6px 12px", marginBottom: "8px", cursor: disabled ? "not-allowed" : "pointer" }}
        >
          Add Band
        </button>
      </>
      {bands.map((band, index) => (
        <Accordion key={band.idx} title={`Band ${band.idx}`} defaultExpanded={false}>
          <>
            <FieldRow>
              <FieldGroup label="Index" style={{ flex: 1 }}>
                <Input
                  type="number"
                  value={band.idx}
                  onChange={(v) => handleBandChange(index, { ...band, idx: Number(v) })}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldRow>
          </>
          <Accordion title="Shape Properties" defaultExpanded={false}>
            <ChartShapePropertiesEditor
              value={band.shapeProperties}
              onChange={(sp) => handleBandChange(index, { ...band, shapeProperties: sp })}
              disabled={disabled}
            />
          </Accordion>
          <>
            <button
              type="button"
              onClick={() => handleRemoveBand(index)}
              disabled={disabled}
              style={{ padding: "6px 12px", cursor: disabled ? "not-allowed" : "pointer", color: "red" }}
            >
              Remove Band
            </button>
          </>
        </Accordion>
      ))}
    </div>
  );
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default bar chart series
 */
export function createDefaultBarChartSeries(): BarChartSeries {
  return {
    type: "barChart",
    index: 0,
    order: 0,
    barDir: "col",
    grouping: "clustered",
    varyColors: false,
    gapWidth: pct(150),
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default line chart series
 */
export function createDefaultLineChartSeries(): LineChartSeries {
  return {
    type: "lineChart",
    index: 0,
    order: 0,
    grouping: "standard",
    varyColors: false,
    marker: true,
    smooth: false,
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default pie chart series
 */
export function createDefaultPieChartSeries(): PieChartSeries {
  return {
    type: "pieChart",
    index: 0,
    order: 0,
    varyColors: true,
    firstSliceAng: deg(0),
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default area chart series
 */
export function createDefaultAreaChartSeries(): AreaChartSeries {
  return {
    type: "areaChart",
    index: 0,
    order: 0,
    grouping: "standard",
    varyColors: false,
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default scatter chart series
 */
export function createDefaultScatterChartSeries(): ScatterChartSeries {
  return {
    type: "scatterChart",
    index: 0,
    order: 0,
    scatterStyle: "lineMarker",
    varyColors: false,
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default radar chart series
 */
export function createDefaultRadarChartSeries(): RadarChartSeries {
  return {
    type: "radarChart",
    index: 0,
    order: 0,
    radarStyle: "standard",
    varyColors: false,
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default bubble chart series
 */
export function createDefaultBubbleChartSeries(): BubbleChartSeries {
  return {
    type: "bubbleChart",
    index: 0,
    order: 0,
    varyColors: false,
    bubbleScale: pct(100),
    showNegBubbles: false,
    sizeRepresents: "area",
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default of-pie chart series
 */
export function createDefaultOfPieChartSeries(): OfPieChartSeries {
  return {
    type: "ofPieChart",
    index: 0,
    order: 0,
    ofPieType: "pie",
    varyColors: true,
    gapWidth: pct(100),
    splitType: "auto",
    secondPieSize: pct(75),
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default stock chart series
 */
export function createDefaultStockChartSeries(): StockChartSeries {
  return {
    type: "stockChart",
    index: 0,
    order: 0,
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default surface chart series
 */
export function createDefaultSurfaceChartSeries(): SurfaceChartSeries {
  return {
    type: "surfaceChart",
    index: 0,
    order: 0,
    wireframe: false,
    series: [],
    dataLabels: createDefaultDataLabels(),
  };
}

/**
 * Create default chart series (bar chart)
 */
export function createDefaultChartSeries(): ChartSeries {
  return createDefaultBarChartSeries();
}
