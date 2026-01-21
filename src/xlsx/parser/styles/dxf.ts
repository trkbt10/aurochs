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
import { parseIntAttr } from "../primitive";
import type { XmlElement } from "../../../xml";
import { getAttr, getChild, getChildren } from "../../../xml";
import { parseFill } from "./fill";
import { parseBorder } from "./border";

function parseDxfNumberFormat(numFmtEl: XmlElement): XlsxNumberFormat {
  const id = parseIntAttr(getAttr(numFmtEl, "numFmtId")) ?? 0;
  const formatCode = getAttr(numFmtEl, "formatCode") ?? "";
  return { numFmtId: numFmtId(id), formatCode };
}

function parseDxf(dxfEl: XmlElement): XlsxDifferentialFormat {
  const numFmtEl = getChild(dxfEl, "numFmt");
  const fillEl = getChild(dxfEl, "fill");
  const borderEl = getChild(dxfEl, "border");

  return {
    numFmt: numFmtEl ? parseDxfNumberFormat(numFmtEl) : undefined,
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

