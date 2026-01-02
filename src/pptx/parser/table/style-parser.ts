/**
 * @file Table style parser
 *
 * Parses DrawingML table styles from a:tblStyleLst.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.2
 */

import type { CellBorders, TablePartStyle, TableStyle } from "../../domain/table";
import { getAttr, getChild, getChildren, type XmlElement } from "../../../xml/index";
import { parseFillFromParent } from "../graphics/fill-parser";
import { parseLine } from "../graphics/line-parser";
import { parseFontReference, parseStyleReference } from "../shape-parser/style";
import { parseCell3d } from "../cell3d-parser";

export type TableStyleList = {
  readonly defaultStyleId?: string;
  readonly styles: readonly TableStyle[];
};

function parseTableCellBorders(tcBdr: XmlElement | undefined): CellBorders | undefined {
  if (!tcBdr) {return undefined;}

  const left = parseLine(getChild(tcBdr, "a:left"));
  const right = parseLine(getChild(tcBdr, "a:right"));
  const top = parseLine(getChild(tcBdr, "a:top"));
  const bottom = parseLine(getChild(tcBdr, "a:bottom"));
  const insideH = parseLine(getChild(tcBdr, "a:insideH"));
  const insideV = parseLine(getChild(tcBdr, "a:insideV"));
  const tlToBr = parseLine(getChild(tcBdr, "a:tl2br"));
  const blToTr = parseLine(getChild(tcBdr, "a:tr2bl"));

  if (
    !left &&
    !right &&
    !top &&
    !bottom &&
    !insideH &&
    !insideV &&
    !tlToBr &&
    !blToTr
  ) {
    return undefined;
  }

  return {
    left: left ?? undefined,
    right: right ?? undefined,
    top: top ?? undefined,
    bottom: bottom ?? undefined,
    insideH: insideH ?? undefined,
    insideV: insideV ?? undefined,
    tlToBr: tlToBr ?? undefined,
    blToTr: blToTr ?? undefined,
  };
}

function parseTableCellStyle(tcStyle: XmlElement | undefined): TablePartStyle | undefined {
  if (!tcStyle) {return undefined;}

  const fillContainer = getChild(tcStyle, "a:fill");
  const fill = fillContainer ? parseFillFromParent(fillContainer) : undefined;
  const fillRef = parseStyleReference(getChild(tcStyle, "a:fillRef"));
  const borders = parseTableCellBorders(getChild(tcStyle, "a:tcBdr"));
  const cell3d = parseCell3d(getChild(tcStyle, "a:cell3D"));

  if (!fill && !fillRef && !borders && !cell3d) {return undefined;}

  return {
    fill,
    fillReference: fillRef ? { index: fillRef.index, color: fillRef.color } : undefined,
    borders,
    cell3d,
  };
}

function parseTableCellTextStyle(tcTxStyle: XmlElement | undefined): TablePartStyle["textProperties"] {
  if (!tcTxStyle) {return undefined;}

  const fontReference = parseFontReference(getChild(tcTxStyle, "a:fontRef"));
  if (!fontReference) {return undefined;}

  return { fontReference };
}

function parseTablePartStyle(part: XmlElement | undefined): TablePartStyle | undefined {
  if (!part) {return undefined;}

  const tcStyle = parseTableCellStyle(getChild(part, "a:tcStyle"));
  const textProperties = parseTableCellTextStyle(getChild(part, "a:tcTxStyle"));

  if (!tcStyle && !textProperties) {return undefined;}

  return {
    ...tcStyle,
    textProperties,
  };
}

function parseTableStyle(element: XmlElement): TableStyle | undefined {
  const styleId = getAttr(element, "styleId");
  if (!styleId) {return undefined;}

  return {
    id: styleId,
    name: getAttr(element, "styleName"),
    tblBg: parseFillFromParent(getChild(element, "a:tblBg")),
    wholeTbl: parseTablePartStyle(getChild(element, "a:wholeTbl")),
    band1H: parseTablePartStyle(getChild(element, "a:band1H")),
    band2H: parseTablePartStyle(getChild(element, "a:band2H")),
    band1V: parseTablePartStyle(getChild(element, "a:band1V")),
    band2V: parseTablePartStyle(getChild(element, "a:band2V")),
    firstCol: parseTablePartStyle(getChild(element, "a:firstCol")),
    lastCol: parseTablePartStyle(getChild(element, "a:lastCol")),
    firstRow: parseTablePartStyle(getChild(element, "a:firstRow")),
    lastRow: parseTablePartStyle(getChild(element, "a:lastRow")),
    seCell: parseTablePartStyle(getChild(element, "a:seCell")),
    swCell: parseTablePartStyle(getChild(element, "a:swCell")),
    neCell: parseTablePartStyle(getChild(element, "a:neCell")),
    nwCell: parseTablePartStyle(getChild(element, "a:nwCell")),
  };
}






/**
 * Parse table style list (a:tblStyleLst).
 */
export function parseTableStyleList(tblStyleLst: XmlElement | undefined): TableStyleList | undefined {
  if (!tblStyleLst) {return undefined;}

  const styles: TableStyle[] = [];
  for (const tblStyle of getChildren(tblStyleLst, "a:tblStyle")) {
    const parsed = parseTableStyle(tblStyle);
    if (parsed) {styles.push(parsed);}
  }

  return {
    defaultStyleId: getAttr(tblStyleLst, "def"),
    styles,
  };
}
