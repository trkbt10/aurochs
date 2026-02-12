/**
 * @file Sample chart fixtures for the demo catalog
 *
 * Provides pre-built Chart objects for testing chart rendering.
 */

import type { Chart, BarSeries, LineSeries, PieSeries, ScatterSeries } from "@aurochs-office/chart/domain";

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_CATEGORIES = ["Q1", "Q2", "Q3", "Q4"];
const SAMPLE_VALUES_1 = [120, 180, 150, 200];
const SAMPLE_VALUES_2 = [100, 140, 160, 180];
const _SAMPLE_VALUES_3 = [80, 120, 140, 160];

// =============================================================================
// Bar Chart Samples
// =============================================================================

const barSeriesSample: BarSeries = {
  type: "barChart",
  barDir: "col",
  grouping: "clustered",
  varyColors: false,
  series: [
    {
      index: 0,
      order: 0,
      categories: {
        stringLiteral: { values: SAMPLE_CATEGORIES },
      },
      values: {
        numberLiteral: { values: SAMPLE_VALUES_1 },
      },
    },
    {
      index: 1,
      order: 1,
      categories: {
        stringLiteral: { values: SAMPLE_CATEGORIES },
      },
      values: {
        numberLiteral: { values: SAMPLE_VALUES_2 },
      },
    },
  ],
  gapWidth: 150,
  overlap: 0,
  axisIds: [0, 1],
};

export const clusteredBarChart: Chart = {
  plotArea: {
    charts: [barSeriesSample],
    axes: [
      {
        type: "catAx",
        axId: 0,
        scaling: { orientation: "minMax" },
        axPos: "b",
        crossAx: 1,
        crosses: "autoZero",
      },
      {
        type: "valAx",
        axId: 1,
        scaling: { orientation: "minMax" },
        axPos: "l",
        crossAx: 0,
        crosses: "autoZero",
        majorGridlines: {},
      },
    ],
  },
  title: {
    textBody: {
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "Clustered Bar Chart" }],
        },
      ],
    },
  },
};

const stackedBarSeries: BarSeries = {
  ...barSeriesSample,
  grouping: "stacked",
};

export const stackedBarChart: Chart = {
  plotArea: {
    charts: [stackedBarSeries],
    axes: [
      {
        type: "catAx",
        axId: 0,
        scaling: { orientation: "minMax" },
        axPos: "b",
        crossAx: 1,
        crosses: "autoZero",
      },
      {
        type: "valAx",
        axId: 1,
        scaling: { orientation: "minMax" },
        axPos: "l",
        crossAx: 0,
        crosses: "autoZero",
        majorGridlines: {},
      },
    ],
  },
  title: {
    textBody: {
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "Stacked Bar Chart" }],
        },
      ],
    },
  },
};

// =============================================================================
// Line Chart Samples
// =============================================================================

const lineSeriesSample: LineSeries = {
  type: "lineChart",
  grouping: "standard",
  varyColors: false,
  series: [
    {
      index: 0,
      order: 0,
      categories: {
        stringLiteral: { values: SAMPLE_CATEGORIES },
      },
      values: {
        numberLiteral: { values: SAMPLE_VALUES_1 },
      },
      marker: { symbol: "circle", size: 5 },
    },
    {
      index: 1,
      order: 1,
      categories: {
        stringLiteral: { values: SAMPLE_CATEGORIES },
      },
      values: {
        numberLiteral: { values: SAMPLE_VALUES_2 },
      },
      marker: { symbol: "square", size: 5 },
    },
  ],
  marker: true,
  axisIds: [0, 1],
};

export const lineChart: Chart = {
  plotArea: {
    charts: [lineSeriesSample],
    axes: [
      {
        type: "catAx",
        axId: 0,
        scaling: { orientation: "minMax" },
        axPos: "b",
        crossAx: 1,
        crosses: "autoZero",
      },
      {
        type: "valAx",
        axId: 1,
        scaling: { orientation: "minMax" },
        axPos: "l",
        crossAx: 0,
        crosses: "autoZero",
        majorGridlines: {},
      },
    ],
  },
  title: {
    textBody: {
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "Line Chart with Markers" }],
        },
      ],
    },
  },
};

// =============================================================================
// Pie Chart Samples
// =============================================================================

const pieSeriesSample: PieSeries = {
  type: "pieChart",
  varyColors: true,
  series: [
    {
      index: 0,
      order: 0,
      categories: {
        stringLiteral: { values: ["Product A", "Product B", "Product C", "Product D"] },
      },
      values: {
        numberLiteral: { values: [35, 25, 20, 20] },
      },
    },
  ],
  firstSliceAng: 0,
};

export const pieChart: Chart = {
  plotArea: {
    charts: [pieSeriesSample],
    axes: [],
  },
  title: {
    textBody: {
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "Pie Chart" }],
        },
      ],
    },
  },
  legend: {
    legendPos: "r",
    layout: {},
    overlay: false,
  },
};

// =============================================================================
// Scatter Chart Samples
// =============================================================================

const scatterSeriesSample: ScatterSeries = {
  type: "scatterChart",
  scatterStyle: "lineMarker",
  varyColors: false,
  series: [
    {
      index: 0,
      order: 0,
      xValues: {
        numberLiteral: { values: [1, 2, 3, 4, 5] },
      },
      yValues: {
        numberLiteral: { values: [2.5, 4.2, 3.8, 5.1, 4.9] },
      },
      marker: { symbol: "circle", size: 7 },
    },
    {
      index: 1,
      order: 1,
      xValues: {
        numberLiteral: { values: [1, 2, 3, 4, 5] },
      },
      yValues: {
        numberLiteral: { values: [1.8, 3.5, 4.2, 3.9, 5.5] },
      },
      marker: { symbol: "diamond", size: 7 },
    },
  ],
  axisIds: [0, 1],
};

export const scatterChart: Chart = {
  plotArea: {
    charts: [scatterSeriesSample],
    axes: [
      {
        type: "valAx",
        axId: 0,
        scaling: { orientation: "minMax" },
        axPos: "b",
        crossAx: 1,
        crosses: "autoZero",
        majorGridlines: {},
      },
      {
        type: "valAx",
        axId: 1,
        scaling: { orientation: "minMax" },
        axPos: "l",
        crossAx: 0,
        crosses: "autoZero",
        majorGridlines: {},
      },
    ],
  },
  title: {
    textBody: {
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "Scatter Chart" }],
        },
      ],
    },
  },
};

// =============================================================================
// Chart Catalog
// =============================================================================

export type ChartCatalogItem = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly chart: Chart;
  readonly category: "bar" | "line" | "pie" | "scatter";
};

export const chartCatalog: readonly ChartCatalogItem[] = [
  {
    id: "clustered-bar",
    name: "Clustered Bar Chart",
    description: "Standard clustered column chart with two series",
    chart: clusteredBarChart,
    category: "bar",
  },
  {
    id: "stacked-bar",
    name: "Stacked Bar Chart",
    description: "Stacked column chart with two series",
    chart: stackedBarChart,
    category: "bar",
  },
  {
    id: "line",
    name: "Line Chart",
    description: "Line chart with markers",
    chart: lineChart,
    category: "line",
  },
  {
    id: "pie",
    name: "Pie Chart",
    description: "Basic pie chart with legend",
    chart: pieChart,
    category: "pie",
  },
  {
    id: "scatter",
    name: "Scatter Chart",
    description: "XY scatter chart with line and markers",
    chart: scatterChart,
    category: "scatter",
  },
];
