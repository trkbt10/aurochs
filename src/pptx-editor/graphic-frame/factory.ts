/**
 * @file GraphicFrame factory functions
 *
 * Creates table/chart/diagram frames with default content.
 */

import type {
  GraphicFrame,
  Table,
  TableRow,
  TableCell,
  TableColumn,
  Chart,
} from "../../pptx/domain";
import type { ShapeId, ResourceId } from "../../pptx/domain/types";
import { deg, px } from "../../pptx/domain/types";
import type { CreationChartType, CreationDiagramType } from "../context/presentation/editor/types";
import type { ShapeBounds } from "../shape/creation-bounds";

// =============================================================================
// Defaults
// =============================================================================

/** Default cell dimensions */
const DEFAULT_CELL_WIDTH = px(100);
const DEFAULT_CELL_HEIGHT = px(40);

/** Default table border color */
const DEFAULT_TABLE_BORDER_COLOR = "8EAADB";

// =============================================================================
// Table Creation
// =============================================================================

/**
 * Create an empty table cell
 */
function createEmptyCell(): TableCell {
  return {
    properties: {
      margins: {
        left: px(5),
        right: px(5),
        top: px(5),
        bottom: px(5),
      },
      anchor: "center",
      borders: {
        left: {
          width: px(1),
          cap: "flat",
          compound: "sng",
          alignment: "ctr",
          fill: {
            type: "solidFill",
            color: { spec: { type: "srgb", value: DEFAULT_TABLE_BORDER_COLOR } },
          },
          dash: "solid",
          join: "round",
        },
        right: {
          width: px(1),
          cap: "flat",
          compound: "sng",
          alignment: "ctr",
          fill: {
            type: "solidFill",
            color: { spec: { type: "srgb", value: DEFAULT_TABLE_BORDER_COLOR } },
          },
          dash: "solid",
          join: "round",
        },
        top: {
          width: px(1),
          cap: "flat",
          compound: "sng",
          alignment: "ctr",
          fill: {
            type: "solidFill",
            color: { spec: { type: "srgb", value: DEFAULT_TABLE_BORDER_COLOR } },
          },
          dash: "solid",
          join: "round",
        },
        bottom: {
          width: px(1),
          cap: "flat",
          compound: "sng",
          alignment: "ctr",
          fill: {
            type: "solidFill",
            color: { spec: { type: "srgb", value: DEFAULT_TABLE_BORDER_COLOR } },
          },
          dash: "solid",
          join: "round",
        },
      },
    },
    textBody: {
      bodyProperties: {},
      paragraphs: [
        {
          properties: {},
          runs: [{ type: "text", text: "" }],
        },
      ],
    },
  };
}

/**
 * Create a table with specified rows and columns
 */
export function createTable(rows: number, cols: number): Table {
  const columns: TableColumn[] = [];
  for (let c = 0; c < cols; c++) {
    columns.push({ width: DEFAULT_CELL_WIDTH });
  }

  const tableRows: TableRow[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: TableCell[] = [];
    for (let c = 0; c < cols; c++) {
      cells.push(createEmptyCell());
    }
    tableRows.push({
      height: DEFAULT_CELL_HEIGHT,
      cells,
    });
  }

  return {
    properties: {
      firstRow: true,
      bandRow: true,
    },
    grid: { columns },
    rows: tableRows,
  };
}

/**
 * Create a table graphic frame
 */
export function createTableGraphicFrame(id: ShapeId, bounds: ShapeBounds, rows: number, cols: number): GraphicFrame {
  return {
    type: "graphicFrame",
    nonVisual: {
      id,
      name: `Table ${id}`,
    },
    transform: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "table",
      data: {
        table: createTable(rows, cols),
      },
    },
  };
}

// =============================================================================
// Chart Creation
// =============================================================================

/**
 * Create default chart data for a given chart type
 *
 * Note: Chart structure is complex. This creates a minimal valid chart.
 * Full chart editing will require proper ChartEditor integration.
 */
function createDefaultChart(chartType: CreationChartType): Chart {
  const minimalPlotArea = {
    charts: [],
    axes: [],
  };

  return {
    plotArea: minimalPlotArea,
    title: {
      textBody: {
        bodyProperties: {},
        paragraphs: [
          {
            properties: {},
            runs: [{ type: "text" as const, text: `New ${chartType} chart` }],
          },
        ],
      },
    },
  };
}

/**
 * Create a chart graphic frame
 */
export function createChartGraphicFrame(
  id: ShapeId,
  bounds: ShapeBounds,
  chartType: CreationChartType
): GraphicFrame {
  const chartResourceId = `chart-${id}` as ResourceId;

  return {
    type: "graphicFrame",
    nonVisual: {
      id,
      name: `Chart ${id}`,
    },
    transform: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "chart",
      data: {
        resourceId: chartResourceId,
        parsedChart: createDefaultChart(chartType),
      },
    },
  };
}

// =============================================================================
// Diagram Creation
// =============================================================================

/**
 * Create a diagram graphic frame
 *
 * Note: Diagrams are complex and this creates a placeholder.
 * Full diagram editing requires SmartArt layout engine support.
 */
export function createDiagramGraphicFrame(
  id: ShapeId,
  bounds: ShapeBounds,
  _diagramType: CreationDiagramType
): GraphicFrame {
  const diagramResourceId = `diagram-${id}` as ResourceId;

  return {
    type: "graphicFrame",
    nonVisual: {
      id,
      name: `Diagram ${id}`,
    },
    transform: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    content: {
      type: "diagram",
      data: {
        dataResourceId: diagramResourceId,
        dataModel: {
          points: [
            { modelId: "pt-1" as `dg-${"pt-1"}`, type: "doc" },
            { modelId: "pt-2" as `dg-${"pt-2"}`, type: "node" },
            { modelId: "pt-3" as `dg-${"pt-3"}`, type: "node" },
          ],
          connections: [
            { modelId: "cxn-1" as `dg-${"cxn-1"}`, sourceId: "pt-1", destinationId: "pt-2", type: "parOf" as const },
            { modelId: "cxn-2" as `dg-${"cxn-2"}`, sourceId: "pt-2", destinationId: "pt-3", type: "parOf" as const },
          ],
        },
        parsedContent: { shapes: [] },
      },
    },
  };
}
