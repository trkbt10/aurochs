/**
 * @file Chart renderer
 *
 * Main entry point for chart rendering.
 * Converts Chart domain objects to SVG output.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type {
  Chart,
  ChartSeries,
  ChartShapeProperties,
  DataReference,
  DataTable,
  PieSeries,
  RadarSeries,
  BubbleSeries,
  LineSeries,
} from "@oxen-office/chart/domain";
import type { BaseFill } from "@oxen-office/drawing-ml/domain/fill";
import type { ChartRenderContext, FillResolver, GenericTextBody, ResolvedFill } from "./types";
import { escapeHtml } from "./escape-html";
import { toSvgTextAttributes } from "./svg-text";

// Types
import type { ChartContent, BarChartConfig, LineChartConfig, PieChartConfig, ChartLayout } from "./render-types";
export type { DataPoint, SeriesData, ValueAxisConfig, ChartContent, ChartLayout } from "./render-types";
export type { BarChartConfig, LineChartConfig, PieChartConfig } from "./render-types";

// Layout
import { calculateChartLayoutFromData } from "./layout";

// Data extraction
import {
  extractBarSeriesData,
  extractLineSeriesData,
  extractPieSeriesData,
  extractPieExplosions,
  extractScatterSeriesData,
  extractAreaSeriesData,
  extractRadarSeriesData,
  extractBubbleSeriesData,
  extractValueAxisConfig,
  getMultiLevelCategoryLabels,
} from "./data";

// Axis rendering
import {
  drawAxes,
  renderGridlines,
  renderMinorGridlines,
  renderValueAxisLabels,
  renderCategoryAxisLabels,
  renderMultiLevelCategoryAxisLabels,
  renderScatterXAxisLabels,
  renderAxisTitles,
  renderValueAxisTickMarks,
  renderCategoryAxisTickMarks,
  renderDisplayUnitsLabel,
} from "./axis";

// Legend rendering
import { renderLegendAtPosition } from "./legend";

// Data labels
import { renderDataLabels } from "./labels";

// Trendlines
import { renderTrendlines } from "./trendline";

// Error Bars
import { renderAllErrorBars } from "./error-bars";

// Line styling
import { extractLineStyle, toSvgStrokeAttributes } from "./line-style";

// Chart generators
import {
  generateBarChart,
  generateLineChart,
  generatePieChart,
  generateScatterChart,
  generateAreaChart,
  generateRadarChart,
  generateBubbleChart,
  generateStockChart,
  extractStockSeriesData,
  renderUnsupportedChartPlaceholder,
} from "./generators";

// Data table
import { renderDataTable, calculateDataTableHeight } from "./data-table";

function normalizeHexColor(color: string): string {
  if (!color) {return color;}
  if (color.startsWith("#")) {return color;}
  if (/^[0-9A-Fa-f]{6}$/.test(color)) {return `#${color}`;}
  return color;
}

function resolvedFillToColor(fill: ResolvedFill): string | undefined {
  if (fill.type === "solid") {
    return normalizeHexColor(fill.color.hex);
  }
  if (fill.type === "gradient") {
    const first = fill.stops[0];
    if (!first) {return undefined;}
    return normalizeHexColor(first.color.hex);
  }
  return undefined;
}

function getExplicitFillColor(fill: BaseFill | undefined, fillResolver: FillResolver): string | undefined {
  if (!fill) {return undefined;}
  return resolvedFillToColor(fillResolver.resolve(fill));
}

function getTextRunValue(run: GenericTextBody["paragraphs"][number]["runs"][number]): string | undefined {
  if (run.type === "text" || run.type === "field") {
    return run.text;
  }
  return undefined;
}

function getBasePieColors(
  {
    varyColors,
    numDataPoints,
    colors,
    ctx,
  }: {
    varyColors: boolean;
    numDataPoints: number;
    colors: readonly string[];
    ctx: ChartRenderContext;
  }
): string[] {
  if (varyColors) {
    return Array.from({ length: numDataPoints }, (_, i) => ctx.getSeriesColor(i));
  }
  return Array.from({ length: numDataPoints }, () => colors[0]);
}

function getPieExplosions(firstSeries: PieSeries | undefined): number[] {
  if (!firstSeries) {
    return [];
  }
  return [...extractPieExplosions(firstSeries)];
}

function getMultiLevelCategories(
  categories: ReturnType<typeof getFirstSeriesCategories>
): ReturnType<typeof getMultiLevelCategoryLabels> | undefined {
  if (categories) {
    return getMultiLevelCategoryLabels(categories);
  }
  return undefined;
}

function renderIfValueRange(
  valueRange: ChartContent["valueRange"],
  render: (valueRange: NonNullable<ChartContent["valueRange"]>) => string
): string {
  if (valueRange) {
    return render(valueRange);
  }
  return "";
}

function renderIfCategoryLabels(
  categoryLabels: ChartContent["categoryLabels"],
  render: (labels: NonNullable<ChartContent["categoryLabels"]>) => string
): string {
  if (categoryLabels) {
    return render(categoryLabels);
  }
  return "";
}

function renderIfChartType(
  chartType: ChartContent["chartType"],
  render: (type: NonNullable<ChartContent["chartType"]>) => string
): string {
  if (chartType) {
    return render(chartType);
  }
  return "";
}

function renderLegendSvg(
  {
    legendPos,
    chart,
    seriesData,
    colors,
    size,
    ctx,
    fillResolver,
  }: {
    legendPos: ChartLayout["legendPos"];
    chart: Chart;
    seriesData: ChartContent["seriesData"];
    colors: ChartContent["colors"];
    size: { width: number; height: number };
    ctx: ChartRenderContext;
    fillResolver: FillResolver;
  }
): string {
  if (legendPos) {
    return renderLegendAtPosition({
      legend: chart.legend,
      seriesData,
      colors,
      pos: legendPos,
      ctx,
      fillResolver,
      chartDimensions: size,
    });
  }
  return "";
}

/**
 * Render data table below the plot area
 *
 * @see ECMA-376 Part 1, Section 21.2.2.54 (dTable)
 */
function renderDataTableSvg(
  {
    dataTable,
    chartContent,
    layout,
    fillResolver,
  }: {
    dataTable: DataTable | undefined;
    chartContent: ChartContent;
    layout: ChartLayout;
    fillResolver: FillResolver;
  }
): string {
  if (!dataTable) {
    return "";
  }

  const categoryLabels = chartContent.categoryLabels ?? [];
  const dataTableHeight = calculateDataTableHeight(dataTable, chartContent.seriesData.length);

  // Position the data table below the plot area (under category axis labels)
  const dataTableLayout = {
    width: layout.plotWidth,
    height: dataTableHeight,
    x: 0,
    y: layout.plotHeight + 25, // 25px offset for category axis labels
  };

  return renderDataTable({
    dataTable,
    input: {
      seriesData: chartContent.seriesData,
      categoryLabels,
      colors: chartContent.colors,
    },
    layout: dataTableLayout,
    fillResolver,
  });
}

/**
 * Resolve data point colors from dPt styling
 *
 * Per ECMA-376, data points (dPt) can override series-level styling
 * for individual data elements.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.52 (dPt)
 */
function resolveDataPointColors(
  {
    series,
    seriesColor,
    numPoints,
    fillResolver,
  }: {
    series: { readonly dataPoints?: readonly { readonly idx: number; readonly shapeProperties?: ChartShapeProperties }[] };
    seriesColor: string;
    numPoints: number;
    fillResolver: FillResolver;
  }
): readonly string[] {
  return Array.from({ length: numPoints }, (_, i) => {
    const dPt = series.dataPoints?.find((dp) => dp.idx === i);
    if (dPt?.shapeProperties) {
      const pointColor = getExplicitFillColor(dPt.shapeProperties.fill, fillResolver);
      return pointColor ?? seriesColor;
    }
    return seriesColor;
  });
}

// =============================================================================
// Chart Title Rendering
// =============================================================================

/**
 * Extract plain text from ChartTitle
 */
function getChartTitleText(title: Chart["title"]): string | undefined {
  if (!title?.textBody) {
    return undefined;
  }

  const paragraphs = title.textBody.paragraphs ?? [];
  const textParts: string[] = [];

  for (const p of paragraphs) {
    for (const run of p.runs) {
      const text = getTextRunValue(run);
      if (text) {
        textParts.push(text);
      }
    }
  }

  if (textParts.length === 0) {
    return undefined;
  }
  return textParts.join("");
}

/**
 * Default font size for chart title (in pt)
 *
 * Per ECMA-376, the default is implementation-defined.
 * PowerPoint typically uses 14pt for chart titles.
 */
const DEFAULT_CHART_TITLE_FONT_SIZE = 14;


/**
 * Calculate chart title position
 *
 * Uses manualLayout from ECMA-376 when available, otherwise positions
 * the title centered at the top of the chart.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.211 (title)
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */
function calculateTitlePosition(
 {
    title,
    plotWidth,
    plotHeight: _plotHeight,
    chartWidth,
    chartHeight,
  }: {
    title: Chart["title"];
    plotWidth: number;
    plotHeight: number;
    chartWidth: number;
    chartHeight: number;
  }
): { x: number; y: number; anchor: string } {
  const manualLayout = title?.layout?.manualLayout;

  if (manualLayout) {
    if (manualLayout.x !== undefined) {
      if (manualLayout.y !== undefined) {
        // Per ECMA-376, manualLayout uses fractions (0-1) of the chart dimensions
        // The x and y represent the position of the element within the chart space
        const x = manualLayout.x * chartWidth;
        const y = manualLayout.y * chartHeight;

        // Default anchor is "start" for manual positioning
        return { x, y, anchor: "start" };
      }
    }
  }

  // Default: centered above the plot area
  return {
    x: plotWidth / 2,
    y: -10,
    anchor: "middle",
  };
}

/**
 * Render chart title
 *
 * Supports ECMA-376 manual layout positioning and overlay behavior.
 * Text styling is resolved from c:title/c:tx/c:rich (TextBody) following
 * ECMA-376 resolution order.
 *
 * Shape properties (c:spPr) support:
 * - Background fill (a:solidFill, a:gradFill)
 * - Border/line (a:ln)
 *
 * @param chart - Chart domain object
 * @param plotWidth - Plot area width
 * @param plotHeight - Plot area height
 * @param chartWidth - Total chart width
 * @param chartHeight - Total chart height
 * @param ctx - Render context for color resolution
 * @returns SVG elements string
 *
 * @see ECMA-376 Part 1, Section 21.2.2.211 (title)
 * @see ECMA-376 Part 1, Section 21.2.2.213 (tx)
 * @see ECMA-376 Part 1, Section 21.2.2.123 (overlay)
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 */
function renderChartTitle(
  {
    chart,
    plotWidth,
    plotHeight,
    chartWidth,
    chartHeight,
    ctx,
    fillResolver,
  }: {
    chart: Chart;
    plotWidth: number;
    plotHeight: number;
    chartWidth: number;
    chartHeight: number;
    ctx: ChartRenderContext;
    fillResolver: FillResolver;
  }
): string {
  // Check if title should be auto-deleted
  if (chart.autoTitleDeleted) {return "";}

  const titleText = getChartTitleText(chart.title);
  if (!titleText) {return "";}

  // Resolve text styling from title's textBody
  // @see ECMA-376 Part 1, Section 21.2.2.211 (title) - c:txPr or c:tx/c:rich
  const textStyle = ctx.getTextStyle(chart.title?.textBody);
  const fontSize = Math.max(textStyle.fontSize ?? 0, DEFAULT_CHART_TITLE_FONT_SIZE);
  const resolvedTextStyle = { ...textStyle, fontSize };
  const styleAttrs = toSvgTextAttributes(resolvedTextStyle);

  // Calculate position from layout or use default
  const pos = calculateTitlePosition({ title: chart.title, plotWidth, plotHeight, chartWidth, chartHeight });

  const elements: string[] = [];

  // Render background/border from spPr if specified
  // @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
  const spPr = chart.title?.shapeProperties;
  if (spPr) {
    const padding = 4;
    const estimatedWidth = titleText.length * (fontSize * 0.6) + padding * 2;
    const estimatedHeight = fontSize + padding * 2;

    // Calculate background position (centered around text)
    const bgX = pos.anchor === "middle" ? pos.x - estimatedWidth / 2 : pos.x - padding;
    const bgY = pos.y - fontSize - padding;

    // Resolve fill with gradient support
    // @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
    const fillStyle = resolveFillStyle(spPr.fill, fillResolver);

    // Resolve line (border)
    const lineStyle = extractLineStyle(spPr, fillResolver);
    const hasLine = spPr.line !== undefined;

    // Build background rect
    const strokeAttrs = hasLine ? ` ${toSvgStrokeAttributes(lineStyle)}` : ` stroke="none"`;
    elements.push(
      `<rect x="${bgX}" y="${bgY}" width="${estimatedWidth}" height="${estimatedHeight}" fill="${fillStyle}"${strokeAttrs}/>`
    );
  }

  // Render text element
  elements.push(
    `<text x="${pos.x}" y="${pos.y}" text-anchor="${pos.anchor}" ${styleAttrs} fill="${resolvedTextStyle.color}">${escapeHtml(titleText)}</text>`
  );

  return elements.join("");
}

/**
 * Get chart title height for layout calculations
 *
 * Returns the height to reserve for the title when overlay is false.
 * When overlay is true, returns 0 (no space reservation).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.123 (overlay)
 */
// =============================================================================
// Plot Area Background Rendering
// =============================================================================

/**
 * Render plot area background and border
 *
 * Renders the plot area's shape properties (spPr) including:
 * - Fill (solid color, gradient, pattern, or picture)
 * - Line (border styling)
 *
 * @see ECMA-376 Part 1, Section 21.2.2.140 (plotArea)
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
function renderPlotAreaBackground(
  {
    plotArea,
    plotWidth,
    plotHeight,
    fillResolver,
  }: {
    plotArea: Chart["plotArea"];
    plotWidth: number;
    plotHeight: number;
    fillResolver: FillResolver;
  }
): string {
  const spPr = plotArea.shapeProperties;
  if (!spPr) {return "";}

  const elements: string[] = [];

  // Resolve fill with gradient support
  const fillStyle = resolveFillStyle(spPr.fill, fillResolver);

  // Resolve line (border)
  const lineStyle = extractLineStyle(spPr, fillResolver);
  const hasLine = spPr.line !== undefined;

  // Build rect element
  const strokeAttrs = hasLine ? ` ${toSvgStrokeAttributes(lineStyle)}` : ` stroke="none"`;
  elements.push(
    `<rect x="0" y="0" width="${plotWidth}" height="${plotHeight}" fill="${fillStyle}"${strokeAttrs}/>`
  );

  return elements.join("");
}

function resolveFillStyle(
  fill: ChartShapeProperties["fill"] | undefined,
  fillResolver: FillResolver
): string {
  if (!fill) {
    return "none";
  }

  const color = resolvedFillToColor(fillResolver.resolve(fill));
  return color ?? "none";
}

function resolveCategoryAxisLabelsSvg(
  {
    chart,
    layout,
    chartContent,
    multiLevelCategories,
    ctx,
  }: {
    chart: Chart;
    layout: ChartLayout;
    chartContent: ChartContent;
    multiLevelCategories: ReturnType<typeof getMultiLevelCategoryLabels> | undefined;
    ctx: ChartRenderContext;
  }
): string {
  if (multiLevelCategories) {
    return renderMultiLevelCategoryAxisLabels({
      axes: chart.plotArea.axes,
      chartWidth: layout.plotWidth,
      chartHeight: layout.plotHeight,
      multiLevelCategories,
      ctx,
    });
  }

  if (chartContent.chartType === "scatter") {
    if (chartContent.categoryLabels && chartContent.xValueRange) {
      return renderScatterXAxisLabels({
        axes: chart.plotArea.axes,
        chartWidth: layout.plotWidth,
        chartHeight: layout.plotHeight,
        categoryLabels: chartContent.categoryLabels,
        valueRange: chartContent.xValueRange,
        ctx,
      });
    }
    return "";
  }

  if (chartContent.categoryLabels) {
    return renderCategoryAxisLabels({
      axes: chart.plotArea.axes,
      chartWidth: layout.plotWidth,
      chartHeight: layout.plotHeight,
      categoryLabels: chartContent.categoryLabels,
      ctx,
    });
  }

  return "";
}

function renderSeriesTrendlines(
  {
    seriesData,
    plotWidth,
    plotHeight,
    valueRange,
    ctx,
    fillResolver,
  }: {
    seriesData: ChartContent["seriesData"];
    plotWidth: number;
    plotHeight: number;
    valueRange: ChartContent["valueRange"];
    ctx: ChartRenderContext;
    fillResolver: FillResolver;
  }
): string {
  if (!valueRange) {
    return "";
  }

  return seriesData
    .map((series) =>
      renderTrendlines({
        trendlines: series.trendlines,
        seriesData: series,
        chartWidth: plotWidth,
        chartHeight: plotHeight,
        valueRange,
        ctx,
        fillResolver,
      })
    )
    .join("");
}

function renderSeriesErrorBars(
  {
    seriesData,
    plotWidth,
    plotHeight,
    valueRange,
    fillResolver,
  }: {
    seriesData: ChartContent["seriesData"];
    plotWidth: number;
    plotHeight: number;
    valueRange: ChartContent["valueRange"];
    fillResolver: FillResolver;
  }
): string {
  if (!valueRange) {
    return "";
  }

  return seriesData
    .map((series) =>
      renderAllErrorBars({
        errorBarsArray: series.errorBars,
        seriesData: series,
        chartWidth: plotWidth,
        chartHeight: plotHeight,
        valueRange,
        fillResolver,
      })
    )
    .join("");
}

// =============================================================================
// Chart Data Helpers
// =============================================================================

/**
 * Get categories DataReference from the first series of a chart
 *
 * Returns undefined for scatter/bubble charts that use X/Y values instead of categories.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.24 (cat)
 */
function getFirstSeriesCategories(chartSeries: ChartSeries): DataReference | undefined {
  const firstSeries = chartSeries.series[0];
  if (!firstSeries) {return undefined;}

  // Check if the series has categories (bar, line, area, pie, radar, surface, stock)
  if ("categories" in firstSeries) {
    return firstSeries.categories;
  }

  // Scatter and bubble charts don't have categories
  return undefined;
}

// =============================================================================
// Chart Series Rendering
// =============================================================================

/**
 * Render chart series content (without SVG wrapper)
 */
function renderChartSeries(
  {
    chartSeries,
    chartWidth,
    chartHeight,
    axes,
    ctx,
    fillResolver,
  }: {
    chartSeries: ChartSeries;
    chartWidth: number;
    chartHeight: number;
    axes: Chart["plotArea"]["axes"];
    ctx: ChartRenderContext;
    fillResolver: FillResolver;
  }
): ChartContent {
  const axisConfig = extractValueAxisConfig(axes);

  const colors: string[] = chartSeries.series.map((ser, i) => ctx.getSeriesColor(i, ser.shapeProperties?.fill));

  switch (chartSeries.type) {
    case "barChart":
    case "bar3DChart": {
      const data = extractBarSeriesData(chartSeries.series);
      const barConfig: BarChartConfig = {
        barDir: chartSeries.barDir,
        grouping: chartSeries.grouping,
      };
      // Resolve per-point colors from dPt styling
      const pointColors = chartSeries.series.map((ser, s) => {
        const numPoints = ser.values.numRef?.cache?.points.length ?? 0;
        return resolveDataPointColors({ series: ser, seriesColor: colors[s], numPoints, fillResolver });
      });
      // Extract invertIfNegative flags per series
      // @see ECMA-376 Part 1, Section 21.2.2.77 (invertIfNegative)
      const invertIfNegativeFlags = chartSeries.series.map((ser) => ser.invertIfNegative ?? false);
      return generateBarChart({
        data,
        chartWidth,
        chartHeight,
        colors,
        axisConfig,
        barConfig,
        pointColors,
        invertIfNegativeFlags,
      });
    }

    case "lineChart":
    case "line3DChart": {
      const data = extractLineSeriesData(chartSeries.series);
      const lineConfig: LineChartConfig = {
        smooth: chartSeries.smooth,
        marker: chartSeries.marker,
        dropLines: chartSeries.dropLines,
        hiLowLines: chartSeries.hiLowLines,
      };
      return generateLineChart({
        data,
        chartWidth,
        chartHeight,
        colors,
        ctx,
        fillResolver,
        axisConfig,
        lineConfig,
      });
    }

    case "pieChart":
    case "pie3DChart": {
      const data = extractPieSeriesData(chartSeries.series);
      const varyColors = chartSeries.varyColors !== false;
      const numDataPoints = chartSeries.series[0]?.values.numRef?.cache?.points.length ?? 0;
      const firstSeries = chartSeries.series[0];
      // Calculate base colors (either vary by point or series color)
      const basePieColors = getBasePieColors({ varyColors, numDataPoints, colors, ctx });
      // Apply dPt color overrides
      const pieColors = basePieColors.map((baseColor, i) => {
        const dPt = firstSeries?.dataPoints?.find((dp) => dp.idx === i);
        const pointColor = getExplicitFillColor(dPt?.shapeProperties?.fill, fillResolver);
        if (pointColor) {return pointColor;}
        return baseColor;
      });
      const explosions = getPieExplosions(firstSeries as PieSeries | undefined);
      const pieConfig: PieChartConfig = {
        firstSliceAng: chartSeries.firstSliceAng as number | undefined,
        varyColors,
        explosions,
      };
      return generatePieChart({ data, chartWidth, chartHeight, colors: pieColors, isDoughnut: false, config: pieConfig });
    }

    case "doughnutChart": {
      const data = extractPieSeriesData(chartSeries.series);
      const varyColors = chartSeries.varyColors !== false;
      const numDataPoints = chartSeries.series[0]?.values.numRef?.cache?.points.length ?? 0;
      const firstSeries = chartSeries.series[0];
      // Calculate base colors (either vary by point or series color)
      const basePieColors = getBasePieColors({ varyColors, numDataPoints, colors, ctx });
      // Apply dPt color overrides
      const pieColors = basePieColors.map((baseColor, i) => {
        const dPt = firstSeries?.dataPoints?.find((dp) => dp.idx === i);
        const pointColor = getExplicitFillColor(dPt?.shapeProperties?.fill, fillResolver);
        if (pointColor) {return pointColor;}
        return baseColor;
      });
      const explosions = getPieExplosions(firstSeries as PieSeries | undefined);
      const pieConfig: PieChartConfig = {
        firstSliceAng: chartSeries.firstSliceAng as number | undefined,
        holeSize: chartSeries.holeSize as number | undefined,
        varyColors,
        explosions,
      };
      return generatePieChart({ data, chartWidth, chartHeight, colors: pieColors, isDoughnut: true, config: pieConfig });
    }

    case "ofPieChart": {
      // Render pie-of-pie/bar-of-pie chart
      // Currently renders the primary pie portion; secondary chart requires extended implementation
      // @see ECMA-376 Part 1, Section 21.2.2.107 (ofPieChart)
      const data = extractPieSeriesData(chartSeries.series);
      const varyColors = chartSeries.varyColors !== false;
      const numDataPoints = chartSeries.series[0]?.values.numRef?.cache?.points.length ?? 0;
      const firstSeries = chartSeries.series[0];

      // Calculate base colors
      const basePieColors = getBasePieColors({ varyColors, numDataPoints, colors, ctx });

      // Apply dPt color overrides
      const pieColors = basePieColors.map((baseColor, i) => {
        const dPt = firstSeries?.dataPoints?.find((dp) => dp.idx === i);
        const pointColor = getExplicitFillColor(dPt?.shapeProperties?.fill, fillResolver);
        if (pointColor) {return pointColor;}
        return baseColor;
      });

      const explosions = getPieExplosions(firstSeries as PieSeries | undefined);

      // Render as a pie chart (primary pie portion)
      // Full pie-of-pie/bar-of-pie with secondary chart would require split calculations
      const pieConfig: PieChartConfig = {
        firstSliceAng: undefined,
        holeSize: undefined,
        varyColors,
        explosions,
      };
      return generatePieChart({ data, chartWidth, chartHeight, colors: pieColors, isDoughnut: false, config: pieConfig });
    }

    case "scatterChart": {
      const data = extractScatterSeriesData(chartSeries.series);
      // Extract scatter-specific configuration per ECMA-376 21.2.2.158
      const scatterConfig = {
        scatterStyle: chartSeries.scatterStyle,
        markers: chartSeries.series.map((ser) => ser.marker),
        smoothFlags: chartSeries.series.map((ser) => ser.smooth),
      };
      return generateScatterChart({ data, chartWidth, chartHeight, colors, ctx, config: scatterConfig });
    }

    case "areaChart":
    case "area3DChart": {
      const data = extractAreaSeriesData(chartSeries.series);
      return generateAreaChart({ data, chartWidth, chartHeight, colors, axisConfig });
    }

    case "radarChart": {
      const data = extractRadarSeriesData(chartSeries.series as readonly RadarSeries[]);
      return generateRadarChart({
        data,
        chartWidth,
        chartHeight,
        colors,
        config: { radarStyle: chartSeries.radarStyle },
      });
    }

    case "bubbleChart": {
      const data = extractBubbleSeriesData(chartSeries.series as readonly BubbleSeries[]);
      return generateBubbleChart({
        data,
        chartWidth,
        chartHeight,
        colors,
        ctx,
        config: {
          bubbleScale: chartSeries.bubbleScale,
          showNegBubbles: chartSeries.showNegBubbles,
          sizeRepresents: chartSeries.sizeRepresents,
        },
      });
    }

    case "stockChart": {
      const data = extractStockSeriesData(chartSeries.series as readonly LineSeries[]);
      return generateStockChart({
        data,
        chartWidth,
        chartHeight,
        colors,
        fillResolver,
        axisConfig,
        config: {
          dropLines: chartSeries.dropLines,
          hiLowLines: chartSeries.hiLowLines,
          upDownBars: chartSeries.upDownBars,
        },
      });
    }

    case "surfaceChart":
    case "surface3DChart": {
      // Surface charts require 3D rendering which is complex
      // For now, render as unsupported with a clear message
      ctx.warnings.add({
        type: "unsupported",
        message: `Surface chart rendering not yet implemented (${chartSeries.type})`,
        element: "chart",
      });
      return {
        content: renderUnsupportedChartPlaceholder("Surface", chartWidth, chartHeight),
        seriesData: [],
        colors: [...colors],
      };
    }

    default: {
      ctx.warnings.add({
        type: "unsupported",
        message: `Unknown chart type: ${(chartSeries as ChartSeries).type}`,
        element: "chart",
      });
      return {
        content: renderUnsupportedChartPlaceholder("Unknown", chartWidth, chartHeight),
        seriesData: [],
        colors: [],
      };
    }
  }
}

// =============================================================================
// Main Chart Rendering
// =============================================================================

/**
 * Render chart to HTML/SVG
 *
 * Composes the complete chart including:
 * - Plot area with chart data
 * - Legend (if defined)
 * - Gridlines
 * - Axis labels
 * - Data labels
 *
 * @param chart - Chart domain object
 * @param width - Chart width in pixels
 * @param height - Chart height in pixels
 * @param ctx - Render context
 * @returns HTML string containing the chart SVG
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */
export function renderChart(
  {
    chart,
    width,
    height,
    ctx,
    fillResolver,
  }: {
    chart: Chart;
    width: number;
    height: number;
    ctx: ChartRenderContext;
    fillResolver: FillResolver;
  }
): string {
  const firstChart = chart.plotArea.charts[0];
  if (!firstChart) {
    ctx.warnings.add({
      type: "fallback",
      message: "No chart data found",
      element: "chart",
    });
    return `<svg width="${width}" height="${height}"></svg>`;
  }

  const seriesCount = firstChart.series.length;

  const layout = calculateChartLayoutFromData({
    width,
    height,
    plotAreaLayout: chart.plotArea.layout,
    legend: chart.legend,
    seriesCount,
  });

  const chartContent = renderChartSeries({
    chartSeries: firstChart,
    chartWidth: layout.plotWidth,
    chartHeight: layout.plotHeight,
    axes: chart.plotArea.axes,
    ctx,
    fillResolver,
  });

  const minorGridlinesSvg = renderIfValueRange(chartContent.valueRange, (valueRange) =>
    renderMinorGridlines({
      axes: chart.plotArea.axes,
      chartWidth: layout.plotWidth,
      chartHeight: layout.plotHeight,
      valueRange,
      ctx,
    })
  );

  const gridlinesSvg = renderIfValueRange(chartContent.valueRange, (valueRange) =>
    renderGridlines({
      axes: chart.plotArea.axes,
      chartWidth: layout.plotWidth,
      chartHeight: layout.plotHeight,
      valueRange,
      ctx,
    })
  );

  const valueAxisLabelsSvg = renderIfValueRange(chartContent.valueRange, (valueRange) =>
    renderValueAxisLabels({
      axes: chart.plotArea.axes,
      chartHeight: layout.plotHeight,
      valueRange,
      ctx,
      chartWidth: layout.plotWidth,
    })
  );

  // Extract multi-level categories from first series if available
  // @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
  const firstSeriesCategories = getFirstSeriesCategories(firstChart);
  const multiLevelCategories = getMultiLevelCategories(firstSeriesCategories);

  // Render category axis labels
  // Scatter charts use two value axes, so need special handling for X-axis labels
  // @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
  const categoryAxisLabelsSvg = resolveCategoryAxisLabelsSvg({
    chart,
    layout,
    chartContent,
    multiLevelCategories,
    ctx,
  });

  // Render tick marks
  // @see ECMA-376 Part 1, Section 21.2.2.88 (majorTickMark)
  // @see ECMA-376 Part 1, Section 21.2.2.100 (minorTickMark)
  const valueTickMarksSvg = renderIfValueRange(chartContent.valueRange, (valueRange) =>
    renderValueAxisTickMarks({ axes: chart.plotArea.axes, chartHeight: layout.plotHeight, valueRange, ctx })
  );

  const categoryTickMarksSvg = renderIfCategoryLabels(chartContent.categoryLabels, (labels) =>
    renderCategoryAxisTickMarks({
      axes: chart.plotArea.axes,
      chartWidth: layout.plotWidth,
      chartHeight: layout.plotHeight,
      numCategories: labels.length,
      ctx,
    })
  );

  const dataLabelsSvg = renderIfChartType(chartContent.chartType, (chartType) =>
    renderDataLabels({
      dataLabels: firstChart.dataLabels,
      seriesData: chartContent.seriesData,
      chartType,
      chartWidth: layout.plotWidth,
      chartHeight: layout.plotHeight,
      ctx,
      fillResolver,
      valueRange: chartContent.valueRange,
      isHorizontal: chartContent.isHorizontal,
    })
  );

  // Render trendlines for each series
  // @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
  const trendlinesSvg = renderSeriesTrendlines({
    seriesData: chartContent.seriesData,
    plotWidth: layout.plotWidth,
    plotHeight: layout.plotHeight,
    valueRange: chartContent.valueRange,
    ctx,
    fillResolver,
  });

  // Render error bars for each series
  // @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
  const errorBarsSvg = renderSeriesErrorBars({
    seriesData: chartContent.seriesData,
    plotWidth: layout.plotWidth,
    plotHeight: layout.plotHeight,
    valueRange: chartContent.valueRange,
    fillResolver,
  });

  const axisTitlesSvg = renderAxisTitles({ axes: chart.plotArea.axes, chartWidth: layout.plotWidth, chartHeight: layout.plotHeight, ctx });

  // Render display units label (e.g., "Millions") for value axis
  const displayUnitsLabelSvg = renderDisplayUnitsLabel(
    chart.plotArea.axes,
    ctx
  );

  const chartTitleSvg = renderChartTitle({
    chart,
    plotWidth: layout.plotWidth,
    plotHeight: layout.plotHeight,
    chartWidth: width,
    chartHeight: height,
    ctx,
    fillResolver,
  });

  // Render plot area background and border
  // @see ECMA-376 Part 1, Section 21.2.2.140 (plotArea)
  const plotAreaBackgroundSvg = renderPlotAreaBackground({
    plotArea: chart.plotArea,
    plotWidth: layout.plotWidth,
    plotHeight: layout.plotHeight,
    fillResolver,
  });

  // Render axis lines with spPr styling
  // @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
  // @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
  const axisLinesSvg = drawAxes({ chartWidth: layout.plotWidth, chartHeight: layout.plotHeight, axes: chart.plotArea.axes, ctx });

  const legendSvg = renderLegendSvg({
    legendPos: layout.legendPos,
    chart,
    seriesData: chartContent.seriesData,
    colors: chartContent.colors,
    size: { width, height },
    ctx,
    fillResolver,
  });

  // Render data table if present
  // @see ECMA-376 Part 1, Section 21.2.2.54 (dTable)
  const dataTableSvg = renderDataTableSvg({ dataTable: chart.plotArea.dataTable, chartContent, layout, fillResolver });

  const svg =
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
    `<g transform="translate(${layout.plotLeft}, ${layout.plotTop})">` +
    plotAreaBackgroundSvg +
    chartTitleSvg +
    minorGridlinesSvg +
    gridlinesSvg +
    axisLinesSvg +
    chartContent.content +
    errorBarsSvg +
    trendlinesSvg +
    valueTickMarksSvg +
    categoryTickMarksSvg +
    valueAxisLabelsSvg +
    categoryAxisLabelsSvg +
    axisTitlesSvg +
    displayUnitsLabelSvg +
    dataLabelsSvg +
    dataTableSvg +
    `</g>` +
    legendSvg +
    `</svg>`;

  return svg;
}

/**
 * Check if chart has renderable data
 */
export function hasChartData(chart: Chart): boolean {
  return chart.plotArea.charts.length > 0;
}
