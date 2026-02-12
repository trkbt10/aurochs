/**
 * @file Doughnut chart fixture
 *
 * @ecma376 21.2.2.50 doughnutChart (Doughnut Charts)
 * @ecma376 21.2.2.72 holeSize (Hole Size)
 */

import type { Chart, DoughnutChartSeries, DataReference } from "@aurochs-office/chart/domain";

const CATEGORIES = ["Sales", "Marketing", "R&D", "Operations"];
const VALUES = [40, 25, 20, 15];

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

const doughnutChartSeries: DoughnutChartSeries = {
  type: "doughnutChart",
  varyColors: true,
  firstSliceAng: 0,
  holeSize: 50,
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
    charts: [doughnutChartSeries],
    axes: [],
  },
  title: {
    textBody: {
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "Doughnut Chart" }],
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
