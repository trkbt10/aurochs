/**
 * @file Chart external data (embedded workbook) resolver
 *
 * Resolves chart → embedded xlsx workbook references using OPC relationships.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */

import type { XmlDocument, XmlElement } from "@oxen/xml";
import type { PresentationFile } from "../../domain/opc";
import { getByPath, getChild } from "@oxen/xml";
import { loadRelationships, getRelationshipPath } from "../../parser/relationships";

/**
 * Package relationship type for embedded OLE packages (xlsx, docx, etc.)
 */
const RELATIONSHIP_TYPE_PACKAGE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package";

/**
 * Result of resolving chart external data reference
 */
export type ChartExternalDataReference = {
  /** Relationship ID (e.g., "rId2") */
  readonly resourceId: string;
  /** Resolved absolute path to embedded xlsx (e.g., "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx") */
  readonly workbookPath: string;
  /** Whether autoUpdate is enabled */
  readonly autoUpdate: boolean;
};

/**
 * Detect c:externalData element in chart XML.
 *
 * @param chartXml - Parsed chart XML document
 * @returns c:externalData element if exists, undefined otherwise
 */
export function findExternalDataElement(chartXml: XmlDocument): XmlElement | undefined {
  const chartSpace = getByPath(chartXml, ["c:chartSpace"]);
  if (!chartSpace) {
    return undefined;
  }

  return getChild(chartSpace, "c:externalData");
}

/**
 * Check if chart has external data reference (embedded Excel workbook).
 *
 * @param chartXml - Parsed chart XML document
 * @returns true if chart has c:externalData element
 */
export function hasExternalData(chartXml: XmlDocument): boolean {
  return findExternalDataElement(chartXml) !== undefined;
}

/**
 * Resolve chart external data (embedded workbook) reference.
 *
 * Uses OPC relationships to resolve c:externalData/@r:id to the actual
 * embedded xlsx path.
 *
 * @param chartXml - Parsed chart XML document
 * @param chartPath - Path to chart XML (e.g., "ppt/charts/chart1.xml")
 * @param file - Presentation file for reading relationships
 * @returns External data reference, or undefined if no external data
 * @throws Error if external data exists but relationship cannot be resolved
 *
 * @example
 * const ref = resolveChartExternalData(chartXml, "ppt/charts/chart1.xml", file);
 * // => { resourceId: "rId2", workbookPath: "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx", autoUpdate: false }
 */
export function resolveChartExternalData(
  chartXml: XmlDocument,
  chartPath: string,
  file: PresentationFile,
): ChartExternalDataReference | undefined {
  const externalData = findExternalDataElement(chartXml);
  if (!externalData) {
    return undefined;
  }

  // Get r:id attribute
  const resourceId = externalData.attrs["r:id"];
  if (!resourceId) {
    throw new Error(
      `resolveChartExternalData: c:externalData missing r:id attribute in ${chartPath}`,
    );
  }

  // Get autoUpdate attribute
  const autoUpdateAttr = externalData.attrs["autoUpdate"];
  const autoUpdate = autoUpdateAttr === "1" || autoUpdateAttr === "true";

  // Load chart relationships
  const resources = loadRelationships(file, chartPath);

  // Resolve the resource ID to target path
  const workbookPath = resources.getTarget(resourceId);
  if (!workbookPath) {
    // Check if relationship file even exists
    const relsPath = getRelationshipPath(chartPath);
    const relsText = file.readText(relsPath);
    if (relsText === null) {
      throw new Error(
        `resolveChartExternalData: relationship file not found: ${relsPath}`,
      );
    }

    throw new Error(
      `resolveChartExternalData: relationship ${resourceId} not found in ${chartPath}. ` +
        `Ensure ${relsPath} contains a Relationship with Id="${resourceId}"`,
    );
  }

  // Validate it's a package relationship (xlsx)
  const relType = resources.getType(resourceId);
  if (relType !== RELATIONSHIP_TYPE_PACKAGE) {
    throw new Error(
      `resolveChartExternalData: unexpected relationship type for ${resourceId}. ` +
        `Expected "${RELATIONSHIP_TYPE_PACKAGE}", got "${relType}"`,
    );
  }

  return {
    resourceId,
    workbookPath,
    autoUpdate,
  };
}

/**
 * Parse formula sheet name from A1 reference formula.
 *
 * Handles both quoted ('Sheet Name') and unquoted (Sheet1) sheet names.
 *
 * @param formula - Cell reference formula (e.g., "Sheet1!$A$2:$A$10", "'My Sheet'!$B$1:$B$5")
 * @returns Object with sheetName and rangeRef, or undefined if invalid
 *
 * @example
 * parseFormulaSheetName("Sheet1!$A$2:$A$10")
 * // => { sheetName: "Sheet1", rangeRef: "$A$2:$A$10" }
 *
 * parseFormulaSheetName("'Sheet Name'!$B$1:$B$5")
 * // => { sheetName: "Sheet Name", rangeRef: "$B$1:$B$5" }
 */
export function parseFormulaSheetName(
  formula: string,
): { sheetName: string; rangeRef: string } | undefined {
  if (!formula) {
    return undefined;
  }

  // Check for quoted sheet name: 'Sheet Name'!range
  const quotedMatch = formula.match(/^'((?:[^']|'')+)'!(.+)$/);
  if (quotedMatch) {
    // Unescape doubled quotes
    const sheetName = quotedMatch[1].replace(/''/g, "'");
    const rangeRef = quotedMatch[2];
    return { sheetName, rangeRef };
  }

  // Check for unquoted sheet name: Sheet1!range
  const unquotedMatch = formula.match(/^([^'!]+)!(.+)$/);
  if (unquotedMatch) {
    return { sheetName: unquotedMatch[1], rangeRef: unquotedMatch[2] };
  }

  return undefined;
}

/**
 * Quote sheet name for use in formula if needed.
 *
 * Quotes names containing spaces, special characters, or that start with digits.
 *
 * @param sheetName - Sheet name
 * @returns Properly quoted sheet name
 *
 * @example
 * quoteSheetName("Sheet1")     // => "Sheet1"
 * quoteSheetName("My Sheet")   // => "'My Sheet'"
 * quoteSheetName("Data's")     // => "'Data''s'"
 */
export function quoteSheetName(sheetName: string): string {
  // Check if quoting is needed
  const needsQuoting =
    /[\s']/.test(sheetName) ||
    /^[\d]/.test(sheetName) ||
    /[^A-Za-z0-9_]/.test(sheetName);

  if (!needsQuoting) {
    return sheetName;
  }

  // Escape single quotes by doubling them
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Compose formula from sheet name and range reference.
 *
 * @param sheetName - Sheet name
 * @param rangeRef - Range reference (e.g., "$A$2:$A$10")
 * @returns Complete formula
 *
 * @example
 * composeFormula("Sheet1", "$A$2:$A$10")
 * // => "Sheet1!$A$2:$A$10"
 *
 * composeFormula("My Sheet", "$B$1:$B$5")
 * // => "'My Sheet'!$B$1:$B$5"
 */
export function composeFormula(sheetName: string, rangeRef: string): string {
  return `${quoteSheetName(sheetName)}!${rangeRef}`;
}
