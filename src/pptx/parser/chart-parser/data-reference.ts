/**
 * @file Data reference parsing for charts
 *
 * Parses numeric, string, and multi-level string references used in chart data.
 *
 * @see ECMA-376 Part 1, Section 21.2.2 - Chart Elements
 */

import type {
  DataReference,
  NumericReference,
  NumericCache,
  NumericPoint,
  StringReference,
  StringCache,
  StringPoint,
  MultiLevelStringReference,
  MultiLevelStringCache,
  MultiLevelStringLevel,
  SeriesText,
} from "../../domain/chart";
import { getChild, getChildren, getXmlText, getAttr, type XmlElement } from "../../../xml";
import { getIntAttr } from "../primitive";

/**
 * Parse numeric point (c:pt)
 * @see ECMA-376 Part 1, Section 21.2.2.129 (pt)
 */
export function parseNumericPoint(pt: XmlElement): NumericPoint | undefined {
  const idx = getIntAttr(pt, "idx");
  if (idx === undefined) {return undefined;}

  const vElement = getChild(pt, "c:v");
  const value = vElement ? parseFloat(getXmlText(vElement) ?? "0") : 0;
  if (isNaN(value)) {return undefined;}

  return {
    idx,
    value,
    formatCode: getAttr(pt, "formatCode"),
  };
}

/**
 * Parse numeric cache (c:numCache)
 * @see ECMA-376 Part 1, Section 21.2.2.111 (numCache)
 */
export function parseNumericCache(numCache: XmlElement): NumericCache | undefined {
  const formatCodeElement = getChild(numCache, "c:formatCode");
  const formatCode = formatCodeElement ? getXmlText(formatCodeElement) : undefined;

  const ptCountElement = getChild(numCache, "c:ptCount");
  const count = ptCountElement ? getIntAttr(ptCountElement, "val") ?? 0 : 0;

  const points: NumericPoint[] = [];
  for (const pt of getChildren(numCache, "c:pt")) {
    const point = parseNumericPoint(pt);
    if (point) {points.push(point);}
  }

  return { formatCode, count, points };
}

/**
 * Parse numeric reference (c:numRef)
 * @see ECMA-376 Part 1, Section 21.2.2.112 (numRef)
 */
export function parseNumericReference(numRef: XmlElement): NumericReference | undefined {
  const fElement = getChild(numRef, "c:f");
  const formula = fElement ? getXmlText(fElement) ?? "" : "";

  const numCache = getChild(numRef, "c:numCache");
  const cache = numCache ? parseNumericCache(numCache) : undefined;

  return { formula, cache };
}

/**
 * Parse string point (c:pt)
 * @see ECMA-376 Part 1, Section 21.2.2.129 (pt)
 */
export function parseStringPoint(pt: XmlElement): StringPoint | undefined {
  const idx = getIntAttr(pt, "idx");
  if (idx === undefined) {return undefined;}

  const vElement = getChild(pt, "c:v");
  const value = vElement ? getXmlText(vElement) ?? "" : "";

  return { idx, value };
}

/**
 * Parse string cache (c:strCache)
 * @see ECMA-376 Part 1, Section 21.2.2.170 (strCache)
 */
export function parseStringCache(strCache: XmlElement): StringCache | undefined {
  const ptCountElement = getChild(strCache, "c:ptCount");
  const count = ptCountElement ? getIntAttr(ptCountElement, "val") ?? 0 : 0;

  const points: StringPoint[] = [];
  for (const pt of getChildren(strCache, "c:pt")) {
    const point = parseStringPoint(pt);
    if (point) {points.push(point);}
  }

  return { count, points };
}

/**
 * Parse string reference (c:strRef)
 * @see ECMA-376 Part 1, Section 21.2.2.171 (strRef)
 */
export function parseStringReference(strRef: XmlElement): StringReference | undefined {
  const fElement = getChild(strRef, "c:f");
  const formula = fElement ? getXmlText(fElement) ?? "" : "";

  const strCache = getChild(strRef, "c:strCache");
  const cache = strCache ? parseStringCache(strCache) : undefined;

  return { formula, cache };
}

/**
 * Parse multi-level string level (c:lvl)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (lvl)
 */
export function parseMultiLevelStringLevel(lvl: XmlElement): MultiLevelStringLevel {
  const points: StringPoint[] = [];
  for (const pt of getChildren(lvl, "c:pt")) {
    const point = parseStringPoint(pt);
    if (point) {points.push(point);}
  }
  return { points };
}

/**
 * Parse multi-level string cache (c:multiLvlStrCache)
 * @see ECMA-376 Part 1, Section 21.2.2.103 (multiLvlStrCache)
 */
export function parseMultiLevelStringCache(cache: XmlElement): MultiLevelStringCache {
  const ptCountElement = getChild(cache, "c:ptCount");
  const count = ptCountElement ? getIntAttr(ptCountElement, "val") ?? 0 : 0;

  const levels: MultiLevelStringLevel[] = [];
  for (const lvl of getChildren(cache, "c:lvl")) {
    levels.push(parseMultiLevelStringLevel(lvl));
  }

  return { count, levels };
}

/**
 * Parse multi-level string reference (c:multiLvlStrRef)
 *
 * Multi-level string references are used for hierarchical categories,
 * e.g., quarters within years (Q1, Q2, Q3, Q4 under 2023, 2024).
 *
 * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
 */
export function parseMultiLevelStringReference(ref: XmlElement): MultiLevelStringReference {
  const fElement = getChild(ref, "c:f");
  const formula = fElement ? getXmlText(fElement) ?? "" : "";

  const cacheElement = getChild(ref, "c:multiLvlStrCache");
  const cache = cacheElement ? parseMultiLevelStringCache(cacheElement) : undefined;

  return { formula, cache };
}

/**
 * Parse data reference (c:cat, c:val, c:xVal, c:yVal)
 * @see ECMA-376 Part 1, Section 21.2.2.24 (cat)
 * @see ECMA-376 Part 1, Section 21.2.2.229 (val)
 * @see ECMA-376 Part 1, Section 21.2.2.102 (multiLvlStrRef)
 */
export function parseDataReference(element: XmlElement | undefined): DataReference {
  if (!element) {return {};}

  const numRef = getChild(element, "c:numRef");
  const strRef = getChild(element, "c:strRef");
  const multiLvlStrRef = getChild(element, "c:multiLvlStrRef");

  return {
    numRef: numRef ? parseNumericReference(numRef) : undefined,
    strRef: strRef ? parseStringReference(strRef) : undefined,
    multiLvlStrRef: multiLvlStrRef ? parseMultiLevelStringReference(multiLvlStrRef) : undefined,
  };
}

/**
 * Parse series text (c:tx)
 * @see ECMA-376 Part 1, Section 21.2.2.209 (tx)
 */
export function parseSeriesText(tx: XmlElement | undefined): SeriesText | undefined {
  if (!tx) {return undefined;}

  const strRef = getChild(tx, "c:strRef");
  if (strRef) {
    const ref = parseStringReference(strRef);
    const firstPoint = ref?.cache?.points[0];
    return {
      value: firstPoint?.value,
      reference: ref?.formula,
    };
  }

  const vElement = getChild(tx, "c:v");
  if (vElement) {
    return { value: getXmlText(vElement) };
  }

  return undefined;
}
