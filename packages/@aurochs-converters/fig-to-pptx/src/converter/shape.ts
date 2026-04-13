/**
 * @file Convert Fig design nodes to PPTX shapes
 *
 * Each FigDesignNode is mapped to the appropriate PPTX Shape type:
 *   - TEXT → SpShape with textBody
 *   - RECTANGLE/ROUNDED_RECTANGLE/ELLIPSE/STAR/REGULAR_POLYGON/VECTOR
 *     → SpShape with geometry
 *   - FRAME/COMPONENT/INSTANCE/SYMBOL → GrpShape (if children) or SpShape
 *   - GROUP → GrpShape
 *   - IMAGE (via image paint) → PicShape
 *   - LINE → SpShape with line geometry
 *   - BOOLEAN_OPERATION → SpShape (flattened, vector paths not available)
 *
 * Nodes with visible=false or opacity=0 are marked as hidden.
 * Node opacity < 1 is applied via alpha on the fill/stroke colors.
 */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigImagePaint } from "@aurochs/fig/types";
import type { Shape, SpShape, GrpShape, PicShape, NonVisualProperties, ShapeProperties } from "@aurochs-office/pptx/domain/shape";
import type { Transform, GroupTransform } from "@aurochs-office/drawing-ml/domain/geometry";
import type { Pixels, Percent } from "@aurochs-office/drawing-ml/domain/units";
import { px, pct } from "@aurochs-office/drawing-ml/domain/units";
import { figTransformToDml, figFillsToDml, figStrokeToDml, figEffectsToDml } from "@aurochs-converters/interop-drawing-ml/fig-to-dml";
import { convertGeometry } from "./geometry";
import { convertText } from "./text";

/**
 * State for generating unique shape IDs within a slide.
 */
export type ShapeIdCounter = { value: number };

/**
 * Convert a list of Fig design nodes to PPTX shapes.
 */
export function convertNodes(
  nodes: readonly FigDesignNode[],
  idCounter: ShapeIdCounter,
): readonly Shape[] {
  const shapes: Shape[] = [];
  for (const node of nodes) {
    const shape = convertNode(node, idCounter);
    if (shape) shapes.push(shape);
  }
  return shapes;
}

/**
 * Convert a single Fig design node to a PPTX Shape.
 *
 * Returns undefined for node types that have no PPTX representation
 * (e.g., SLICE, STICKY, WIDGET, etc.)
 */
export function convertNode(
  node: FigDesignNode,
  idCounter: ShapeIdCounter,
): Shape | undefined {
  // Skip non-renderable node types
  if (isNonRenderableType(node.type)) return undefined;

  // Check for image fill — becomes PicShape
  const imagePaint = findTopVisibleImagePaint(node);
  if (imagePaint && imagePaint.imageRef) {
    return convertToPicShape(node, imagePaint, idCounter);
  }

  // Group-like nodes with children → GrpShape
  if (isGroupLike(node.type) && node.children && node.children.length > 0) {
    return convertToGroupShape(node, idCounter);
  }

  // Text nodes → SpShape with textBody
  if (node.type === "TEXT" && node.textData) {
    return convertToTextShape(node, idCounter);
  }

  // All other visual nodes → SpShape
  return convertToSpShape(node, idCounter);
}

function convertToSpShape(
  node: FigDesignNode,
  idCounter: ShapeIdCounter,
): SpShape {
  const id = nextId(idCounter);
  const transform = figTransformToDml(node.transform, node.size);
  const geometry = convertGeometry(node);
  const fill = figFillsToDml(node.fills);
  const line = figStrokeToDml(node.strokes, node.strokeWeight, node.strokeCap, node.strokeJoin);
  const effects = figEffectsToDml(node.effects);

  const properties: ShapeProperties = {
    transform,
    geometry,
    fill,
    line,
    effects,
  };

  return {
    type: "sp",
    nonVisual: buildNonVisual(id, node),
    properties,
    textBody: node.textData ? convertText(node.textData) : undefined,
  };
}

function convertToTextShape(
  node: FigDesignNode,
  idCounter: ShapeIdCounter,
): SpShape {
  const id = nextId(idCounter);
  const transform = figTransformToDml(node.transform, node.size);
  const fill = figFillsToDml(node.fills);
  const line = figStrokeToDml(node.strokes, node.strokeWeight, node.strokeCap, node.strokeJoin);
  const effects = figEffectsToDml(node.effects);

  return {
    type: "sp",
    nonVisual: {
      ...buildNonVisual(id, node),
      textBox: true,
    },
    properties: {
      transform,
      geometry: { type: "preset", preset: "rect", adjustValues: [] },
      fill,
      line,
      effects,
    },
    textBody: convertText(node.textData!),
  };
}

function convertToGroupShape(
  node: FigDesignNode,
  idCounter: ShapeIdCounter,
): GrpShape {
  const id = nextId(idCounter);
  const transform = figTransformToDml(node.transform, node.size);
  const children = convertNodes(node.children!, idCounter);

  // In Figma, child coordinates are relative to the parent frame's origin.
  // In PPTX, grpSp childOffset/childExtent define the child coordinate space.
  // Setting childOffset to (0,0) and childExtent to the group's own dimensions
  // means children's x,y are relative to the group's top-left — matching Figma.
  const groupTransform: GroupTransform = {
    ...transform,
    childOffsetX: px(0) as Pixels,
    childOffsetY: px(0) as Pixels,
    childExtentWidth: transform.width,
    childExtentHeight: transform.height,
  };

  return {
    type: "grpSp",
    nonVisual: buildNonVisual(id, node),
    properties: {
      transform: groupTransform,
      fill: figFillsToDml(node.fills),
      effects: figEffectsToDml(node.effects),
    },
    children,
  };
}

function convertToPicShape(
  node: FigDesignNode,
  imagePaint: FigImagePaint,
  idCounter: ShapeIdCounter,
): PicShape {
  const id = nextId(idCounter);
  const transform = figTransformToDml(node.transform, node.size);

  return {
    type: "pic",
    nonVisual: buildNonVisual(id, node),
    blipFill: {
      resourceId: `fig-image:${imagePaint.imageRef}`,
      stretch: true,
    },
    properties: {
      transform,
      effects: figEffectsToDml(node.effects),
    },
  };
}

function buildNonVisual(id: string, node: FigDesignNode): NonVisualProperties {
  return {
    id,
    name: node.name,
    hidden: !node.visible || node.opacity <= 0 ? true : undefined,
  };
}

function nextId(counter: ShapeIdCounter): string {
  return String(++counter.value);
}

/**
 * Find the topmost visible image paint in a node's fills.
 */
function findTopVisibleImagePaint(node: FigDesignNode): FigImagePaint | undefined {
  for (let i = node.fills.length - 1; i >= 0; i--) {
    const paint = node.fills[i];
    if (paint.visible === false) continue;
    const typeName = typeof paint.type === "string" ? paint.type : paint.type.name;
    if (typeName === "IMAGE") return paint as FigImagePaint;
  }
  return undefined;
}

function isGroupLike(type: string): boolean {
  return type === "GROUP" || type === "FRAME" || type === "COMPONENT"
    || type === "COMPONENT_SET" || type === "INSTANCE" || type === "SYMBOL"
    || type === "SECTION";
}

function isNonRenderableType(type: string): boolean {
  return type === "SLICE" || type === "STICKY" || type === "CONNECTOR"
    || type === "SHAPE_WITH_TEXT" || type === "CODE_BLOCK" || type === "STAMP"
    || type === "WIDGET" || type === "EMBED" || type === "LINK_UNFURL"
    || type === "MEDIA" || type === "TABLE" || type === "TABLE_CELL";
}
