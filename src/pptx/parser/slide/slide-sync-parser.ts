/**
 * @file Slide synchronization parser
 *
 * Parses slide synchronization data (slideUpdateInfo part).
 *
 * @see ECMA-376 Part 1, Section 19.6.1 (sldSyncPr)
 */

import type { SlideSyncProperties } from "../../domain/slide";
import { getAttr, type XmlElement } from "../../../xml/index";

/**
 * Parse p:sldSyncPr (slide synchronization properties) element.
 *
 * @param element - The p:sldSyncPr element
 * @returns Parsed slide synchronization properties
 */
export function parseSlideSyncProperties(element: XmlElement): SlideSyncProperties {
  return {
    clientInsertedTime: getAttr(element, "clientInsertedTime"),
    serverSldId: getAttr(element, "serverSldId"),
    serverSldModifiedTime: getAttr(element, "serverSldModifiedTime"),
  };
}
