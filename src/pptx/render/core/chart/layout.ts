/**
 * @file Chart layout utilities
 *
 * Layout calculation for charts including plot area dimensions and legend positioning.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */

import type { Legend, Layout } from "../../../domain/chart";
import type { ChartLayout } from "./types";

// =============================================================================
// Implementation-Defined Layout Values
// =============================================================================
// The following values are NOT specified in ECMA-376 and are implementation-defined.
// ECMA-376 uses manualLayout for explicit positioning, but when manualLayout is
// absent, applications use their own defaults. These values approximate PowerPoint
// behavior and may need adjustment based on visual comparison.
// =============================================================================

/**
 * Default chart padding (implementation-defined)
 *
 * ECMA-376 does not specify default padding values. When manualLayout is not
 * provided, these values are used for automatic layout.
 *
 * Rationale:
 * - left: 50px - space for Y axis labels (typically 4-5 characters wide)
 * - bottom: 40px - space for X axis labels
 * - top/right: 20px - minimal visual padding
 */
export const DEFAULT_PADDING = { top: 20, right: 20, bottom: 40, left: 50 } as const;

/**
 * Legend dimensions (implementation-defined)
 *
 * ECMA-376 21.2.2.94 (legend) specifies position and overlay behavior,
 * but not default dimensions. These values approximate PowerPoint's behavior.
 */
export const LEGEND_WIDTH = 150;
export const LEGEND_ITEM_HEIGHT = 20;
export const LEGEND_ITEM_PADDING = 5;

/**
 * Calculate legend dimensions for a given number of series
 */
export function calculateLegendDimensions(seriesCount: number): { width: number; height: number } {
  return {
    width: LEGEND_WIDTH,
    height: seriesCount * (LEGEND_ITEM_HEIGHT + LEGEND_ITEM_PADDING) + LEGEND_ITEM_PADDING,
  };
}

/**
 * Calculate chart layout including legend space reservation
 *
 * When legend.overlay is true, the legend is positioned on top of the
 * plot area without taking space from it.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 * @see ECMA-376 Part 1, Section 21.2.3.24 (ST_LegendPos)
 * @see ECMA-376 Part 1, Section 21.2.2.123 (overlay)
 */
export function calculateChartLayout(
  width: number,
  height: number,
  legend: Legend | undefined,
  seriesCount: number
): ChartLayout {
  const basePlot = {
    left: DEFAULT_PADDING.left,
    top: DEFAULT_PADDING.top,
    width: width - DEFAULT_PADDING.left - DEFAULT_PADDING.right,
    height: height - DEFAULT_PADDING.top - DEFAULT_PADDING.bottom,
  };

  if (!legend) {
    return {
      plotWidth: basePlot.width,
      plotHeight: basePlot.height,
      plotLeft: basePlot.left,
      plotTop: basePlot.top,
      legendPos: undefined,
    };
  }

  const legendDims = calculateLegendDimensions(seriesCount);
  const legendGap = 10;
  const layout = applyLegendLayout(basePlot, legend, legendDims, legendGap, width, height);

  return {
    plotWidth: layout.plot.width,
    plotHeight: layout.plot.height,
    plotLeft: layout.plot.left,
    plotTop: layout.plot.top,
    legendPos: layout.legendPos,
  };
}

type PlotRect = { left: number; top: number; width: number; height: number };

function applyLegendLayout(
  plot: PlotRect,
  legend: Legend,
  legendDims: { width: number; height: number },
  legendGap: number,
  width: number,
  height: number
): { plot: PlotRect; legendPos: { x: number; y: number } } {
  const isOverlay = legend.overlay === true;

  switch (legend.position) {
    case "l": {
      const adjustedPlot = adjustPlotLeft(plot, legendDims, legendGap, isOverlay);
      const legendX = resolveLegendXLeft(plot, legendGap, isOverlay);
      const legendY = resolveLegendYCentered(plot, legendDims);
      return { plot: adjustedPlot, legendPos: { x: legendX, y: legendY } };
    }
    case "t": {
      const adjustedPlot = adjustPlotTop(plot, legendDims, legendGap, isOverlay);
      const legendX = (width - legendDims.width) / 2;
      const legendY = resolveLegendYTop(plot, legendGap, isOverlay);
      return { plot: adjustedPlot, legendPos: { x: legendX, y: legendY } };
    }
    case "b": {
      const adjustedPlot = adjustPlotBottom(plot, legendDims, legendGap, isOverlay);
      const legendX = (width - legendDims.width) / 2;
      const legendY = resolveLegendYBottom(plot, adjustedPlot, legendDims, legendGap, height, isOverlay);
      return { plot: adjustedPlot, legendPos: { x: legendX, y: legendY } };
    }
    case "tr": {
      const adjustedPlot = adjustPlotRight(plot, legendDims, legendGap, isOverlay);
      const legendX = resolveLegendXRight(plot, adjustedPlot, legendDims, legendGap, width, isOverlay);
      const legendY = resolveLegendYTop(plot, legendGap, isOverlay);
      return { plot: adjustedPlot, legendPos: { x: legendX, y: legendY } };
    }
    case "r":
    default: {
      const adjustedPlot = adjustPlotRight(plot, legendDims, legendGap, isOverlay);
      const legendX = resolveLegendXRight(plot, adjustedPlot, legendDims, legendGap, width, isOverlay);
      const legendY = resolveLegendYCentered(plot, legendDims);
      return { plot: adjustedPlot, legendPos: { x: legendX, y: legendY } };
    }
  }
}

function adjustPlotLeft(
  plot: PlotRect,
  legendDims: { width: number; height: number },
  legendGap: number,
  isOverlay: boolean
): PlotRect {
  if (isOverlay) {
    return plot;
  }
  return {
    left: plot.left + legendDims.width + legendGap,
    top: plot.top,
    width: plot.width - legendDims.width - legendGap,
    height: plot.height,
  };
}

function adjustPlotTop(
  plot: PlotRect,
  legendDims: { width: number; height: number },
  legendGap: number,
  isOverlay: boolean
): PlotRect {
  if (isOverlay) {
    return plot;
  }
  return {
    left: plot.left,
    top: plot.top + legendDims.height + legendGap,
    width: plot.width,
    height: plot.height - legendDims.height - legendGap,
  };
}

function adjustPlotBottom(
  plot: PlotRect,
  legendDims: { width: number; height: number },
  legendGap: number,
  isOverlay: boolean
): PlotRect {
  if (isOverlay) {
    return plot;
  }
  return {
    left: plot.left,
    top: plot.top,
    width: plot.width,
    height: plot.height - legendDims.height - legendGap,
  };
}

function adjustPlotRight(
  plot: PlotRect,
  legendDims: { width: number; height: number },
  legendGap: number,
  isOverlay: boolean
): PlotRect {
  if (isOverlay) {
    return plot;
  }
  return {
    left: plot.left,
    top: plot.top,
    width: plot.width - legendDims.width - legendGap,
    height: plot.height,
  };
}

function resolveLegendXLeft(plot: PlotRect, legendGap: number, isOverlay: boolean): number {
  if (isOverlay) {
    return legendGap;
  }
  return plot.left;
}

function resolveLegendXRight(
  plot: PlotRect,
  adjustedPlot: PlotRect,
  legendDims: { width: number; height: number },
  legendGap: number,
  width: number,
  isOverlay: boolean
): number {
  if (isOverlay) {
    return width - legendDims.width - legendGap;
  }
  return plot.left + adjustedPlot.width + legendGap;
}

function resolveLegendYCentered(plot: PlotRect, legendDims: { width: number; height: number }): number {
  return plot.top + (plot.height - legendDims.height) / 2;
}

function resolveLegendYTop(plot: PlotRect, legendGap: number, isOverlay: boolean): number {
  if (isOverlay) {
    return legendGap;
  }
  return plot.top;
}

function resolveLegendYBottom(
  plot: PlotRect,
  adjustedPlot: PlotRect,
  legendDims: { width: number; height: number },
  legendGap: number,
  height: number,
  isOverlay: boolean
): number {
  if (isOverlay) {
    return height - legendDims.height - legendGap;
  }
  return plot.top + adjustedPlot.height + legendGap;
}

/**
 * Calculate legend position from Layout data or automatic positioning
 */
export function calculateLegendPositionFromLayout(
  legend: Legend | undefined,
  width: number,
  height: number,
  seriesCount: number
): { x: number; y: number } | undefined {
  if (!legend) {
    return undefined;
  }

  const legendDims = calculateLegendDimensions(seriesCount);
  const manualLayout = legend.layout?.manualLayout;

  if (hasLegendManualPosition(manualLayout)) {
    // Use manual layout values
    return {
      x: manualLayout.x * width,
      y: manualLayout.y * height,
    };
  }

  // Automatic positioning based on legendPos
  // Implementation-defined defaults for automatic layout
  switch (legend.position) {
    case "r":
      return {
        x: width - legendDims.width - 10,
        y: (height - legendDims.height) / 2,
      };
    case "l":
      return {
        x: 10,
        y: (height - legendDims.height) / 2,
      };
    case "t":
      return {
        x: (width - legendDims.width) / 2,
        y: 10,
      };
    case "b":
      return {
        x: (width - legendDims.width) / 2,
        y: height - legendDims.height - 10,
      };
    case "tr":
      return {
        x: width - legendDims.width - 10,
        y: 10,
      };
    default:
      return {
        x: width - legendDims.width - 10,
        y: (height - legendDims.height) / 2,
      };
  }
}

/**
 * Calculate chart layout from parsed Layout data
 *
 * Prioritizes manualLayout from ECMA-376 when available, otherwise
 * falls back to automatic layout (implementation-defined).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */
export function calculateChartLayoutFromData(
  width: number,
  height: number,
  plotAreaLayout: Layout | undefined,
  legend: Legend | undefined,
  seriesCount: number
): ChartLayout {
  // Check for manual layout on plot area
  const manualLayout = plotAreaLayout?.manualLayout;

  if (hasPlotManualLayout(manualLayout)) {
    // Use manual layout values (fractions 0-1)
    const plotLeft = manualLayout.x * width;
    const plotTop = manualLayout.y * height;
    const plotWidth = manualLayout.w * width;
    const plotHeight = manualLayout.h * height;

    // Calculate legend position based on legend's layout or position
    const legendPos = calculateLegendPositionFromLayout(legend, width, height, seriesCount);

    return {
      plotWidth,
      plotHeight,
      plotLeft,
      plotTop,
      legendPos,
    };
  }

  // Fall back to automatic layout
  return calculateChartLayout(width, height, legend, seriesCount);
}

function hasLegendManualPosition(
  manualLayout: Layout["manualLayout"] | undefined
): manualLayout is { x: number; y: number } {
  if (!manualLayout) {
    return false;
  }
  if (manualLayout.x === undefined) {
    return false;
  }
  if (manualLayout.y === undefined) {
    return false;
  }
  return true;
}

function hasPlotManualLayout(
  manualLayout: Layout["manualLayout"] | undefined
): manualLayout is { x: number; y: number; w: number; h: number } {
  if (!manualLayout) {
    return false;
  }
  if (manualLayout.x === undefined) {
    return false;
  }
  if (manualLayout.y === undefined) {
    return false;
  }
  if (manualLayout.w === undefined) {
    return false;
  }
  if (manualLayout.h === undefined) {
    return false;
  }
  return true;
}
