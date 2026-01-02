/**
 * @file Content enricher for pre-parsing chart and diagram content
 *
 * This module enriches Slide domain objects with pre-parsed chart and diagram
 * content, allowing render to render without directly calling parser.
 *
 * The enrichment happens in the integration layer, bridging parser and render.
 */

import type {
  BlipFill,
  BlipFillProperties,
  DiagramColorsDefinition,
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
  Fill,
  GraphicFrame,
  OleReference,
  PicShape,
  Shape,
  Slide,
  SpShape,
} from "../../domain/index";
import { parseXml } from "../../../xml/index";
import { parseChart } from "../chart-parser/index";
import { parseDiagramDrawing } from "../diagram/diagram-parser";
import { parseDiagramColorsDefinition } from "../diagram/color-parser";
import { parseDiagramDataModel } from "../diagram/data-parser";
import { parseDiagramLayoutDefinition } from "../diagram/layout-parser";
import { parseDiagramStyleDefinition } from "../diagram/style-parser";
import { parseRelationships } from "../../core/opc/relationships";
import {
  getRelationshipPath,
  RELATIONSHIP_TYPES,
  getMimeTypeFromPath,
  arrayBufferToBase64,
  createDataUrl,
  resolveRelativePath,
  normalizePath,
} from "../../core/opc/index";
import type { SlideResources } from "../../core/opc/index";
import { findVmlShapeImage, getVmlRelsPath, normalizeVmlImagePath } from "../external/vml-parser";
import { emfToSvg } from "../external/emf-parser";

/**
 * File reader interface for loading content from PPTX archive
 */
export type FileReader = {
  readonly readFile: (path: string) => ArrayBuffer | null;
  readonly resolveResource: (id: string) => string | undefined;
  readonly getResourceByType?: (relType: string) => string | undefined;
};

/**
 * Enrich a Slide with pre-parsed chart and diagram content.
 *
 * This function iterates through all shapes in the slide and for each
 * GraphicFrame with chart or diagram content, loads and parses the
 * external XML files and attaches the parsed data to the domain objects.
 *
 * @param slide - The parsed Slide domain object
 * @param fileReader - Interface for reading files from the PPTX archive
 * @returns A new Slide with pre-parsed content attached
 */
export function enrichSlideContent(slide: Slide, fileReader: FileReader): Slide {
  const enrichedShapes = slide.shapes.map((shape) => enrichShape(shape, fileReader));

  // If no shapes were enriched, return the original slide
  if (enrichedShapes.every((s, i) => s === slide.shapes[i])) {
    return slide;
  }

  return {
    ...slide,
    shapes: enrichedShapes,
  };
}

/**
 * Enrich a single shape with pre-parsed content if applicable.
 */
function enrichShape(shape: Shape, fileReader: FileReader): Shape {
  if (shape.type !== "graphicFrame") {
    return shape;
  }

  const frame = shape as GraphicFrame;

  if (frame.content.type === "chart") {
    return enrichChartFrame(frame, fileReader);
  }

  if (frame.content.type === "diagram") {
    return enrichDiagramFrame(frame, fileReader);
  }

  if (frame.content.type === "oleObject") {
    return enrichOleFrame(frame, fileReader);
  }

  return shape;
}

/**
 * Enrich a chart GraphicFrame with pre-parsed Chart data.
 */
function enrichChartFrame(frame: GraphicFrame, fileReader: FileReader): GraphicFrame {
  if (frame.content.type !== "chart") {
    return frame;
  }

  const chartRef = frame.content.data;

  // Skip if already parsed
  if (chartRef.parsedChart !== undefined) {
    return frame;
  }

  // Resolve chart file path from resource ID
  const chartPath = fileReader.resolveResource(chartRef.resourceId as string);
  if (chartPath === undefined) {
    return frame;
  }

  // Read chart XML file
  const chartData = fileReader.readFile(chartPath);
  if (chartData === null) {
    return frame;
  }

  // Parse chart XML
  const decoder = new TextDecoder();
  const chartXmlText = decoder.decode(chartData);
  const chartDoc = parseXml(chartXmlText);
  if (chartDoc === undefined) {
    return frame;
  }

  // Parse to Chart domain object
  const parsedChart = parseChart(chartDoc);
  if (parsedChart === undefined) {
    return frame;
  }

  // Return new frame with parsed chart attached
  return {
    ...frame,
    content: {
      ...frame.content,
      data: {
        ...chartRef,
        parsedChart,
      },
    },
  };
}

/**
 * Enrich a diagram GraphicFrame with pre-parsed DiagramContent.
 *
 * This function also resolves diagram-specific resource references (blipFill)
 * using the diagram's relationship file, not the slide's relationships.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */
function enrichDiagramFrame(frame: GraphicFrame, fileReader: FileReader): GraphicFrame {
  if (frame.content.type !== "diagram") {
    return frame;
  }

  const diagramRef = frame.content.data;

  // Skip if already parsed
  if (diagramRef.parsedContent !== undefined) {
    return frame;
  }

  const dataModel = diagramRef.dataModel ?? loadDiagramDataModel(diagramRef.dataResourceId, fileReader);
  const layoutDefinition =
    diagramRef.layoutDefinition ?? loadDiagramLayoutDefinition(diagramRef.layoutResourceId, fileReader);
  const styleDefinition =
    diagramRef.styleDefinition ?? loadDiagramStyleDefinition(diagramRef.styleResourceId, fileReader);
  const colorsDefinition =
    diagramRef.colorsDefinition ?? loadDiagramColorsDefinition(diagramRef.colorResourceId, fileReader);

  // Find diagram drawing file using relationship type
  const diagramPath = fileReader.getResourceByType?.(RELATIONSHIP_TYPES.DIAGRAM_DRAWING);
  if (diagramPath === undefined) {
    return frame;
  }

  // Normalize diagram path (handle relative paths like ../diagrams/drawing1.xml)
  const normalizedDiagramPath = normalizePath(diagramPath);

  // Read diagram drawing XML file
  const diagramData = fileReader.readFile(normalizedDiagramPath);
  if (diagramData === null) {
    return frame;
  }

  // Parse diagram XML
  const decoder = new TextDecoder();
  const diagramXmlText = decoder.decode(diagramData);
  const diagramDoc = parseXml(diagramXmlText);
  if (diagramDoc === undefined) {
    return frame;
  }

  // Parse to DiagramContent domain object
  const parsedContent = parseDiagramDrawing(diagramDoc);
  if (parsedContent.shapes.length === 0) {
    return frame;
  }

  // Load diagram-specific relationships for blipFill resolution
  const diagramRelsPath = getRelationshipPath(normalizedDiagramPath);
  const diagramRelsData = fileReader.readFile(diagramRelsPath);
  const diagramResources = loadDiagramResources(diagramRelsData);

  // Resolve blipFill resourceIds in diagram shapes using diagram relationships
  const resolvedShapes = resolveDiagramShapeResources(
    parsedContent.shapes,
    diagramResources,
    normalizedDiagramPath,
    fileReader,
  );

  // Return new frame with parsed diagram attached
  return {
    ...frame,
    content: {
      ...frame.content,
      data: {
        ...diagramRef,
        parsedContent: { shapes: resolvedShapes },
        dataModel,
        layoutDefinition,
        styleDefinition,
        colorsDefinition,
      },
    },
  };
}

/**
 * Load diagram resources from relationship file.
 */
function loadDiagramResources(relsData: ArrayBuffer | null): SlideResources {
  if (relsData === null) {
    return {};
  }

  const decoder = new TextDecoder();
  const relsXmlText = decoder.decode(relsData);
  const relsDoc = parseXml(relsXmlText);
  if (relsDoc === undefined) {
    return {};
  }

  return parseRelationships(relsDoc);
}

function loadDiagramDataModel(resourceId: string | undefined, fileReader: FileReader): DiagramDataModel | undefined {
  const doc = loadDiagramResourceXml(resourceId, fileReader);
  if (!doc) {
    return undefined;
  }
  return parseDiagramDataModel(doc);
}

function loadDiagramLayoutDefinition(
  resourceId: string | undefined,
  fileReader: FileReader,
): DiagramLayoutDefinition | undefined {
  const doc = loadDiagramResourceXml(resourceId, fileReader);
  if (!doc) {
    return undefined;
  }
  return parseDiagramLayoutDefinition(doc);
}

function loadDiagramStyleDefinition(
  resourceId: string | undefined,
  fileReader: FileReader,
): DiagramStyleDefinition | undefined {
  const doc = loadDiagramResourceXml(resourceId, fileReader);
  if (!doc) {
    return undefined;
  }
  return parseDiagramStyleDefinition(doc);
}

function loadDiagramColorsDefinition(
  resourceId: string | undefined,
  fileReader: FileReader,
): DiagramColorsDefinition | undefined {
  const doc = loadDiagramResourceXml(resourceId, fileReader);
  if (!doc) {
    return undefined;
  }
  return parseDiagramColorsDefinition(doc);
}

function loadDiagramResourceXml(resourceId: string | undefined, fileReader: FileReader) {
  if (!resourceId) {
    return undefined;
  }

  const path = fileReader.resolveResource(resourceId);
  if (!path) {
    return undefined;
  }

  const data = fileReader.readFile(path);
  if (data === null) {
    return undefined;
  }

  const decoder = new TextDecoder();
  const xmlText = decoder.decode(data);
  return parseXml(xmlText);
}

/**
 * Resolve blipFill resource IDs in diagram shapes to data URLs.
 *
 * Diagram shapes reference images via r:embed IDs that point to
 * ppt/diagrams/_rels/drawing1.xml.rels, not the slide relationships.
 * This function walks all shapes and converts resourceIds to data URLs.
 */
function resolveDiagramShapeResources(
  shapes: readonly Shape[],
  diagramResources: SlideResources,
  diagramPath: string,
  fileReader: FileReader,
): readonly Shape[] {
  // Get the base directory for resolving relative paths
  const diagramDir = diagramPath.substring(0, diagramPath.lastIndexOf("/") + 1);

  return shapes.map((shape) => resolveShapeResources(shape, diagramResources, diagramDir, fileReader));
}

/**
 * Resolve resource IDs in a single shape recursively.
 */
function resolveShapeResources(
  shape: Shape,
  resources: SlideResources,
  baseDir: string,
  fileReader: FileReader,
): Shape {
  switch (shape.type) {
    case "sp":
      return resolveSpShapeResources(shape, resources, baseDir, fileReader);
    case "pic":
      return resolvePicShapeResources(shape, resources, baseDir, fileReader);
    case "grpSp":
      return {
        ...shape,
        children: shape.children.map((child) => resolveShapeResources(child, resources, baseDir, fileReader)),
      };
    default:
      return shape;
  }
}

/**
 * Resolve blipFill in SpShape properties.
 */
function resolveSpShapeResources(
  shape: SpShape,
  resources: SlideResources,
  baseDir: string,
  fileReader: FileReader,
): SpShape {
  const fill = shape.properties?.fill;
  if (fill?.type !== "blipFill") {
    return shape;
  }

  const resolvedFill = resolveBlipFill(fill, resources, baseDir, fileReader);
  if (resolvedFill === fill) {
    return shape;
  }

  return {
    ...shape,
    properties: {
      ...shape.properties,
      fill: resolvedFill,
    },
  };
}

/**
 * Resolve blipFill in PicShape.
 */
function resolvePicShapeResources(
  shape: PicShape,
  resources: SlideResources,
  baseDir: string,
  fileReader: FileReader,
): PicShape {
  const resolved = resolveBlipFillProperties(shape.blipFill, resources, baseDir, fileReader);
  if (resolved === shape.blipFill) {
    return shape;
  }

  return {
    ...shape,
    blipFill: resolved,
  };
}

/**
 * Resolve a BlipFill's resourceId to a data URL.
 */
function resolveBlipFill(fill: BlipFill, resources: SlideResources, baseDir: string, fileReader: FileReader): Fill {
  const resolved = resolveResourceToDataUrl(fill.resourceId, resources, baseDir, fileReader);

  if (resolved === undefined) {
    return fill;
  }

  return {
    ...fill,
    resourceId: resolved,
  };
}

/**
 * Resolve BlipFillProperties's resourceId to a data URL.
 */
function resolveBlipFillProperties(
  blipFill: BlipFillProperties,
  resources: SlideResources,
  baseDir: string,
  fileReader: FileReader,
): BlipFillProperties {
  const resolved = resolveResourceToDataUrl(blipFill.resourceId, resources, baseDir, fileReader);

  if (resolved === undefined) {
    return blipFill;
  }

  return {
    ...blipFill,
    resourceId: resolved,
  };
}

/**
 * Resolve a resource ID to a data URL using diagram relationships.
 *
 * @param resourceId - The r:embed or r:link ID (e.g., "rId1")
 * @param resources - Diagram relationships map
 * @param baseDir - Base directory for resolving relative paths
 * @param fileReader - File reader for accessing archive content
 * @returns Data URL if resolved, undefined if not found
 */
function resolveResourceToDataUrl(
  resourceId: string,
  resources: SlideResources,
  baseDir: string,
  fileReader: FileReader,
): string | undefined {
  // Skip if already a data URL
  if (resourceId.startsWith("data:")) {
    return undefined;
  }

  // Look up in diagram relationships
  const resource = resources[resourceId];
  if (resource === undefined) {
    return undefined;
  }

  // Resolve relative path (e.g., "../media/image1.jpeg")
  const targetPath = resolveRelativePath(baseDir, resource.target);

  // Read the resource file
  const data = fileReader.readFile(targetPath);
  if (data === null) {
    return undefined;
  }

  // Convert to data URL
  return createDataUrl(data, targetPath);
}

// =============================================================================
// OLE Object Enrichment
// =============================================================================

/**
 * Enrich an OLE object GraphicFrame with pre-resolved preview image.
 *
 * OLE objects can have preview images from two sources:
 * 1. p:pic child element (ECMA-376-1:2016 format) - already resolved as pic.resourceId
 * 2. VML drawing part (legacy format) - needs resolution via spid attribute
 *
 * This function resolves VML-based preview images and attaches them as data URLs
 * to OleReference.previewImageUrl, allowing render to render without calling parser.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 * @see MS-OE376 Part 4 Section 4.4.2.4
 */
function enrichOleFrame(frame: GraphicFrame, fileReader: FileReader): GraphicFrame {
  if (frame.content.type !== "oleObject") {
    return frame;
  }

  const oleRef = frame.content.data;

  // Skip if already has preview URL
  if (oleRef.previewImageUrl !== undefined) {
    return frame;
  }

  // Skip if no VML shape ID (modern format uses pic.resourceId directly)
  if (oleRef.spid === undefined) {
    return frame;
  }

  // Try to resolve VML preview image
  const previewImageUrl = resolveVmlPreviewImage(oleRef, fileReader);
  if (previewImageUrl === undefined) {
    return frame;
  }

  // Return new frame with preview image URL attached
  return {
    ...frame,
    content: {
      ...frame.content,
      data: {
        ...oleRef,
        previewImageUrl,
      },
    },
  };
}

/**
 * Resolve OLE object preview image from VML drawing.
 *
 * @param oleRef - OLE reference with spid attribute
 * @param fileReader - File reader for accessing archive content
 * @returns Data URL if resolved, undefined if not found
 */
function resolveVmlPreviewImage(oleRef: OleReference, fileReader: FileReader): string | undefined {
  if (oleRef.spid === undefined || fileReader.getResourceByType === undefined) {
    return undefined;
  }

  // Get VML drawing path
  const vmlPath = fileReader.getResourceByType(RELATIONSHIP_TYPES.VML_DRAWING);
  if (vmlPath === undefined) {
    return undefined;
  }

  // Read VML drawing
  const vmlData = fileReader.readFile(vmlPath);
  if (vmlData === null) {
    return undefined;
  }

  // Parse VML drawing
  const vmlText = new TextDecoder().decode(vmlData);
  const vmlDoc = parseXml(vmlText);
  if (vmlDoc === undefined) {
    return undefined;
  }

  // Read VML relationships
  const vmlRelsPath = getVmlRelsPath(vmlPath);
  const vmlRelsData = fileReader.readFile(vmlRelsPath);
  const vmlRelsDoc = vmlRelsData !== null ? parseXml(new TextDecoder().decode(vmlRelsData)) : null;

  // Find image info for this shape
  const imageInfo = findVmlShapeImage(vmlDoc, vmlRelsDoc ?? null, oleRef.spid as string);
  if (imageInfo === undefined) {
    return undefined;
  }

  // Normalize image path and read image
  const normalizedPath = normalizeVmlImagePath(vmlPath, imageInfo.imagePath);
  const imageData = fileReader.readFile(normalizedPath);
  if (imageData === null) {
    return undefined;
  }

  // Handle EMF by converting to SVG
  const ext = normalizedPath.split(".").pop()?.toLowerCase();
  if (ext === "emf") {
    const svg = emfToSvg(new Uint8Array(imageData));
    if (svg !== null) {
      const base64 = btoa(svg);
      return `data:image/svg+xml;base64,${base64}`;
    }
    // Fall back to embedding raw EMF (won't display but won't break)
  }

  // Convert to data URL
  const mimeType = getMimeTypeFromPath(normalizedPath);
  const base64 = arrayBufferToBase64(imageData);
  return `data:${mimeType};base64,${base64}`;
}
