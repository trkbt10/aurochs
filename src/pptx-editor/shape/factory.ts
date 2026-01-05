/**
 * @file Shape factory functions
 *
 * Creates new shapes with default properties for the editor.
 */

import type {
  SpShape,
  CxnShape,
  GraphicFrame,
  PicShape,
  Shape,
  Table,
  TableRow,
  TableCell,
  TableColumn,
  Chart,
  CustomGeometry,
} from "../../pptx/domain";
import type { ShapeId, Pixels, ResourceId } from "../../pptx/domain/types";
import { px, deg, pct } from "../../pptx/domain/types";
import type { CreationPresetShape, CreationMode } from "../context/presentation/editor/types";

// =============================================================================
// Chart Type Definitions
// =============================================================================

export type ChartType = "bar" | "line" | "pie";
export type DiagramType = "process" | "cycle" | "hierarchy" | "relationship";

// =============================================================================
// Types
// =============================================================================

export type ShapeBounds = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
};

// =============================================================================
// Default Values
// =============================================================================

/** Default fill color (Office blue) */
const DEFAULT_FILL_COLOR = "4472C4";

/** Default stroke color (darker blue) */
const DEFAULT_STROKE_COLOR = "2F528F";

/** Default stroke width */
const DEFAULT_STROKE_WIDTH = px(1);

/** Default shape dimensions */
const DEFAULT_SHAPE_WIDTH = px(150);
const DEFAULT_SHAPE_HEIGHT = px(100);

/** Default text box dimensions */
const DEFAULT_TEXTBOX_WIDTH = px(200);
const DEFAULT_TEXTBOX_HEIGHT = px(40);

// =============================================================================
// ID Generation
// =============================================================================

// eslint-disable-next-line no-restricted-syntax -- Counter requires mutation
let shapeCounter = 0;

/**
 * Generate a unique shape ID
 */
export function generateShapeId(): ShapeId {
  shapeCounter += 1;
  return `shape-${Date.now()}-${shapeCounter}` as ShapeId;
}

/**
 * Reset shape counter (for testing)
 */
export function resetShapeCounter(): void {
  shapeCounter = 0;
}

// =============================================================================
// Shape Factory Functions
// =============================================================================

/**
 * Create a basic shape (SpShape) with preset geometry
 */
export function createSpShape(id: ShapeId, bounds: ShapeBounds, preset: CreationPresetShape): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id,
      name: `Shape ${id}`,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset,
        adjustValues: [],
      },
      fill: {
        type: "solidFill",
        color: {
          spec: { type: "srgb", value: DEFAULT_FILL_COLOR },
        },
      },
      line: {
        width: DEFAULT_STROKE_WIDTH,
        cap: "flat",
        compound: "sng",
        alignment: "ctr",
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: DEFAULT_STROKE_COLOR },
          },
        },
        dash: "solid",
        join: "round",
      },
    },
  };
}

/**
 * Create a text box shape
 */
export function createTextBox(id: ShapeId, bounds: ShapeBounds): SpShape {
  return {
    type: "sp",
    nonVisual: {
      id,
      name: `TextBox ${id}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
      fill: { type: "noFill" },
    },
    textBody: {
      bodyProperties: {},
      paragraphs: [
        {
          properties: {},
          runs: [
            {
              type: "text",
              text: "",
            },
          ],
        },
      ],
    },
  };
}

/**
 * Create a custom geometry shape
 *
 * @param id - Shape ID
 * @param geometry - Custom geometry definition
 * @param bounds - Position and size in slide coordinates
 * @returns SpShape with CustomGeometry
 */
export function createCustomGeometryShape(
  id: ShapeId,
  geometry: CustomGeometry,
  bounds: ShapeBounds
): SpShape {
  const pathFill = geometry.paths[0]?.fill;
  const isFillEnabled = pathFill !== "none";

  return {
    type: "sp",
    nonVisual: {
      id,
      name: `Path ${id}`,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry,
      fill: isFillEnabled
        ? {
            type: "solidFill",
            color: {
              spec: { type: "srgb", value: DEFAULT_FILL_COLOR },
            },
          }
        : { type: "noFill" },
      line: {
        width: px(2),
        cap: "round",
        compound: "sng",
        alignment: "ctr",
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: DEFAULT_STROKE_COLOR },
          },
        },
        dash: "solid",
        join: "round",
      },
    },
  };
}

/**
 * Create a connector shape
 */
export function createConnector(id: ShapeId, bounds: ShapeBounds): CxnShape {
  return {
    type: "cxnSp",
    nonVisual: {
      id,
      name: `Connector ${id}`,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "straightConnector1",
        adjustValues: [],
      },
      line: {
        width: DEFAULT_STROKE_WIDTH,
        cap: "flat",
        compound: "sng",
        alignment: "ctr",
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: DEFAULT_STROKE_COLOR },
          },
        },
        dash: "solid",
        join: "round",
      },
    },
  };
}

/** Default cell dimensions */
const DEFAULT_CELL_WIDTH = px(100);
const DEFAULT_CELL_HEIGHT = px(40);

/** Default table border color */
const DEFAULT_TABLE_BORDER_COLOR = "8EAADB";

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

/**
 * Create a picture shape
 *
 * For new pictures, resourceId is the dataURL of the image.
 * The rendering layer will handle dataURL resources.
 */
export function createPicShape(id: ShapeId, bounds: ShapeBounds, dataUrl: string): PicShape {
  return {
    type: "pic",
    nonVisual: {
      id,
      name: `Picture ${id}`,
    },
    blipFill: {
      resourceId: dataUrl as ResourceId,
      sourceRect: {
        left: pct(0),
        top: pct(0),
        right: pct(0),
        bottom: pct(0),
      },
      stretch: true,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
    },
  };
}

/**
 * Create default chart data for a given chart type
 *
 * Note: Chart structure is complex. This creates a minimal valid chart.
 * Full chart editing will require proper ChartEditor integration.
 */
function createDefaultChart(chartType: ChartType): Chart {
  // Minimal chart structure - actual rendering requires full chart data
  const minimalPlotArea = {
    charts: [],
    axes: [],
  };

  // Return minimal chart with plotArea
  // The rendering layer will display a placeholder for empty charts
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
export function createChartGraphicFrame(id: ShapeId, bounds: ShapeBounds, chartType: ChartType): GraphicFrame {
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

/**
 * Create a diagram graphic frame
 *
 * Note: Diagrams are complex and this creates a placeholder.
 * Full diagram editing requires SmartArt layout engine support.
 */
export function createDiagramGraphicFrame(id: ShapeId, bounds: ShapeBounds, _diagramType: DiagramType): GraphicFrame {
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
        // Placeholder shapes - actual rendering requires layout engine
        parsedContent: { shapes: [] },
      },
    },
  };
}

// =============================================================================
// Default Bounds
// =============================================================================

function getDimensionsForMode(mode: CreationMode): { width: Pixels; height: Pixels } {
  switch (mode.type) {
    case "textbox":
      return { width: DEFAULT_TEXTBOX_WIDTH, height: DEFAULT_TEXTBOX_HEIGHT };
    case "connector":
      return { width: px(100), height: px(0) };
    case "table":
      return { width: px(mode.cols * 100), height: px(mode.rows * 40) };
    default:
      return { width: DEFAULT_SHAPE_WIDTH, height: DEFAULT_SHAPE_HEIGHT };
  }
}

/**
 * Get default bounds for a creation mode
 */
export function getDefaultBoundsForMode(mode: CreationMode, centerX: Pixels, centerY: Pixels): ShapeBounds {
  const { width, height } = getDimensionsForMode(mode);

  return {
    x: px((centerX as number) - (width as number) / 2),
    y: px((centerY as number) - (height as number) / 2),
    width,
    height,
  };
}

/**
 * Create bounds from drag start/end coordinates
 */
export function createBoundsFromDrag(startX: Pixels, startY: Pixels, endX: Pixels, endY: Pixels): ShapeBounds {
  const x1 = startX as number;
  const y1 = startY as number;
  const x2 = endX as number;
  const y2 = endY as number;

  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const width = Math.max(10, Math.abs(x2 - x1));
  const height = Math.max(10, Math.abs(y2 - y1));

  return {
    x: px(minX),
    y: px(minY),
    width: px(width),
    height: px(height),
  };
}

// =============================================================================
// Create Shape from Mode
// =============================================================================

/**
 * Create a shape based on the current creation mode
 */
export function createShapeFromMode(mode: CreationMode, bounds: ShapeBounds): Shape | undefined {
  const id = generateShapeId();

  switch (mode.type) {
    case "shape":
      return createSpShape(id, bounds, mode.preset);
    case "textbox":
      return createTextBox(id, bounds);
    case "connector":
      return createConnector(id, bounds);
    case "table":
      return createTableGraphicFrame(id, bounds, mode.rows, mode.cols);
    case "select":
    case "picture":
      // These require additional handling (file upload dialog)
      return undefined;
  }
}
