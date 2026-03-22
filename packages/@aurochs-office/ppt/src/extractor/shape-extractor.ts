/**
 * @file Extract shapes from OfficeArt records
 */

import type { PptRecord } from "../records/types";
import { RT } from "../records/record-types";
import { findChildByType, findChildrenByType } from "../records/record-iterator";
import {
  parseOfficeArtFSP, parseOfficeArtFOPT, getShapeProp,
  parseClientAnchor, parseChildAnchor, msosptToPresetShape,
  SHAPE_PROP,
  type ShapeFlags, type ShapeProperty,
} from "../records/atoms/shape";
import { resolveColor, type ColorScheme } from "../records/atoms/color";
import { extractTextBodies } from "./text-extractor";
import { extractTextHyperlinkRanges, type HyperlinkMap, type TextHyperlinkRange } from "./hyperlink-extractor";
import { isTableGroup, extractTable } from "./table-extractor";
import type {
  PptShape, PptTransform, PptFill, PptLine, PptPicture,
  PptPresetShape, PptTextBody,
} from "../domain/types";

/** PPT master unit to EMU conversion factor: 914400 / 576 */
const MASTER_UNIT_TO_EMU = 914400 / 576;

/**
 * Extract shapes from a slide's OfficeArtSpgrContainer.
 *
 * In PPT, the OfficeArtDgContainer is wrapped inside a PPDrawing container (0x040C):
 * SlideContainer → PPDrawing → OfficeArtDgContainer → OfficeArtSpgrContainer → shapes
 */
export function extractShapes(options: {
  slideRecord: PptRecord;
  fonts: readonly string[];
  colorScheme: ColorScheme;
  hyperlinkMap?: HyperlinkMap;
}): readonly PptShape[] {
  const { slideRecord, fonts, colorScheme, hyperlinkMap } = options;
  const children = slideRecord.children ?? [];

  // OfficeArtDgContainer may be nested inside PPDrawing (0x040C) or be a direct child
  const dgContainer = findDgContainer(children);
  if (!dgContainer) {return [];}

  // Find the shape group container
  const spgrContainer = findChildByType(dgContainer.children ?? [], RT.OfficeArtSpgrContainer);
  if (!spgrContainer) {return [];}

  return extractShapesFromGroup({ container: spgrContainer, fonts, colorScheme, hyperlinkMap });
}

function extractShapesFromGroup(options: {
  container: PptRecord;
  fonts: readonly string[];
  colorScheme: ColorScheme;
  hyperlinkMap?: HyperlinkMap;
}): readonly PptShape[] {
  const { container, fonts, colorScheme, hyperlinkMap } = options;
  const shapes: PptShape[] = [];
  const children = container.children ?? [];

  for (const child of children) {
    if (child.recType === RT.OfficeArtSpContainer) {
      const shape = extractSingleShape({ spContainer: child, fonts, colorScheme, hyperlinkMap });
      if (shape) {shapes.push(shape);}
    } else if (child.recType === RT.OfficeArtSpgrContainer) {
      // Check if this group is a table
      const tertiaryProps = isTableGroup(child);
      if (tertiaryProps) {
        const table = extractTable({ groupContainer: child, tertiaryProps, fonts, colorScheme });
        if (table) {
          const transform = extractGroupTransform(child);
          shapes.push({
            type: "table",
            transform: transform ?? defaultTransform(),
            table,
          });
          continue;
        }
      }

      // Regular nested group
      const groupShapes = extractShapesFromGroup({ container: child, fonts, colorScheme, hyperlinkMap });
      if (groupShapes.length > 0) {
        const transform = extractGroupTransform(child);
        shapes.push({
          type: "group",
          transform: transform ?? defaultTransform(),
          children: groupShapes,
        });
      }
    }
  }

  return shapes;
}

function extractSingleShape(options: {
  spContainer: PptRecord;
  fonts: readonly string[];
  colorScheme: ColorScheme;
  hyperlinkMap?: HyperlinkMap;
}): PptShape | undefined {
  const { spContainer, fonts, colorScheme, hyperlinkMap } = options;
  const children = spContainer.children ?? [];

  // Parse FSP (shape type + flags)
  const fspRecord = findChildByType(children, RT.OfficeArtFSP);
  if (!fspRecord) {return undefined;}
  const fsp = parseOfficeArtFSP(fspRecord);

  // Skip deleted shapes and the patriarch shape
  if (fsp.isDeleted || fsp.isPatriarch) {return undefined;}

  // Parse FOPT (shape properties)
  const foptRecord = findChildByType(children, RT.OfficeArtFOPT);
  const props = foptRecord ? parseOfficeArtFOPT(foptRecord) : new Map<number, ShapeProperty>();

  // Parse anchor (position)
  const anchorRecord = findChildByType(children, RT.OfficeArtClientAnchor);
  const childAnchorRecord = findChildByType(children, RT.OfficeArtChildAnchor);

  const transform = resolveTransform({ anchorRecord, childAnchorRecord, fsp, props });

  // Determine shape type
  const msospt = fspRecord.recInstance;
  const presetShape = msosptToPresetShape(msospt) as PptPresetShape;

  // Extract fill
  const fill = extractFill(props, colorScheme);

  // Extract line
  const line = extractLine(props, colorScheme);

  // Extract text
  const clientTextboxRecord = findChildByType(children, RT.OfficeArtClientTextbox);
  const textBody = extractShapeTextBody({ clientTextboxRecord, fonts, colorScheme, hyperlinkMap });

  // Extract picture reference
  const picture = extractPictureRef(props);

  // Determine type
  const type = resolveShapeType(picture, fsp, msospt);

  return {
    type,
    transform,
    presetShape,
    ...(fill ? { fill } : {}),
    ...(line ? { line } : {}),
    ...(textBody ? { textBody } : {}),
    ...(picture ? { picture } : {}),
  };
}

function anchorToTransform(options: {
  left: number; top: number; right: number; bottom: number;
  fsp: ShapeFlags;
  props: Map<number, ShapeProperty>;
}): PptTransform {
  const { left, top, right, bottom, fsp, props } = options;
  // ClientAnchor coordinates are in master units or EMU depending on recInstance
  // We'll convert master units to EMU
  const scale = MASTER_UNIT_TO_EMU;
  const xEmu = Math.round(left * scale);
  const yEmu = Math.round(top * scale);
  const widthEmu = Math.round((right - left) * scale);
  const heightEmu = Math.round((bottom - top) * scale);
  const rotation = extractRotation(props);

  return {
    xEmu, yEmu,
    widthEmu: Math.abs(widthEmu),
    heightEmu: Math.abs(heightEmu),
    rotation,
    flipH: fsp.flipH,
    flipV: fsp.flipV,
  };
}

function childAnchorToTransform(options: {
  left: number; top: number; right: number; bottom: number;
  fsp: ShapeFlags;
  props: Map<number, ShapeProperty>;
}): PptTransform {
  const { left, top, right, bottom, fsp, props } = options;
  // ChildAnchor coordinates are already in EMU
  const rotation = extractRotation(props);
  return {
    xEmu: left,
    yEmu: top,
    widthEmu: Math.abs(right - left),
    heightEmu: Math.abs(bottom - top),
    rotation,
    flipH: fsp.flipH,
    flipV: fsp.flipV,
  };
}

function findDgContainer(children: readonly PptRecord[]): PptRecord | undefined {
  const direct = findChildByType(children, RT.OfficeArtDgContainer);
  if (direct) { return direct; }
  const ppDrawing = findChildByType(children, RT.PPDrawing);
  if (!ppDrawing) { return undefined; }
  return findChildByType(ppDrawing.children ?? [], RT.OfficeArtDgContainer);
}

function resolveTransform(ctx: {
  anchorRecord: PptRecord | undefined;
  childAnchorRecord: PptRecord | undefined;
  fsp: ShapeFlags;
  props: Map<number, ShapeProperty>;
}): PptTransform {
  const { anchorRecord, childAnchorRecord, fsp, props } = ctx;
  if (anchorRecord) {
    const anchor = parseClientAnchor(anchorRecord);
    return anchorToTransform({ left: anchor.left, top: anchor.top, right: anchor.right, bottom: anchor.bottom, fsp, props });
  }
  if (childAnchorRecord) {
    const anchor = parseChildAnchor(childAnchorRecord);
    return childAnchorToTransform({ left: anchor.left, top: anchor.top, right: anchor.right, bottom: anchor.bottom, fsp, props });
  }
  return defaultTransform();
}

function extractShapeTextBody(ctx: {
  clientTextboxRecord: PptRecord | undefined;
  fonts: readonly string[];
  colorScheme: ColorScheme;
  hyperlinkMap?: HyperlinkMap;
}): PptTextBody | undefined {
  if (!ctx.clientTextboxRecord?.children) { return undefined; }
  const bodies = extractTextBodies(ctx.clientTextboxRecord.children, ctx.fonts, ctx.colorScheme);
  if (bodies.length === 0) { return undefined; }
  const body = bodies[0];
  if (!ctx.hyperlinkMap || ctx.hyperlinkMap.size === 0) { return body; }
  const ranges = extractTextHyperlinkRanges(ctx.clientTextboxRecord.children);
  if (ranges.length === 0) { return body; }
  return applyHyperlinksToTextBody(body, ranges, ctx.hyperlinkMap);
}

function extractPictureRef(props: Map<number, ShapeProperty>): PptPicture | undefined {
  const blipId = getShapeProp(props, SHAPE_PROP.BLIP_ID);
  if (blipId === undefined) { return undefined; }
  return { pictureIndex: blipId - 1, ...(extractCrop(props)) };
}

function resolveShapeType(picture: PptPicture | undefined, fsp: ShapeFlags, msospt: number): PptShape["type"] {
  if (picture) { return "picture"; }
  if (fsp.isConnector || msospt === 20 || (msospt >= 32 && msospt <= 40)) { return "connector"; }
  return "shape";
}

function extractRotation(props: Map<number, ShapeProperty>): number {
  const raw = getShapeProp(props, SHAPE_PROP.ROTATION);
  if (raw === undefined) {return 0;}
  // Rotation is stored as a fixed-point 16.16 value in degrees
  return (raw >> 16) + (raw & 0xFFFF) / 65536;
}

function extractFill(props: Map<number, ShapeProperty>, colorScheme: ColorScheme): PptFill | undefined {
  const boolProps = getShapeProp(props, SHAPE_PROP.FILL_STYLE_BOOL_PROPS);

  // Check if fill is explicitly disabled
  if (boolProps !== undefined) {
    const hasFill = boolProps & 0x0010; // fFilled flag
    const useFill = boolProps & 0x0010_0000; // fUsefFilled flag
    if (useFill && !hasFill) {
      return { type: "none" };
    }
  }

  const fillColor = getShapeProp(props, SHAPE_PROP.FILL_COLOR);
  if (fillColor !== undefined) {
    return { type: "solid", color: resolveColor(fillColor, colorScheme) };
  }

  return undefined;
}

function extractLine(props: Map<number, ShapeProperty>, colorScheme: ColorScheme): PptLine | undefined {
  const boolProps = getShapeProp(props, SHAPE_PROP.LINE_STYLE_BOOL_PROPS);

  // Check if line is explicitly disabled
  if (boolProps !== undefined) {
    const hasLine = boolProps & 0x0008; // fLine flag
    const useLine = boolProps & 0x0008_0000; // fUsefLine flag
    if (useLine && !hasLine) {
      return undefined;
    }
  }

  const lineColor = getShapeProp(props, SHAPE_PROP.LINE_COLOR);
  const lineWidth = getShapeProp(props, SHAPE_PROP.LINE_WIDTH);
  const lineDash = getShapeProp(props, SHAPE_PROP.LINE_DASH_STYLE);

  if (lineColor === undefined && lineWidth === undefined) {return undefined;}

  return {
    widthEmu: lineWidth ?? 9525, // Default: 0.75pt = 9525 EMU
    ...(lineColor !== undefined ? { color: resolveColor(lineColor, colorScheme) } : {}),
    ...(lineDash !== undefined ? { dashStyle: dashStyleToString(lineDash) } : {}),
  };
}

function dashStyleToString(value: number): PptLine["dashStyle"] {
  switch (value) {
    case 0: return "solid";
    case 1: return "dash";
    case 2: return "dot";
    case 3: return "dashDot";
    case 4: return "dashDotDot";
    default: return "solid";
  }
}

function extractCrop(props: Map<number, ShapeProperty>): Partial<PptPicture> {
  const cropLeft = getShapeProp(props, SHAPE_PROP.CROP_FROM_LEFT);
  const cropTop = getShapeProp(props, SHAPE_PROP.CROP_FROM_TOP);
  const cropRight = getShapeProp(props, SHAPE_PROP.CROP_FROM_RIGHT);
  const cropBottom = getShapeProp(props, SHAPE_PROP.CROP_FROM_BOTTOM);

  return {
    ...(cropLeft ? { cropLeft: fixedPointToFraction(cropLeft) } : {}),
    ...(cropTop ? { cropTop: fixedPointToFraction(cropTop) } : {}),
    ...(cropRight ? { cropRight: fixedPointToFraction(cropRight) } : {}),
    ...(cropBottom ? { cropBottom: fixedPointToFraction(cropBottom) } : {}),
  };
}

function fixedPointToFraction(value: number): number {
  // Fixed-point 16.16 value representing a fraction
  return value / 65536;
}

function extractGroupTransform(groupContainer: PptRecord): PptTransform | undefined {
  const children = groupContainer.children ?? [];
  // First SpContainer in group is the patriarch
  const spContainers = findChildrenByType(children, RT.OfficeArtSpContainer);
  if (spContainers.length === 0) {return undefined;}

  const patriarch = spContainers[0];
  const anchor = findChildByType(patriarch.children ?? [], RT.OfficeArtClientAnchor);
  if (!anchor) {return undefined;}

  const a = parseClientAnchor(anchor);
  const scale = MASTER_UNIT_TO_EMU;
  return {
    xEmu: Math.round(a.left * scale),
    yEmu: Math.round(a.top * scale),
    widthEmu: Math.round((a.right - a.left) * scale),
    heightEmu: Math.round((a.bottom - a.top) * scale),
    rotation: 0,
    flipH: false,
    flipV: false,
  };
}

function defaultTransform(): PptTransform {
  return { xEmu: 0, yEmu: 0, widthEmu: 0, heightEmu: 0, rotation: 0, flipH: false, flipV: false };
}

/**
 * Apply hyperlink ranges to a text body by splitting runs at hyperlink boundaries.
 */
function applyHyperlinksToTextBody(
  textBody: PptTextBody,
  ranges: readonly TextHyperlinkRange[],
  hyperlinkMap: HyperlinkMap,
): PptTextBody {
  // Flatten all text to get absolute character positions per paragraph
  const newParagraphs = [];
  const charPosRef = { value: 0 };

  for (const para of textBody.paragraphs) {
    const newRuns = [];
    for (const run of para.runs) {
      const runStart = charPosRef.value;
      const runEnd = charPosRef.value + run.text.length;

      // Find overlapping hyperlink ranges
      const overlapping = ranges.filter(r => r.begin < runEnd && r.end > runStart);

      if (overlapping.length === 0) {
        newRuns.push(run);
      } else {
        // Split run at hyperlink boundaries
        const posRef = { value: 0 };
        for (const range of overlapping) {
          const relStart = Math.max(0, range.begin - runStart);
          const relEnd = Math.min(run.text.length, range.end - runStart);

          // Text before this hyperlink
          if (relStart > posRef.value) {
            newRuns.push({ text: run.text.substring(posRef.value, relStart), properties: run.properties });
          }

          // Hyperlinked text
          const url = hyperlinkMap.get(range.exHyperlinkIdRef);
          if (url) {
            newRuns.push({
              text: run.text.substring(relStart, relEnd),
              properties: { ...run.properties, hyperlink: url },
            });
          } else {
            newRuns.push({ text: run.text.substring(relStart, relEnd), properties: run.properties });
          }

          posRef.value = relEnd;
        }

        // Remaining text after last hyperlink
        if (posRef.value < run.text.length) {
          newRuns.push({ text: run.text.substring(posRef.value), properties: run.properties });
        }
      }

      charPosRef.value += run.text.length;
    }

    newParagraphs.push({ ...para, runs: newRuns });
    charPosRef.value += 1; // CR separator between paragraphs
  }

  return { ...textBody, paragraphs: newParagraphs };
}
