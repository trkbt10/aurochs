/**
 * @file Common series parsing utilities
 *
 * @see ECMA-376 Part 1, Section 21.2.2.163 (ser)
 */

import type { XmlElement } from "@oxen/xml";
import { getChild } from "@oxen/xml";
import { getIntAttr } from "../../primitive";
import { parseSeriesText } from "../data-reference";
import { parseChartShapeProperties } from "../shape-properties";

/**
 * Common series properties
 */
export type BaseSeriesProperties = {
  idx: number;
  order: number;
  tx: ReturnType<typeof parseSeriesText>;
  shapeProperties: ReturnType<typeof parseChartShapeProperties>;
};

/**
 * Parse common series properties
 */
export function parseBaseSeriesProperties(ser: XmlElement): BaseSeriesProperties {
  const idxEl = getChild(ser, "c:idx");
  const orderEl = getChild(ser, "c:order");

  return {
    idx: idxEl ? (getIntAttr(idxEl, "val") ?? 0) : 0,
    order: orderEl ? (getIntAttr(orderEl, "val") ?? 0) : 0,
    tx: parseSeriesText(getChild(ser, "c:tx")),
    shapeProperties: parseChartShapeProperties(getChild(ser, "c:spPr")),
  };
}
