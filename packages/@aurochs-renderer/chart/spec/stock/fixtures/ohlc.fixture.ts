/**
 * @file OHLC stock chart fixture
 *
 * @ecma376 21.2.2.200 stockChart (Stock Charts)
 */

import type { Chart, StockChartSeries, DataReference } from "@aurochs-office/chart/domain";

const CATEGORIES = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

function createCategoryRef(categories: readonly string[]): DataReference {
  return {
    strLit: {
      count: categories.length,
      points: categories.map((value, idx) => ({ idx, value })),
    },
  };
}

function createValueRef(values: readonly number[]): DataReference {
  return {
    numLit: {
      count: values.length,
      points: values.map((value, idx) => ({ idx, value })),
    },
  };
}

// StockChartSeries uses LineSeries[] for its series
const stockChartSeries: StockChartSeries = {
  type: "stockChart",
  series: [
    // Open
    {
      idx: 0,
      order: 0,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef([100, 105, 102, 108, 110]),
    },
    // High
    {
      idx: 1,
      order: 1,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef([110, 115, 112, 118, 120]),
    },
    // Low
    {
      idx: 2,
      order: 2,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef([95, 100, 98, 104, 105]),
    },
    // Close
    {
      idx: 3,
      order: 3,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef([105, 102, 108, 110, 115]),
    },
  ],
  axisIds: [0, 1],
  hiLowLines: {},
  upDownBars: {
    gapWidth: 150,
  },
};

export const chart: Chart = {
  plotArea: {
    charts: [stockChartSeries],
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
          runs: [{ type: "text", text: "Stock Chart (OHLC)" }],
        },
      ],
    },
  },
};

export default chart;
