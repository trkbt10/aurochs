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
import { resolveColor, type ColorScheme, DEFAULT_COLOR_SCHEME } from "../records/atoms/color";
import { extractTextBodies } from "./text-extractor";
import { extractTextHyperlinkRanges, type HyperlinkMap } from "./hyperlink-extractor";
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
export function extractShapes(
  slideRecord: PptRecord,
  fonts: readonly string[],
  colorScheme: ColorScheme,
  hyperlinkMap?: HyperlinkMap,
): readonly PptShape[] {
  const children = slideRecord.children ?? [];

  // OfficeArtDgContainer may be nested inside PPDrawing (0x040C) or be a direct child
  let dgContainer = findChildByType(children, RT.OfficeArtDgContainer);
  if (!dgContainer) {
    const ppDrawing = findChildByType(children, RT.PPDrawing);
    if (ppDrawing) {
      dgContainer = findChildByType(ppDrawing.children ?? [], RT.OfficeArtDgContainer);
    }
  }
  if (!dgContainer) return [];

  // Find the shape group container
  const spgrContainer = findChildByType(dgContainer.children ?? [], RT.OfficeArtSpgrContainer);
  if (!spgrContainer) return [];

  return extractShapesFromGroup(spgrContainer, fonts, colorScheme, hyperlinkMap);
}

function extractShapesFromGroup(
  container: PptRecord,
  fonts: readonly string[],
  colorScheme: ColorScheme,
  hyperlinkMap?: HyperlinkMap,
): readonly PptShape[] {
  const shapes: PptShape[] = [];
  const children = container.children ?? [];

  for (const child of children) {
    if (child.recType === RT.OfficeArtSpContainer) {
      const shape = extractSingleShape(child, fonts, colorScheme, hyperlinkMap);
      if (shape) shapes.push(shape);
    } else if (child.recType === RT.OfficeArtSpgrContainer) {
      // Check if this group is a table
      const tertiaryProps = isTableGroup(child);
      if (tertiaryProps) {
        const table = extractTable(child, tertiaryProps, fonts, colorScheme);
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
      const groupShapes = extractShapesFromGroup(child, fonts, colorScheme, hyperlinkMap);
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

function extractSingleShape(
  spContainer: PptRecord,
  fonts: readonly string[],
  colorScheme: ColorScheme,
  hyperlinkMap?: HyperlinkMap,
): PptShape | undefined {
  const children = spContainer.children ?? [];

  // Parse FSP (shape type + flags)
  const fspRecord = findChildByType(children, RT.OfficeArtFSP);
  if (!fspRecord) return undefined;
  const fsp = parseOfficeArtFSP(fspRecord);

  // Skip deleted shapes and the patriarch shape
  if (fsp.isDeleted || fsp.isPatriarch) return undefined;

  // Parse FOPT (shape properties)
  const foptRecord = findChildByType(children, RT.OfficeArtFOPT);
  const props = foptRecord ? parseOfficeArtFOPT(foptRecord) : new Map<number, ShapeProperty>();

  // Parse anchor (position)
  const anchorRecord = findChildByType(children, RT.OfficeArtClientAnchor);
  const childAnchorRecord = findChildByType(children, RT.OfficeArtChildAnchor);

  let transform: PptTransform;
  if (anchorRecord) {
    const anchor = parseClientAnchor(anchorRecord);
    transform = anchorToTransform(anchor.left, anchor.top, anchor.right, anchor.bottom, fsp, props);
  } else if (childAnchorRecord) {
    const anchor = parseChildAnchor(childAnchorRecord);
    transform = childAnchorToTransform(anchor.left, anchor.top, anchor.right, anchor.bottom, fsp, props);
  } else {
    transform = defaultTransform();
  }

  // Determine shape type
  const msospt = fspRecord.recInstance;
  const presetShape = msosptToPresetShape(msospt) as PptPresetShape;

  // Extract fill
  const fill = extractFill(props, colorScheme);

  // Extract line
  const line = extractLine(props, colorScheme);

  // Extract text
  const clientTextboxRecord = findChildByType(children, RT.OfficeArtClientTextbox);
  let textBody: PptTextBody | undefined;
  if (clientTextboxRecord?.children) {
    const bodies = extractTextBodies(clientTextboxRecord.children, fonts, colorScheme);
    if (bodies.length > 0) {
      textBody = bodies[0];
      // Apply text hyperlinks if available
      if (hyperlinkMap && hyperlinkMap.size > 0) {
        const ranges = extractTextHyperlinkRanges(clientTextboxRecord.children);
        if (ranges.length > 0) {
          textBody = applyHyperlinksToTextBody(textBody, ranges, hyperlinkMap);
        }
      }
    }
  }

  // Extract picture reference
  let picture: PptPicture | undefined;
  const blipId = getShapeProp(props, SHAPE_PROP.BLIP_ID);
  if (blipId !== undefined) {
    picture = {
      pictureIndex: blipId - 1, // BLIP ID is 1-based
      ...(extractCrop(props)),
    };
  }

  // Determine type
  let type: PptShape["type"] = "shape";
  if (picture) type = "picture";
  else if (fsp.isConnector || msospt === 20 || (msospt >= 32 && msospt <= 40)) type = "connector";

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

function anchorToTransform(
  left: number, top: number, right: number, bottom: number,
  fsp: ShapeFlags,
  props: Map<number, ShapeProperty>,
): PptTransform {
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

function childAnchorToTransform(
  left: number, top: number, right: number, bottom: number,
  fsp: ShapeFlags,
  props: Map<number, ShapeProperty>,
): PptTransform {
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

function extractRotation(props: Map<number, ShapeProperty>): number {
  const raw = getShapeProp(props, SHAPE_PROP.ROTATION);
  if (raw === undefined) return 0;
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

  if (lineColor === undefined && lineWidth === undefined) return undefined;

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
  if (spContainers.length === 0) return undefined;

  const patriarch = spContainers[0];
  const anchor = findChildByType(patriarch.children ?? [], RT.OfficeArtClientAnchor);
  if (!anchor) return undefined;

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
  ranges: readonly import("./hyperlink-extractor").TextHyperlinkRange[],
  hyperlinkMap: HyperlinkMap,
): PptTextBody {
  // Flatten all text to get absolute character positions per paragraph
  const newParagraphs = [];
  let charPos = 0;

  for (const para of textBody.paragraphs) {
    const newRuns = [];
    for (const run of para.runs) {
      const runStart = charPos;
      const runEnd = charPos + run.text.length;

      // Find overlapping hyperlink ranges
      const overlapping = ranges.filter(r => r.begin < runEnd && r.end > runStart);

      if (overlapping.length === 0) {
        newRuns.push(run);
      } else {
        // Split run at hyperlink boundaries
        let pos = 0;
        for (const range of overlapping) {
          const relStart = Math.max(0, range.begin - runStart);
          const relEnd = Math.min(run.text.length, range.end - runStart);

          // Text before this hyperlink
          if (relStart > pos) {
            newRuns.push({ text: run.text.substring(pos, relStart), properties: run.properties });
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

          pos = relEnd;
        }

        // Remaining text after last hyperlink
        if (pos < run.text.length) {
          newRuns.push({ text: run.text.substring(pos), properties: run.properties });
        }
      }

      charPos += run.text.length;
    }

    newParagraphs.push({ ...para, runs: newRuns });
    charPos += 1; // CR separator between paragraphs
  }

  return { ...textBody, paragraphs: newParagraphs };
}
