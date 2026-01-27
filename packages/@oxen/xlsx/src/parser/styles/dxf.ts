/**
 * @file Differential format (DXF) parser for styles.xml
 *
 * Parses the `<dxfs>` collection used by conditional formatting rules (`cfRule/@dxfId`).
 *
 * This intentionally supports a subset used by our rendering pipeline:
 * - numFmt (formatCode)
 * - fill (patternFill)
 * - border
 *
 * Additional DXF components (font, alignment, protection) can be added as needed.
 *
 * @see ECMA-376 Part 4, Section 18.8.18 (dxfs)
 * @see ECMA-376 Part 4, Section 18.8.14 (dxf)
 */

import type { XlsxDifferentialFormat } from "../../domain/style/dxf";
import type { XlsxNumberFormat } from "../../domain/style/number-format";
import { numFmtId } from "../../domain/types";
import { parseBooleanAttr, parseFloatAttr, parseIntAttr } from "../primitive";
import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getChildren } from "@oxen/xml";
import { parseFill } from "./fill";
import { parseBorder } from "./border";
import { parseColor } from "./font";
import type { UnderlineStyle } from "../../domain/style/font";

function parseDxfNumberFormat(numFmtEl: XmlElement): XlsxNumberFormat {
  const id = parseIntAttr(getAttr(numFmtEl, "numFmtId")) ?? 0;
  const formatCode = getAttr(numFmtEl, "formatCode") ?? "";
  return { numFmtId: numFmtId(id), formatCode };
}

function parseBoolElement(el: XmlElement | undefined): boolean | undefined {
  if (!el) {
    return undefined;
  }
  const val = getAttr(el, "val");
  if (val === undefined) {
    return true;
  }
  return parseBooleanAttr(val);
}

function parseUnderlineElement(uEl: XmlElement | undefined): UnderlineStyle | undefined {
  if (!uEl) {
    return undefined;
  }
  const uVal = getAttr(uEl, "val");
  if (uVal === undefined) {
    return "single";
  }
  return uVal as UnderlineStyle;
}

function parseDxfFont(fontEl: XmlElement) {
  const nameEl = getChild(fontEl, "name");
  const szEl = getChild(fontEl, "sz");
  const bEl = getChild(fontEl, "b");
  const iEl = getChild(fontEl, "i");
  const uEl = getChild(fontEl, "u");
  const strikeEl = getChild(fontEl, "strike");
  const colorEl = getChild(fontEl, "color");

  return {
    name: nameEl ? getAttr(nameEl, "val") ?? undefined : undefined,
    size: parseFloatAttr(szEl ? getAttr(szEl, "val") : undefined),
    bold: parseBoolElement(bEl),
    italic: parseBoolElement(iEl),
    underline: parseUnderlineElement(uEl),
    strikethrough: parseBoolElement(strikeEl),
    color: colorEl ? parseColor(colorEl) : undefined,
  };
}

function parseDxf(dxfEl: XmlElement): XlsxDifferentialFormat {
  const numFmtEl = getChild(dxfEl, "numFmt");
  const fontEl = getChild(dxfEl, "font");
  const fillEl = getChild(dxfEl, "fill");
  const borderEl = getChild(dxfEl, "border");

  return {
    numFmt: numFmtEl ? parseDxfNumberFormat(numFmtEl) : undefined,
    font: fontEl ? parseDxfFont(fontEl) : undefined,
    fill: fillEl ? parseFill(fillEl) : undefined,
    border: borderEl ? parseBorder(borderEl) : undefined,
  };
}

/**
 * Parse `<dxfs>` from styles.xml.
 *
 * Returns an array whose indices correspond to `cfRule/@dxfId`.
 */
export function parseDxfs(dxfsEl: XmlElement | undefined): readonly XlsxDifferentialFormat[] {
  if (!dxfsEl) {
    return [];
  }
  return getChildren(dxfsEl, "dxf").map(parseDxf);
}
