/**
 * @file Element builder registry - unified approach to building PPTX elements
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { serializeShape as domainToXml, serializeGraphicFrame } from "@oxen-office/pptx/patcher/shape/shape-serializer";
import { addShapeToTree } from "@oxen-office/pptx/patcher/slide/shape-tree-patcher";
import { addMedia } from "@oxen-office/pptx/patcher/resources/media-manager";
import { updateDocumentRoot, updateAtPath } from "@oxen-office/pptx/patcher/core/xml-mutator";
import type { parseXml } from "@oxen/xml";
import type { ZipPackage } from "@oxen/zip";
import type { SpShape, GraphicFrame, PicShape, CxnShape, GrpShape, Shape } from "@oxen-office/pptx/domain/shape";
import type { Table, TableRow, TableCell } from "@oxen-office/pptx/domain/table/types";
import type { GroupTransform } from "@oxen-office/pptx/domain/geometry";
import type { Pixels, Degrees } from "@oxen-office/ooxml/domain/units";
import type { ShapeSpec, ImageSpec, ConnectorSpec, GroupSpec, TableSpec, TableCellSpec } from "./types";
import { PRESET_MAP } from "./presets";
import { generateShapeId, buildFill, buildLine, buildTextBody, buildEffects, buildShape3d } from "./common";

// =============================================================================
// Context Types
// =============================================================================

export type { ZipPackage };

export type BuildContext = {
  readonly existingIds: string[];
  readonly specDir: string;
  readonly zipPackage: ZipPackage;
  readonly slidePath: string;
};

type XmlDocument = ReturnType<typeof parseXml>;
type XmlElement = ReturnType<typeof domainToXml>;

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
      geometry: { type: "preset", preset, adjustValues: [] },
      fill: spec.fill ? buildFill(spec.fill) : undefined,
      line: spec.lineColor
        ? buildLine(spec.lineColor, spec.lineWidth ?? 1, {
            dash: spec.lineDash,
            cap: spec.lineCap,
            join: spec.lineJoin,
            compound: spec.lineCompound,
            headEnd: spec.lineHeadEnd,
            tailEnd: spec.lineTailEnd,
          })
        : undefined,
      effects: spec.effects ? buildEffects(spec.effects) : undefined,
      shape3d: spec.shape3d ? buildShape3d(spec.shape3d) : undefined,
    },
    textBody: spec.text ? buildTextBody(spec.text, spec.textBody) : undefined,
  };
}

export const shapeBuilder: SyncBuilder<ShapeSpec> = (spec, id) => ({
  xml: domainToXml(buildSpShape(spec, id)),
});

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

function buildPicShape(spec: ImageSpec, id: string, resourceId: string): PicShape {
  return {
    type: "pic",
    nonVisual: { id, name: `Picture ${id}` },
    blipFill: {
      resourceId,
      stretch: true,
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
  };
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

  return { xml: domainToXml(buildPicShape(spec, id, rId)) };
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
      startConnection: spec.startShapeId
        ? { shapeId: spec.startShapeId, siteIndex: spec.startSiteIndex ?? 1 }
        : undefined,
      endConnection: spec.endShapeId
        ? { shapeId: spec.endShapeId, siteIndex: spec.endSiteIndex ?? 3 }
        : undefined,
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

function buildGroupChild(spec: ShapeSpec | GroupSpec, existingIds: string[]): Shape {
  const newId = generateShapeId(existingIds);
  existingIds.push(newId);

  if (spec.type === "group") {
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
export function addElementsSync<TSpec>(
  slideDoc: XmlDocument,
  specs: readonly TSpec[],
  existingIds: string[],
  ctx: BuildContext,
  builder: SyncBuilder<TSpec>,
): { readonly doc: XmlDocument; readonly added: number } {
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
export async function addElementsAsync<TSpec>(
  slideDoc: XmlDocument,
  specs: readonly TSpec[],
  existingIds: string[],
  ctx: BuildContext,
  builder: AsyncBuilder<TSpec>,
): Promise<{ readonly doc: XmlDocument; readonly added: number }> {
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
