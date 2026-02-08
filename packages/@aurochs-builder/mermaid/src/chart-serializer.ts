/**
 * @file Serialize chart data to Mermaid syntax
 */

import { escapeMermaidLabel } from "@aurochs/mermaid";
import type { ChartMermaidInput } from "./types";

/**
 * Serialize chart data as a Mermaid `pie` chart.
 * Each category+value pair becomes a slice.
 */
function serializePie(input: ChartMermaidInput): string {
  const lines: string[] = [];

  if (input.title) {
    lines.push(`pie title "${escapeMermaidLabel(input.title)}"`);
  } else {
    lines.push("pie");
  }

  for (const series of input.series) {
    const categories = series.categories ?? [];
    for (let i = 0; i < series.values.length; i++) {
      const label = i < categories.length ? categories[i]! : `Item ${i + 1}`;
      lines.push(`  "${escapeMermaidLabel(label)}" : ${series.values[i]}`);
    }
  }

  return lines.join("\n");
}

/**
 * Serialize chart data as a Mermaid `xychart-beta`.
 * Supports bar and line rendering.
 */
function serializeXYChart(input: ChartMermaidInput): string {
  const lines: string[] = [];
  lines.push("xychart-beta");

  if (input.title) {
    lines.push(`  title "${escapeMermaidLabel(input.title)}"`);
  }

  // Use categories from the first series that has them
  const categorySeries = input.series.find((s) => s.categories && s.categories.length > 0);
  if (categorySeries?.categories) {
    const cats = categorySeries.categories.map((c) => `"${escapeMermaidLabel(c)}"`);
    lines.push(`  x-axis [${cats.join(", ")}]`);
  }

  const isLine = input.chartType === "line" || input.chartType === "area";

  for (const series of input.series) {
    const values = series.values.map((v) => String(v));
    const keyword = isLine ? "line" : "bar";
    lines.push(`  ${keyword} [${values.join(", ")}]`);
  }

  return lines.join("\n");
}

/**
 * Serialize chart data to Mermaid syntax string (without fence).
 * Dispatches to `pie` or `xychart-beta` based on chart type.
 */
export function serializeChartToMermaid(input: ChartMermaidInput): string {
  if (input.series.length === 0) {
    return "";
  }

  switch (input.chartType) {
    case "pie":
      return serializePie(input);
    case "line":
    case "area":
    case "bar":
    case "scatter":
    case "radar":
    case "other":
    default:
      return serializeXYChart(input);
  }
}
