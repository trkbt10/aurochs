/**
 * @file ChartML domain/parser/patcher entry point
 *
 * This package is intended to be format-agnostic (PPTX/DOCX/XLSX),
 * providing reusable ChartML logic.
 *
 * NOTE: For chart building/serialization, use @aurochs-builder/chart package.
 */

// Domain types
export type {
  ChartType,
  BarDirection,
  BarGrouping,
  Grouping,
  ScatterStyle,
  RadarStyle,
  OfPieType,
  Chart,
  ChartTitle,
  Layout,
  ManualLayout,
  PlotArea,
  ChartSeries,
  Legend,
  Axis,
} from "./domain/types";
