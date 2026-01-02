/**
 * @file Diagram XML transformation utilities
 * Handles namespace transformation for diagram content
 */

import type { XmlDocument } from "../../../xml/index";
import { replaceDspNamespace, isXmlDocument } from "../../../xml/index";

/**
 * Transform diagram XML by replacing dsp: namespace with p: namespace
 *
 * ECMA-376: Diagram drawing content uses dsp: prefix but can be processed
 * using the same rules as p: (presentation) namespace for shapes.
 *
 * @param diagram - Parsed diagram XML
 * @returns Transformed XML with p: namespace, or null if transformation fails
 */
export function transformDiagramNamespace(diagram: XmlDocument): XmlDocument | null {
  const serialized = JSON.stringify(diagram);
  const transformed = replaceDspNamespace(serialized);
  const parsed: unknown = JSON.parse(transformed);

  if (!isXmlDocument(parsed)) {
    return null;
  }
  return parsed;
}
