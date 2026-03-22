/**
 * @file PPTX part reader
 *
 * Reads OPC part entries from a PackageFile and returns
 * parsed, Markup Compatibility-processed XmlDocuments.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 * @see ECMA-376 Part 3, Section 10 (Markup Compatibility)
 */

import type { PackageFile } from "@aurochs-office/opc";
import type { XmlDocument } from "@aurochs/xml";
import { stripCdata, parseXml, applyMarkupCompatibility, type MarkupCompatibilityOptions } from "@aurochs/xml";

/**
 * Supported namespace prefixes for Markup Compatibility processing.
 *
 * These are the OOXML namespace prefixes used across PresentationML,
 * DrawingML, Charts, Diagrams, and related specs.
 *
 * @see ECMA-376 Part 3, Section 10.2.1 (mc:AlternateContent)
 */
const MARKUP_COMPATIBILITY_OPTIONS: MarkupCompatibilityOptions = {
  supportedPrefixes: ["a", "c", "dgm", "dsp", "mc", "o", "p", "r", "v", "wp", "wpc", "wpg", "wsp", "wgp", "xdr"],
};

/**
 * Strip CDATA if needed for Office 2007 compatibility.
 * Office 2007 and earlier (appVersion <= 12) may embed CDATA in slide content.
 */
function processContent(text: string, appVersion: number, isSlideContent: boolean): string {
  if (isSlideContent && appVersion <= 12) {
    return stripCdata(text);
  }
  return text;
}

/**
 * Read and parse an OPC part from a PackageFile.
 *
 * Pipeline: file.readText → CDATA strip (if legacy) → parseXml → applyMarkupCompatibility
 *
 * @param file - The presentation file (OPC package)
 * @param path - Part path within the archive (e.g., "ppt/slides/slide1.xml")
 * @param options - Optional: appVersion (default 16), isSlideContent (default false)
 * @returns Parsed and MC-processed XmlDocument, or null if the part doesn't exist
 */
export function readPart(
  file: PackageFile,
  path: string,
  options?: { appVersion?: number; isSlideContent?: boolean },
): XmlDocument | null {
  const appVersion = options?.appVersion ?? 16;
  const isSlideContent = options?.isSlideContent ?? false;

  const text = file.readText(path);
  if (text === null) {
    return null;
  }

  const content = processContent(text, appVersion, isSlideContent);
  const document = parseXml(content);
  return applyMarkupCompatibility(document, MARKUP_COMPATIBILITY_OPTIONS);
}
