/**
 * @file OfficeArt shape record parsers
 *
 * @see [MS-ODRAW] Section 2.2.39 (OfficeArtFSP)
 * @see [MS-ODRAW] Section 2.2.40 (OfficeArtFOPT)
 * @see [MS-PPT] Section 2.13.10 (OfficeArtClientAnchor)
 */

import type { PptRecord } from "../types";
import { RT } from "../record-types";

// =========================================================================
// OfficeArtFSP (shape flags + shape ID)
// =========================================================================

export type ShapeFlags = {
  readonly shapeId: number;
  readonly isGroup: boolean;
  readonly isChild: boolean;
  readonly isPatriarch: boolean;
  readonly hasAnchor: boolean;
  readonly isConnector: boolean;
  readonly isDeleted: boolean;
  readonly isOleShape: boolean;
  readonly hasShapeType: boolean;
  readonly flipH: boolean;
  readonly flipV: boolean;
};

/** Parse OfficeArtFSP (recType=0xF00A). The recInstance contains the shape type. */
export function parseOfficeArtFSP(record: PptRecord): ShapeFlags {
  if (record.recType !== RT.OfficeArtFSP) {
    throw new Error(`Expected OfficeArtFSP (0xF00A), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
  const shapeId = view.getUint32(0, true);
  const flags = view.getUint32(4, true);

  return {
    shapeId,
    isGroup: !!(flags & 0x01),
    isChild: !!(flags & 0x02),
    isPatriarch: !!(flags & 0x04),
    isDeleted: !!(flags & 0x08),
    isOleShape: !!(flags & 0x10),
    hasShapeType: !!(flags & 0x20),
    hasAnchor: !!(flags & 0x40),
    isConnector: !!(flags & 0x80),
    flipH: !!(flags & 0x40_00),
    flipV: !!(flags & 0x80_00),
  };
}

// =========================================================================
// OfficeArtFOPT (shape properties table)
// =========================================================================

/** Shape property types from [MS-ODRAW] */
export const SHAPE_PROP = {
  // Transform
  ROTATION:                 4,

  // Group
  GROUP_LEFT:               0x0140,
  GROUP_TOP:                0x0141,
  GROUP_RIGHT:              0x0142,
  GROUP_BOTTOM:             0x0143,

  // Fill
  FILL_TYPE:                0x0180,
  FILL_COLOR:               0x0181,
  FILL_OPACITY:             0x0182,
  FILL_BACKGROUND_COLOR:    0x0183,
  FILL_STYLE_BOOL_PROPS:    0x01BF,

  // Line
  LINE_COLOR:               0x01C0,
  LINE_OPACITY:             0x01C1,
  LINE_WIDTH:               0x01CB,
  LINE_DASH_STYLE:          0x01CE,
  LINE_STYLE_BOOL_PROPS:    0x01FF,

  // Text
  TEXT_ID:                  0x0080,
  TEXT_DIRECTION:           0x008B,
  TEXT_ANCHOR:              0x0087,
  TEXT_WORD_WRAP:           0x0085,
  TEXT_ROTATION:            0x008A,

  // Geometry
  GEO_LEFT:                0x0140,
  GEO_TOP:                 0x0141,
  GEO_RIGHT:               0x0142,
  GEO_BOTTOM:              0x0143,

  // Blip (picture)
  BLIP_ID:                 0x0104,
  CROP_FROM_LEFT:          0x0102,
  CROP_FROM_TOP:           0x0103,
  CROP_FROM_RIGHT:         0x0105,
  CROP_FROM_BOTTOM:        0x0106,

  // Boolean shape properties
  SHAPE_BOOL_PROPS:        0x03BF,
} as const;

export type ShapeProperty = {
  readonly id: number;
  readonly value: number;
  readonly isBlip: boolean;
  readonly isComplex: boolean;
  readonly complexData?: Uint8Array;
};

/**
 * Parse OfficeArtFOPT (recType=0xF00B) / SecondaryFOPT / TertiaryFOPT.
 * Returns a map of property ID → value.
 *
 * The recInstance field contains the number of properties.
 */
export function parseOfficeArtFOPT(record: PptRecord): Map<number, ShapeProperty> {
  if (
    record.recType !== RT.OfficeArtFOPT &&
    record.recType !== RT.OfficeArtSecondaryFOPT &&
    record.recType !== RT.OfficeArtTertiaryFOPT
  ) {
    throw new Error(`Expected OfficeArtFOPT, got 0x${record.recType.toString(16)}`);
  }

  const propertyCount = record.recInstance;
  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
  const properties = new Map<number, ShapeProperty>();

  // Fixed-length entries: 6 bytes each (u16 id + u32 value)
  const fixedSize = propertyCount * 6;
  for (let i = 0; i < propertyCount && (i * 6 + 5) < record.data.byteLength; i++) {
    const offset = i * 6;
    const idRaw = view.getUint16(offset, true);
    const value = view.getUint32(offset + 2, true);

    const id = idRaw & 0x3FFF;
    const isBlip = !!(idRaw & 0x4000);
    const isComplex = !!(idRaw & 0x8000);

    properties.set(id, { id, value, isBlip, isComplex });
  }

  // Parse complex data that follows the fixed entries
  // Complex properties have isComplex=true and value = byte length of their data
  let complexOffset = fixedSize;
  for (const [, prop] of properties) {
    if (prop.isComplex && prop.value > 0 && complexOffset + prop.value <= record.data.byteLength) {
      const complexData = record.data.slice(complexOffset, complexOffset + prop.value);
      properties.set(prop.id, { ...prop, complexData });
      complexOffset += prop.value;
    }
  }

  return properties;
}

/** Get a property value, or undefined. */
export function getShapeProp(props: Map<number, ShapeProperty>, id: number): number | undefined {
  return props.get(id)?.value;
}

// =========================================================================
// OfficeArtClientAnchor (slide coordinates)
// =========================================================================

export type ClientAnchorData = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

/**
 * Parse OfficeArtClientAnchor (recType=0xF010).
 *
 * In PPT, the client anchor stores slide-relative coordinates.
 * The coordinates are in "master units" (1/576 inch).
 */
export function parseClientAnchor(record: PptRecord): ClientAnchorData {
  if (record.recType !== RT.OfficeArtClientAnchor) {
    throw new Error(`Expected OfficeArtClientAnchor (0xF010), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);

  // Format depends on recInstance:
  // recInstance=0: 8 bytes, 4 x u16 (top, left, right, bottom) in 1/576 inch
  // recInstance=1: 16 bytes, 4 x u32 (top, left, right, bottom) in EMU
  if (record.recInstance === 1 || record.data.byteLength >= 16) {
    return {
      top: view.getInt32(0, true),
      left: view.getInt32(4, true),
      right: view.getInt32(8, true),
      bottom: view.getInt32(12, true),
    };
  }

  // 8-byte format: scaled by master unit size
  return {
    top: view.getInt16(0, true),
    left: view.getInt16(2, true),
    right: view.getInt16(4, true),
    bottom: view.getInt16(6, true),
  };
}

// =========================================================================
// OfficeArtChildAnchor (group-relative coordinates)
// =========================================================================

export type ChildAnchorData = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

/** Parse OfficeArtChildAnchor (recType=0xF00F). 16 bytes: 4 x u32. */
export function parseChildAnchor(record: PptRecord): ChildAnchorData {
  if (record.recType !== RT.OfficeArtChildAnchor) {
    throw new Error(`Expected OfficeArtChildAnchor (0xF00F), got 0x${record.recType.toString(16)}`);
  }

  const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);
  return {
    left: view.getInt32(0, true),
    top: view.getInt32(4, true),
    right: view.getInt32(8, true),
    bottom: view.getInt32(12, true),
  };
}

// =========================================================================
// Shape type mapping (MSOSPT values from [MS-ODRAW])
// =========================================================================

/** Map OfficeArt shape type (MSOSPT) to OOXML preset shape name. */
export function msosptToPresetShape(msospt: number): string {
  const mapping: Record<number, string> = {
    0: "rect",           // msosptNotPrimitive (generic)
    1: "rect",           // msosptRectangle
    2: "roundRect",      // msosptRoundRectangle
    3: "ellipse",        // msosptEllipse
    4: "diamond",        // msosptDiamond
    5: "triangle",       // msosptIsocelesTriangle
    6: "rtTriangle",     // msosptRightTriangle
    7: "parallelogram",  // msosptParallelogram
    8: "trapezoid",      // msosptTrapezoid
    9: "hexagon",        // msosptHexagon
    10: "octagon",       // msosptOctagon
    11: "plus",          // msosptPlus
    12: "star5",         // msosptStar
    13: "rightArrow",    // msosptArrow
    14: "mathNotEqual",  // msosptThickArrow (approximate)
    15: "homePlate",     // msosptHomePlate
    16: "cube",          // msosptCube
    20: "line",          // msosptLine
    21: "bentConnector3", // msosptBentConnector
    32: "straightConnector1", // msosptStraightConnector1
    33: "bentConnector2",
    34: "bentConnector3",
    35: "bentConnector4",
    36: "bentConnector5",
    37: "curvedConnector2",
    38: "curvedConnector3",
    39: "curvedConnector4",
    40: "curvedConnector5",
    61: "rect",          // msosptCallout1
    75: "rect",          // msosptTextBox
    109: "wedgeRoundRectCallout",
    110: "wedgeEllipseCallout",
    183: "sun",
    184: "moon",
    185: "bracketPair",
    186: "bracePair",
    187: "star4",
    188: "doubleWave",
    202: "rect",         // msosptTextBox (alternative)
  };
  return mapping[msospt] ?? "rect";
}
