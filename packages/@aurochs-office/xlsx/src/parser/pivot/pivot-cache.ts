/**
 * @file Pivot Cache Parser
 *
 * Parses pivot cache definition and records XML files.
 *
 * @see ECMA-376 Part 4, Section 18.10 (Pivot Tables)
 */

import type { XmlElement } from "@aurochs/xml";
import { getAttr, getChild, getChildren, getTextContent } from "@aurochs/xml";
import { parseBooleanAttr, parseFloatAttr, parseIntAttr } from "../primitive";
import type {
  XlsxPivotCacheDefinition,
  XlsxPivotCacheField,
  XlsxPivotCacheItem,
  XlsxPivotCacheSource,
  XlsxPivotCacheRecords,
  XlsxPivotRecord,
  XlsxPivotRecordValue,
} from "../../domain/pivot/cache-types";

// =============================================================================
// Cache Field Parsing
// =============================================================================

function parseCacheItem(itemElement: XmlElement): XlsxPivotCacheItem {
  const tagName = itemElement.name.split(":").pop() ?? itemElement.name;

  switch (tagName) {
    case "s":
      return { type: "s", v: getAttr(itemElement, "v") ?? undefined };
    case "n":
      return { type: "n", n: parseFloatAttr(getAttr(itemElement, "v")) };
    case "b":
      return { type: "b", b: parseBooleanAttr(getAttr(itemElement, "v")) };
    case "e":
      return { type: "e", e: getAttr(itemElement, "v") ?? undefined };
    case "d":
      return { type: "d", v: getAttr(itemElement, "v") ?? undefined };
    case "m":
      return { type: "m" };
    default:
      return { type: "s", v: getAttr(itemElement, "v") ?? undefined };
  }
}

function parseSharedItems(sharedItemsEl: XmlElement | undefined): readonly XlsxPivotCacheItem[] | undefined {
  if (!sharedItemsEl) {
    return undefined;
  }
  const items: XlsxPivotCacheItem[] = [];
  for (const child of sharedItemsEl.children) {
    if (typeof child !== "object" || child.type !== "element") {
      continue;
    }
    items.push(parseCacheItem(child));
  }
  return items.length > 0 ? items : undefined;
}

function parseCacheField(fieldElement: XmlElement): XlsxPivotCacheField {
  const sharedItems = parseSharedItems(getChild(fieldElement, "sharedItems"));

  return {
    name: getAttr(fieldElement, "name") ?? "",
    numFmtId: parseIntAttr(getAttr(fieldElement, "numFmtId")),
    databaseField: parseBooleanAttr(getAttr(fieldElement, "databaseField")),
    ...(sharedItems && { sharedItems }),
  };
}

// =============================================================================
// Cache Source Parsing
// =============================================================================

function parseCacheSource(cacheSourceElement: XmlElement | undefined): XlsxPivotCacheSource | undefined {
  if (!cacheSourceElement) {
    return undefined;
  }

  const worksheetSourceEl = getChild(cacheSourceElement, "worksheetSource");
  if (worksheetSourceEl) {
    return {
      type: "worksheet",
      ref: getAttr(worksheetSourceEl, "ref") ?? undefined,
      sheet: getAttr(worksheetSourceEl, "sheet") ?? undefined,
      name: getAttr(worksheetSourceEl, "name") ?? undefined,
    };
  }

  const consolidationEl = getChild(cacheSourceElement, "consolidation");
  if (consolidationEl) {
    return {
      type: "consolidation",
      autoPage: parseBooleanAttr(getAttr(consolidationEl, "autoPage")),
    };
  }

  return undefined;
}

// =============================================================================
// Cache Definition Parser
// =============================================================================

/**
 * Parse a pivot cache definition XML element.
 *
 * @param cacheDefElement - The root pivotCacheDefinition element
 * @param cacheId - Cache ID
 * @param xmlPath - Path to the cache definition XML
 * @returns Parsed pivot cache definition
 *
 * @see ECMA-376 Part 4, Section 18.10.1.67 (pivotCacheDefinition)
 */
export function parsePivotCacheDefinition(
  cacheDefElement: XmlElement,
  cacheId: number,
  xmlPath: string,
): XlsxPivotCacheDefinition {
  // Parse cache source
  const cacheSourceEl = getChild(cacheDefElement, "cacheSource");
  const cacheSource = parseCacheSource(cacheSourceEl);

  // Parse cache fields
  const cacheFieldsEl = getChild(cacheDefElement, "cacheFields");
  const cacheFields = cacheFieldsEl ? getChildren(cacheFieldsEl, "cacheField").map(parseCacheField) : undefined;

  return {
    cacheId,
    refreshOnLoad: parseBooleanAttr(getAttr(cacheDefElement, "refreshOnLoad")),
    recordCount: parseIntAttr(getAttr(cacheDefElement, "recordCount")),
    upgradeOnRefresh: parseBooleanAttr(getAttr(cacheDefElement, "upgradeOnRefresh")),
    saveData: parseBooleanAttr(getAttr(cacheDefElement, "saveData")),
    backgroundQuery: parseBooleanAttr(getAttr(cacheDefElement, "backgroundQuery")),
    createdVersion: parseIntAttr(getAttr(cacheDefElement, "createdVersion")),
    refreshedVersion: parseIntAttr(getAttr(cacheDefElement, "refreshedVersion")),
    minRefreshableVersion: parseIntAttr(getAttr(cacheDefElement, "minRefreshableVersion")),
    cacheSource,
    ...(cacheFields && cacheFields.length > 0 && { cacheFields }),
    xmlPath,
  };
}

// =============================================================================
// Cache Records Parser
// =============================================================================

function parseRecordValue(valueElement: XmlElement): XlsxPivotRecordValue {
  const tagName = valueElement.name.split(":").pop() ?? valueElement.name;

  switch (tagName) {
    case "x":
      return { type: "x", x: parseIntAttr(getAttr(valueElement, "v")) };
    case "s":
      return { type: "s", v: getAttr(valueElement, "v") ?? getTextContent(valueElement) };
    case "n":
      return { type: "n", n: parseFloatAttr(getAttr(valueElement, "v")) };
    case "b":
      return { type: "b", b: parseBooleanAttr(getAttr(valueElement, "v")) };
    case "e":
      return { type: "e", e: getAttr(valueElement, "v") ?? undefined };
    case "d":
      return { type: "d", v: getAttr(valueElement, "v") ?? undefined };
    case "m":
      return { type: "m" };
    default:
      return { type: "s", v: getAttr(valueElement, "v") ?? undefined };
  }
}

function parseRecord(recordElement: XmlElement): XlsxPivotRecord {
  const values: XlsxPivotRecordValue[] = [];
  for (const child of recordElement.children) {
    if (typeof child !== "object" || child.type !== "element") {
      continue;
    }
    values.push(parseRecordValue(child));
  }
  return { values };
}

/**
 * Parse pivot cache records XML element.
 *
 * @param recordsElement - The root pivotCacheRecords element
 * @returns Parsed pivot cache records
 *
 * @see ECMA-376 Part 4, Section 18.10.1.68 (pivotCacheRecords)
 */
export function parsePivotCacheRecords(recordsElement: XmlElement): XlsxPivotCacheRecords {
  const records = getChildren(recordsElement, "r").map(parseRecord);

  return {
    count: parseIntAttr(getAttr(recordsElement, "count")) ?? records.length,
    records,
  };
}
