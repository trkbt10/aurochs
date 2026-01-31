/**
 * @file GraphicFrame factory functions
 *
 * Creates table/chart/diagram frames with default content.
 */

import type { GraphicFrame, Table, TableRow, TableCell, TableColumn } from "@oxen-office/pptx/domain";
import type { ShapeId, ResourceId } from "@oxen-office/pptx/domain/types";
import { deg, px } from "@oxen-office/ooxml/domain/units";
import type { CreationChartType, CreationDiagramType } from "../context/presentation/editor/types";
import type { ShapeBounds } from "../shape/creation-bounds";
import { type OleType, OLE_TYPE_MAP } from "@oxen-builder/pptx/patcher/resources/ole-manager";

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
export type CreateTableGraphicFrameOptions = {
  readonly id: ShapeId;
  readonly bounds: ShapeBounds;
  readonly rows: number;
  readonly cols: number;
};


























/** Create a table graphic frame with the specified dimensions */
export function createTableGraphicFrame({ id, bounds, rows, cols }: CreateTableGraphicFrameOptions): GraphicFrame {
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

/**
 * Create a chart graphic frame
 */
export function createChartGraphicFrame(
  id: ShapeId,
  bounds: ShapeBounds,
  _chartType: CreationChartType
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
        // Note: Chart data should be stored in ResourceStore separately
        // The factory creates the shape reference; the editor manages the data
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
        // Note: Diagram data should be stored in ResourceStore separately
        // The factory creates the shape reference; the editor manages the data
      },
    },
  };
}

// =============================================================================
// OLE Object Creation
// =============================================================================

/**
 * Create an OLE object graphic frame.
 *
 * The embedData is stored in the shape and will be processed during export
 * to create the actual embedded file in the PPTX package.
 *
 * @param id - Shape ID
 * @param bounds - Position and size
 * @param oleType - Type of OLE object (xlsx, docx, pptx)
 * @param embedData - Binary data of the file to embed
 * @param filename - Original filename for naming
 * @returns GraphicFrame with OLE object content
 */
export type CreateOleGraphicFrameOptions = {
  readonly id: ShapeId;
  readonly bounds: ShapeBounds;
  readonly oleType: OleType;
  readonly embedData: ArrayBuffer;
  readonly filename: string;
};


























/** Create an OLE object graphic frame for embedding external documents */
export function createOleGraphicFrame({ id, bounds, oleType, embedData, filename }: CreateOleGraphicFrameOptions): GraphicFrame {
  const typeInfo = OLE_TYPE_MAP[oleType];
  const objectName = filename.replace(/\.[^/.]+$/, ""); // Remove extension

  return {
    type: "graphicFrame",
    nonVisual: {
      id,
      name: `Object ${id}`,
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
      type: "oleObject",
      data: {
        progId: typeInfo.progId,
        name: objectName,
        showAsIcon: true, // Default to icon view since we don't have preview
        embedData,
        originalFilename: filename,
      },
    },
  };
}
