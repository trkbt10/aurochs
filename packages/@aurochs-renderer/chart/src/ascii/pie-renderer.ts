/**
 * @file ASCII pie chart renderer (percentage list style)
 */

import { truncateText } from "@aurochs-renderer/drawing-ml/ascii";
import type { AsciiSeriesData } from "./types";

type PieRendererParams = {
  readonly series: readonly AsciiSeriesData[];
  readonly width: number;
};

const PIE_MARKERS = ["\u25A0", "\u25A1", "\u25AA", "\u25AB", "\u25CF", "\u25CB", "\u25C6", "\u25C7"];
const BAR_CHAR = "\u2588";

/** Render a pie chart as a percentage breakdown list. */
export function renderPieAscii(params: PieRendererParams): string {
  const { series, width } = params;
  if (series.length === 0) {
    return "";
  }

  const firstSeries = series[0]!;
  const categories = firstSeries.categories ?? firstSeries.values.map((_, i) => `Item ${i + 1}`);
  const values = firstSeries.values;

  if (values.length === 0) {
    return "";
  }

  const total = values.reduce((a, b) => a + Math.abs(b), 0);
  if (total === 0) {
    return "(no data)";
  }

  const maxCatLen = Math.max(...categories.map((c) => c.length), 1);
  const pctWidth = 7; // " XX.X% "
  const barMaxWidth = Math.max(1, width - maxCatLen - pctWidth - 4);

  const lines: string[] = [];

  for (let i = 0; i < values.length; i++) {
    const marker = PIE_MARKERS[i % PIE_MARKERS.length]!;
    const label = truncateText(categories[i] ?? `Item ${i + 1}`, maxCatLen);
    const paddedLabel = label.padEnd(maxCatLen);
    const pct = (Math.abs(values[i]!) / total) * 100;
    const pctStr = pct.toFixed(1).padStart(5) + "%";
    const barWidth = Math.round((Math.abs(values[i]!) / total) * barMaxWidth);
    const bar = BAR_CHAR.repeat(barWidth);
    lines.push(`${marker} ${paddedLabel}  ${pctStr}  ${bar}`);
  }

  return lines.join("\n");
}
