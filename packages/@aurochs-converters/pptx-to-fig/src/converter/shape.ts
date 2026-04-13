/**
 * @file Convert PPTX shapes to Fig design nodes
 *
 * Shape type mapping:
 *   SpShape → FigDesignNode (type from geometry)
 *   PicShape → FigDesignNode with IMAGE fill paint
 *   GrpShape → FigDesignNode type GROUP with children
 *   CxnShape → FigDesignNode type LINE (connector)
 *   GraphicFrame → FigDesignNode type FRAME (tables/charts as bounding box)
 *   ContentPartShape → skipped
 */

import type {
  Shape, SpShape, PicShape, GrpShape, CxnShape, GraphicFrame,
} from "@aurochs-office/pptx/domain/shape";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigPaint } from "@aurochs/fig/types";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { TableStyleList } from "@aurochs-office/pptx/parser/table/style-parser";
import type { Chart } from "@aurochs-office/chart/domain";
import { dmlTransformToFig, dmlFillToFig, dmlLineTofig, dmlEffectsToFig, type FigTransformResult } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";
import { diagramShapesToFig, chartToFigNodes } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";
import { convertGeometry } from "./geometry";
import { convertText } from "./text";
import { convertTableToNodes } from "./table";

/**
 * Counter for generating unique Fig node IDs within a conversion session.
 */
export type NodeIdCounter = { value: number };

/**
 * Context for PPTX→Fig conversion, carrying theme resolution data.
 */
export type ConvertContext = {
  readonly colorContext?: ColorContext;
  readonly fontScheme?: FontScheme;
  readonly resourceStore?: ResourceStore;
  readonly tableStyles?: TableStyleList;
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
    if (node) nodes.push(node);
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
  const transform = shape.properties.transform
    ? dmlTransformToFig(shape.properties.transform)
    : defaultTransform(shape.nonVisual.name);

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
  const transform = shape.properties.transform
    ? dmlTransformToFig(shape.properties.transform)
    : defaultTransform(shape.nonVisual.name);

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
  const transform = shape.properties.transform
    ? dmlTransformToFig(shape.properties.transform)
    : defaultTransform(shape.nonVisual.name);

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
  const transform = shape.properties.transform
    ? dmlTransformToFig(shape.properties.transform)
    : defaultTransform(shape.nonVisual.name);

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

function convertGraphicFrame(
  shape: GraphicFrame,
  idCounter: NodeIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);
  const transform = dmlTransformToFig(shape.transform);
  const content = shape.content;

  let children: readonly FigDesignNode[] | undefined;

  switch (content.type) {
    case "table": {
      // Decompose table into cell FRAME + TEXT nodes
      children = convertTableToNodes(
        content.data.table,
        idCounter,
        ctx,
      );
      break;
    }
    case "diagram": {
      // Diagram shapes may have been pre-generated by the enrichment pipeline
      // and stored in the ResourceStore. If available, convert them.
      const diagramResourceId = content.data.dataResourceId;
      if (diagramResourceId && ctx.resourceStore) {
        const entry = ctx.resourceStore.get(diagramResourceId);
        const diagramContent = entry?.parsed as { shapes?: readonly Shape[] } | undefined;
        if (diagramContent?.shapes && diagramContent.shapes.length > 0) {
          children = convertShapes(diagramContent.shapes, idCounter, ctx);
          break;
        }
      }
      console.warn(
        `[pptx-to-fig] Diagram content in "${shape.nonVisual.name}" has no pre-generated shapes. Retaining bounding box.`,
      );
      break;
    }
    case "oleObject": {
      // OLE objects may have a preview image (pic field).
      const pic = content.data.pic;
      if (pic) {
        const picId = nextId(idCounter);
        const imagePaint: FigPaint = {
          type: "IMAGE",
          visible: true,
          opacity: 1,
          imageRef: pic.resourceId,
          scaleMode: "FILL",
        };
        children = [{
          id: picId as FigNodeId,
          type: "RECTANGLE",
          name: "OLE Preview",
          visible: true,
          opacity: 1,
          transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
          size: transform.size,
          fills: [imagePaint],
          strokes: [],
          strokeWeight: 0,
          effects: [],
        }];
      }
      break;
    }
    case "chart": {
      // Try to retrieve the parsed Chart from the ResourceStore
      // and render it to Fig nodes.
      const chartResourceId = content.data.resourceId;
      if (chartResourceId && ctx.resourceStore) {
        const entry = ctx.resourceStore.get(chartResourceId);
        const parsedChart = entry?.parsed as Chart | undefined;
        if (parsedChart) {
          children = chartToFigNodes(
            parsedChart,
            transform.size.x,
            transform.size.y,
            ctx.colorContext,
            shape.nonVisual.name,
          );
          break;
        }
      }
      console.warn(
        `[pptx-to-fig] Chart content in "${shape.nonVisual.name}" has no parsed data in ResourceStore. Retaining bounding box.`,
      );
      break;
    }
    case "unknown": {
      console.warn(
        `[pptx-to-fig] Unknown GraphicFrame content (uri: "${content.uri}") in "${shape.nonVisual.name}". Retaining bounding box.`,
      );
      break;
    }
  }

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

function nextId(counter: NodeIdCounter): string {
  const id = ++counter.value;
  return `0:${id}`;
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
