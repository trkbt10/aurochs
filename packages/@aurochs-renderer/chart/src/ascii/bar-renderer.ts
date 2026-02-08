/**
 * @file ASCII bar chart renderer
 */

import { truncateText } from "@aurochs-renderer/drawing-ml/ascii";
import type { AsciiSeriesData } from "./types";

const BAR_CHAR = "\u2588";

type BarRendererParams = {
  readonly series: readonly AsciiSeriesData[];
  readonly width: number;
};

/** Render a horizontal bar chart in ASCII. */
export function renderBarAscii(params: BarRendererParams): string {
  const { series, width } = params;
  if (series.length === 0) {
    return "";
  }

  // Collect all categories and values
  const firstSeries = series[0]!;
  const categories = firstSeries.categories ?? firstSeries.values.map((_, i) => `${i + 1}`);
  const values = firstSeries.values;

  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 0);
  const maxLabelLen = Math.max(...categories.map((c) => c.length), 1);
  // Reserve space: label + " " + bar + " " + value
  const valueStrings = values.map((v) => String(v));
  const maxValueLen = Math.max(...valueStrings.map((v) => v.length), 1);
  const barMaxWidth = Math.max(1, width - maxLabelLen - maxValueLen - 3);

  const lines: string[] = [];

  for (let i = 0; i < values.length; i++) {
    const label = truncateText(categories[i] ?? `${i + 1}`, maxLabelLen);
    const paddedLabel = label.padEnd(maxLabelLen);
    const value = values[i]!;
    const barWidth = maxValue > 0 ? Math.round((value / maxValue) * barMaxWidth) : 0;
    const bar = BAR_CHAR.repeat(barWidth);
    lines.push(`${paddedLabel} ${bar} ${valueStrings[i]}`);
  }

  // Multi-series: show additional series below
  for (let s = 1; s < series.length; s++) {
    const ser = series[s]!;
    const serCats = ser.categories ?? ser.values.map((_, i) => `${i + 1}`);
    if (ser.name) {
      lines.push("");
      lines.push(`[${ser.name}]`);
    }
    const serMax = Math.max(...ser.values, 0);
    for (let i = 0; i < ser.values.length; i++) {
      const label = truncateText(serCats[i] ?? `${i + 1}`, maxLabelLen);
      const paddedLabel = label.padEnd(maxLabelLen);
      const value = ser.values[i]!;
      const barWidth = serMax > 0 ? Math.round((value / serMax) * barMaxWidth) : 0;
      const bar = BAR_CHAR.repeat(barWidth);
      lines.push(`${paddedLabel} ${bar} ${value}`);
    }
  }

  return lines.join("\n");
}
