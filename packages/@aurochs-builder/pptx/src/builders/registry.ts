/**
 * @file Element builder registry - unified approach to building PPTX elements
 *
 * NOTE: This module uses Node.js fs for file reading. For browser usage,
 * the image/media data should be passed directly instead of file paths.
 */

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
} from "@aurochs-builder/pptx/patcher";
import type { ZipPackage } from "@aurochs/zip";
import type { SpShape, GraphicFrame, PicShape, CxnShape, GrpShape, Shape } from "@aurochs-office/pptx/domain/shape";
import type {
  Table,
  TableRow,
  TableCell,
  TableCellProperties,
  CellMargin,
  CellBorders,
  CellAnchor,
} from "@aurochs-office/pptx/domain/table/types";
import type { GroupTransform } from "@aurochs-office/pptx/domain/geometry";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { Shape3d } from "@aurochs-office/pptx/domain/three-d";
import { px, deg, type Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ShapeSpec, ImageSpec, ConnectorSpec, GroupSpec, TableSpec, TableCellSpec } from "../types";
import type { TextSpec } from "@aurochs-builder/drawing-ml";
import type { Line } from "@aurochs-office/pptx/domain/color/types";
import { contentToTextBody } from "./table-update-builder";
import { PRESET_MAP } from "./presets";
import { generateShapeId } from "./id-generator";
import { buildFill } from "@aurochs-builder/drawing-ml/fill";
import { buildLine } from "@aurochs-builder/drawing-ml/line";
import { buildTextBody, collectHyperlinks } from "@aurochs-builder/drawing-ml/text";
import { buildEffects, buildShape3d } from "@aurochs-builder/drawing-ml/effect";
import { parseXml, serializeDocument, isXmlElement } from "@aurochs/xml";
import { buildBlipEffectsFromSpec } from "./blip-effects-builder";
import { buildCustomGeometryFromSpec } from "./custom-geometry-builder";
import { buildMediaReferenceFromSpec, detectEmbeddedMediaType } from "./media-embed-builder";
import type { MediaType } from "@aurochs-builder/pptx/patcher/resources/media-manager";
import { detectImageMimeType, readFileToArrayBuffer, uint8ArrayToArrayBuffer } from "./file-utils";
import { getSlideRelsPath } from "./rels-utils";

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
  const preset = PRESET_MAP[spec.type];
  if (!preset) {
    throw new Error(`Unknown shape type: "${spec.type}". Use a valid PresetShapeType.`);
  }

  return {
    type: "sp",
    nonVisual: { id, name: `Shape ${id}` },
    placeholder: spec.placeholder ? { type: spec.placeholder.type, idx: spec.placeholder.idx } : undefined,
    properties: {
      transform: {
        x: px(spec.x),
        y: px(spec.y),
        width: px(spec.width),
        height: px(spec.height),
        rotation: deg(spec.rotation ?? 0),
        flipH: spec.flipH ?? false,
        flipV: spec.flipV ?? false,
      },
      geometry: spec.customGeometry
        ? buildCustomGeometryFromSpec(spec.customGeometry)
        : { type: "preset", preset, adjustValues: [] },
      fill: spec.fill ? buildFill(spec.fill) : undefined,
      line: buildLineFromShapeSpec(spec),
      effects: spec.effects ? buildEffects(spec.effects) : undefined,
      // Type assertion: drawing-ml Shape3d is structurally compatible with pptx Shape3d
      shape3d: spec.shape3d ? (buildShape3d(spec.shape3d) as Shape3d) : undefined,
    },
    // Type assertion: drawing-ml TextBody is structurally compatible with pptx TextBody
    textBody: spec.text ? (buildTextBody(spec.text, spec.textBody) as TextBody) : undefined,
  };
}

/**
 * Register hyperlink URLs and get rIds
 */
function registerHyperlinks(text: TextSpec | undefined, ctx: BuildContext): Map<string, string> {
  const urlToRid = new Map<string, string>();

  if (!text) {
    return urlToRid;
  }

  const hyperlinks = collectHyperlinks(text);
  if (hyperlinks.length === 0) {
    return urlToRid;
  }

  // Get the relationships file path
  const relsPath = getSlideRelsPath(ctx.slidePath);

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
  if (urlToRid.size === 0) {
    return element;
  }

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

function buildPicShape({
  spec,
  id,
  resourceId,
  media,
}: {
  spec: ImageSpec;
  id: string;
  resourceId: string;
  media: { readonly mediaType: "video" | "audio"; readonly media: PicShape["media"] } | undefined;
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
        x: px(spec.x),
        y: px(spec.y),
        width: px(spec.width),
        height: px(spec.height),
        rotation: deg(spec.rotation ?? 0),
        flipH: spec.flipH ?? false,
        flipV: spec.flipV ?? false,
      },
    },
    mediaType: media?.mediaType,
    media: media?.media,
  };
}

async function buildEmbeddedMedia(
  spec: ImageSpec,
  ctx: BuildContext,
): Promise<{ readonly mediaType: "video" | "audio"; readonly media: PicShape["media"] } | undefined> {
  if (!spec.media) {
    return undefined;
  }

  let mediaArrayBuffer: ArrayBuffer;
  if (spec.media.data) {
    mediaArrayBuffer = uint8ArrayToArrayBuffer(spec.media.data);
  } else if (spec.media.path) {
    const mediaPath = path.resolve(ctx.specDir, spec.media.path);
    mediaArrayBuffer = await readFileToArrayBuffer(mediaPath);
  } else {
    throw new Error("MediaEmbedSpec requires either 'path' or 'data'");
  }

  const mediaType = detectEmbeddedMediaType(spec.media);

  const { rId: mediaRId } = addMedia({
    pkg: ctx.zipPackage,
    mediaData: mediaArrayBuffer,
    mediaType,
    referringPart: ctx.slidePath,
  });

  return buildMediaReferenceFromSpec(spec.media, mediaRId, mediaType);
}

export const imageBuilder: AsyncBuilder<ImageSpec> = async (spec, id, ctx) => {
  let arrayBuffer: ArrayBuffer;
  let mimeType: MediaType;

  if (spec.data) {
    arrayBuffer = uint8ArrayToArrayBuffer(spec.data);
    mimeType = (spec.mimeType ?? "image/png") as MediaType;
  } else if (spec.path) {
    const imagePath = path.resolve(ctx.specDir, spec.path);
    mimeType = detectImageMimeType(imagePath);
    arrayBuffer = await readFileToArrayBuffer(imagePath);
  } else {
    throw new Error("ImageSpec requires either 'path' or 'data'");
  }

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
        x: px(spec.x),
        y: px(spec.y),
        width: px(spec.width),
        height: px(spec.height),
        rotation: deg(spec.rotation ?? 0),
        flipH: spec.flipH ?? false,
        flipV: spec.flipV ?? false,
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
    x: px(spec.x),
    y: px(spec.y),
    width: px(spec.width),
    height: px(spec.height),
    rotation: deg(spec.rotation ?? 0),
    flipH: spec.flipH ?? false,
    flipV: spec.flipV ?? false,
    childOffsetX: px(0),
    childOffsetY: px(0),
    childExtentWidth: px(spec.width),
    childExtentHeight: px(spec.height),
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

function mapVerticalAlignment(va: "top" | "middle" | "bottom"): CellAnchor {
  if (va === "middle") {
    return "center";
  }
  return va;
}

function buildCellBorder(color: string, width: number): Line {
  // eslint-disable-next-line custom/no-as-outside-guard -- drawing-ml Line is structurally compatible with pptx Line
  return buildLine(color, width) as unknown as Line;
}

function buildCellBorders(color: string, width: number): CellBorders {
  const border = buildCellBorder(color, width);
  return {
    left: border,
    right: border,
    top: border,
    bottom: border,
  };
}

function buildCellMargins(cellSpec: TableCellSpec): CellMargin | undefined {
  const hasMargin =
    cellSpec.marginLeft !== undefined ||
    cellSpec.marginRight !== undefined ||
    cellSpec.marginTop !== undefined ||
    cellSpec.marginBottom !== undefined;

  if (!hasMargin) {
    return undefined;
  }

  return {
    left: px(cellSpec.marginLeft ?? 0),
    right: px(cellSpec.marginRight ?? 0),
    top: px(cellSpec.marginTop ?? 0),
    bottom: px(cellSpec.marginBottom ?? 0),
  };
}

function buildCellProperties(cellSpec: TableCellSpec): TableCellProperties {
  const margins = buildCellMargins(cellSpec);

  return {
    ...(cellSpec.fill !== undefined && {
      fill: { type: "solidFill" as const, color: { spec: { type: "srgb" as const, value: cellSpec.fill } } },
    }),
    ...(cellSpec.borderColor !== undefined && {
      borders: buildCellBorders(cellSpec.borderColor, cellSpec.borderWidth ?? 1),
    }),
    ...(cellSpec.verticalAlignment !== undefined && {
      anchor: mapVerticalAlignment(cellSpec.verticalAlignment),
    }),
    ...(margins !== undefined && { margins }),
    ...(cellSpec.gridSpan !== undefined && cellSpec.gridSpan > 1 && { colSpan: cellSpec.gridSpan }),
    ...(cellSpec.rowSpan !== undefined && cellSpec.rowSpan > 1 && { rowSpan: cellSpec.rowSpan }),
  };
}

function buildCellTextBody(cellSpec: TableCellSpec): TextBody {
  if (cellSpec.content) {
    return contentToTextBody(cellSpec.content);
  }
  if (cellSpec.text !== undefined) {
    return contentToTextBody(cellSpec.text);
  }
  throw new Error("TableCellSpec requires either 'text' or 'content'");
}

function buildTableCell(cellSpec: TableCellSpec): TableCell {
  return {
    properties: buildCellProperties(cellSpec),
    textBody: buildCellTextBody(cellSpec),
  };
}

/**
 * Track merge regions from the spec to apply horizontalMerge/verticalMerge flags.
 * Returns a Set of "row,col" keys for cells that should be marked as merged.
 */
function collectMergeFlags(rows: readonly (readonly TableCellSpec[])[]): {
  hMerge: Set<string>;
  vMerge: Set<string>;
} {
  const hMerge = new Set<string>();
  const vMerge = new Set<string>();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]!;
      if (cell.gridSpan !== undefined && cell.gridSpan > 1) {
        for (let i = 1; i < cell.gridSpan && c + i < row.length; i++) {
          hMerge.add(`${r},${c + i}`);
        }
      }
      if (cell.rowSpan !== undefined && cell.rowSpan > 1) {
        for (let i = 1; i < cell.rowSpan && r + i < rows.length; i++) {
          vMerge.add(`${r + i},${c}`);
        }
      }
    }
  }

  return { hMerge, vMerge };
}

type BuildTableRowInput = {
  readonly rowCells: readonly TableCellSpec[];
  readonly rowHeight: Pixels;
  readonly rowIndex: number;
  readonly mergeFlags: { hMerge: Set<string>; vMerge: Set<string> };
};

function buildTableRow({ rowCells, rowHeight, rowIndex, mergeFlags }: BuildTableRowInput): TableRow {
  const cells = rowCells.map((cellSpec, colIndex): TableCell => {
    const key = `${rowIndex},${colIndex}`;
    const isHMerge = mergeFlags.hMerge.has(key);
    const isVMerge = mergeFlags.vMerge.has(key);

    if (isHMerge || isVMerge) {
      return {
        properties: {
          ...(isHMerge && { horizontalMerge: true }),
          ...(isVMerge && { verticalMerge: true }),
        },
      };
    }

    return buildTableCell(cellSpec);
  });

  return { height: rowHeight, cells };
}

function buildTable(spec: TableSpec): Table {
  const colCount = spec.rows[0]?.length ?? 0;
  const rowCount = spec.rows.length;
  const colWidth = px(colCount > 0 ? spec.width / colCount : spec.width);
  const rowHeight = px(rowCount > 0 ? spec.height / rowCount : spec.height);

  const mergeFlags = collectMergeFlags(spec.rows);

  return {
    properties: {},
    grid: {
      columns: Array.from({ length: colCount }, () => ({ width: colWidth })),
    },
    rows: spec.rows.map((row, rowIndex) => buildTableRow({ rowCells: row, rowHeight, rowIndex, mergeFlags })),
  };
}

function buildTableGraphicFrame(spec: TableSpec, id: string): GraphicFrame {
  const table = buildTable(spec);
  return {
    type: "graphicFrame",
    nonVisual: { id, name: `Table ${id}` },
    transform: {
      x: px(spec.x),
      y: px(spec.y),
      width: px(spec.width),
      height: px(spec.height),
      rotation: deg(0),
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
export function addElementsSync<TSpec>({ slideDoc, specs, existingIds, ctx, builder }: AddElementsSyncOptions<TSpec>): {
  readonly doc: XmlDocument;
  readonly added: number;
} {
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
