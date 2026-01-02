/**
 * @file Chart space and 3D chart parsing
 *
 * Parses chart-space level options (print settings, protection, pivot source)
 * and 3D chart elements (view3D, walls, data table).
 */

import type {
  View3D,
  ChartSurface,
  PictureOptions,
  PictureFormat,
  DataTable,
  PivotSource,
  PivotFormat,
  PivotFormats,
  ChartProtection,
  HeaderFooter,
  PageMargins,
  PageSetup,
  PrintSettings,
} from "../../domain/chart";
import { getChild, getChildren, getAttr as xmlGetAttr, getXmlText, type XmlElement } from "../../../xml";
import { deg } from "../../domain/types";
import { parseBoolean, parseFloat64, parseInt32, getBoolAttr, getIntAttr } from "../primitive";
import { parseChartShapeProperties } from "./shape-properties";
import { parseTextBody } from "../text/text-parser";
import { parseMarker, parseDataLabel } from "./components";
import { getChartPercentAttr } from "./percent";

function getAttr(element: XmlElement | undefined, name: string): string | undefined {
  if (!element) {return undefined;}
  return xmlGetAttr(element, name);
}

function parseRotation(el: XmlElement | undefined): ReturnType<typeof deg> | undefined {
  const raw = getAttr(el, "val");
  if (!raw) {return undefined;}
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) {return undefined;}
  return deg(parsed);
}






/**
 * Parse 3D view settings (c:view3D).
 */
export function parseView3D(view3d: XmlElement | undefined): View3D | undefined {
  if (!view3d) {return undefined;}

  return {
    rotX: parseRotation(getChild(view3d, "c:rotX")),
    hPercent: getChartPercentAttr(getChild(view3d, "c:hPercent"), "val"),
    rotY: parseRotation(getChild(view3d, "c:rotY")),
    depthPercent: getChartPercentAttr(getChild(view3d, "c:depthPercent"), "val"),
    rAngAx: getBoolAttr(getChild(view3d, "c:rAngAx"), "val"),
    perspective: getIntAttr(getChild(view3d, "c:perspective"), "val"),
  };
}






/**
 * Parse picture options (c:pictureOptions).
 */
export function parsePictureOptions(el: XmlElement | undefined): PictureOptions | undefined {
  if (!el) {return undefined;}

  const pictureFormatEl = getChild(el, "c:pictureFormat");
  const pictureStackUnitEl = getChild(el, "c:pictureStackUnit");

  return {
    applyToFront: getBoolAttr(getChild(el, "c:applyToFront"), "val"),
    applyToSides: getBoolAttr(getChild(el, "c:applyToSides"), "val"),
    applyToEnd: getBoolAttr(getChild(el, "c:applyToEnd"), "val"),
    pictureFormat: (getAttr(pictureFormatEl, "val") as PictureFormat) ?? undefined,
    pictureStackUnit: parseFloat64(getAttr(pictureStackUnitEl, "val")),
  };
}






/**
 * Parse chart surface (c:floor, c:sideWall, c:backWall).
 */
export function parseChartSurface(el: XmlElement | undefined): ChartSurface | undefined {
  if (!el) {return undefined;}

  return {
    thickness: getChartPercentAttr(getChild(el, "c:thickness"), "val"),
    shapeProperties: parseChartShapeProperties(getChild(el, "c:spPr")),
    pictureOptions: parsePictureOptions(getChild(el, "c:pictureOptions")),
  };
}






/**
 * Parse data table (c:dTable).
 */
export function parseDataTable(el: XmlElement | undefined): DataTable | undefined {
  if (!el) {return undefined;}

  const txPrEl = getChild(el, "c:txPr");

  return {
    showHorzBorder: getBoolAttr(getChild(el, "c:showHorzBorder"), "val"),
    showVertBorder: getBoolAttr(getChild(el, "c:showVertBorder"), "val"),
    showOutline: getBoolAttr(getChild(el, "c:showOutline"), "val"),
    showKeys: getBoolAttr(getChild(el, "c:showKeys"), "val"),
    shapeProperties: parseChartShapeProperties(getChild(el, "c:spPr")),
    textProperties: txPrEl ? parseTextBody(txPrEl) : undefined,
  };
}






/**
 * Parse pivot source (c:pivotSource).
 */
export function parsePivotSource(el: XmlElement | undefined): PivotSource | undefined {
  if (!el) {return undefined;}

  const nameEl = getChild(el, "c:name");
  const fmtIdEl = getChild(el, "c:fmtId");
  const name = nameEl ? getXmlText(nameEl) : undefined;
  const fmtId = fmtIdEl ? getIntAttr(fmtIdEl, "val") : undefined;

  if (!name || fmtId === undefined) {return undefined;}

  return {
    name,
    fmtId,
  };
}






/**
 * Parse pivot format (c:pivotFmt).
 */
export function parsePivotFormat(el: XmlElement): PivotFormat | undefined {
  const idxEl = getChild(el, "c:idx");
  if (!idxEl) {return undefined;}

  const idx = getIntAttr(idxEl, "val") ?? 0;
  const txPrEl = getChild(el, "c:txPr");

  return {
    idx,
    shapeProperties: parseChartShapeProperties(getChild(el, "c:spPr")),
    textProperties: txPrEl ? parseTextBody(txPrEl) : undefined,
    marker: parseMarker(getChild(el, "c:marker")),
    dataLabel: parseDataLabel(getChild(el, "c:dLbl")),
  };
}






/**
 * Parse pivot formats list (c:pivotFmts).
 */
export function parsePivotFormats(el: XmlElement | undefined): PivotFormats | undefined {
  if (!el) {return undefined;}

  const formats = getChildren(el, "c:pivotFmt")
    .map(parsePivotFormat)
    .filter((format): format is PivotFormat => Boolean(format));

  if (formats.length === 0) {return undefined;}

  return { formats };
}






/**
 * Parse chart protection (c:protection).
 */
export function parseProtection(el: XmlElement | undefined): ChartProtection | undefined {
  if (!el) {return undefined;}

  return {
    chartObject: getBoolAttr(getChild(el, "c:chartObject"), "val"),
    data: getBoolAttr(getChild(el, "c:data"), "val"),
    formatting: getBoolAttr(getChild(el, "c:formatting"), "val"),
    selection: getBoolAttr(getChild(el, "c:selection"), "val"),
    userInterface: getBoolAttr(getChild(el, "c:userInterface"), "val"),
  };
}






/**
 * Parse header/footer (c:headerFooter).
 */
export function parseHeaderFooter(el: XmlElement | undefined): HeaderFooter | undefined {
  if (!el) {return undefined;}

  const oddHeaderEl = getChild(el, "c:oddHeader");
  const oddFooterEl = getChild(el, "c:oddFooter");
  const evenHeaderEl = getChild(el, "c:evenHeader");
  const evenFooterEl = getChild(el, "c:evenFooter");
  const firstHeaderEl = getChild(el, "c:firstHeader");
  const firstFooterEl = getChild(el, "c:firstFooter");

  return {
    oddHeader: oddHeaderEl ? getXmlText(oddHeaderEl) : undefined,
    oddFooter: oddFooterEl ? getXmlText(oddFooterEl) : undefined,
    evenHeader: evenHeaderEl ? getXmlText(evenHeaderEl) : undefined,
    evenFooter: evenFooterEl ? getXmlText(evenFooterEl) : undefined,
    firstHeader: firstHeaderEl ? getXmlText(firstHeaderEl) : undefined,
    firstFooter: firstFooterEl ? getXmlText(firstFooterEl) : undefined,
    alignWithMargins: parseBoolean(getAttr(el, "alignWithMargins")),
    differentOddEven: parseBoolean(getAttr(el, "differentOddEven")),
    differentFirst: parseBoolean(getAttr(el, "differentFirst")),
  };
}






/**
 * Parse page margins (c:pageMargins).
 */
export function parsePageMargins(el: XmlElement | undefined): PageMargins | undefined {
  if (!el) {return undefined;}

  const left = parseFloat64(getAttr(el, "l"));
  const right = parseFloat64(getAttr(el, "r"));
  const top = parseFloat64(getAttr(el, "t"));
  const bottom = parseFloat64(getAttr(el, "b"));
  const header = parseFloat64(getAttr(el, "header"));
  const footer = parseFloat64(getAttr(el, "footer"));

  if ([left, right, top, bottom, header, footer].some((value) => value === undefined)) {return undefined;}

  return {
    left: left ?? 0,
    right: right ?? 0,
    top: top ?? 0,
    bottom: bottom ?? 0,
    header: header ?? 0,
    footer: footer ?? 0,
  };
}






/**
 * Parse page setup (c:pageSetup).
 */
export function parsePageSetup(el: XmlElement | undefined): PageSetup | undefined {
  if (!el) {return undefined;}

  return {
    paperSize: parseInt32(getAttr(el, "paperSize")),
    paperHeight: parseFloat64(getAttr(el, "paperHeight")),
    paperWidth: parseFloat64(getAttr(el, "paperWidth")),
    firstPageNumber: parseInt32(getAttr(el, "firstPageNumber")),
    orientation: getAttr(el, "orientation") as PageSetup["orientation"],
    blackAndWhite: parseBoolean(getAttr(el, "blackAndWhite")),
    draft: parseBoolean(getAttr(el, "draft")),
    useFirstPageNumber: parseBoolean(getAttr(el, "useFirstPageNumber")),
    horizontalDpi: parseInt32(getAttr(el, "horizontalDpi")),
    verticalDpi: parseInt32(getAttr(el, "verticalDpi")),
    copies: parseInt32(getAttr(el, "copies")),
  };
}






/**
 * Parse print settings (c:printSettings).
 */
export function parsePrintSettings(el: XmlElement | undefined): PrintSettings | undefined {
  if (!el) {return undefined;}

  return {
    headerFooter: parseHeaderFooter(getChild(el, "c:headerFooter")),
    pageMargins: parsePageMargins(getChild(el, "c:pageMargins")),
    pageSetup: parsePageSetup(getChild(el, "c:pageSetup")),
  };
}






/**
 * Parse user shapes relationship id (c:userShapes).
 */
export function parseUserShapesRelId(el: XmlElement | undefined): string | undefined {
  if (!el) {return undefined;}
  return getAttr(el, "r:id");
}
