/**
 * @file Content enricher for pre-parsing chart and diagram content
 *
 * This module enriches Slide domain objects with pre-parsed chart and diagram
 * content, allowing render to render without directly calling parser.
 *
 * The enrichment happens in the integration layer, bridging parser and render.
 */

import type { BlipFill, BlipFillProperties, DiagramColorsDefinition, DiagramDataModel, DiagramLayoutDefinition, DiagramStyleDefinition, Fill, GraphicFrame, OleReference, PicShape, Shape, Slide, SpShape } from "../../domain/index";
import {
  generateDiagramShapes,
  type ShapeGenerationConfig,
} from "../../domain/diagram/layout-engine";
import { parseXml } from "@oxen/xml";
import { parseChart } from "../chart-parser/index";
import { parseDiagramDrawing } from "../diagram/diagram-parser";
import { parseDiagramColorsDefinition } from "../diagram/color-parser";
import { parseDiagramDataModel } from "../diagram/data-parser";
import { parseDiagramLayoutDefinition } from "../diagram/layout-parser";
import { parseDiagramStyleDefinition } from "../diagram/style-parser";
import type { ResourceMap } from "../../domain/opc";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { getMimeTypeFromPath } from "../../opc/utils";
import { toDataUrl } from "@oxen/buffer";
import {
  getRelationshipPath,
  parseRelationships,
  resolvePartPath,
} from "../relationships";
import { createEmptyResourceMap } from "../../domain/relationships";
import { findVmlShapeImage, getVmlRelsPath, normalizeVmlImagePath } from "../external/vml-parser";
import { emfToSvg } from "../external/emf-parser";
import type { ResourceStore } from "../../domain/resource-store";

/**
 * File reader interface for loading content from PPTX archive
 */
export type FileReader = {
  readonly readFile: (path: string) => ArrayBuffer | null;
  readonly resolveResource: (id: string) => string | undefined;
  readonly getResourceByType?: (relType: string) => string | undefined;
};

/**
 * Context for enrichment operations
 */
type EnrichmentContext = {
  readonly fileReader: FileReader;
  readonly resourceStore?: ResourceStore;
};

/**
 * Enrich a Slide with pre-parsed chart and diagram content.
 *
 * This function iterates through all shapes in the slide and for each
 * GraphicFrame with chart or diagram content, loads and parses the
 * external XML files and attaches the parsed data to the domain objects.
 *
 * If a ResourceStore is provided, parsed content is also registered there
 * for centralized resource management.
 *
 * @param slide - The parsed Slide domain object
 * @param fileReader - Interface for reading files from the PPTX archive
 * @param resourceStore - Optional resource store for centralized management
 * @returns A new Slide with pre-parsed content attached
 */
export function enrichSlideContent(
  slide: Slide,
  fileReader: FileReader,
  resourceStore?: ResourceStore,
): Slide {
  const ctx: EnrichmentContext = { fileReader, resourceStore };
  const enrichedShapes = slide.shapes.map((shape) => enrichShape(shape, ctx));

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
function enrichShape(shape: Shape, ctx: EnrichmentContext): Shape {
  if (shape.type !== "graphicFrame") {
    return shape;
  }

  const frame = shape as GraphicFrame;

  if (frame.content.type === "chart") {
    return enrichChartFrame(frame, ctx);
  }

  if (frame.content.type === "diagram") {
    return enrichDiagramFrame(frame, ctx);
  }

  if (frame.content.type === "oleObject") {
    return enrichOleFrame(frame, ctx);
  }

  return shape;
}

/**
 * Enrich a chart GraphicFrame with pre-parsed Chart data.
 *
 * If ResourceStore is provided, the parsed chart is also registered there.
 */
function enrichChartFrame(frame: GraphicFrame, ctx: EnrichmentContext): GraphicFrame {
  if (frame.content.type !== "chart") {
    return frame;
  }

  const { fileReader, resourceStore } = ctx;
  const chartRef = frame.content.data;

  // Skip if already in ResourceStore
  if (resourceStore?.has(chartRef.resourceId as string)) {
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

  // Register in ResourceStore
  if (resourceStore !== undefined) {
    resourceStore.set(chartRef.resourceId as string, {
      kind: "chart",
      source: "parsed",
      data: chartData,
      path: chartPath,
      parsed: parsedChart,
    });
  }

  // Chart data is now stored in ResourceStore, frame remains unchanged
  return frame;
}

/**
 * Enrich a diagram GraphicFrame with pre-parsed DiagramContent.
 *
 * This function also resolves diagram-specific resource references (blipFill)
 * using the diagram's relationship file, not the slide's relationships.
 *
 * If the diagram drawing file is not available or has no shapes, it falls back
 * to generating shapes dynamically using the layout engine.
 *
 * If ResourceStore is provided, parsed diagram data is also registered there.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML Diagrams
 */
function enrichDiagramFrame(frame: GraphicFrame, ctx: EnrichmentContext): GraphicFrame {
  if (frame.content.type !== "diagram") {
    return frame;
  }

  const { fileReader, resourceStore } = ctx;
  const diagramRef = frame.content.data;

  // Skip if already in ResourceStore
  if (resourceStore?.has(diagramRef.dataResourceId ?? "")) {
    return frame;
  }

  const dataModel = loadDiagramDataModel(diagramRef.dataResourceId, fileReader);
  const layoutDefinition = loadDiagramLayoutDefinition(diagramRef.layoutResourceId, fileReader);
  const styleDefinition = loadDiagramStyleDefinition(diagramRef.styleResourceId, fileReader);
  const colorsDefinition = loadDiagramColorsDefinition(diagramRef.colorResourceId, fileReader);

  // Try to get pre-rendered shapes from diagram drawing file
  let shapes = tryParseDiagramDrawing(frame, fileReader);

  // If no pre-rendered shapes, fall back to dynamic generation using layout engine
  if (shapes === undefined || shapes.length === 0) {
    shapes = tryGenerateDiagramShapes(frame, dataModel, layoutDefinition, styleDefinition, colorsDefinition);
  }

  // Register diagram data in ResourceStore
  if (resourceStore !== undefined && diagramRef.dataResourceId !== undefined) {
    resourceStore.set(diagramRef.dataResourceId, {
      kind: "diagram",
      source: "parsed",
      data: new ArrayBuffer(0), // Diagram data is stored as parsed objects
      parsed: {
        shapes: shapes ?? [],
        dataModel,
        layoutDefinition,
        styleDefinition,
        colorsDefinition,
      },
    });
  }

  // Diagram data is now stored in ResourceStore, frame remains unchanged
  return frame;
}

/**
 * Try to parse pre-rendered shapes from diagram drawing file.
 */
function tryParseDiagramDrawing(frame: GraphicFrame, fileReader: FileReader): readonly Shape[] | undefined {
  // Find diagram drawing file using relationship type
  const diagramPath = fileReader.getResourceByType?.(RELATIONSHIP_TYPES.DIAGRAM_DRAWING);
  if (diagramPath === undefined) {
    return undefined;
  }

  // diagramPath is already normalized by relationship resolution (RFC 3986)
  // Read diagram drawing XML file
  const diagramData = fileReader.readFile(diagramPath);
  if (diagramData === null) {
    return undefined;
  }

  // Parse diagram XML
  const decoder = new TextDecoder();
  const diagramXmlText = decoder.decode(diagramData);
  const diagramDoc = parseXml(diagramXmlText);
  if (diagramDoc === undefined) {
    return undefined;
  }

  // Parse to DiagramContent domain object
  const parsedContent = parseDiagramDrawing(diagramDoc);
  if (parsedContent.shapes.length === 0) {
    return undefined;
  }

  // Load diagram-specific relationships for blipFill resolution
  const diagramRelsPath = getRelationshipPath(diagramPath);
  const diagramRelsData = fileReader.readFile(diagramRelsPath);
  const diagramResources = loadDiagramResources(diagramRelsData, diagramPath);

  // Resolve blipFill resourceIds in diagram shapes using diagram relationships
  return resolveDiagramShapeResources(
    parsedContent.shapes,
    diagramResources,
    diagramPath,
    fileReader,
  );
}

/**
 * Try to generate diagram shapes dynamically using layout engine.
 *
 * This is used as a fallback when no pre-rendered diagram drawing is available.
 */
function tryGenerateDiagramShapes(
  frame: GraphicFrame,
  dataModel: DiagramDataModel | undefined,
  layoutDefinition: DiagramLayoutDefinition | undefined,
  styleDefinition: DiagramStyleDefinition | undefined,
  colorsDefinition: DiagramColorsDefinition | undefined,
): readonly Shape[] | undefined {
  // Need at least data model to generate shapes
  if (dataModel === undefined) {
    return undefined;
  }

  // Get frame bounds for layout calculation
  const transform = frame.transform;
  const bounds = {
    x: 0,
    y: 0,
    width: transform?.width ?? 500,
    height: transform?.height ?? 400,
  };

  const config: ShapeGenerationConfig = {
    bounds,
    defaultNodeWidth: 100,
    defaultNodeHeight: 60,
    defaultSpacing: 10,
  };

  try {
    const result = generateDiagramShapes(
      dataModel,
      layoutDefinition,
      styleDefinition,
      colorsDefinition,
      config,
    );
    return result.shapes;
  } catch (error) {
    // Log error for debugging purposes but continue gracefully
    console.warn(
      "Failed to generate diagram shapes dynamically:",
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

/**
 * Load diagram resources from relationship file.
 *
 * @param relsData - Raw relationship file data
 * @param sourcePath - Source part path for RFC 3986 path resolution
 */
function loadDiagramResources(relsData: ArrayBuffer | null, sourcePath: string): ResourceMap {
  if (relsData === null) {
    return createEmptyResourceMap();
  }

  const decoder = new TextDecoder();
  const relsXmlText = decoder.decode(relsData);
  const relsDoc = parseXml(relsXmlText);
  if (relsDoc === undefined) {
    return createEmptyResourceMap();
  }

  return parseRelationships(relsDoc, sourcePath);
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
  diagramResources: ResourceMap,
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
  resources: ResourceMap,
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
  resources: ResourceMap,
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
  resources: ResourceMap,
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
function resolveBlipFill(fill: BlipFill, resources: ResourceMap, baseDir: string, fileReader: FileReader): Fill {
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
  resources: ResourceMap,
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
  resources: ResourceMap,
  baseDir: string,
  fileReader: FileReader,
): string | undefined {
  // Skip if already a data URL
  if (resourceId.startsWith("data:")) {
    return undefined;
  }

  // Look up in diagram relationships
  // Note: targets should already be resolved by parseRelationships (RFC 3986)
  // but we use resolvePartPath as a safety fallback for any relative paths
  const target = resources.getTarget(resourceId);
  if (target === undefined) {
    return undefined;
  }

  // Target should be absolute, but resolve if relative
  const targetPath = target.startsWith("ppt/") ? target : resolvePartPath(baseDir, target);

  // Read the resource file
  const data = fileReader.readFile(targetPath);
  if (data === null) {
    return undefined;
  }

  // Convert to data URL
  const mimeType = getMimeTypeFromPath(targetPath) ?? "application/octet-stream";
  return toDataUrl(data, mimeType);
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
 * If ResourceStore is provided, preview image data is also registered there.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 * @see MS-OE376 Part 4 Section 4.4.2.4
 */
function enrichOleFrame(frame: GraphicFrame, ctx: EnrichmentContext): GraphicFrame {
  if (frame.content.type !== "oleObject") {
    return frame;
  }

  const { fileReader, resourceStore } = ctx;
  const oleRef = frame.content.data;

  // Skip if already in ResourceStore
  if (resourceStore?.has(oleRef.resourceId ?? "")) {
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

  // Register preview image in ResourceStore
  if (resourceStore !== undefined && oleRef.resourceId !== undefined) {
    resourceStore.set(oleRef.resourceId, {
      kind: "ole",
      source: "parsed",
      data: new ArrayBuffer(0), // Preview is stored as data URL
      previewUrl: previewImageUrl,
    });
  }

  // OLE preview is now stored in ResourceStore, frame remains unchanged
  return frame;
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
  const mimeType = getMimeTypeFromPath(normalizedPath) ?? "application/octet-stream";
  return toDataUrl(imageData, mimeType);
}
