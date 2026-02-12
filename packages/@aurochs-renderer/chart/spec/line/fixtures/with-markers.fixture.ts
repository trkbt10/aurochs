/**
 * @file Line chart with markers fixture
 *
 * @ecma376 21.2.2.97 lineChart (Line Charts)
 * @ecma376 21.2.2.105 marker (Marker)
 */

import type { Chart, LineChartSeries, DataReference } from "@aurochs-office/chart/domain";

const CATEGORIES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const VALUES_1 = [100, 120, 115, 140, 160, 180];
const VALUES_2 = [80, 95, 110, 105, 130, 150];

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

const lineChartSeries: LineChartSeries = {
  type: "lineChart",
  grouping: "standard",
  varyColors: false,
  marker: true,
  series: [
    {
      idx: 0,
      order: 0,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef(VALUES_1),
      marker: { symbol: "circle", size: 5 },
    },
    {
      idx: 1,
      order: 1,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef(VALUES_2),
      marker: { symbol: "square", size: 5 },
    },
  ],
  axisIds: [0, 1],
};

export const chart: Chart = {
  plotArea: {
    charts: [lineChartSeries],
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

export default chart;
