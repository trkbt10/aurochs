/** @file Table serializer for a:tbl element */
import { createElement, type XmlElement } from "@aurochs/xml";
import type {
  Table,
  TableCell,
  TableCellProperties,
  TableProperties,
  CellBorders,
} from "@aurochs-office/pptx/domain/table/types";
import { ooxmlBool, ooxmlEmu } from "@aurochs-builder/core";
import { serializeFill } from "./fill";
import { serializeEffects } from "./effects";
import { serializeDrawingTextBody } from "./text";
import { serializeLine } from "./line";

function serializeTableProperties(props: TableProperties): XmlElement {
  const attrs: Record<string, string> = {};
  if (props.rtl !== undefined) {
    attrs.rtl = ooxmlBool(props.rtl);
  }
  if (props.firstRow !== undefined) {
    attrs.firstRow = ooxmlBool(props.firstRow);
  }
  if (props.firstCol !== undefined) {
    attrs.firstCol = ooxmlBool(props.firstCol);
  }
  if (props.lastRow !== undefined) {
    attrs.lastRow = ooxmlBool(props.lastRow);
  }
  if (props.lastCol !== undefined) {
    attrs.lastCol = ooxmlBool(props.lastCol);
  }
  if (props.bandRow !== undefined) {
    attrs.bandRow = ooxmlBool(props.bandRow);
  }
  if (props.bandCol !== undefined) {
    attrs.bandCol = ooxmlBool(props.bandCol);
  }

  const children: XmlElement[] = [];
  if (props.fill) {
    children.push(serializeFill(props.fill));
  }
  if (props.effects) {
    const eff = serializeEffects(props.effects);
    if (eff) {
      children.push(eff);
    }
  }
  if (props.tableStyleId) {
    children.push(createElement("a:tableStyleId", {}, [{ type: "text", value: props.tableStyleId }]));
  }

  return createElement("a:tblPr", attrs, children);
}

function serializeCellAnchor(anchor: TableCellProperties["anchor"]): string | undefined {
  if (!anchor) {
    return undefined;
  }
  if (anchor === "top") {
    return "t";
  }
  if (anchor === "center") {
    return "ctr";
  }
  return "b";
}

function serializeCellBorders(borders: CellBorders): XmlElement[] {
  const out: XmlElement[] = [];

  // Table borders are line elements with specialized names (a:lnL, a:lnR, ...).
  // Reuse the standard line serializer and swap the element name.
  const withName = (name: string, line: NonNullable<CellBorders[keyof CellBorders]>): XmlElement => {
    const base = serializeLine(line);
    return createElement(name, base.attrs, base.children as XmlElement[]);
  };

  if (borders.left) {
    out.push(withName("a:lnL", borders.left));
  }
  if (borders.right) {
    out.push(withName("a:lnR", borders.right));
  }
  if (borders.top) {
    out.push(withName("a:lnT", borders.top));
  }
  if (borders.bottom) {
    out.push(withName("a:lnB", borders.bottom));
  }
  if (borders.tlToBr) {
    out.push(withName("a:lnTlToBr", borders.tlToBr));
  }
  if (borders.blToTr) {
    out.push(withName("a:lnBlToTr", borders.blToTr));
  }

  return out;
}

function serializeTableCellProperties(props: TableCellProperties): XmlElement {
  const attrs: Record<string, string> = {};

  if (props.margins) {
    attrs.marL = ooxmlEmu(props.margins.left);
    attrs.marR = ooxmlEmu(props.margins.right);
    attrs.marT = ooxmlEmu(props.margins.top);
    attrs.marB = ooxmlEmu(props.margins.bottom);
  }

  const anchor = serializeCellAnchor(props.anchor);
  if (anchor) {
    attrs.anchor = anchor;
  }
  if (props.anchorCenter !== undefined) {
    attrs.anchorCtr = ooxmlBool(props.anchorCenter);
  }
  if (props.horzOverflow) {
    attrs.horzOverflow = props.horzOverflow;
  }
  if (props.verticalType) {
    attrs.vert = props.verticalType;
  }

  if (props.rowSpan !== undefined) {
    attrs.rowSpan = String(props.rowSpan);
  }
  if (props.colSpan !== undefined) {
    attrs.gridSpan = String(props.colSpan);
  }
  if (props.horizontalMerge) {
    attrs.hMerge = "1";
  }
  if (props.verticalMerge) {
    attrs.vMerge = "1";
  }

  const children: XmlElement[] = [];
  if (props.borders) {
    children.push(...serializeCellBorders(props.borders));
  }
  if (props.fill) {
    children.push(serializeFill(props.fill));
  }

  return createElement("a:tcPr", attrs, children);
}

function createEmptyTxBody(): XmlElement {
  return createElement("a:txBody", {}, [createElement("a:bodyPr"), createElement("a:lstStyle"), createElement("a:p")]);
}

function serializeTableCell(cell: TableCell): XmlElement {
  const attrs: Record<string, string> = {};
  if (cell.id) {
    attrs.id = cell.id;
  }

  const txBody = cell.textBody ? serializeDrawingTextBody(cell.textBody) : createEmptyTxBody();
  const tcPr = serializeTableCellProperties(cell.properties);

  return createElement("a:tc", attrs, [txBody, tcPr]);
}

/** Serialize a table to a:tbl element */
export function serializeDrawingTable(table: Table): XmlElement {
  const tblGrid = createElement(
    "a:tblGrid",
    {},
    table.grid.columns.map((c) => createElement("a:gridCol", { w: ooxmlEmu(c.width) })),
  );

  const rows = table.rows.map((r) => createElement("a:tr", { h: ooxmlEmu(r.height) }, r.cells.map(serializeTableCell)));

  return createElement("a:tbl", {}, [serializeTableProperties(table.properties), tblGrid, ...rows]);
}
