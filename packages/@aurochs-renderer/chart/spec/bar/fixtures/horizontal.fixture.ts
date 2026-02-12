/**
 * @file Horizontal bar chart fixture
 *
 * @ecma376 21.2.2.16 barChart (Bar Charts)
 * @ecma376 21.2.2.17 barDir (bar = horizontal)
 */

import type { Chart, BarChartSeries, DataReference } from "@aurochs-office/chart/domain";

const CATEGORIES = ["Product A", "Product B", "Product C", "Product D"];
const VALUES = [85, 120, 95, 150];

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

const barChartSeries: BarChartSeries = {
  type: "barChart",
  barDir: "bar", // horizontal
  grouping: "clustered",
  varyColors: false,
  series: [
    {
      idx: 0,
      order: 0,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef(VALUES),
    },
  ],
  gapWidth: 150,
  overlap: 0,
  axisIds: [0, 1],
};

export const chart: Chart = {
  plotArea: {
    charts: [barChartSeries],
    axes: [
      {
        type: "catAx",
        axId: 0,
        scaling: { orientation: "minMax" },
        axPos: "l",
        crossAx: 1,
        crosses: "autoZero",
      },
      {
        type: "valAx",
        axId: 1,
        scaling: { orientation: "minMax" },
        axPos: "b",
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
          runs: [{ type: "text", text: "Horizontal Bar Chart" }],
        },
      ],
    },
  },
};

export default chart;
