/**
 * @file Chart domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { Fill, Line } from "./color/types";
import type { TextBody } from "./text";
import type { Degrees, Percent, Pixels, Points } from "./types";

// =============================================================================
// Chart Type Enumeration
// =============================================================================

/**
 * Chart type
 * @see ECMA-376 Part 1, Section 21.2.2 (chart element types)
 */
export type ChartType =
  | "areaChart"
  | "area3DChart"
  | "barChart"
  | "bar3DChart"
  | "bubbleChart"
  | "doughnutChart"
  | "lineChart"
  | "line3DChart"
  | "ofPieChart"
  | "pieChart"
  | "pie3DChart"
  | "radarChart"
  | "scatterChart"
  | "stockChart"
  | "surface3DChart"
  | "surfaceChart";

/**
 * Bar/Column chart direction
 * @see ECMA-376 Part 1, Section 21.2.3.3 (ST_BarDir)
 */
export type BarDirection = "bar" | "col";

/**
 * Bar/Column chart grouping
 * @see ECMA-376 Part 1, Section 21.2.3.4 (ST_BarGrouping)
 */
export type BarGrouping = "clustered" | "stacked" | "percentStacked" | "standard";

/**
 * Line/Area chart grouping
 * @see ECMA-376 Part 1, Section 21.2.3.17 (ST_Grouping)
 */
export type Grouping = "percentStacked" | "stacked" | "standard";

/**
 * Scatter chart style
 * @see ECMA-376 Part 1, Section 21.2.3.37 (ST_ScatterStyle)
 */
export type ScatterStyle = "line" | "lineMarker" | "marker" | "none" | "smooth" | "smoothMarker";

/**
 * Radar chart style
 * @see ECMA-376 Part 1, Section 21.2.3.32 (ST_RadarStyle)
 */
export type RadarStyle = "standard" | "marker" | "filled";

// =============================================================================
// Chart Structure Types
// =============================================================================

/**
 * Complete chart definition
 * @see ECMA-376 Part 1, Section 21.2.2.27 (chartSpace)
 */
export type Chart = {
  readonly title?: ChartTitle;
  readonly autoTitleDeleted?: boolean;
  readonly pivotFormats?: PivotFormats;
  readonly view3D?: View3D;
  readonly floor?: ChartSurface;
  readonly sideWall?: ChartSurface;
  readonly backWall?: ChartSurface;
  readonly plotArea: PlotArea;
  readonly legend?: Legend;
  readonly plotVisOnly?: boolean;
  readonly dispBlanksAs?: "gap" | "span" | "zero";
  readonly showDataLabelsOverMax?: boolean;
  readonly style?: number; // Chart style index
  readonly externalData?: {
    readonly resourceId: string;
    readonly autoUpdate?: boolean;
  };
  readonly date1904?: boolean;
  readonly roundedCorners?: boolean;
  readonly pivotSource?: PivotSource;
  readonly protection?: ChartProtection;
  readonly printSettings?: PrintSettings;
  readonly userShapes?: string;
};

/**
 * Chart title
 * @see ECMA-376 Part 1, Section 21.2.2.211 (title)
 */
export type ChartTitle = {
  readonly textBody?: TextBody;
  readonly layout?: Layout;
  readonly overlay?: boolean;
  readonly shapeProperties?: ChartShapeProperties;
};

/**
 * Manual layout positioning
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 */
export type Layout = {
  readonly manualLayout?: ManualLayout;
};

/**
 * Manual layout dimensions
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */
export type ManualLayout = {
  readonly layoutTarget?: "inner" | "outer";
  readonly xMode?: "edge" | "factor";
  readonly yMode?: "edge" | "factor";
  readonly wMode?: "edge" | "factor";
  readonly hMode?: "edge" | "factor";
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
};

/**
 * Plot area containing chart data
 * @see ECMA-376 Part 1, Section 21.2.2.140 (plotArea)
 */
export type PlotArea = {
  readonly layout?: Layout;
  readonly charts: readonly ChartSeries[];
  readonly axes: readonly Axis[];
  readonly dataTable?: DataTable;
  readonly shapeProperties?: ChartShapeProperties;
};

// =============================================================================
// Chart Series Types
// =============================================================================

/**
 * Base chart series with common properties
 */
export type ChartSeriesBase = {
  readonly index: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly dataLabels?: DataLabels;
};

/**
 * Area chart series
 */
export type AreaChartSeries = ChartSeriesBase & {
  readonly type: "areaChart" | "area3DChart";
  readonly grouping: Grouping;
  readonly varyColors?: boolean;
  readonly gapDepth?: Percent;
  readonly series: readonly AreaSeries[];
  readonly dropLines?: ChartLines;
};

/**
 * Bar chart series
 */
export type BarChartSeries = ChartSeriesBase & {
  readonly type: "barChart" | "bar3DChart";
  readonly barDir: BarDirection;
  readonly grouping: BarGrouping;
  readonly varyColors?: boolean;
  readonly gapWidth?: Percent;
  readonly gapDepth?: Percent;
  readonly shape?: "cone" | "coneToMax" | "box" | "cylinder" | "pyramid" | "pyramidToMax";
  readonly overlap?: number; // -100 to 100
  readonly series: readonly BarSeries[];
};

/**
 * Line chart series
 */
export type LineChartSeries = ChartSeriesBase & {
  readonly type: "lineChart" | "line3DChart";
  readonly grouping: Grouping;
  readonly varyColors?: boolean;
  readonly gapDepth?: Percent;
  readonly series: readonly LineSeries[];
  readonly dropLines?: ChartLines;
  readonly hiLowLines?: ChartLines;
  readonly upDownBars?: UpDownBars;
  readonly marker?: boolean;
  readonly smooth?: boolean;
};

/**
 * Pie chart series
 */
export type PieChartSeries = ChartSeriesBase & {
  readonly type: "pieChart" | "pie3DChart" | "doughnutChart";
  readonly varyColors?: boolean;
  readonly series: readonly PieSeries[];
  readonly firstSliceAng?: Degrees;
  readonly holeSize?: Percent; // For doughnut
};

/**
 * Pie-of-pie or bar-of-pie chart type
 * @see ECMA-376 Part 1, Section 21.2.3.28 (ST_OfPieType)
 */
export type OfPieType = "pie" | "bar";

/**
 * Split type for pie-of-pie/bar-of-pie charts
 * @see ECMA-376 Part 1, Section 21.2.3.40 (ST_SplitType)
 */
export type OfPieSplitType = "auto" | "cust" | "percent" | "pos" | "val";

/**
 * Pie-of-Pie or Bar-of-Pie chart series
 * @see ECMA-376 Part 1, Section 21.2.2.107 (ofPieChart)
 */
export type OfPieChartSeries = ChartSeriesBase & {
  readonly type: "ofPieChart";
  /** Whether this is pie-of-pie or bar-of-pie */
  readonly ofPieType: OfPieType;
  readonly varyColors?: boolean;
  readonly series: readonly PieSeries[];
  /** Gap between primary and secondary chart (percent) */
  readonly gapWidth?: Percent;
  /** How data is split between primary and secondary */
  readonly splitType?: OfPieSplitType;
  /** Split position value (interpretation depends on splitType) */
  readonly splitPos?: number;
  /** Custom split points (indices of data points to show in secondary) */
  readonly custSplit?: readonly number[];
  /** Size of second pie/bar as percentage of first */
  readonly secondPieSize?: Percent;
  /** Show series lines connecting primary to secondary */
  readonly serLines?: ChartLines;
};

/**
 * Scatter chart series
 */
export type ScatterChartSeries = ChartSeriesBase & {
  readonly type: "scatterChart";
  readonly scatterStyle: ScatterStyle;
  readonly varyColors?: boolean;
  readonly series: readonly ScatterSeries[];
};

/**
 * Radar chart series
 */
export type RadarChartSeries = ChartSeriesBase & {
  readonly type: "radarChart";
  readonly radarStyle: RadarStyle;
  readonly varyColors?: boolean;
  readonly series: readonly RadarSeries[];
};

/**
 * Bubble chart series
 */
export type BubbleChartSeries = ChartSeriesBase & {
  readonly type: "bubbleChart";
  readonly varyColors?: boolean;
  readonly bubbleScale?: Percent;
  readonly showNegBubbles?: boolean;
  readonly sizeRepresents?: "area" | "w";
  readonly series: readonly BubbleSeries[];
};

/**
 * Stock chart series
 * @see ECMA-376 Part 1, Section 21.2.2.200 (stockChart)
 */
export type StockChartSeries = ChartSeriesBase & {
  readonly type: "stockChart";
  readonly series: readonly LineSeries[];
  readonly dropLines?: ChartLines;
  readonly hiLowLines?: ChartLines;
  readonly upDownBars?: UpDownBars;
};

/**
 * Surface chart series
 * @see ECMA-376 Part 1, Section 21.2.2.189 (surfaceChart)
 * @see ECMA-376 Part 1, Section 21.2.2.188 (surface3DChart)
 */
export type SurfaceChartSeries = ChartSeriesBase & {
  readonly type: "surfaceChart" | "surface3DChart";
  readonly wireframe?: boolean;
  readonly series: readonly SurfaceSeries[];
  readonly bandFormats?: readonly BandFormat[];
};

/**
 * Union of all chart series types
 */
export type ChartSeries =
  | AreaChartSeries
  | BarChartSeries
  | LineChartSeries
  | PieChartSeries
  | OfPieChartSeries
  | ScatterChartSeries
  | RadarChartSeries
  | BubbleChartSeries
  | StockChartSeries
  | SurfaceChartSeries;

// =============================================================================
// Individual Series Types
// =============================================================================

/**
 * Series text reference
 * @see ECMA-376 Part 1, Section 21.2.2.218 (tx)
 */
export type SeriesText = {
  readonly value?: string;
  readonly reference?: string; // Cell reference
};

/**
 * Area series
 */
export type AreaSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly marker?: Marker;
  readonly dataPoints?: readonly DataPoint[];
  readonly categories: DataReference;
  readonly values: DataReference;
  /** @see ECMA-376 Part 1, Section 21.2.2.209 (trendline) */
  readonly trendlines?: readonly Trendline[];
  /** @see ECMA-376 Part 1, Section 21.2.2.58 (errBars) */
  readonly errorBars?: readonly ErrorBars[];
};

/**
 * Bar series
 */
export type BarSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly invertIfNegative?: boolean;
  readonly dataPoints?: readonly DataPoint[];
  readonly categories: DataReference;
  readonly values: DataReference;
  /** @see ECMA-376 Part 1, Section 21.2.2.209 (trendline) */
  readonly trendlines?: readonly Trendline[];
  /** @see ECMA-376 Part 1, Section 21.2.2.58 (errBars) */
  readonly errorBars?: readonly ErrorBars[];
};

/**
 * Line series
 */
export type LineSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly marker?: Marker;
  readonly dataPoints?: readonly DataPoint[];
  readonly categories: DataReference;
  readonly values: DataReference;
  readonly smooth?: boolean;
  /** @see ECMA-376 Part 1, Section 21.2.2.209 (trendline) */
  readonly trendlines?: readonly Trendline[];
  /** @see ECMA-376 Part 1, Section 21.2.2.58 (errBars) */
  readonly errorBars?: readonly ErrorBars[];
};

/**
 * Pie series
 * @see ECMA-376 Part 1, Section 21.2.2.138 (pieSer)
 */
export type PieSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly dataPoints?: readonly DataPoint[];
  readonly categories: DataReference;
  readonly values: DataReference;
  readonly explosion?: Percent;
};

/**
 * Scatter series
 */
export type ScatterSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly marker?: Marker;
  readonly dataPoints?: readonly DataPoint[];
  readonly xValues: DataReference;
  readonly yValues: DataReference;
  readonly smooth?: boolean;
  /** @see ECMA-376 Part 1, Section 21.2.2.209 (trendline) */
  readonly trendlines?: readonly Trendline[];
  /** @see ECMA-376 Part 1, Section 21.2.2.58 (errBars) */
  readonly errorBars?: readonly ErrorBars[];
};

/**
 * Radar series
 */
export type RadarSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly marker?: Marker;
  readonly dataPoints?: readonly DataPoint[];
  readonly categories: DataReference;
  readonly values: DataReference;
};

/**
 * Bubble series
 * @see ECMA-376 Part 1, Section 21.2.2.19 (bubbleSer)
 */
export type BubbleSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly invertIfNegative?: boolean;
  readonly dataPoints?: readonly DataPoint[];
  readonly xValues: DataReference;
  readonly yValues: DataReference;
  readonly bubbleSize: DataReference;
  readonly bubble3D?: boolean;
};

/**
 * Surface series
 * @see ECMA-376 Part 1, Section 21.2.2.189 (surfaceChart)
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */
export type SurfaceSeries = {
  readonly idx: number;
  readonly order: number;
  readonly tx?: SeriesText;
  readonly shapeProperties?: ChartShapeProperties;
  readonly categories: DataReference;
  readonly values: DataReference;
};

// =============================================================================
// Data Types
// =============================================================================

/**
 * Data reference (categories or values)
 * @see ECMA-376 Part 1, Section 21.2.2.24 (cat), Section 21.2.2.229 (val)
 */
export type DataReference = {
  readonly numRef?: NumericReference;
  readonly strRef?: StringReference;
  readonly numLit?: NumericLiteral;
  readonly strLit?: StringLiteral;
  /** Multi-level string reference for hierarchical categories */
  readonly multiLvlStrRef?: MultiLevelStringReference;
};

/**
 * Numeric reference to external data
 */
export type NumericReference = {
  readonly formula: string;
  readonly cache?: NumericCache;
};

/**
 * String reference to external data
 */
export type StringReference = {
  readonly formula: string;
  readonly cache?: StringCache;
};

/**
 * Numeric data cache
 */
export type NumericCache = {
  readonly formatCode?: string;
  readonly count: number;
  readonly points: readonly NumericPoint[];
};

/**
 * String data cache
 */
export type StringCache = {
  readonly count: number;
  readonly points: readonly StringPoint[];
};

/**
 * Numeric literal (embedded data)
 */
export type NumericLiteral = {
  readonly formatCode?: string;
  readonly count: number;
  readonly points: readonly NumericPoint[];
};

/**
 * String literal (embedded data)
 */
export type StringLiteral = {
  readonly count: number;
  readonly points: readonly StringPoint[];
};

/**
 * Numeric data point
 */
export type NumericPoint = {
  readonly idx: number;
  readonly value: number;
  readonly formatCode?: string;
};

/**
 * String data point
 */
export type StringPoint = {
  readonly idx: number;
  readonly value: string;
};

/**
 * Multi-level string reference for hierarchical categories
 * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
 */
export type MultiLevelStringReference = {
  readonly formula: string;
  readonly cache?: MultiLevelStringCache;
};

/**
 * Multi-level string cache containing hierarchical levels
 * @see ECMA-376 Part 1, Section 21.2.2.103 (multiLvlStrCache)
 */
export type MultiLevelStringCache = {
  readonly count: number;
  readonly levels: readonly MultiLevelStringLevel[];
};

/**
 * Single level in multi-level category hierarchy
 * @see ECMA-376 Part 1, Section 21.2.2.95 (lvl)
 */
export type MultiLevelStringLevel = {
  readonly points: readonly StringPoint[];
};

/**
 * Individual data point styling
 * @see ECMA-376 Part 1, Section 21.2.2.52 (dPt)
 */
export type DataPoint = {
  readonly idx: number;
  readonly invertIfNegative?: boolean;
  readonly marker?: Marker;
  readonly bubble3D?: boolean;
  readonly explosion?: Percent;
  readonly shapeProperties?: ChartShapeProperties;
};

// =============================================================================
// Chart Component Types
// =============================================================================

/**
 * Data marker
 * @see ECMA-376 Part 1, Section 21.2.2.97 (marker)
 */
export type Marker = {
  readonly symbol: "circle" | "dash" | "diamond" | "dot" | "none" | "picture" | "plus" | "square" | "star" | "triangle" | "x";
  readonly size?: Points;
  readonly shapeProperties?: ChartShapeProperties;
};

/**
 * Data labels
 * @see ECMA-376 Part 1, Section 21.2.2.49 (dLbls)
 */
export type DataLabels = {
  readonly labels?: readonly DataLabel[];
  readonly delete?: boolean;
  readonly showLegendKey?: boolean;
  readonly showVal?: boolean;
  readonly showCatName?: boolean;
  readonly showSerName?: boolean;
  readonly showPercent?: boolean;
  readonly showBubbleSize?: boolean;
  readonly separator?: string;
  readonly position?: "bestFit" | "b" | "ctr" | "inBase" | "inEnd" | "l" | "outEnd" | "r" | "t";
  readonly numFormat?: string;
  readonly shapeProperties?: ChartShapeProperties;
  readonly textProperties?: TextBody;
  /**
   * Show leader lines connecting labels to data points
   * Primarily used for pie charts with external labels
   * @see ECMA-376 Part 1, Section 21.2.2.184 (showLeaderLines)
   */
  readonly showLeaderLines?: boolean;
  /**
   * Leader line styling
   * @see ECMA-376 Part 1, Section 21.2.2.91 (leaderLines)
   */
  readonly leaderLines?: ChartLines;
};

/**
 * Single data label (c:dLbl)
 * @see ECMA-376 Part 1, Section 21.2.2.47 (dLbl)
 */
export type DataLabel = {
  readonly idx: number;
  readonly delete?: boolean;
  readonly layout?: Layout;
  readonly text?: TextBody;
  readonly numFormat?: string;
  readonly shapeProperties?: ChartShapeProperties;
  readonly textProperties?: TextBody;
  readonly position?: "bestFit" | "b" | "ctr" | "inBase" | "inEnd" | "l" | "outEnd" | "r" | "t";
  readonly showLegendKey?: boolean;
  readonly showVal?: boolean;
  readonly showCatName?: boolean;
  readonly showSerName?: boolean;
  readonly showPercent?: boolean;
  readonly showBubbleSize?: boolean;
  readonly separator?: string;
};

/**
 * Chart data table (c:dTable)
 * @see ECMA-376 Part 1, Section 21.2.2.54 (dTable)
 */
export type DataTable = {
  readonly showHorzBorder?: boolean;
  readonly showVertBorder?: boolean;
  readonly showOutline?: boolean;
  readonly showKeys?: boolean;
  readonly shapeProperties?: ChartShapeProperties;
  readonly textProperties?: TextBody;
};

/**
 * View 3D settings
 * @see ECMA-376 Part 1, Section 21.2.2.228 (view3D)
 */
export type View3D = {
  readonly rotX?: Degrees;
  readonly hPercent?: Percent;
  readonly rotY?: Degrees;
  readonly depthPercent?: Percent;
  readonly rAngAx?: boolean;
  readonly perspective?: number;
};

/**
 * Chart surface (floor, side wall, back wall)
 * @see ECMA-376 Part 1, Section 21.2.2.11 (backWall)
 */
export type ChartSurface = {
  readonly thickness?: Percent;
  readonly shapeProperties?: ChartShapeProperties;
  readonly pictureOptions?: PictureOptions;
};

/**
 * Picture options for chart surfaces
 * @see ECMA-376 Part 1, Section 21.2.2.138 (pictureOptions)
 */
export type PictureOptions = {
  readonly applyToFront?: boolean;
  readonly applyToSides?: boolean;
  readonly applyToEnd?: boolean;
  readonly pictureFormat?: PictureFormat;
  readonly pictureStackUnit?: number;
};

/**
 * Picture format for chart surfaces
 * @see ECMA-376 Part 1, Section 21.2.2.137 (pictureFormat)
 */
export type PictureFormat = "stretch" | "stack" | "stackScale";

/**
 * Surface band format
 * @see ECMA-376 Part 1, Section 21.2.2.13 (bandFmt)
 */
export type BandFormat = {
  readonly idx: number;
  readonly shapeProperties?: ChartShapeProperties;
};

/**
 * Pivot source information
 * @see ECMA-376 Part 1, Section 21.2.2.144 (pivotSource)
 */
export type PivotSource = {
  readonly name: string;
  readonly fmtId: number;
};

/**
 * Pivot format definition
 * @see ECMA-376 Part 1, Section 21.2.2.142 (pivotFmt)
 */
export type PivotFormat = {
  readonly idx: number;
  readonly shapeProperties?: ChartShapeProperties;
  readonly textProperties?: TextBody;
  readonly marker?: Marker;
  readonly dataLabel?: DataLabel;
};

/**
 * Pivot formats collection
 * @see ECMA-376 Part 1, Section 21.2.2.143 (pivotFmts)
 */
export type PivotFormats = {
  readonly formats: readonly PivotFormat[];
};

/**
 * Chart protection settings
 * @see ECMA-376 Part 1, Section 21.2.2.149 (protection)
 */
export type ChartProtection = {
  readonly chartObject?: boolean;
  readonly data?: boolean;
  readonly formatting?: boolean;
  readonly selection?: boolean;
  readonly userInterface?: boolean;
};

/**
 * Header and footer strings
 * @see ECMA-376 Part 1, Section 21.2.2.79 (headerFooter)
 */
export type HeaderFooter = {
  readonly oddHeader?: string;
  readonly oddFooter?: string;
  readonly evenHeader?: string;
  readonly evenFooter?: string;
  readonly firstHeader?: string;
  readonly firstFooter?: string;
  readonly alignWithMargins?: boolean;
  readonly differentOddEven?: boolean;
  readonly differentFirst?: boolean;
};

/**
 * Page margins for chart printing
 * @see ECMA-376 Part 1, Section 21.2.2.133 (pageMargins)
 */
export type PageMargins = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly header: number;
  readonly footer: number;
};

/**
 * Page setup for chart printing
 * @see ECMA-376 Part 1, Section 21.2.2.134 (pageSetup)
 */
export type PageSetup = {
  readonly paperSize?: number;
  readonly paperHeight?: number;
  readonly paperWidth?: number;
  readonly firstPageNumber?: number;
  readonly orientation?: "default" | "portrait" | "landscape";
  readonly blackAndWhite?: boolean;
  readonly draft?: boolean;
  readonly useFirstPageNumber?: boolean;
  readonly horizontalDpi?: number;
  readonly verticalDpi?: number;
  readonly copies?: number;
};

/**
 * Print settings for charts
 * @see ECMA-376 Part 1, Section 21.2.2.148 (printSettings)
 */
export type PrintSettings = {
  readonly headerFooter?: HeaderFooter;
  readonly pageMargins?: PageMargins;
  readonly pageSetup?: PageSetup;
};

/**
 * Chart lines (drop lines, hi-low lines, etc.)
 */
export type ChartLines = {
  readonly shapeProperties?: ChartShapeProperties;
};

/**
 * Up/Down bars for stock charts
 */
export type UpDownBars = {
  readonly gapWidth?: Percent;
  readonly upBars?: ChartShapeProperties;
  readonly downBars?: ChartShapeProperties;
};

/**
 * Trendline type
 * @see ECMA-376 Part 1, Section 21.2.3.51 (ST_TrendlineType)
 */
export type TrendlineType = "exp" | "linear" | "log" | "movingAvg" | "poly" | "power";

/**
 * Trendline label
 * @see ECMA-376 Part 1, Section 21.2.2.210 (trendlineLbl)
 */
export type TrendlineLabel = {
  /** Layout for positioning */
  readonly layout?: Layout;
  /** Custom text content */
  readonly text?: TextBody;
  /** Number format for values */
  readonly numFormat?: string;
  /** Shape properties for background/border */
  readonly shapeProperties?: ChartShapeProperties;
  /** Text properties for styling */
  readonly textProperties?: TextBody;
};

/**
 * Trendline
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 */
export type Trendline = {
  /** Trendline name */
  readonly name?: string;
  /** Trendline type */
  readonly trendlineType: TrendlineType;
  /** Polynomial order (2-6, required for poly type) */
  readonly order?: number;
  /** Moving average period (required for movingAvg type) */
  readonly period?: number;
  /** Forecast forward distance (category units) */
  readonly forward?: number;
  /** Forecast backward distance (category units) */
  readonly backward?: number;
  /** Y-intercept value (forces trendline through this y value) */
  readonly intercept?: number;
  /** Display R-squared value on chart */
  readonly dispRSqr?: boolean;
  /** Display equation on chart */
  readonly dispEq?: boolean;
  /** Shape properties (line style) */
  readonly shapeProperties?: ChartShapeProperties;
  /** Trendline label (for equation/R² display) */
  readonly trendlineLabel?: TrendlineLabel;
};

/**
 * Error bar direction
 * @see ECMA-376 Part 1, Section 21.2.3.17 (ST_ErrDir)
 */
export type ErrorBarDirection = "x" | "y";

/**
 * Error bar type (which direction to show error)
 * @see ECMA-376 Part 1, Section 21.2.3.18 (ST_ErrBarType)
 */
export type ErrorBarType = "both" | "minus" | "plus";

/**
 * Error value type (how error values are calculated)
 * @see ECMA-376 Part 1, Section 21.2.3.19 (ST_ErrValType)
 */
export type ErrorValueType = "cust" | "fixedVal" | "percentage" | "stdDev" | "stdErr";

/**
 * Error bars
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 */
export type ErrorBars = {
  /** Error bar direction (x or y axis) */
  readonly errDir?: ErrorBarDirection;
  /** Error bar type (both, minus, plus) */
  readonly errBarType: ErrorBarType;
  /** Error value type */
  readonly errValType: ErrorValueType;
  /** Whether to hide end caps */
  readonly noEndCap?: boolean;
  /** Fixed error value (for fixedVal/percentage/stdDev types) */
  readonly val?: number;
  /** Custom plus values (for cust type) */
  readonly plus?: DataReference;
  /** Custom minus values (for cust type) */
  readonly minus?: DataReference;
  /** Shape properties */
  readonly shapeProperties?: ChartShapeProperties;
};

/**
 * Legend entry for per-entry formatting
 *
 * Allows individual legend entries to be formatted differently or deleted.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 */
export type LegendEntry = {
  /** Index of the series this entry refers to */
  readonly idx: number;
  /** Whether to delete/hide this entry */
  readonly delete?: boolean;
  /** Text properties for this entry */
  readonly textProperties?: TextBody;
};

/**
 * Legend
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 */
export type Legend = {
  readonly position: "b" | "l" | "r" | "t" | "tr";
  readonly layout?: Layout;
  readonly overlay?: boolean;
  readonly shapeProperties?: ChartShapeProperties;
  readonly textProperties?: TextBody;
  /** Per-entry formatting overrides */
  readonly entries?: readonly LegendEntry[];
};

// =============================================================================
// Axis Types
// =============================================================================

/**
 * Axis type discriminator
 */
export type AxisType = "catAx" | "valAx" | "dateAx" | "serAx";

/**
 * Axis position
 * @see ECMA-376 Part 1, Section 21.2.3.2 (ST_AxPos)
 */
export type AxisPosition = "b" | "l" | "r" | "t";

/**
 * Axis orientation
 * @see ECMA-376 Part 1, Section 21.2.3.25 (ST_Orientation)
 */
export type AxisOrientation = "maxMin" | "minMax";

/**
 * Tick mark style
 * @see ECMA-376 Part 1, Section 21.2.3.43 (ST_TickMark)
 */
export type TickMark = "cross" | "in" | "none" | "out";

/**
 * Tick label position
 * @see ECMA-376 Part 1, Section 21.2.3.44 (ST_TickLblPos)
 */
export type TickLabelPosition = "high" | "low" | "nextTo" | "none";

/**
 * Cross-between value
 * @see ECMA-376 Part 1, Section 21.2.3.12 (ST_CrossBetween)
 */
export type CrossBetween = "between" | "midCat";

/**
 * Crosses position
 * @see ECMA-376 Part 1, Section 21.2.3.13 (ST_Crosses)
 */
export type Crosses = "autoZero" | "max" | "min";

/**
 * Base axis properties
 */
export type AxisBase = {
  readonly id: number;
  readonly position: AxisPosition;
  readonly orientation: AxisOrientation;
  readonly delete?: boolean;
  readonly majorTickMark: TickMark;
  readonly minorTickMark: TickMark;
  readonly tickLabelPosition: TickLabelPosition;
  readonly title?: ChartTitle;
  readonly numFormat?: string;
  readonly majorGridlines?: ChartLines;
  readonly minorGridlines?: ChartLines;
  readonly shapeProperties?: ChartShapeProperties;
  readonly textProperties?: TextBody;
  readonly crossAxisId: number;
  readonly crosses?: Crosses;
  readonly crossesAt?: number;
};

/**
 * Category axis
 * @see ECMA-376 Part 1, Section 21.2.2.25 (catAx)
 */
export type CategoryAxis = AxisBase & {
  readonly type: "catAx";
  readonly auto?: boolean;
  readonly labelAlignment?: "ctr" | "l" | "r";
  readonly labelOffset?: Percent;
  readonly tickLabelSkip?: number;
  readonly tickMarkSkip?: number;
  readonly noMultiLevelLabels?: boolean;
};

/**
 * Value axis
 * @see ECMA-376 Part 1, Section 21.2.2.226 (valAx)
 */
export type ValueAxis = AxisBase & {
  readonly type: "valAx";
  readonly crossBetween?: CrossBetween;
  readonly majorUnit?: number;
  readonly minorUnit?: number;
  readonly max?: number;
  readonly min?: number;
  readonly logBase?: number;
  readonly dispUnits?: DisplayUnits;
};

/**
 * Date axis
 * @see ECMA-376 Part 1, Section 21.2.2.43 (dateAx)
 */
export type DateAxis = AxisBase & {
  readonly type: "dateAx";
  readonly auto?: boolean;
  readonly baseTimeUnit?: "days" | "months" | "years";
  readonly majorTimeUnit?: "days" | "months" | "years";
  readonly minorTimeUnit?: "days" | "months" | "years";
  readonly majorUnit?: number;
  readonly minorUnit?: number;
  readonly max?: number;
  readonly min?: number;
};

/**
 * Series axis (for 3D charts)
 * @see ECMA-376 Part 1, Section 21.2.2.175 (serAx)
 */
export type SeriesAxis = AxisBase & {
  readonly type: "serAx";
  readonly tickLabelSkip?: number;
  readonly tickMarkSkip?: number;
};

/**
 * Display units for value axis
 */
export type DisplayUnits = {
  readonly builtInUnit?: "hundreds" | "thousands" | "tenThousands" | "hundredThousands" | "millions" | "tenMillions" | "hundredMillions" | "billions" | "trillions";
  readonly customUnit?: number;
  readonly dispUnitsLbl?: ChartTitle;
};

/**
 * Union of all axis types
 */
export type Axis = CategoryAxis | ValueAxis | DateAxis | SeriesAxis;

// =============================================================================
// Chart Shape Properties
// =============================================================================

/**
 * Shape properties for chart elements
 * @see ECMA-376 Part 1, Section 21.2.2.197 (spPr)
 */
export type ChartShapeProperties = {
  readonly fill?: Fill;
  readonly line?: Line;
  readonly effectList?: ChartEffects;
};

/**
 * Chart effect list
 */
export type ChartEffects = {
  readonly shadow?: {
    readonly color: string;
    readonly blur: Pixels;
    readonly distance: Pixels;
    readonly direction: Degrees;
  };
  readonly glow?: {
    readonly color: string;
    readonly radius: Pixels;
  };
  readonly softEdge?: {
    readonly radius: Pixels;
  };
};
