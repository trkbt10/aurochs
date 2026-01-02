/**
 * @file Unsupported chart placeholder
 *
 * Renders placeholder for chart types not yet implemented.
 */

import { escapeHtml } from "../../../html/index";

/**
 * Render placeholder for unsupported chart types
 *
 * Displays a centered message indicating the chart type is not yet implemented.
 */
export function renderUnsupportedChartPlaceholder(
  chartTypeName: string,
  chartWidth: number,
  chartHeight: number
): string {
  const cx = chartWidth / 2;
  const cy = chartHeight / 2;
  const boxWidth = Math.min(200, chartWidth * 0.8);
  const boxHeight = 60;

  return `
    <rect x="${cx - boxWidth / 2}" y="${cy - boxHeight / 2}"
          width="${boxWidth}" height="${boxHeight}"
          fill="#f5f5f5" stroke="#ccc" rx="4"/>
    <text x="${cx}" y="${cy - 8}" text-anchor="middle"
          font-size="12" fill="#666">${escapeHtml(chartTypeName)}</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle"
          font-size="10" fill="#999">Not yet implemented</text>
  `;
}
