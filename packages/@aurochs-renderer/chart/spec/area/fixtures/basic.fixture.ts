/**
 * @file Basic area chart fixture
 *
 * @ecma376 21.2.2.3 areaChart (Area Charts)
 */

import type { Chart, AreaChartSeries, DataReference } from "@aurochs-office/chart/domain";

const CATEGORIES = ["2020", "2021", "2022", "2023", "2024"];
const VALUES_1 = [50, 80, 120, 150, 200];
const VALUES_2 = [30, 50, 70, 90, 120];

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

const areaChartSeries: AreaChartSeries = {
  type: "areaChart",
  grouping: "standard",
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
  ],
  axisIds: [0, 1],
};

export const chart: Chart = {
  plotArea: {
    charts: [areaChartSeries],
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
          runs: [{ type: "text", text: "Area Chart" }],
        },
      ],
    },
  },
};

export default chart;
