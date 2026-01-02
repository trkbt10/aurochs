/**
 * @file Title and legend parsing for charts
 *
 * @see ECMA-376 Part 1, Section 21.2.2.201 (title)
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 */

import type { ChartTitle, Legend, LegendEntry } from "../../domain/chart";
import { getChild, getChildren, getAttr as xmlGetAttr, type XmlElement } from "../../../xml";
import { getIntAttr, getBoolAttr } from "../primitive";

/**
 * Safe getAttr that handles undefined elements
 */
function getAttr(element: XmlElement | undefined, name: string): string | undefined {
  if (!element) {return undefined;}
  return xmlGetAttr(element, name);
}
import { parseChartShapeProperties } from "./shape-properties";
import { parseLayout } from "./layout";
import { parseTextBody } from "../text/text-parser";
import { mapLegendPosition } from "./mapping";

/**
 * Parse chart title (c:title)
 * @see ECMA-376 Part 1, Section 21.2.2.201 (title)
 */
export function parseChartTitle(titleElement: XmlElement | undefined): ChartTitle | undefined {
  if (!titleElement) {return undefined;}

  const overlayEl = getChild(titleElement, "c:overlay");
  const txElement = getChild(titleElement, "c:tx");
  const txPr = txElement ? getChild(txElement, "c:rich") : undefined;
  const layoutEl = getChild(titleElement, "c:layout");

  return {
    textBody: txPr ? parseTextBody(txPr) : undefined,
    layout: parseLayout(layoutEl),
    overlay: overlayEl ? getBoolAttr(overlayEl, "val") : undefined,
    shapeProperties: parseChartShapeProperties(getChild(titleElement, "c:spPr")),
  };
}

/**
 * Parse legend entry (c:legendEntry)
 *
 * Allows per-entry formatting overrides and deletion of specific legend items.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 */
export function parseLegendEntry(entryEl: XmlElement): LegendEntry {
  const idxEl = getChild(entryEl, "c:idx");
  const deleteEl = getChild(entryEl, "c:delete");
  const txPrEl = getChild(entryEl, "c:txPr");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    delete: deleteEl ? getBoolAttr(deleteEl, "val") : undefined,
    textProperties: txPrEl ? parseTextBody(txPrEl) : undefined,
  };
}

/**
 * Parse legend (c:legend)
 *
 * Parses c:txPr (text properties) for legend text styling.
 * Parses c:legendEntry elements for per-entry formatting.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.94 (legend)
 * @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr) - text properties
 */
export function parseLegend(legendElement: XmlElement | undefined): Legend | undefined {
  if (!legendElement) {return undefined;}

  const legendPosEl = getChild(legendElement, "c:legendPos");
  const overlayEl = getChild(legendElement, "c:overlay");
  const txPrEl = getChild(legendElement, "c:txPr");

  // Parse legend entries for per-entry formatting
  // @see ECMA-376 Part 1, Section 21.2.2.92 (legendEntry)
  const entryElements = getChildren(legendElement, "c:legendEntry");
  const entries = entryElements.length > 0 ? entryElements.map(parseLegendEntry) : undefined;

  return {
    position: mapLegendPosition(getAttr(legendPosEl, "val")),
    layout: parseLayout(getChild(legendElement, "c:layout")),
    overlay: overlayEl ? getBoolAttr(overlayEl, "val") : undefined,
    shapeProperties: parseChartShapeProperties(getChild(legendElement, "c:spPr")),
    textProperties: txPrEl ? parseTextBody(txPrEl) : undefined,
    entries,
  };
}
