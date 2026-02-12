/**
 * @file Basic bubble chart fixture
 *
 * @ecma376 21.2.2.20 bubbleChart (Bubble Charts)
 * @ecma376 21.2.2.18 bubbleScale (Bubble Scale)
 */

import type { Chart, BubbleChartSeries, DataReference } from "@aurochs-office/chart/domain";

function createValueRef(values: readonly number[]): DataReference {
  return {
    numLit: {
      count: values.length,
      points: values.map((value, idx) => ({ idx, value })),
    },
  };
}

const bubbleChartSeries: BubbleChartSeries = {
  type: "bubbleChart",
  varyColors: false,
  bubbleScale: 100,
  showNegBubbles: false,
  sizeRepresents: "area",
  series: [
    {
      idx: 0,
      order: 0,
      xValues: createValueRef([1, 2, 3, 4, 5]),
      yValues: createValueRef([2.5, 4.2, 3.8, 5.1, 4.9]),
      bubbleSize: createValueRef([10, 20, 15, 25, 18]),
    },
    {
      idx: 1,
      order: 1,
      xValues: createValueRef([1.5, 2.5, 3.5, 4.5]),
      yValues: createValueRef([3.0, 3.8, 4.5, 4.0]),
      bubbleSize: createValueRef([12, 18, 22, 16]),
    },
  ],
  axisIds: [0, 1],
};

export const chart: Chart = {
  plotArea: {
    charts: [bubbleChartSeries],
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
          runs: [{ type: "text", text: "Bubble Chart" }],
        },
      ],
    },
  },
};

export default chart;
