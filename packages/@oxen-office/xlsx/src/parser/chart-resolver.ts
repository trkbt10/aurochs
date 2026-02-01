/**
 * @file Chart Resolver
 *
 * Resolves and parses chart parts from xlsx drawings.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { XmlElement, XmlDocument } from "@oxen/xml";
import { parseXml, isXmlElement } from "@oxen/xml";
import { parseChart } from "@oxen-office/chart/parser";
import type { Chart } from "@oxen-office/chart/domain/types";
import type { XlsxDrawing, XlsxChartFrame } from "../domain/drawing/types";
import { dirnamePosixPath, joinPosixPath, normalizePosixPath } from "@oxen-office/opc";

// =============================================================================
// Types
// =============================================================================

/**
 * A chart with its relationship ID and resolved path.
 */
export type XlsxChart = {
  /** Relationship ID used to reference this chart */
  readonly relId: string;
  /** Path to the chart XML within the package */
  readonly chartPath: string;
  /** Parsed chart data */
  readonly chart: Chart;
};

/**
 * Result of resolving charts for a worksheet.
 */
export type XlsxWorksheetCharts = {
  /** All resolved charts for this worksheet */
  readonly charts: readonly XlsxChart[];
};

// =============================================================================
// Helper Functions
// =============================================================================

function getDocumentRoot(doc: XmlDocument): XmlElement {
  const root = doc.children.find((c): c is XmlElement => isXmlElement(c));
  if (!root) {
    throw new Error("No root element found in document");
  }
  return root;
}

function resolveTargetPath(basePath: string, target: string): string {
  const baseDir = dirnamePosixPath(basePath);
  const resolved = normalizePosixPath(joinPosixPath(baseDir, target));
  return resolved.startsWith("/") ? resolved.slice(1) : resolved;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Collect chart relationship IDs from a drawing.
 *
 * @param drawing - The parsed drawing
 * @returns Array of chart relationship IDs
 */
export function collectChartRelIds(drawing: XlsxDrawing | undefined): readonly string[] {
  if (!drawing) {
    return [];
  }

  const chartRelIds: string[] = [];
  for (const anchor of drawing.anchors) {
    if (anchor.content?.type === "chartFrame") {
      const chartFrame = anchor.content as XlsxChartFrame;
      if (chartFrame.chartRelId) {
        chartRelIds.push(chartFrame.chartRelId);
      }
    }
  }
  return chartRelIds;
}

/**
 * Resolve and parse charts for a worksheet drawing.
 *
 * @param getFileContent - Function to retrieve file content
 * @param drawingPath - Path to the drawing XML
 * @param drawingRelationships - Map of relationship IDs to targets
 * @param chartRelIds - Chart relationship IDs to resolve
 * @returns Resolved charts
 */
export async function resolveCharts(
  getFileContent: (path: string) => Promise<string | undefined>,
  drawingPath: string,
  drawingRelationships: ReadonlyMap<string, string>,
  chartRelIds: readonly string[],
): Promise<readonly XlsxChart[]> {
  const charts: XlsxChart[] = [];

  for (const relId of chartRelIds) {
    const target = drawingRelationships.get(relId);
    if (!target) {
      continue;
    }

    const chartPath = resolveTargetPath(drawingPath, target);
    const chartXml = await getFileContent(chartPath);
    if (!chartXml) {
      continue;
    }

    try {
      const chartRoot = getDocumentRoot(parseXml(chartXml));
      const chart = parseChart(chartRoot);
      if (!chart) {
        continue;
      }
      charts.push({
        relId,
        chartPath,
        chart,
      });
    } catch {
      // Skip charts that fail to parse
      continue;
    }
  }

  return charts;
}

/**
 * Update drawing content with resolved chart paths.
 *
 * @param drawing - The drawing to update
 * @param chartPathMap - Map of relationship IDs to resolved chart paths
 * @returns Updated drawing with chart paths
 */
export function updateDrawingWithChartPaths(
  drawing: XlsxDrawing,
  chartPathMap: ReadonlyMap<string, string>,
): XlsxDrawing {
  const updatedAnchors = drawing.anchors.map((anchor) => {
    if (anchor.content?.type !== "chartFrame") {
      return anchor;
    }

    const chartFrame = anchor.content as XlsxChartFrame;
    if (!chartFrame.chartRelId) {
      return anchor;
    }

    const chartPath = chartPathMap.get(chartFrame.chartRelId);
    if (!chartPath) {
      return anchor;
    }

    return {
      ...anchor,
      content: {
        ...chartFrame,
        chartPath,
      },
    };
  });

  return {
    anchors: updatedAnchors,
  };
}
