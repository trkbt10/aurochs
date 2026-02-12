/**
 * @file Basic pie chart fixture
 *
 * @ecma376 21.2.2.141 pieChart (Pie Charts)
 * @ecma376 21.2.2.223 varyColors (Vary Colors by Point)
 */

import type { Chart, PieChartSeries, DataReference } from "@aurochs-office/chart/domain";

const CATEGORIES = ["Product A", "Product B", "Product C", "Product D"];
const VALUES = [35, 25, 20, 20];

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

const pieChartSeries: PieChartSeries = {
  type: "pieChart",
  varyColors: true,
  firstSliceAng: 0,
  series: [
    {
      idx: 0,
      order: 0,
      categories: createCategoryRef(CATEGORIES),
      values: createValueRef(VALUES),
    },
  ],
};

export const chart: Chart = {
  plotArea: {
    charts: [pieChartSeries],
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

export default chart;
