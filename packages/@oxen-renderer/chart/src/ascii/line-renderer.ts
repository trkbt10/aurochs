/**
 * @file ASCII line chart renderer
 */

import { createCanvas, setCell, renderCanvas } from "@oxen-renderer/drawing-ml/ascii";
import type { AsciiSeriesData } from "./types";

type LineRendererParams = {
  readonly series: readonly AsciiSeriesData[];
  readonly width: number;
};

const POINT_CHAR = "*";
const LINE_CHARS = { horizontal: "\u2500", vertical: "\u2502", corner: "\u2514" };

/** Render a line chart in ASCII using a 2D canvas. */
export function renderLineAscii(params: LineRendererParams): string {
  const { series, width } = params;
  if (series.length === 0 || series[0]!.values.length === 0) {
    return "";
  }

  const firstSeries = series[0]!;
  const categories = firstSeries.categories ?? firstSeries.values.map((_, i) => `${i + 1}`);

  // Collect all values across series
  const allValues = series.flatMap((s) => [...s.values]);
  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  // Chart area dimensions
  const labelWidth = Math.max(String(Math.round(maxVal)).length, String(Math.round(minVal)).length) + 1;
  const chartWidth = Math.max(1, width - labelWidth - 1);
  const chartHeight = Math.min(15, Math.max(5, Math.floor(chartWidth / 3)));

  // Canvas: chart area + axis line + category labels
  const canvasWidth = labelWidth + 1 + chartWidth;
  const canvasHeight = chartHeight + 2;
  const canvas = createCanvas(canvasWidth, canvasHeight);

  // Draw Y axis
  for (let r = 0; r < chartHeight; r++) {
    setCell({ canvas, col: labelWidth, row: r, char: LINE_CHARS.vertical, z: 1 });
  }

  // Draw X axis
  setCell({ canvas, col: labelWidth, row: chartHeight, char: LINE_CHARS.corner, z: 1 });
  for (let c = labelWidth + 1; c < canvasWidth; c++) {
    setCell({ canvas, col: c, row: chartHeight, char: LINE_CHARS.horizontal, z: 1 });
  }

  // Y axis labels
  const topLabel = String(Math.round(maxVal));
  for (let i = 0; i < topLabel.length && i < labelWidth; i++) {
    setCell({ canvas, col: labelWidth - topLabel.length + i, row: 0, char: topLabel[i]!, z: 1 });
  }
  const midVal = Math.round((maxVal + minVal) / 2);
  const midLabel = String(midVal);
  const midRow = Math.floor(chartHeight / 2);
  for (let i = 0; i < midLabel.length && i < labelWidth; i++) {
    setCell({ canvas, col: labelWidth - midLabel.length + i, row: midRow, char: midLabel[i]!, z: 1 });
  }

  // X axis category labels
  const numPoints = firstSeries.values.length;
  const xStep = numPoints > 1 ? (chartWidth - 1) / (numPoints - 1) : 0;
  for (let i = 0; i < categories.length; i++) {
    const xPos = labelWidth + 1 + Math.round(i * xStep);
    const cat = categories[i]!;
    for (let c = 0; c < cat.length && xPos + c < canvasWidth; c++) {
      setCell({ canvas, col: xPos + c, row: chartHeight + 1, char: cat[c]!, z: 1 });
    }
  }

  // Plot data points and connecting lines
  const seriesChars = [POINT_CHAR, "o", "+", "x"];
  for (let s = 0; s < series.length; s++) {
    const ser = series[s]!;
    const pointChar = seriesChars[s % seriesChars.length]!;

    let prevX = -1;
    let prevY = -1;

    for (let i = 0; i < ser.values.length; i++) {
      const value = ser.values[i]!;
      const xPos = labelWidth + 1 + Math.round(i * xStep);
      const yPos = chartHeight - 1 - Math.round(((value - minVal) / range) * (chartHeight - 1));

      // Draw connecting line between adjacent points
      if (prevX >= 0 && prevY >= 0) {
        const dx = xPos - prevX;
        const dy = yPos - prevY;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        for (let step = 1; step < steps; step++) {
          const ix = Math.round(prevX + (dx * step) / steps);
          const iy = Math.round(prevY + (dy * step) / steps);
          if (iy >= 0 && iy < chartHeight) {
            const lineChar = Math.abs(dy) > Math.abs(dx) ? "|" : dy < 0 ? "/" : "\\";
            setCell({ canvas, col: ix, row: iy, char: lineChar, z: 2 });
          }
        }
      }

      // Draw data point
      if (yPos >= 0 && yPos < chartHeight) {
        setCell({ canvas, col: xPos, row: yPos, char: pointChar, z: 3 });
      }

      prevX = xPos;
      prevY = yPos;
    }
  }

  return renderCanvas(canvas);
}
