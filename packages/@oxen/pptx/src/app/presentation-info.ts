/**
 * @file Presentation info parsing utilities
 * Parses presentation.xml and app.xml for presentation metadata
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import { getByPath, getTextByPath } from "@oxen/xml";
import { px } from "@oxen/ooxml/domain/units";
import type { SlideSize } from "../domain";
import { SLIDE_FACTOR } from "../domain/unit-conversion";

/** Default slide size (16:9 aspect ratio at 96 DPI) */
const DEFAULT_SLIDE_SIZE: SlideSize = { width: px(960), height: px(540) };

/**
 * Parse slide size from presentation XML
 * ECMA-376: p:presentation/p:sldSz contains slide dimensions in EMUs
 * @param presentationXml - Parsed presentation.xml
 * @returns Slide size in pixels
 */
export function parseSlideSizeFromXml(presentationXml: XmlDocument | null): SlideSize {
  if (presentationXml === null) {
    return DEFAULT_SLIDE_SIZE;
  }

  const sldSz = getByPath(presentationXml, ["p:presentation", "p:sldSz"]);

  if (sldSz === undefined) {
    return DEFAULT_SLIDE_SIZE;
  }

  const cx = parseInt(sldSz.attrs["cx"] ?? "0", 10);
  const cy = parseInt(sldSz.attrs["cy"] ?? "0", 10);
  return {
    width: px((cx * SLIDE_FACTOR) | 0),
    height: px((cy * SLIDE_FACTOR) | 0),
  };
}

/**
 * Parse default text style from presentation XML
 * ECMA-376: p:presentation/p:defaultTextStyle contains default text formatting
 * @param presentationXml - Parsed presentation.xml
 * @returns Default text style node or null
 */
export function parseDefaultTextStyle(presentationXml: XmlDocument | null): XmlElement | null {
  if (presentationXml === null) {
    return null;
  }
  const node = getByPath(presentationXml, ["p:presentation", "p:defaultTextStyle"]);
  if (node === undefined) {
    return null;
  }
  return node;
}

/**
 * Parse app version from parsed app.xml
 * ECMA-376: docProps/app.xml contains AppVersion element with text content
 * @param appXml - Parsed app.xml (or null if not found)
 * @returns PowerPoint version number or null if not found
 */
export function parseAppVersion(appXml: XmlDocument | null): number | null {
  if (appXml === null) {
    return null;
  }
  const versionStr = getTextByPath(appXml, ["Properties", "AppVersion"]);
  if (versionStr === undefined) {
    return null;
  }
  return parseInt(versionStr, 10);
}
