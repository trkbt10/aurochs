/**
 * @file EMF (Enhanced Metafile) parser
 *
 * Parses EMF files and converts to SVG for browser display.
 * Based on MS-EMF specification.
 *
 * @see https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-emf
 */

import { base64ArrayBuffer } from "@oxen/buffer";

// =============================================================================
// EMF Record Types (MS-EMF Section 2.1.1)
// =============================================================================

const EMR_HEADER = 0x00000001;
const EMR_POLYGON = 0x00000003;
const EMR_POLYLINE = 0x00000004;
const EMR_POLYPOLYGON = 0x00000008;
const EMR_SETWINDOWEXTEX = 0x00000009;
const EMR_SETWINDOWORGEX = 0x0000000a;
const EMR_SETVIEWPORTEXTEX = 0x0000000b;
const EMR_SETVIEWPORTORGEX = 0x0000000c;
const EMR_EOF = 0x0000000e;
const EMR_SETBKMODE = 0x00000012;
const EMR_SETPOLYFILLMODE = 0x00000013;
const EMR_SETTEXTALIGN = 0x00000016;
const EMR_SETTEXTCOLOR = 0x00000018;
const EMR_SETBKCOLOR = 0x00000019;
const EMR_MOVETOEX = 0x0000001b;
const EMR_SELECTOBJECT = 0x00000025;
const EMR_CREATEPEN = 0x00000026;
const EMR_CREATEBRUSHINDIRECT = 0x00000027;
const EMR_DELETEOBJECT = 0x00000028;
const EMR_ELLIPSE = 0x0000002a;
const EMR_RECTANGLE = 0x0000002b;
const EMR_LINETO = 0x00000036;
const EMR_BEGINPATH = 0x0000003b;
const EMR_ENDPATH = 0x0000003c;
const EMR_CLOSEFIGURE = 0x0000003d;
const EMR_FILLPATH = 0x0000003e;
const EMR_STROKEANDFILLPATH = 0x0000003f;
const EMR_STROKEPATH = 0x00000040;
const EMR_COMMENT = 0x00000046;
const EMR_BITBLT = 0x0000004c;
const EMR_STRETCHDIBITS = 0x00000051;
const EMR_EXTCREATEFONTINDIRECTW = 0x00000052;
const EMR_EXTTEXTOUTW = 0x00000054;
const EMR_POLYGON16 = 0x00000056;
const EMR_POLYLINE16 = 0x00000057;
const EMR_POLYPOLYGON16 = 0x0000005b;

// =============================================================================
// Types
// =============================================================================

type EmfHeader = {
  readonly bounds: { left: number; top: number; right: number; bottom: number };
  readonly frame: { left: number; top: number; right: number; bottom: number };
  readonly version: number;
  readonly size: number;
  readonly records: number;
  readonly handles: number;
  readonly description: string;
  readonly deviceWidth: number;
  readonly deviceHeight: number;
  readonly millimetersWidth: number;
  readonly millimetersHeight: number;
};

type Point = { x: number; y: number };

type EmfPen = {
  readonly style: number;
  readonly width: number;
  readonly color: string;
};

type EmfBrush = {
  readonly style: number;
  readonly color: string;
  readonly hatch: number;
};

type EmfFont = {
  readonly height: number;
  readonly width: number;
  readonly weight: number;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strikeOut: boolean;
  readonly faceName: string;
};

type GdiObject = EmfPen | EmfBrush | EmfFont | null;

type EmfState = {
  currentPos: Point;
  windowOrg: Point;
  windowExt: Point;
  viewportOrg: Point;
  viewportExt: Point;
  textColor: string;
  bkColor: string;
  bkMode: number;
  textAlign: number;
  polyFillMode: number;
  currentPen: EmfPen;
  currentBrush: EmfBrush;
  currentFont: EmfFont | null;
  objects: Map<number, GdiObject>;
  pathData: string;
  inPath: boolean;
  transform: { m11: number; m12: number; m21: number; m22: number; dx: number; dy: number };
};

// =============================================================================
// Parser
// =============================================================================

/**
 * Parse EMF file and convert to SVG
 */
export function emfToSvg(data: Uint8Array): string | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const offsetState = { value: 0 };

  // Parse header
  const header = parseHeader(view, offsetState.value);
  if (header === null) {
    return null;
  }

  // Calculate dimensions from bounds (device units)
  const boundsWidth = header.bounds.right - header.bounds.left;
  const boundsHeight = header.bounds.bottom - header.bounds.top;

  // Calculate frame dimensions (0.01mm units, convert to logical units)
  const frameWidth = header.frame.right - header.frame.left;
  const frameHeight = header.frame.bottom - header.frame.top;

  if (boundsWidth <= 0 || boundsHeight <= 0) {
    return null;
  }

  // Use frame as the logical coordinate space for the viewBox
  // The EMF drawing commands use frame coordinates
  const viewBoxWidth = frameWidth > 0 ? frameWidth : boundsWidth;
  const viewBoxHeight = frameHeight > 0 ? frameHeight : boundsHeight;

  // Initialize state
  const state: EmfState = {
    currentPos: { x: 0, y: 0 },
    windowOrg: { x: header.frame.left, y: header.frame.top },
    windowExt: { x: viewBoxWidth, y: viewBoxHeight },
    viewportOrg: { x: 0, y: 0 },
    viewportExt: { x: boundsWidth, y: boundsHeight },
    textColor: "#000000",
    bkColor: "#ffffff",
    bkMode: 1, // TRANSPARENT
    textAlign: 0,
    polyFillMode: 1, // ALTERNATE
    currentPen: { style: 0, width: 1, color: "#000000" },
    currentBrush: { style: 0, color: "#ffffff", hatch: 0 },
    currentFont: null,
    objects: new Map(),
    pathData: "",
    inPath: false,
    transform: { m11: 1, m12: 0, m21: 0, m22: 1, dx: 0, dy: 0 },
  };

  const elements: string[] = [];
  offsetState.value = 0;

  // Process records
  while (offsetState.value < data.length) {
    const offset = offsetState.value;
    const recordType = view.getUint32(offset, true);
    const recordSize = view.getUint32(offset + 4, true);

    if (recordSize < 8 || offset + recordSize > data.length) {
      break;
    }

    const element = processRecord(view, offset, recordType, recordSize, state);
    if (element !== null) {
      elements.push(element);
    }

    if (recordType === EMR_EOF) {
      break;
    }

    offsetState.value += recordSize;
  }

  // Build SVG with frame-based viewBox for correct scaling
  const viewBox = `${header.frame.left} ${header.frame.top} ${viewBoxWidth} ${viewBoxHeight}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${boundsWidth}" height="${boundsHeight}" preserveAspectRatio="xMidYMid meet">${elements.join("")}</svg>`;
}

/**
 * Parse EMF header record
 */
function parseHeader(view: DataView, offset: number): EmfHeader | null {
  const recordType = view.getUint32(offset, true);
  if (recordType !== EMR_HEADER) {
    return null;
  }

  const bounds = {
    left: view.getInt32(offset + 8, true),
    top: view.getInt32(offset + 12, true),
    right: view.getInt32(offset + 16, true),
    bottom: view.getInt32(offset + 20, true),
  };

  const frame = {
    left: view.getInt32(offset + 24, true),
    top: view.getInt32(offset + 28, true),
    right: view.getInt32(offset + 32, true),
    bottom: view.getInt32(offset + 36, true),
  };

  const signature = view.getUint32(offset + 40, true);
  if (signature !== 0x464d4520) { // " EMF"
    return null;
  }

  return {
    bounds,
    frame,
    version: view.getUint32(offset + 44, true),
    size: view.getUint32(offset + 48, true),
    records: view.getUint32(offset + 52, true),
    handles: view.getUint16(offset + 56, true),
    description: "",
    deviceWidth: view.getUint32(offset + 64, true),
    deviceHeight: view.getUint32(offset + 68, true),
    millimetersWidth: view.getUint32(offset + 72, true),
    millimetersHeight: view.getUint32(offset + 76, true),
  };
}

/**
 * Process a single EMF record
 */
function processRecord(
  view: DataView,
  offset: number,
  recordType: number,
  recordSize: number,
  state: EmfState,
): string | null {
  switch (recordType) {
    case EMR_HEADER:
      return null;

    case EMR_EOF:
      return null;

    case EMR_SETWINDOWEXTEX:
      state.windowExt.x = view.getInt32(offset + 8, true);
      state.windowExt.y = view.getInt32(offset + 12, true);
      return null;

    case EMR_SETWINDOWORGEX:
      state.windowOrg.x = view.getInt32(offset + 8, true);
      state.windowOrg.y = view.getInt32(offset + 12, true);
      return null;

    case EMR_SETVIEWPORTEXTEX:
      state.viewportExt.x = view.getInt32(offset + 8, true);
      state.viewportExt.y = view.getInt32(offset + 12, true);
      return null;

    case EMR_SETVIEWPORTORGEX:
      state.viewportOrg.x = view.getInt32(offset + 8, true);
      state.viewportOrg.y = view.getInt32(offset + 12, true);
      return null;

    case EMR_SETTEXTCOLOR:
      state.textColor = parseColorRef(view, offset + 8);
      return null;

    case EMR_SETBKCOLOR:
      state.bkColor = parseColorRef(view, offset + 8);
      return null;

    case EMR_SETBKMODE:
      state.bkMode = view.getUint32(offset + 8, true);
      return null;

    case EMR_SETTEXTALIGN:
      state.textAlign = view.getUint32(offset + 8, true);
      return null;

    case EMR_SETPOLYFILLMODE:
      state.polyFillMode = view.getUint32(offset + 8, true);
      return null;

    case EMR_MOVETOEX:
      state.currentPos.x = view.getInt32(offset + 8, true);
      state.currentPos.y = view.getInt32(offset + 12, true);
      if (state.inPath) {
        state.pathData += `M${state.currentPos.x},${state.currentPos.y}`;
      }
      return null;

    case EMR_LINETO:
      return processLineTo(view, offset, state);

    case EMR_RECTANGLE:
      return processRectangle(view, offset, state);

    case EMR_ELLIPSE:
      return processEllipse(view, offset, state);

    case EMR_POLYGON:
      return processPolygon(view, offset, recordSize, state, false);

    case EMR_POLYGON16:
      return processPolygon16(view, offset, recordSize, state, false);

    case EMR_POLYLINE:
      return processPolygon(view, offset, recordSize, state, true);

    case EMR_POLYLINE16:
      return processPolygon16(view, offset, recordSize, state, true);

    case EMR_POLYPOLYGON:
      return processPolyPolygon(view, offset, recordSize, state);

    case EMR_POLYPOLYGON16:
      return processPolyPolygon16(view, offset, recordSize, state);

    case EMR_CREATEPEN:
      return processCreatePen(view, offset, state);

    case EMR_CREATEBRUSHINDIRECT:
      return processCreateBrush(view, offset, state);

    case EMR_EXTCREATEFONTINDIRECTW:
      return processCreateFont(view, offset, recordSize, state);

    case EMR_SELECTOBJECT:
      return processSelectObject(view, offset, state);

    case EMR_DELETEOBJECT:
      return processDeleteObject(view, offset, state);

    case EMR_BEGINPATH:
      state.inPath = true;
      state.pathData = "";
      return null;

    case EMR_ENDPATH:
      state.inPath = false;
      return null;

    case EMR_CLOSEFIGURE:
      state.pathData += "Z";
      return null;

    case EMR_FILLPATH:
      return processFillPath(state);

    case EMR_STROKEPATH:
      return processStrokePath(state);

    case EMR_STROKEANDFILLPATH:
      return processStrokeAndFillPath(state);

    case EMR_STRETCHDIBITS:
      return processStretchDIBits(view, offset);

    case EMR_BITBLT:
      return processBitBlt(view, offset);

    case EMR_EXTTEXTOUTW:
      return processExtTextOutW(view, offset, recordSize, state);

    case EMR_COMMENT:
      // EMF+ records are embedded in comments
      return processComment(view, offset);

    default:
      return null;
  }
}

// =============================================================================
// Record Processors
// =============================================================================

function parseColorRef(view: DataView, offset: number): string {
  const r = view.getUint8(offset);
  const g = view.getUint8(offset + 1);
  const b = view.getUint8(offset + 2);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function processLineTo(view: DataView, offset: number, state: EmfState): string | null {
  const x = view.getInt32(offset + 8, true);
  const y = view.getInt32(offset + 12, true);

  if (state.inPath) {
    state.pathData += `L${x},${y}`;
    state.currentPos.x = x;
    state.currentPos.y = y;
    return null;
  }

  const result = `<line x1="${state.currentPos.x}" y1="${state.currentPos.y}" x2="${x}" y2="${y}" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
  state.currentPos.x = x;
  state.currentPos.y = y;
  return result;
}

function processRectangle(view: DataView, offset: number, state: EmfState): string {
  const left = view.getInt32(offset + 8, true);
  const top = view.getInt32(offset + 12, true);
  const right = view.getInt32(offset + 16, true);
  const bottom = view.getInt32(offset + 20, true);

  const fill = state.currentBrush.style === 1 ? "none" : state.currentBrush.color;
  return `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="${fill}" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
}

function processEllipse(view: DataView, offset: number, state: EmfState): string {
  const left = view.getInt32(offset + 8, true);
  const top = view.getInt32(offset + 12, true);
  const right = view.getInt32(offset + 16, true);
  const bottom = view.getInt32(offset + 20, true);

  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const rx = (right - left) / 2;
  const ry = (bottom - top) / 2;

  const fill = state.currentBrush.style === 1 ? "none" : state.currentBrush.color;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
}

function processPolygon(
  view: DataView,
  offset: number,
  recordSize: number,
  state: EmfState,
  isPolyline: boolean,
): string | null {
  const count = view.getUint32(offset + 24, true);
  if (count < 2) {return null;}

  const points = readPointList(view, offset + 28, offset + recordSize, count, 8, (pointOffset) => ({
    x: view.getInt32(pointOffset, true),
    y: view.getInt32(pointOffset + 4, true),
  }));

  return renderPolygon(points, state, isPolyline);
}

function processPolygon16(
  view: DataView,
  offset: number,
  recordSize: number,
  state: EmfState,
  isPolyline: boolean,
): string | null {
  const count = view.getUint32(offset + 24, true);
  if (count < 2) {return null;}

  const points = readPointList(view, offset + 28, offset + recordSize, count, 4, (pointOffset) => ({
    x: view.getInt16(pointOffset, true),
    y: view.getInt16(pointOffset + 2, true),
  }));

  return renderPolygon(points, state, isPolyline);
}

function readPointList(
  view: DataView,
  startOffset: number,
  endOffset: number,
  count: number,
  stride: number,
  readPoint: (pointOffset: number) => Point,
): Point[] {
  const points: Point[] = [];
  const offsetState = { value: startOffset };
  range(count).some(() => {
    if (offsetState.value + stride > endOffset) {return true;}
    points.push(readPoint(offsetState.value));
    offsetState.value += stride;
    return false;
  });
  return points;
}

function renderPolygon(points: Point[], state: EmfState, isPolyline: boolean): string {
  const d = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join("");
  const closePath = isPolyline ? "" : "Z";
  const fill = isPolyline ? "none" : (state.currentBrush.style === 1 ? "none" : state.currentBrush.color);
  const fillRule = state.polyFillMode === 1 ? "evenodd" : "nonzero";
  return `<path d="${d}${closePath}" fill="${fill}" fill-rule="${fillRule}" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
}

function processPolyPolygon(view: DataView, offset: number, recordSize: number, state: EmfState): string | null {
  const numPolygons = view.getUint32(offset + 24, true);
  const totalPoints = view.getUint32(offset + 28, true);
  if (numPolygons === 0 || totalPoints === 0) {return null;}

  const { counts: polygonCounts, nextOffset } = readPolygonCounts(view, offset + 32, offset + recordSize, numPolygons);
  const d = buildPolyPolygonPath(
    view,
    nextOffset,
    offset + recordSize,
    polygonCounts,
    8,
    (pointOffset) => ({
      x: view.getInt32(pointOffset, true),
      y: view.getInt32(pointOffset + 4, true),
    }),
  );

  const fill = state.currentBrush.style === 1 ? "none" : state.currentBrush.color;
  const fillRule = state.polyFillMode === 1 ? "evenodd" : "nonzero";
  return `<path d="${d}" fill="${fill}" fill-rule="${fillRule}" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
}

function processPolyPolygon16(view: DataView, offset: number, recordSize: number, state: EmfState): string | null {
  const numPolygons = view.getUint32(offset + 24, true);
  const totalPoints = view.getUint32(offset + 28, true);
  if (numPolygons === 0 || totalPoints === 0) {return null;}

  const { counts: polygonCounts, nextOffset } = readPolygonCounts(view, offset + 32, offset + recordSize, numPolygons);
  const d = buildPolyPolygonPath(
    view,
    nextOffset,
    offset + recordSize,
    polygonCounts,
    4,
    (pointOffset) => ({
      x: view.getInt16(pointOffset, true),
      y: view.getInt16(pointOffset + 2, true),
    }),
  );

  const fill = state.currentBrush.style === 1 ? "none" : state.currentBrush.color;
  const fillRule = state.polyFillMode === 1 ? "evenodd" : "nonzero";
  return `<path d="${d}" fill="${fill}" fill-rule="${fillRule}" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
}

function readPolygonCounts(
  view: DataView,
  startOffset: number,
  endOffset: number,
  count: number,
): { counts: number[]; nextOffset: number } {
  const counts: number[] = [];
  const offsetState = { value: startOffset };
  range(count).some(() => {
    if (offsetState.value + 4 > endOffset) {return true;}
    counts.push(view.getUint32(offsetState.value, true));
    offsetState.value += 4;
    return false;
  });
  return { counts, nextOffset: offsetState.value };
}

function buildPolyPolygonPath(
  view: DataView,
  startOffset: number,
  endOffset: number,
  polygonCounts: readonly number[],
  stride: number,
  readPoint: (pointOffset: number) => Point,
): string {
  const offsetState = { value: startOffset };
  const segments: string[] = [];
  polygonCounts.forEach((count) => {
    const pointIndexState = { value: 0 };
    range(count).some(() => {
      if (offsetState.value + stride > endOffset) {return true;}
      const point = readPoint(offsetState.value);
      segments.push(pointIndexState.value === 0 ? `M${point.x},${point.y}` : `L${point.x},${point.y}`);
      pointIndexState.value += 1;
      offsetState.value += stride;
      return false;
    });
    segments.push("Z");
  });
  return segments.join("");
}

function processCreatePen(view: DataView, offset: number, state: EmfState): null {
  const index = view.getUint32(offset + 8, true);
  const style = view.getUint32(offset + 12, true);
  const width = view.getUint32(offset + 16, true);
  const color = parseColorRef(view, offset + 24);

  const normalizedWidth = width === 0 ? 1 : width;
  state.objects.set(index, { style, width: normalizedWidth, color });
  return null;
}

function processCreateBrush(view: DataView, offset: number, state: EmfState): null {
  const index = view.getUint32(offset + 8, true);
  const style = view.getUint32(offset + 12, true);
  const color = parseColorRef(view, offset + 16);
  const hatch = view.getUint32(offset + 20, true);

  state.objects.set(index, { style, color, hatch });
  return null;
}

function processCreateFont(view: DataView, offset: number, recordSize: number, state: EmfState): null {
  const index = view.getUint32(offset + 8, true);

  const height = view.getInt32(offset + 12, true);
  const width = view.getInt32(offset + 16, true);
  const weight = view.getUint32(offset + 28, true);
  const italic = view.getUint8(offset + 32) !== 0;
  const underline = view.getUint8(offset + 33) !== 0;
  const strikeOut = view.getUint8(offset + 34) !== 0;

  // Face name starts at offset 48, UTF-16LE
  const faceNameOffset = offset + 48;
  const faceChars: string[] = [];
  range(32).some((i) => {
    const charOffset = faceNameOffset + i * 2;
    if (charOffset + 2 > offset + recordSize) {return true;}
    const charCode = view.getUint16(charOffset, true);
    if (charCode === 0) {return true;}
    faceChars.push(String.fromCharCode(charCode));
    return false;
  });
  const faceName = faceChars.join("");

  state.objects.set(index, { height: Math.abs(height), width, weight, italic, underline, strikeOut, faceName });
  return null;
}

function processSelectObject(view: DataView, offset: number, state: EmfState): null {
  const index = view.getUint32(offset + 8, true);

  // Stock objects (high bit set)
  if (index & 0x80000000) {
    const stockId = index & 0x7fffffff;
    switch (stockId) {
      case 0: // WHITE_BRUSH
        state.currentBrush = { style: 0, color: "#ffffff", hatch: 0 };
        break;
      case 1: // LTGRAY_BRUSH
        state.currentBrush = { style: 0, color: "#c0c0c0", hatch: 0 };
        break;
      case 2: // GRAY_BRUSH
        state.currentBrush = { style: 0, color: "#808080", hatch: 0 };
        break;
      case 3: // DKGRAY_BRUSH
        state.currentBrush = { style: 0, color: "#404040", hatch: 0 };
        break;
      case 4: // BLACK_BRUSH
        state.currentBrush = { style: 0, color: "#000000", hatch: 0 };
        break;
      case 5: // NULL_BRUSH
        state.currentBrush = { style: 1, color: "none", hatch: 0 };
        break;
      case 6: // WHITE_PEN
        state.currentPen = { style: 0, width: 1, color: "#ffffff" };
        break;
      case 7: // BLACK_PEN
        state.currentPen = { style: 0, width: 1, color: "#000000" };
        break;
      case 8: // NULL_PEN
        state.currentPen = { style: 5, width: 0, color: "none" };
        break;
    }
    return null;
  }

  const obj = state.objects.get(index);
  if (isEmfPen(obj)) {
    state.currentPen = obj;
  } else if (isEmfBrush(obj)) {
    state.currentBrush = obj;
  } else if (isEmfFont(obj)) {
    state.currentFont = obj;
  }
  return null;
}

function processDeleteObject(view: DataView, offset: number, state: EmfState): null {
  const index = view.getUint32(offset + 8, true);
  state.objects.delete(index);
  return null;
}

function processFillPath(state: EmfState): string | null {
  if (state.pathData === "") {return null;}
  const fill = state.currentBrush.style === 1 ? "none" : state.currentBrush.color;
  const fillRule = state.polyFillMode === 1 ? "evenodd" : "nonzero";
  const result = `<path d="${state.pathData}" fill="${fill}" fill-rule="${fillRule}" stroke="none"/>`;
  state.pathData = "";
  return result;
}

function processStrokePath(state: EmfState): string | null {
  if (state.pathData === "") {return null;}
  const result = `<path d="${state.pathData}" fill="none" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
  state.pathData = "";
  return result;
}

function processStrokeAndFillPath(state: EmfState): string | null {
  if (state.pathData === "") {return null;}
  const fill = state.currentBrush.style === 1 ? "none" : state.currentBrush.color;
  const fillRule = state.polyFillMode === 1 ? "evenodd" : "nonzero";
  const result = `<path d="${state.pathData}" fill="${fill}" fill-rule="${fillRule}" stroke="${state.currentPen.color}" stroke-width="${state.currentPen.width}"/>`;
  state.pathData = "";
  return result;
}

function processStretchDIBits(view: DataView, offset: number): string | null {
  // DIB header offset
  const bmiOffset = view.getUint32(offset + 48, true);
  const bmiSize = view.getUint32(offset + 52, true);
  const bitsOffset = view.getUint32(offset + 56, true);
  const bitsSize = view.getUint32(offset + 60, true);

  if (bmiOffset === 0 || bitsOffset === 0 || bitsSize === 0) {
    return null;
  }

  const destX = view.getInt32(offset + 8, true);
  const destY = view.getInt32(offset + 12, true);
  const destW = view.getInt32(offset + 32, true);
  const destH = view.getInt32(offset + 36, true);

  // Read bitmap header
  const bmiStart = offset + bmiOffset;
  const biCompression = view.getUint32(bmiStart + 16, true);

  // Only handle uncompressed bitmaps
  if (biCompression !== 0 && biCompression !== 3) {
    return null;
  }

  // Extract DIB data and convert to PNG data URL
  const dibData = extractDIBToPng(view, offset + bmiOffset, bmiSize, offset + bitsOffset, bitsSize);
  if (dibData === null) {
    return null;
  }

  return `<image href="${dibData}" x="${destX}" y="${destY}" width="${destW}" height="${Math.abs(destH)}" preserveAspectRatio="none"/>`;
}

function processBitBlt(view: DataView, offset: number): string | null {
  const bmiOffset = view.getUint32(offset + 84, true);
  const bmiSize = view.getUint32(offset + 88, true);
  const bitsOffset = view.getUint32(offset + 92, true);
  const bitsSize = view.getUint32(offset + 96, true);

  if (bmiOffset === 0 || bitsOffset === 0 || bitsSize === 0) {
    return null;
  }

  const destX = view.getInt32(offset + 8, true);
  const destY = view.getInt32(offset + 12, true);
  const destW = view.getInt32(offset + 16, true);
  const destH = view.getInt32(offset + 20, true);

  const dibData = extractDIBToPng(view, offset + bmiOffset, bmiSize, offset + bitsOffset, bitsSize);
  if (dibData === null) {
    return null;
  }

  return `<image href="${dibData}" x="${destX}" y="${destY}" width="${destW}" height="${destH}" preserveAspectRatio="none"/>`;
}

function extractDIBToPng(
  view: DataView,
  bmiOffset: number,
  bmiSize: number,
  bitsOffset: number,
  bitsSize: number,
): string | null {
  // Read BITMAPINFOHEADER
  const biCompression = view.getUint32(bmiOffset + 16, true);

  if (biCompression !== 0 && biCompression !== 3) {
    return null;
  }

  // For now, just embed as BMP data URL (browsers can handle some BMPs)
  // A full implementation would convert to PNG
  const bmpHeader = new Uint8Array(14);
  const bmpView = new DataView(bmpHeader.buffer);
  bmpView.setUint16(0, 0x4d42, true); // 'BM'
  bmpView.setUint32(2, 14 + bmiSize + bitsSize, true);
  bmpView.setUint32(10, 14 + bmiSize, true);

  const bmpData = new Uint8Array(14 + bmiSize + bitsSize);
  bmpData.set(bmpHeader);
  bmpData.set(new Uint8Array(view.buffer, view.byteOffset + bmiOffset, bmiSize), 14);
  bmpData.set(new Uint8Array(view.buffer, view.byteOffset + bitsOffset, bitsSize), 14 + bmiSize);

  const base64 = base64ArrayBuffer(bmpData.buffer);
  return `data:image/bmp;base64,${base64}`;
}

function processExtTextOutW(
  view: DataView,
  offset: number,
  recordSize: number,
  state: EmfState,
): string | null {
  const x = view.getInt32(offset + 24, true);
  const y = view.getInt32(offset + 28, true);
  const stringLen = view.getUint32(offset + 32, true);
  const stringOffset = view.getUint32(offset + 36, true);

  if (stringLen === 0 || stringOffset === 0) {
    return null;
  }

  // Read UTF-16LE string
  const textStart = offset + stringOffset;
  const textChars: string[] = [];
  range(stringLen).some((i) => {
    const charOffset = textStart + i * 2;
    if (charOffset + 2 > offset + recordSize) {return true;}
    const charCode = view.getUint16(charOffset, true);
    textChars.push(String.fromCharCode(charCode));
    return false;
  });
  const text = textChars.join("");

  const fontSize = state.currentFont?.height ?? 12;
  const fontFamily = state.currentFont?.faceName ?? "sans-serif";
  const fontWeight = (state.currentFont?.weight ?? 400) >= 700 ? "bold" : "normal";
  const fontStyle = state.currentFont?.italic ? "italic" : "normal";

  // Text anchor based on alignment
  const textAnchor = resolveTextAnchor(state.textAlign);

  const escapedText = escapeXml(text);
  return `<text x="${x}" y="${y}" fill="${state.textColor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${textAnchor}">${escapedText}</text>`;
}

function processComment(
  view: DataView,
  offset: number,
): string | null {
  // Check for EMF+ signature
  const dataSize = view.getUint32(offset + 8, true);
  if (dataSize < 4) {return null;}

  const signature = view.getUint32(offset + 12, true);
  if (signature === 0x2b464d45) { // "EMF+"
    // This is EMF+ data - for now we skip it
    // A full implementation would parse EMF+ records
    return null;
  }

  return null;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveTextAnchor(textAlign: number): "start" | "middle" | "end" {
  const hAlign = textAlign & 0x06;
  if (hAlign === 2) {return "end";}
  if (hAlign === 6) {return "middle";}
  return "start";
}

function isEmfPen(obj: GdiObject | undefined): obj is EmfPen {
  if (!obj) {return false;}
  return "width" in obj && "style" in obj && !("hatch" in obj);
}

function isEmfBrush(obj: GdiObject | undefined): obj is EmfBrush {
  if (!obj) {return false;}
  return "hatch" in obj;
}

function isEmfFont(obj: GdiObject | undefined): obj is EmfFont {
  if (!obj) {return false;}
  return "faceName" in obj;
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}
