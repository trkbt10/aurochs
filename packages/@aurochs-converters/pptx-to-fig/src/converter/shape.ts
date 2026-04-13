/**
 * @file Convert PPTX shapes to Fig design nodes
 *
 * Shape type mapping:
 *   SpShape → FigDesignNode (type from geometry)
 *   PicShape → FigDesignNode with IMAGE fill paint
 *   GrpShape → FigDesignNode type GROUP with children
 *   CxnShape → FigDesignNode type LINE (connector)
 *   GraphicFrame → FigDesignNode type FRAME (tables/charts/diagrams)
 *   ContentPartShape → skipped
 */

import type {
  Shape, SpShape, PicShape, GrpShape, CxnShape, GraphicFrame,
} from "@aurochs-office/pptx/domain/shape";
import type { Transform } from "@aurochs-office/drawing-ml/domain/geometry";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigPaint } from "@aurochs/fig/types";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { TableStyleList } from "@aurochs-office/pptx/parser/table/style-parser";
import type { Chart } from "@aurochs-office/chart/domain";
import type { FigImage } from "@aurochs/fig/parser";
import { dmlTransformToFig, dmlFillToFig, dmlLineTofig, dmlEffectsToFig, type FigTransformResult } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";
import { renderChartToSvg } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";
import { convertGeometry } from "./geometry";
import { convertText } from "./text";
import { convertTableToNodes } from "./table";

/**
 * Counter for generating unique Fig node IDs within a conversion session.
 */
export type NodeIdCounter = { value: number };

/**
 * Context for PPTX→Fig conversion, carrying theme resolution data.
 *
 * `collectedImages` accumulates images generated during conversion
 * (e.g. chart SVG renderings). The caller merges these into the
 * final FigDesignDocument.images.
 */
export type ConvertContext = {
  readonly colorContext?: ColorContext;
  readonly fontScheme?: FontScheme;
  readonly resourceStore?: ResourceStore;
  readonly tableStyles?: TableStyleList;
  /** Mutable map for collecting images generated during conversion */
  readonly collectedImages: Map<string, FigImage>;
};

/**
 * Convert a list of PPTX shapes to Fig design nodes.
 */
export function convertShapes(
  shapes: readonly Shape[],
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): readonly FigDesignNode[] {
  const nodes: FigDesignNode[] = [];
  for (const shape of shapes) {
    const node = convertShape(shape, idCounter, ctx);
    if (node) {nodes.push(node);}
  }
  return nodes;
}

/**
 * Convert a single PPTX shape to a Fig design node.
 */
export function convertShape(
  shape: Shape,
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): FigDesignNode | undefined {
  switch (shape.type) {
    case "sp":
      return convertSpShape(shape, idCounter, ctx);
    case "pic":
      return convertPicShape(shape, idCounter, ctx);
    case "grpSp":
      return convertGrpShape(shape, idCounter, ctx);
    case "cxnSp":
      return convertCxnShape(shape, idCounter, ctx);
    case "graphicFrame":
      return convertGraphicFrame(shape, idCounter, ctx);
    case "contentPart":
      return undefined;
    default:
      return undefined;
  }
}

function convertSpShape(
  shape: SpShape,
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);
  const transform = resolveShapeTransform(shape.properties.transform, shape.nonVisual.name);

  const width = transform.size.x;
  const height = transform.size.y;
  const geoResult = convertGeometry(shape.properties.geometry, width, height);
  const fills = shape.properties.fill ? dmlFillToFig(shape.properties.fill, ctx.colorContext) : [];
  const strokeProps = dmlLineTofig(shape.properties.line, ctx.colorContext);
  const effects = dmlEffectsToFig(shape.properties.effects, ctx.colorContext);

  const isTextNode = shape.nonVisual.textBox || (shape.textBody && !shape.properties.geometry);
  const nodeType = isTextNode ? "TEXT" : geoResult.nodeType;

  return {
    id: id as FigNodeId,
    type: nodeType,
    name: shape.nonVisual.name,
    visible: shape.nonVisual.hidden !== true,
    opacity: 1,
    transform: transform.transform,
    size: transform.size,
    fills,
    strokes: strokeProps?.strokePaints ?? [],
    strokeWeight: strokeProps?.strokeWeight ?? 0,
    strokeCap: strokeProps?.strokeCap,
    strokeJoin: strokeProps?.strokeJoin,
    cornerRadius: geoResult.cornerRadius,
    rectangleCornerRadii: geoResult.rectangleCornerRadii,
    pointCount: geoResult.pointCount,
    starInnerRadius: geoResult.starInnerRadius,
    effects,
    textData: shape.textBody ? convertText(shape.textBody, ctx.fontScheme, ctx.colorContext) : undefined,
  };
}

function convertPicShape(
  shape: PicShape,
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);
  const transform = resolveShapeTransform(shape.properties.transform, shape.nonVisual.name);

  const effects = dmlEffectsToFig(shape.properties.effects, ctx.colorContext);

  const imagePaint: FigPaint = {
    type: "IMAGE",
    visible: true,
    opacity: 1,
    imageRef: shape.blipFill.resourceId,
    scaleMode: "FILL",
  };

  return {
    id: id as FigNodeId,
    type: "RECTANGLE",
    name: shape.nonVisual.name,
    visible: shape.nonVisual.hidden !== true,
    opacity: 1,
    transform: transform.transform,
    size: transform.size,
    fills: [imagePaint],
    strokes: [],
    strokeWeight: 0,
    effects,
  };
}

function convertGrpShape(
  shape: GrpShape,
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);
  const transform = resolveShapeTransform(shape.properties.transform, shape.nonVisual.name);

  const children = convertShapes(shape.children, idCounter, ctx);
  const fills = shape.properties.fill ? dmlFillToFig(shape.properties.fill, ctx.colorContext) : [];
  const effects = dmlEffectsToFig(shape.properties.effects, ctx.colorContext);

  return {
    id: id as FigNodeId,
    type: "GROUP",
    name: shape.nonVisual.name,
    visible: shape.nonVisual.hidden !== true,
    opacity: 1,
    transform: transform.transform,
    size: transform.size,
    fills,
    strokes: [],
    strokeWeight: 0,
    effects,
    children,
  };
}

function convertCxnShape(
  shape: CxnShape,
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);
  const transform = resolveShapeTransform(shape.properties.transform, shape.nonVisual.name);

  const strokeProps = dmlLineTofig(shape.properties.line, ctx.colorContext);
  const effects = dmlEffectsToFig(shape.properties.effects, ctx.colorContext);

  return {
    id: id as FigNodeId,
    type: "LINE",
    name: shape.nonVisual.name,
    visible: shape.nonVisual.hidden !== true,
    opacity: 1,
    transform: transform.transform,
    size: transform.size,
    fills: [],
    strokes: strokeProps?.strokePaints ?? [],
    strokeWeight: strokeProps?.strokeWeight ?? 0,
    strokeCap: strokeProps?.strokeCap,
    strokeJoin: strokeProps?.strokeJoin,
    effects,
  };
}

type ResolveGraphicFrameChildrenOptions = {
  readonly content: GraphicFrame["content"];
  readonly shape: GraphicFrame;
  readonly transform: FigTransformResult;
  readonly idCounter: NodeIdCounter;
  readonly ctx: ConvertContext;
};

/** Resolve the children nodes for a graphic frame based on its content type. */
function resolveGraphicFrameChildren(
  { content, shape, transform, idCounter, ctx }: ResolveGraphicFrameChildrenOptions,
): readonly FigDesignNode[] | undefined {
  switch (content.type) {
    case "table":
      return convertTableToNodes(content.data.table, idCounter, ctx);
    case "diagram": {
      const diagramResourceId = content.data.dataResourceId;
      if (diagramResourceId && ctx.resourceStore) {
        const entry = ctx.resourceStore.get(diagramResourceId);
        const diagramContent = entry?.parsed as { shapes?: readonly Shape[] } | undefined;
        if (diagramContent?.shapes && diagramContent.shapes.length > 0) {
          return convertShapes(diagramContent.shapes, idCounter, ctx);
        }
      }
      console.warn(
        `[pptx-to-fig] Diagram content in "${shape.nonVisual.name}" has no pre-generated shapes. Retaining bounding box.`,
      );
      return undefined;
    }
    case "oleObject": {
      const pic = content.data.pic;
      if (pic) {
        return [createImageNode({ id: nextId(idCounter), name: "OLE Preview", size: transform.size, imageRef: pic.resourceId })];
      }
      return undefined;
    }
    case "chart":
      return convertChartContent({ content, shape, transform, idCounter, ctx });
    case "unknown":
      console.warn(
        `[pptx-to-fig] Unknown GraphicFrame content (uri: "${content.uri}") in "${shape.nonVisual.name}". Retaining bounding box.`,
      );
      return undefined;
    default:
      return undefined;
  }
}

function convertGraphicFrame(
  shape: GraphicFrame,
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);
  const transform = dmlTransformToFig(shape.transform);
  const content = shape.content;
  const children = resolveGraphicFrameChildren({ content, shape, transform, idCounter, ctx });

  return {
    id: id as FigNodeId,
    type: "FRAME",
    name: shape.nonVisual.name,
    visible: shape.nonVisual.hidden !== true,
    opacity: 1,
    transform: transform.transform,
    size: transform.size,
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    clipsContent: true,
    children,
  };
}

type ConvertChartContentOptions = {
  readonly content: GraphicFrame["content"];
  readonly shape: GraphicFrame;
  readonly transform: FigTransformResult;
  readonly idCounter: NodeIdCounter;
  readonly ctx: ConvertContext;
};

/**
 * Convert chart content to Fig design nodes.
 *
 * Renders the chart to SVG, then stores it as a FigImage (image/svg+xml)
 * and creates a RECTANGLE node with an IMAGE fill referencing it.
 * This produces a proper Fig image that renders in all consumers
 * (fig renderer, kwix, etc.) without relying on _raw fields.
 */
function convertChartContent(
  { content, shape, transform, idCounter, ctx }: ConvertChartContentOptions,
): readonly FigDesignNode[] | undefined {
  if (content.type !== "chart") {return undefined;}

  const chartResourceId = content.data.resourceId;
  if (!chartResourceId || !ctx.resourceStore) {
    console.warn(
      `[pptx-to-fig] Chart content in "${shape.nonVisual.name}" has no parsed data in ResourceStore. Retaining bounding box.`,
    );
    return undefined;
  }

  const entry = ctx.resourceStore.get(chartResourceId);
  const parsedChart = entry?.parsed as Chart | undefined;
  if (!parsedChart) {
    console.warn(
      `[pptx-to-fig] Chart content in "${shape.nonVisual.name}" has no parsed data in ResourceStore. Retaining bounding box.`,
    );
    return undefined;
  }

  const result = renderChartToSvg({
    chart: parsedChart,
    width: transform.size.x,
    height: transform.size.y,
    colorContext: ctx.colorContext,
    name: shape.nonVisual.name,
  });
  if (!result) {return undefined;}

  // Store the rendered SVG as an image in the collected images map.
  // SVG is a valid image format that Fig renderers can display via
  // data: URI embedding (same mechanism as PNG/JPEG images).
  const imageRef = `chart:${chartResourceId}`;
  const svgData = new TextEncoder().encode(result.svg);
  ctx.collectedImages.set(imageRef, {
    ref: imageRef,
    data: svgData,
    mimeType: "image/svg+xml",
  });

  return [createImageNode({ id: nextId(idCounter), name: shape.nonVisual.name, size: transform.size, imageRef })];
}

type CreateImageNodeOptions = {
  readonly id: string;
  readonly name: string;
  readonly size: { x: number; y: number };
  readonly imageRef: string;
};

/**
 * Create a RECTANGLE node with an IMAGE fill.
 * Shared pattern for OLE previews, charts, and other image-based content.
 */
function createImageNode(
  { id, name, size, imageRef }: CreateImageNodeOptions,
): FigDesignNode {
  const imagePaint: FigPaint = {
    type: "IMAGE",
    visible: true,
    opacity: 1,
    imageRef,
    scaleMode: "FILL",
  };
  return {
    id: id as FigNodeId,
    type: "RECTANGLE",
    name,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size,
    fills: [imagePaint],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  };
}

function nextId(counter: NodeIdCounter): string {
  const id = ++counter.value;
  return `0:${id}`;
}

function resolveShapeTransform(transform: Transform | undefined, shapeName: string): FigTransformResult {
  return transform ? dmlTransformToFig(transform) : defaultTransform(shapeName);
}

/**
 * Fallback transform for shapes with missing xfrm.
 *
 * ECMA-376 requires xfrm on shape properties, so reaching this path
 * indicates malformed input. Identity matrix at origin with zero size
 * makes the shape invisible rather than rendering at an arbitrary size.
 */
function defaultTransform(shapeName: string): FigTransformResult {
  console.warn(
    `[pptx-to-fig] Shape "${shapeName}" has no transform (xfrm). Using identity at origin.`,
  );
  return {
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 0, y: 0 },
  };
}
