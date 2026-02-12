/**
 * @file Stacked bar chart fixture
 *
 * @ecma376 21.2.2.16 barChart (Bar Charts)
 * @ecma376 21.2.2.77 grouping (stacked)
 */

import type { Chart, BarChartSeries, DataReference } from "@aurochs-office/chart/domain";

const CATEGORIES = ["Q1", "Q2", "Q3", "Q4"];
const VALUES_1 = [120, 180, 150, 200];
const VALUES_2 = [100, 140, 160, 180];
const VALUES_3 = [80, 100, 90, 120];

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
  barDir: "col",
  grouping: "stacked",
  varyColors: false,
  series: [
    {
      idx: 0,
      order: 0,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef(VALUES_1),
    },
    {
      idx: 1,
      order: 1,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef(VALUES_2),
    },
    {
      idx: 2,
      order: 2,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef(VALUES_3),
    },
  ],
  gapWidth: 150,
  overlap: 100,
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

export default chart;
