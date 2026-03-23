/**
 * @file Content enricher for pre-parsing chart and diagram content
 *
 * This module enriches Slide domain objects with pre-parsed chart and diagram
 * content, allowing render to render without directly calling parser.
 *
 * The enrichment happens in the integration layer, bridging parser and render.
 */

import type { BlipFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type {
  BlipFillProperties,
  GraphicFrame,
  OleReference,
  PicShape,
  Shape,
  Slide,
  SpShape,
} from "../../domain/index";
import type {
  DiagramColorsDefinition,
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
} from "@aurochs-office/diagram/domain";
import type { ShapeGenerationConfig } from "@aurochs-office/diagram/layout-engine";
import { generateDiagramShapes } from "../../domain/diagram/layout-engine";
import { parseXml } from "@aurochs/xml";
import { parseChart } from "@aurochs-office/chart/parser";
import { parseDiagramDrawing } from "./diagram-drawing-parser";
import { parseDiagramColorsDefinition } from "@aurochs-office/diagram/parser/diagram/color-parser";
import { parseDiagramDataModel } from "@aurochs-office/diagram/parser/diagram/data-parser";
import { parseDiagramLayoutDefinition } from "@aurochs-office/diagram/parser/diagram/layout-parser";
import { parseDiagramStyleDefinition } from "@aurochs-office/diagram/parser/diagram/style-parser";
import { parseShapeProperties } from "../shape-parser/properties";
import { parseTextBody } from "../text/text-parser";
import { parseShapeStyle } from "../shape-parser/style";
import type { ResourceMap } from "@aurochs-office/opc";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { getMimeTypeFromPath } from "@aurochs/files";
import { toDataUrl } from "@aurochs/buffer";
import { parseRelationships, resolvePartPath } from "@aurochs-office/ooxml/parser";
import { getRelationshipPartPath } from "@aurochs-office/opc";
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
 * Context for content loading operations
 */
type ContentLoadContext = {
  readonly fileReader: FileReader;
  readonly resourceStore: ResourceStore;
};

type TryGenerateDiagramShapesOptions = {
  readonly frame: GraphicFrame;
  readonly dataModel: DiagramDataModel | undefined;
  readonly layoutDefinition: DiagramLayoutDefinition | undefined;
  readonly styleDefinition: DiagramStyleDefinition | undefined;
  readonly colorsDefinition: DiagramColorsDefinition | undefined;
};

type DiagramResourceResolverContext = {
  readonly resources: ResourceMap;
  readonly baseDir: string;
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
export function enrichSlideContent(slide: Slide, fileReader: FileReader, resourceStore: ResourceStore): Slide {
  const ctx: ContentLoadContext = { fileReader, resourceStore };

  // Register all blipFill images in ResourceStore
  registerSlideBlipFillImages(slide.shapes, fileReader, resourceStore);

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
function enrichShape(shape: Shape, ctx: ContentLoadContext): Shape {
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
function enrichChartFrame(frame: GraphicFrame, ctx: ContentLoadContext): GraphicFrame {
  if (frame.content.type !== "chart") {
    return frame;
  }

  const { fileReader, resourceStore } = ctx;
  const chartRef = frame.content.data;
  const resourceId = chartRef.resourceId as string;

  if (resourceStore.has(resourceId)) {
    return frame;
  }

  const chartPath = fileReader.resolveResource(resourceId);
  if (chartPath === undefined) {
    console.warn(`[enrichSlideContent] chart resource not found: ${resourceId}`);
    return frame;
  }

  const chartData = fileReader.readFile(chartPath);
  if (chartData === null) {
    console.warn(`[enrichSlideContent] chart file not readable: ${chartPath}`);
    return frame;
  }

  const decoder = new TextDecoder();
  const chartDoc = parseXml(decoder.decode(chartData));
  if (chartDoc === undefined) {
    console.warn(`[enrichSlideContent] chart XML parse failed: ${chartPath}`);
    return frame;
  }

  const parsedChart = parseChart(chartDoc);
  if (parsedChart === undefined) {
    console.warn(`[enrichSlideContent] chart domain parse failed: ${chartPath}`);
    return frame;
  }

  resourceStore.set(resourceId, {
    kind: "chart",
    source: "parsed",
    data: chartData,
    path: chartPath,
    parsed: parsedChart,
  });

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
function enrichDiagramFrame(frame: GraphicFrame, ctx: ContentLoadContext): GraphicFrame {
  if (frame.content.type !== "diagram") {
    return frame;
  }

  const { fileReader, resourceStore } = ctx;
  const diagramRef = frame.content.data;

  if (diagramRef.dataResourceId === undefined) {
    console.warn("[enrichSlideContent] diagram has no dataResourceId");
    return frame;
  }

  if (resourceStore.has(diagramRef.dataResourceId)) {
    return frame;
  }

  const dataModel = loadDiagramDataModel(diagramRef.dataResourceId, fileReader);
  const layoutDefinition = loadDiagramLayoutDefinition(diagramRef.layoutResourceId, fileReader);
  const styleDefinition = loadDiagramStyleDefinition(diagramRef.styleResourceId, fileReader);
  const colorsDefinition = loadDiagramColorsDefinition(diagramRef.colorResourceId, fileReader);

  // ECMA-376 Part 1, Section 21.4: Diagrams may have a pre-rendered drawing part
  // (dgm:relIds/@r:dm points to a drawing1.xml with pre-baked shapes).
  // If absent, shapes are generated from the data model using the layout engine.
  const preRenderedShapes = tryParseDiagramDrawing(frame, fileReader, resourceStore);
  const generatedShapes = preRenderedShapes === undefined || preRenderedShapes.length === 0
    ? tryGenerateDiagramShapes({ frame, dataModel, layoutDefinition, styleDefinition, colorsDefinition })
    : undefined;
  const shapes = (preRenderedShapes !== undefined && preRenderedShapes.length > 0)
    ? preRenderedShapes
    : generatedShapes;

  if (shapes === undefined || shapes.length === 0) {
    console.warn(`[enrichSlideContent] diagram has no shapes: ${diagramRef.dataResourceId}`);
  }

  resourceStore.set(diagramRef.dataResourceId, {
    kind: "diagram",
    source: "parsed",
    data: new ArrayBuffer(0),
    parsed: {
      shapes: shapes ?? [],
      dataModel,
      layoutDefinition,
      styleDefinition,
      colorsDefinition,
    },
  });

  return frame;
}

/**
 * Try to parse pre-rendered shapes from diagram drawing file.
 */
function tryParseDiagramDrawing(frame: GraphicFrame, fileReader: FileReader, resourceStore?: ResourceStore): readonly Shape[] | undefined {
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
  const diagramRelsPath = getRelationshipPartPath(diagramPath);
  const diagramRelsData = fileReader.readFile(diagramRelsPath);
  const diagramResources = loadDiagramResources(diagramRelsData, diagramPath);

  // Resolve blipFill resourceIds in diagram shapes using diagram relationships.
  // Images are registered in ResourceStore; shapes' resourceId fields are updated
  // to the resolved part path (globally unique, avoids rId scope collision).
  return resolveDiagramShapeResources({ shapes: parsedContent.shapes, diagramResources, diagramPath, fileReader, resourceStore });
}

/**
 * Try to generate diagram shapes dynamically using layout engine.
 *
 * This is used as a fallback when no pre-rendered diagram drawing is available.
 */
function tryGenerateDiagramShapes({
  frame,
  dataModel,
  layoutDefinition,
  styleDefinition,
  colorsDefinition,
}: TryGenerateDiagramShapesOptions): readonly Shape[] | undefined {
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
    const result = generateDiagramShapes({
      dataModel,
      layoutDefinition,
      styleDefinition,
      colorDefinition: colorsDefinition,
      config,
    });
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
  return parseDiagramDataModel(doc, { parseShapeProperties, parseTextBody });
}

function loadDiagramLayoutDefinition(
  resourceId: string | undefined,
  fileReader: FileReader,
): DiagramLayoutDefinition | undefined {
  const doc = loadDiagramResourceXml(resourceId, fileReader);
  if (!doc) {
    return undefined;
  }
  return parseDiagramLayoutDefinition(doc, { parseShapeProperties, parseTextBody });
}

function loadDiagramStyleDefinition(
  resourceId: string | undefined,
  fileReader: FileReader,
): DiagramStyleDefinition | undefined {
  const doc = loadDiagramResourceXml(resourceId, fileReader);
  if (!doc) {
    return undefined;
  }
  return parseDiagramStyleDefinition(doc, { parseTextBody, parseShapeStyle });
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
 * Resolve blipFill resource IDs in diagram shapes.
 *
 * Diagram shapes reference images via r:embed IDs that point to
 * ppt/diagrams/_rels/drawing1.xml.rels, not the slide relationships.
 * These rIds are scoped to the diagram part and may collide with slide rIds.
 *
 * This function resolves each diagram rId to its part path (e.g., "ppt/media/image1.png"),
 * registers the image data in ResourceStore under that path, and updates the shape's
 * resourceId to the path. The part path is globally unique within the PPTX package.
 */
function resolveDiagramShapeResources({
  shapes,
  diagramResources,
  diagramPath,
  fileReader,
  resourceStore,
}: {
  readonly shapes: readonly Shape[];
  readonly diagramResources: ResourceMap;
  readonly diagramPath: string;
  readonly fileReader: FileReader;
  readonly resourceStore?: ResourceStore;
}): readonly Shape[] {
  // Get the base directory for resolving relative paths
  const diagramDir = diagramPath.substring(0, diagramPath.lastIndexOf("/") + 1);

  const ctx: DiagramResourceResolverContext = { resources: diagramResources, baseDir: diagramDir, fileReader, resourceStore };
  return shapes.map((shape) => resolveShapeResources({ shape, ...ctx }));
}

/**
 * Resolve resource IDs in a single shape recursively.
 */
function resolveShapeResources({
  shape,
  resources,
  baseDir,
  fileReader,
}: { readonly shape: Shape } & DiagramResourceResolverContext): Shape {
  switch (shape.type) {
    case "sp":
      return resolveSpShapeResources({ shape, resources, baseDir, fileReader });
    case "pic":
      return resolvePicShapeResources({ shape, resources, baseDir, fileReader });
    case "grpSp":
      return {
        ...shape,
        children: shape.children.map((child) =>
          resolveShapeResources({ shape: child, resources, baseDir, fileReader }),
        ),
      };
    default:
      return shape;
  }
}

/**
 * Resolve blipFill in SpShape properties.
 */
function resolveSpShapeResources({
  shape,
  resources,
  baseDir,
  fileReader,
}: { readonly shape: SpShape } & DiagramResourceResolverContext): SpShape {
  const fill = shape.properties?.fill;
  if (fill?.type !== "blipFill") {
    return shape;
  }

  const resolvedFill = resolveBlipFill({ fill, resources, baseDir, fileReader });
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
function resolvePicShapeResources({
  shape,
  resources,
  baseDir,
  fileReader,
}: { readonly shape: PicShape } & DiagramResourceResolverContext): PicShape {
  const resolved = resolveBlipFillProperties({ blipFill: shape.blipFill, resources, baseDir, fileReader });
  if (resolved === shape.blipFill) {
    return shape;
  }

  return {
    ...shape,
    blipFill: resolved,
  };
}

/**
 * Resolve a BlipFill's diagram-scoped resourceId to a globally unique part path.
 * The image data is registered in ResourceStore.
 */
function resolveBlipFill({
  fill,
  resources,
  baseDir,
  fileReader,
  resourceStore,
}: { readonly fill: BlipFill } & DiagramResourceResolverContext): BaseFill {
  const resolved = resolveDiagramResourceId({ resourceId: fill.resourceId, resources, baseDir, fileReader, resourceStore });

  if (resolved === undefined) {
    return fill;
  }

  return {
    ...fill,
    resourceId: resolved,
  };
}

/**
 * Resolve BlipFillProperties's diagram-scoped resourceId to a globally unique part path.
 * The image data is registered in ResourceStore.
 */
function resolveBlipFillProperties({
  blipFill,
  resources,
  baseDir,
  fileReader,
  resourceStore,
}: { readonly blipFill: BlipFillProperties } & DiagramResourceResolverContext): BlipFillProperties {
  const resolved = resolveDiagramResourceId({ resourceId: blipFill.resourceId, resources, baseDir, fileReader, resourceStore });

  if (resolved === undefined) {
    return blipFill;
  }

  return {
    ...blipFill,
    resourceId: resolved,
  };
}

/**
 * Resolve a diagram-scoped resource ID to a globally unique part path
 * and register the image data in ResourceStore.
 *
 * Diagram rIds (e.g., "rId1") are scoped to the diagram's .rels file and
 * may collide with slide-scoped rIds. This function resolves the rId to
 * the target part path (e.g., "ppt/media/image1.png") which is globally
 * unique within the PPTX package.
 *
 * @returns Part path if resolved and registered, undefined if not found
 */
function resolveDiagramResourceId({
  resourceId,
  resources,
  baseDir,
  fileReader,
  resourceStore,
}: { readonly resourceId: string } & DiagramResourceResolverContext): string | undefined {
  // Look up in diagram relationships
  const target = resources.getTarget(resourceId);
  if (target === undefined) {
    return undefined;
  }

  // Resolve to absolute part path
  const targetPath = target.startsWith("ppt/") ? target : resolvePartPath(baseDir, target);

  // Register in ResourceStore if not already present
  if (resourceStore !== undefined && !resourceStore.has(targetPath)) {
    const data = fileReader.readFile(targetPath);
    if (data !== null) {
      const mimeType = getMimeTypeFromPath(targetPath) ?? "application/octet-stream";
      resourceStore.set(targetPath, {
        kind: "image",
        source: "parsed",
        data,
        mimeType,
        path: targetPath,
      });
    }
  }

  return targetPath;
}

// =============================================================================
// BlipFill Image Registration
// =============================================================================

/**
 * Register all blipFill images found in shapes into ResourceStore.
 *
 * Walks shapes recursively and for each blipFill resourceId:
 * 1. Resolves the rId to a file path via fileReader
 * 2. Reads the image data from the archive
 * 3. Registers in ResourceStore under the rId
 *
 * This ensures ResourceStore is the single source of truth for all image data.
 * After this, resolve() only needs to call resourceStore.toDataUrl().
 */
function registerSlideBlipFillImages(
  shapes: readonly Shape[],
  fileReader: FileReader,
  resourceStore: ResourceStore,
): void {
  for (const shape of shapes) {
    registerShapeBlipFillImages(shape, fileReader, resourceStore);
  }
}

function registerShapeBlipFillImages(
  shape: Shape,
  fileReader: FileReader,
  resourceStore: ResourceStore,
): void {
  switch (shape.type) {
    case "sp": {
      const fill = shape.properties?.fill;
      if (fill?.type === "blipFill") {
        registerBlipFillResourceId(fill.resourceId, fileReader, resourceStore);
      }
      break;
    }
    case "pic":
      registerBlipFillResourceId(shape.blipFill.resourceId, fileReader, resourceStore);
      break;
    case "grpSp":
      registerSlideBlipFillImages(shape.children, fileReader, resourceStore);
      break;
    case "cxnSp": {
      const fill = shape.properties?.fill;
      if (fill?.type === "blipFill") {
        registerBlipFillResourceId(fill.resourceId, fileReader, resourceStore);
      }
      break;
    }
  }
}

/**
 * Register a single blipFill resource in ResourceStore.
 */
function registerBlipFillResourceId(
  resourceId: string,
  fileReader: FileReader,
  resourceStore: ResourceStore,
): void {
  if (resourceStore.has(resourceId)) {
    return;
  }

  const targetPath = fileReader.resolveResource(resourceId);
  if (targetPath === undefined) {
    return;
  }

  const data = fileReader.readFile(targetPath);
  if (data === null) {
    return;
  }

  const mimeType = getMimeTypeFromPath(targetPath) ?? "application/octet-stream";
  resourceStore.set(resourceId, {
    kind: "image",
    source: "parsed",
    data,
    mimeType,
    path: targetPath,
  });
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
function enrichOleFrame(frame: GraphicFrame, ctx: ContentLoadContext): GraphicFrame {
  if (frame.content.type !== "oleObject") {
    return frame;
  }

  const { fileReader, resourceStore } = ctx;
  const oleRef = frame.content.data;

  if (oleRef.resourceId !== undefined && resourceStore.has(oleRef.resourceId)) {
    return frame;
  }

  // Modern format (ECMA-376-1:2016): p:pic child element provides preview.
  // Its blipFill.resourceId is already registered by registerSlideBlipFillImages.
  // Only legacy VML format (spid attribute) needs resolution here.
  if (oleRef.spid === undefined) {
    return frame;
  }

  const previewImageUrl = resolveVmlPreviewImage(oleRef, fileReader);
  if (previewImageUrl === undefined) {
    console.warn(`[enrichSlideContent] OLE VML preview not resolved: spid=${oleRef.spid}`);
    return frame;
  }

  if (oleRef.resourceId !== undefined) {
    resourceStore.set(oleRef.resourceId, {
      kind: "ole",
      source: "parsed",
      data: new ArrayBuffer(0),
      previewUrl: previewImageUrl,
    });
  }

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
