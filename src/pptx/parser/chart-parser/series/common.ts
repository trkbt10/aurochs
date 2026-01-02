/**
 * @file Common series parsing utilities
 *
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */

import type { XmlElement } from "../../../../xml";
import { getChild } from "../../../../xml";
import { getIntAttr, getBoolAttr } from "../../primitive";
import { parseSeriesText, parseDataReference } from "../data-reference";
import { parseChartShapeProperties } from "../shape-properties";
import { parseMarker, parseDataPoints, parseTrendlines, parseErrorBars } from "../components";

/**
 * Common series properties
 */
export type BaseSeriesProperties = {
  idx: number;
  order: number;
  tx: ReturnType<typeof parseSeriesText>;
  shapeProperties: ReturnType<typeof parseChartShapeProperties>;
}

/**
 * Parse common series properties
 */
export function parseBaseSeriesProperties(ser: XmlElement): BaseSeriesProperties {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");

  return {
    idx: idxEl ? getIntAttr(idxEl, "val") ?? 0 : 0,
    order: orderEl ? getIntAttr(orderEl, "val") ?? 0 : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
  };
}

// Re-export commonly used functions
export {
  parseSeriesText,
  parseDataReference,
  parseChartShapeProperties,
  parseMarker,
  parseDataPoints,
  parseTrendlines,
  parseErrorBars,
  getIntAttr,
  getBoolAttr,
  getChild,
};
