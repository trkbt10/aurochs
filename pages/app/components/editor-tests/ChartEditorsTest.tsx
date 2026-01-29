/**
 * @file Chart Editors Test
 *
 * Test component for chart-related editors (DataLabels, Legend, Axis, ChartSeries, Chart).
 */

import { useState, type CSSProperties } from "react";
import {
  DataLabelsEditor,
  LegendEditor,
  AxisEditor,
  ChartSeriesEditor,
  ChartEditor,
  createDefaultDataLabels,
  createDefaultLegend,
  createDefaultAxis,
  createDefaultChartSeries,
  createDefaultChart,
} from "@oxen-ui/pptx-editor";
import type { DataLabels, Legend, Axis, ChartSeries, Chart } from "@oxen-office/chart/domain";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border-subtle)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueDisplayStyle: CSSProperties = {
  marginTop: "16px",
  padding: "12px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-tertiary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "200px",
  overflow: "auto",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "24px",
};

/**
 * Chart editors test component
 */
export function ChartEditorsTest() {
  const [dataLabels, setDataLabels] = useState<DataLabels>(createDefaultDataLabels());
  const [legend, setLegend] = useState<Legend>(createDefaultLegend());
  const [axis, setAxis] = useState<Axis>(createDefaultAxis());
  const [chartSeries, setChartSeries] = useState<ChartSeries>(createDefaultChartSeries());
  const [chart, setChart] = useState<Chart>(createDefaultChart());

  return (
    <div style={gridStyle}>
      {/* DataLabels Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Data Labels Editor</h2>
        <DataLabelsEditor value={dataLabels} onChange={setDataLabels} />
        <div style={valueDisplayStyle}>{JSON.stringify(dataLabels, null, 2)}</div>
      </div>

      {/* Legend Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Legend Editor</h2>
        <LegendEditor value={legend} onChange={setLegend} />
        <div style={valueDisplayStyle}>{JSON.stringify(legend, null, 2)}</div>
      </div>

      {/* Axis Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Axis Editor</h2>
        <AxisEditor value={axis} onChange={setAxis} />
        <div style={valueDisplayStyle}>{JSON.stringify(axis, null, 2)}</div>
      </div>

      {/* ChartSeries Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Chart Series Editor</h2>
        <ChartSeriesEditor value={chartSeries} onChange={setChartSeries} />
        <div style={valueDisplayStyle}>{JSON.stringify(chartSeries, null, 2)}</div>
      </div>

      {/* Chart Editor */}
      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Chart Editor</h2>
        <ChartEditor value={chart} onChange={setChart} />
        <div style={valueDisplayStyle}>{JSON.stringify(chart, null, 2)}</div>
      </div>
    </div>
  );
}
