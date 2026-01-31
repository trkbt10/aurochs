/**
 * @file Element builder registry - unified approach to building PPTX elements
 *
 * NOTE: This module uses Node.js fs for file reading. For browser usage,
 * the image/media data should be passed directly instead of file paths.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  addMedia,
  addRelationship,
  addShapeToTree,
  ensureRelationshipsDocument,
  serializeGraphicFrame,
  serializeShape as domainToXml,
  updateAtPath,
  updateDocumentRoot,
} from "@oxen-builder/pptx/patcher";
import type { ZipPackage } from "@oxen/zip";
import type { SpShape, GraphicFrame, PicShape, CxnShape, GrpShape, Shape } from "@oxen-office/pptx/domain/shape";
import type { Table, TableRow, TableCell } from "@oxen-office/pptx/domain/table/types";
import type { GroupTransform } from "@oxen-office/pptx/domain/geometry";
import type { Pixels, Degrees } from "@oxen-office/ooxml/domain/units";
import type { ShapeSpec, ImageSpec, ConnectorSpec, GroupSpec, TableSpec, TableCellSpec, TextSpec } from "../types";
import { PRESET_MAP } from "./presets";
import { generateShapeId } from "./id-generator";
import { buildFill } from "@oxen-builder/drawing-ml/fill";
import { buildLine } from "./line-builder";
import { buildTextBody, collectHyperlinks } from "./text-builder";
import { buildEffects, buildShape3d } from "./effects-builder";
import { parseXml, serializeDocument, isXmlElement } from "@oxen/xml";
import { buildBlipEffectsFromSpec } from "./blip-effects-builder";
import { buildCustomGeometryFromSpec } from "./custom-geometry-builder";
import { buildMediaReferenceFromSpec, detectEmbeddedMediaType } from "./media-embed-builder";

// =============================================================================
// Context Types
// =============================================================================

export type BuildContext = {
  readonly existingIds: string[];
  readonly specDir: string;
  readonly zipPackage: ZipPackage;
  readonly slidePath: string;
};

type XmlDocument = ReturnType<typeof parseXml>;
type XmlElement = ReturnType<typeof domainToXml>;

function buildLineFromShapeSpec(spec: ShapeSpec): ReturnType<typeof buildLine> | undefined {
  if (!spec.lineColor) {
    return undefined;
  }
  return buildLine(spec.lineColor, spec.lineWidth ?? 1, {
    dash: spec.lineDash,
    cap: spec.lineCap,
    join: spec.lineJoin,
    compound: spec.lineCompound,
    headEnd: spec.lineHeadEnd,
    tailEnd: spec.lineTailEnd,
  });
}

function buildConnectorConnection(
  shapeId: string | undefined,
  siteIndex: number | undefined,
  defaultSiteIndex: number,
): { readonly shapeId: string; readonly siteIndex: number } | undefined {
  if (!shapeId) {
    return undefined;
  }
  return { shapeId, siteIndex: siteIndex ?? defaultSiteIndex };
}

// =============================================================================
// Element Builder Interface
// =============================================================================

/**
 * Result from building an element
 */
export type BuildResult = {
  readonly xml: XmlElement;
};

/**
 * Synchronous element builder function
 */
export type SyncBuilder<TSpec> = (spec: TSpec, id: string, ctx: BuildContext) => BuildResult;

/**
 * Asynchronous element builder function
 */
export type AsyncBuilder<TSpec> = (spec: TSpec, id: string, ctx: BuildContext) => Promise<BuildResult>;

// =============================================================================
// Shape Builder
// =============================================================================

function buildSpShape(spec: ShapeSpec, id: string): SpShape {
  const preset = PRESET_MAP[spec.type] ?? "rect";

  return {
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    placeholder: spec.placeholder ? { type: spec.placeholder.type, idx: spec.placeholder.idx } : undefined,
    properties: {
      transform: {
        x: spec.x as Pixels,
        y: spec.y as Pixels,
        width: spec.width as Pixels,
        height: spec.height as Pixels,
        rotation: (spec.rotation ?? 0) as Degrees,
        flipH: spec.flipH ?? false,
        flipV: spec.flipV ?? false,
      },
      geometry: spec.customGeometry ? buildCustomGeometryFromSpec(spec.customGeometry) : { type: "preset", preset, adjustValues: [] },
      fill: spec.fill ? buildFill(spec.fill) : undefined,
      line: buildLineFromShapeSpec(spec),
      effects: spec.effects ? buildEffects(spec.effects) : undefined,
      shape3d: spec.shape3d ? buildShape3d(spec.shape3d) : undefined,
    },
    textBody: spec.text ? buildTextBody(spec.text, spec.textBody) : undefined,
  };
}

/**
 * Register hyperlink URLs and get rIds
 */
function registerHyperlinks(
  text: TextSpec | undefined,
  ctx: BuildContext,
): Map<string, string> {
  const urlToRid = new Map<string, string>();

  if (!text) {return urlToRid;}

  const hyperlinks = collectHyperlinks(text);
  if (hyperlinks.length === 0) {return urlToRid;}

  // Get the relationships file path
  const relsPath = ctx.slidePath.replace(/\/([^/]+)\.xml$/, "/_rels/$1.xml.rels");

  // Read or create relationships document
  const relsXml = ctx.zipPackage.readText(relsPath);
  const initialRelsDoc = ensureRelationshipsDocument(relsXml ? parseXml(relsXml) : null);

  // Add each unique hyperlink using reduce to avoid mutation
  const { doc: finalRelsDoc, map: urlToRidMap } = hyperlinks.reduce(
    (acc, hlink) => {
      if (acc.map.has(hlink.url)) {
        return acc;
      }
      const { updatedXml, rId } = addRelationship(
        acc.doc,
        hlink.url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
      );
      const newMap = new Map(acc.map);
      newMap.set(hlink.url, rId);
      return { doc: updatedXml, map: newMap };
    },
    { doc: initialRelsDoc, map: urlToRid },
  );

  // Write updated relationships
  const updatedRelsXml = serializeDocument(finalRelsDoc, { declaration: true, standalone: true });
  ctx.zipPackage.writeText(relsPath, updatedRelsXml);

  return urlToRidMap;
}

/**
 * Replace hyperlink URLs with rIds in XML element tree
 */
function replaceHyperlinkUrls(element: XmlElement, urlToRid: Map<string, string>): XmlElement {
  if (urlToRid.size === 0) {return element;}

  // Check if this element is a hlinkClick with r:id that matches a URL
  if (element.name === "a:hlinkClick" && element.attrs["r:id"]) {
    const url = element.attrs["r:id"];
    const rId = urlToRid.get(url);
    if (rId) {
      return {
        ...element,
        attrs: { ...element.attrs, "r:id": rId },
      };
    }
  }

  // Recurse into children
  const children = element.children.map((child) => {
    if (isXmlElement(child)) {
      return replaceHyperlinkUrls(child, urlToRid);
    }
    return child;
  });

  return { ...element, children };
}

function buildShapeXml(spec: ShapeSpec, id: string, urlToRid: Map<string, string>): XmlElement {
  const baseXml = domainToXml(buildSpShape(spec, id));
  return urlToRid.size > 0 ? replaceHyperlinkUrls(baseXml, urlToRid) : baseXml;
}

export const shapeBuilder: SyncBuilder<ShapeSpec> = (spec, id, ctx) => {
  const urlToRid = registerHyperlinks(spec.text, ctx);
  const xml = buildShapeXml(spec, id, urlToRid);
  return { xml };
};

// =============================================================================
// Image Builder
// =============================================================================

function detectMimeType(filePath: string): "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}

function buildPicShape({
  spec,
  id,
  resourceId,
  media,
}: {
  spec: ImageSpec;
  id: string;
  resourceId: string;
  media:
    | { readonly mediaType: "video" | "audio"; readonly media: PicShape["media"] }
    | undefined;
}): PicShape {
  return {
    type: "pic",
    nonVisual: { id, name: `Picture ${id}` },
    blipFill: {
      resourceId,
      stretch: true,
      blipEffects: spec.effects ? buildBlipEffectsFromSpec(spec.effects) : undefined,
    },
    properties: {
      transform: {
        x: spec.x as Pixels,
        y: spec.y as Pixels,
        width: spec.width as Pixels,
        height: spec.height as Pixels,
        rotation: 0 as Degrees,
        flipH: false,
        flipV: false,
      },
    },
    mediaType: media?.mediaType,
    media: media?.media,
  };
}

async function buildEmbeddedMedia(
  spec: ImageSpec,
  ctx: BuildContext,
): Promise<
  | { readonly mediaType: "video" | "audio"; readonly media: PicShape["media"] }
  | undefined
> {
  if (!spec.media) {
    return undefined;
  }

  const mediaPath = path.resolve(ctx.specDir, spec.media.path);
  const mediaBuffer = await fs.readFile(mediaPath);
  const mediaType = detectEmbeddedMediaType(spec.media);

  const mediaArrayBuffer = new ArrayBuffer(mediaBuffer.length);
  const mediaView = new Uint8Array(mediaArrayBuffer);
  mediaView.set(mediaBuffer);

  const { rId: mediaRId } = addMedia({
    pkg: ctx.zipPackage,
    mediaData: mediaArrayBuffer,
    mediaType,
    referringPart: ctx.slidePath,
  });

  return buildMediaReferenceFromSpec(spec.media, mediaRId, mediaType);
}

export const imageBuilder: AsyncBuilder<ImageSpec> = async (spec, id, ctx) => {
  const imagePath = path.resolve(ctx.specDir, spec.path);
  const imageBuffer = await fs.readFile(imagePath);
  const mimeType = detectMimeType(imagePath);

  // Create a proper ArrayBuffer copy from the buffer
  const arrayBuffer = new ArrayBuffer(imageBuffer.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(imageBuffer);

  const { rId } = addMedia({
    pkg: ctx.zipPackage,
    mediaData: arrayBuffer,
    mediaType: mimeType,
    referringPart: ctx.slidePath,
  });

  const media = await buildEmbeddedMedia(spec, ctx);

  return { xml: domainToXml(buildPicShape({ spec, id, resourceId: rId, media })) };
};

// =============================================================================
// Connector Builder
// =============================================================================

function buildCxnShape(spec: ConnectorSpec, id: string): CxnShape {
  const preset = spec.preset ?? "straightConnector1";

  return {
    type: "cxnSp",
    nonVisual: {
      id,
      name: `Connector ${id}`,
      startConnection: buildConnectorConnection(spec.startShapeId, spec.startSiteIndex, 1),
      endConnection: buildConnectorConnection(spec.endShapeId, spec.endSiteIndex, 3),
    },
    properties: {
      transform: {
        x: spec.x as Pixels,
        y: spec.y as Pixels,
        width: spec.width as Pixels,
        height: spec.height as Pixels,
        rotation: 0 as Degrees,
        flipH: false,
        flipV: false,
      },
      geometry: { type: "preset", preset, adjustValues: [] },
      line: spec.lineColor ? buildLine(spec.lineColor, spec.lineWidth ?? 2) : buildLine("000000", 2),
    },
  };
}

export const connectorBuilder: SyncBuilder<ConnectorSpec> = (spec, id) => ({
  xml: domainToXml(buildCxnShape(spec, id)),
});

// =============================================================================
// Group Builder
// =============================================================================

function isGroupSpec(spec: ShapeSpec | GroupSpec): spec is GroupSpec {
  return spec.type === "group" && "children" in spec;
}

function buildGroupChild(spec: ShapeSpec | GroupSpec, existingIds: string[]): Shape {
  const newId = generateShapeId(existingIds);
  existingIds.push(newId);

  if (isGroupSpec(spec)) {
    return buildGrpShape(spec, newId, existingIds);
  }
  return buildSpShape(spec, newId);
}

function buildGrpShape(spec: GroupSpec, id: string, existingIds: string[]): GrpShape {
  const children = spec.children.map((childSpec) => buildGroupChild(childSpec, existingIds));

  const transform: GroupTransform = {
    x: spec.x as Pixels,
    y: spec.y as Pixels,
    width: spec.width as Pixels,
    height: spec.height as Pixels,
    rotation: 0 as Degrees,
    flipH: false,
    flipV: false,
    childOffsetX: 0 as Pixels,
    childOffsetY: 0 as Pixels,
    childExtentWidth: spec.width as Pixels,
    childExtentHeight: spec.height as Pixels,
  };

  return {
    type: "grpSp",
    nonVisual: { id, name: `Group ${id}` },
    properties: {
      transform,
      fill: spec.fill ? buildFill(spec.fill) : undefined,
    },
    children,
  };
}

export const groupBuilder: SyncBuilder<GroupSpec> = (spec, id, ctx) => ({
  xml: domainToXml(buildGrpShape(spec, id, ctx.existingIds)),
});

// =============================================================================
// Table Builder
// =============================================================================

function buildTableCell(cellSpec: TableCellSpec): TableCell {
  return {
    properties: {},
    textBody: {
      bodyProperties: {},
      paragraphs: [{ properties: {}, runs: [{ type: "text", text: cellSpec.text }] }],
    },
  };
}

function buildTableRow(rowCells: readonly TableCellSpec[], rowHeight: Pixels): TableRow {
  return {
    height: rowHeight,
    cells: rowCells.map(buildTableCell),
  };
}

function buildTable(spec: TableSpec): Table {
  const colCount = spec.rows[0]?.length ?? 0;
  const rowCount = spec.rows.length;
  const colWidth = (colCount > 0 ? spec.width / colCount : spec.width) as Pixels;
  const rowHeight = (rowCount > 0 ? spec.height / rowCount : spec.height) as Pixels;

  return {
    properties: {},
    grid: {
      columns: Array.from({ length: colCount }, () => ({ width: colWidth })),
    },
    rows: spec.rows.map((row) => buildTableRow(row, rowHeight)),
  };
}

function buildTableGraphicFrame(spec: TableSpec, id: string): GraphicFrame {
  const table = buildTable(spec);
  return {
    type: "graphicFrame",
    nonVisual: { id, name: `Table ${id}` },
    transform: {
      x: spec.x as Pixels,
      y: spec.y as Pixels,
      width: spec.width as Pixels,
      height: spec.height as Pixels,
      rotation: 0 as Degrees,
      flipH: false,
      flipV: false,
    },
    content: {
      type: "table",
      data: { table },
    },
  };
}

export const tableBuilder: SyncBuilder<TableSpec> = (spec, id) => ({
  xml: serializeGraphicFrame(buildTableGraphicFrame(spec, id)),
});

// =============================================================================
// Unified Element Processing
// =============================================================================

/**
 * Add elements to slide document using a sync builder
 */
export type AddElementsSyncOptions<TSpec> = {
  readonly slideDoc: XmlDocument;
  readonly specs: readonly TSpec[];
  readonly existingIds: string[];
  readonly ctx: BuildContext;
  readonly builder: SyncBuilder<TSpec>;
};

/**
 * Add elements to a slide document using a synchronous builder function.
 */
export function addElementsSync<TSpec>({
  slideDoc,
  specs,
  existingIds,
  ctx,
  builder,
}: AddElementsSyncOptions<TSpec>): { readonly doc: XmlDocument; readonly added: number } {
  return specs.reduce(
    (acc, spec) => {
      const newId = generateShapeId(existingIds);
      existingIds.push(newId);
      const { xml } = builder(spec, newId, ctx);
      const doc = updateDocumentRoot(acc.doc, (root) =>
        updateAtPath(root, ["p:cSld", "p:spTree"], (tree) => addShapeToTree(tree, xml)),
      );
      return { doc, added: acc.added + 1 };
    },
    { doc: slideDoc, added: 0 },
  );
}

/**
 * Add elements to slide document using an async builder
 */
export type AddElementsAsyncOptions<TSpec> = {
  readonly slideDoc: XmlDocument;
  readonly specs: readonly TSpec[];
  readonly existingIds: string[];
  readonly ctx: BuildContext;
  readonly builder: AsyncBuilder<TSpec>;
};

/**
 * Add elements to a slide document using an asynchronous builder function.
 */
export async function addElementsAsync<TSpec>({
  slideDoc,
  specs,
  existingIds,
  ctx,
  builder,
}: AddElementsAsyncOptions<TSpec>): Promise<{ readonly doc: XmlDocument; readonly added: number }> {
  type Acc = { doc: XmlDocument; added: number };
  const initial: Acc = { doc: slideDoc, added: 0 };

  return specs.reduce(async (accPromise, spec) => {
    const acc = await accPromise;
    const newId = generateShapeId(existingIds);
    existingIds.push(newId);
    const { xml } = await builder(spec, newId, ctx);
    const doc = updateDocumentRoot(acc.doc, (root) =>
      updateAtPath(root, ["p:cSld", "p:spTree"], (tree) => addShapeToTree(tree, xml)),
    );
    return { doc, added: acc.added + 1 };
  }, Promise.resolve(initial));
}
