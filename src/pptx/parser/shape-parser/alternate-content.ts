/**
 * @file mc:AlternateContent Processing
 *
 * @see ECMA-376 Part 3, Section 10.2.1 (mc:AlternateContent)
 */

import { getAttr, getChild, getChildren, type XmlElement } from "../../../xml";

// =============================================================================
// mc:AlternateContent Processing (ECMA-376 Part 3, Section 10.2.1)
// =============================================================================
//
// TODO: mc:AlternateContent handling is NOT fully comprehensive.
// The following contexts are NOT YET COVERED:
//
// 1. p:transition (Slide Transitions)
//    - Location: slide-parser.ts (not shape-parser.ts)
//    - Example: mc:Choice Requires="p14" for Office 2010+ transitions
//    - See: issues/ecma376-mc-alternateContent-compliance.md
//
// 2. p:extLst (Extension Lists)
//    - Extension lists may contain mc:AlternateContent for version-specific extensions
//    - Not yet investigated
//
// 3. a:blip in other fill contexts
//    - Currently only p:blipFill in p:pic is handled
//    - Other fills (a:blipFill in a:ln, etc.) may need similar handling
//
// 4. c:chart elements
//    - Chart XML may contain mc:AlternateContent
//    - Not yet investigated in chart-parser.ts
//
// 5. dgm:* (Diagram/SmartArt elements)
//    - Diagram XML may contain mc:AlternateContent
//    - Not yet investigated in diagram-parser.ts
//
// 6. Nested mc:AlternateContent
//    - mc:AlternateContent inside mc:Choice/mc:Fallback
//    - Not tested, may work but unverified
//
// When adding support for new contexts, use processAlternateContent() or
// isChoiceSupported() to ensure spec-compliant behavior.
// =============================================================================

/**
 * Supported namespace prefixes for mc:Choice Requires evaluation.
 *
 * Per ECMA-376 Part 3, Section 10.2.1, the Requires attribute contains
 * namespace prefixes that must be understood to process the Choice.
 *
 * This renderer supports:
 * - Standard DrawingML and PresentationML (always supported, no prefix needed)
 *
 * This renderer does NOT support:
 * - v: VML (Vector Markup Language)
 * - ma: Mac-specific formats
 * - a14, p14, p15, etc.: Office version-specific extensions
 *
 * @see ECMA-376 Part 3, Section 10.2.1
 */
const SUPPORTED_NAMESPACES = new Set<string>([
  // We don't support any extended namespaces
  // Standard DrawingML/PresentationML elements don't require Requires attribute
]);

/**
 * Check if all required namespaces in mc:Choice Requires attribute are supported.
 *
 * Per ECMA-376 Part 3, Section 10.2.1:
 * "The Requires attribute contains a whitespace-delimited list of namespace
 * prefixes. A consumer shall process the Choice only if it understands all
 * of the specified namespaces."
 *
 * @param requires - The Requires attribute value (whitespace-delimited prefixes)
 * @returns true if all required namespaces are supported
 */
export function isChoiceSupported(requires: string | undefined): boolean {
  if (requires === undefined || requires === "") {
    // No requirements means always supported
    return true;
  }

  const prefixes = requires.split(/\s+/).filter((p) => p.length > 0);
  return prefixes.every((prefix) => SUPPORTED_NAMESPACES.has(prefix));
}

/**
 * Process mc:AlternateContent element per ECMA-376 Part 3, Section 10.2.1.
 *
 * Algorithm:
 * 1. Process mc:Choice elements in document order
 * 2. For each Choice, evaluate Requires attribute
 * 3. If consumer supports all required namespaces, select that Choice
 * 4. If no Choice matches, use mc:Fallback
 *
 * @param mcElement - The mc:AlternateContent element
 * @param childName - The child element name to extract (e.g., "p:blipFill")
 * @returns The selected child element or undefined
 */
export function processAlternateContent(
  mcElement: XmlElement,
  childName: string,
): XmlElement | undefined {
  // Process mc:Choice elements in order per spec
  const choices = getChildren(mcElement, "mc:Choice");
  for (const choice of choices) {
    const requires = getAttr(choice, "Requires");
    if (isChoiceSupported(requires)) {
      const child = getChild(choice, childName);
      if (child !== undefined) {
        return child;
      }
    }
  }

  // No matching Choice found, use mc:Fallback per spec
  const fallback = getChild(mcElement, "mc:Fallback");
  if (fallback !== undefined) {
    return getChild(fallback, childName);
  }

  return undefined;
}

/**
 * Get p:blipFill from a picture element, handling mc:AlternateContent.
 *
 * Per ECMA-376 Part 3, Section 10.2.1, mc:AlternateContent provides
 * alternative representations for different consumers. For pictures,
 * this is commonly used to provide Mac-specific image formats (PDF)
 * with PNG fallbacks.
 *
 * @see ECMA-376 Part 3, Section 10.2.1 (mc:AlternateContent)
 * @see ECMA-376 Part 1, Section 19.3.1.37 (p:pic)
 */
export function getBlipFillElement(element: XmlElement): XmlElement | undefined {
  // Try direct p:blipFill first
  const directBlipFill = getChild(element, "p:blipFill");
  if (directBlipFill !== undefined) {
    return directBlipFill;
  }

  // Process mc:AlternateContent per ECMA-376 Part 3
  const mcElement = getChild(element, "mc:AlternateContent");
  if (mcElement !== undefined) {
    return processAlternateContent(mcElement, "p:blipFill");
  }

  return undefined;
}

/**
 * Get p:oleObj from graphic data, handling mc:AlternateContent.
 *
 * Per ECMA-376 Part 3, Section 10.2.1, mc:AlternateContent provides
 * alternative representations for different consumers. For OLE objects,
 * this is commonly used to provide VML-based representations (Requires="v")
 * with DrawingML fallbacks.
 *
 * Processing follows the ECMA-376 Part 3 algorithm:
 * 1. Check each mc:Choice in order for supported Requires namespaces
 * 2. Use mc:Fallback if no Choice matches
 *
 * Since we don't support VML (v namespace), OLE objects with VML Choice
 * will correctly fall through to Fallback per the specification.
 *
 * @see ECMA-376 Part 3, Section 10.2.1 (mc:AlternateContent)
 * @see ECMA-376 Part 1, Section 19.3.1.36a (p:oleObj)
 */
export function getOleObjElement(graphicData: XmlElement): XmlElement | undefined {
  // Try direct p:oleObj first
  const directOleObj = getChild(graphicData, "p:oleObj");
  if (directOleObj !== undefined) {
    return directOleObj;
  }

  // Process mc:AlternateContent per ECMA-376 Part 3
  const mcElement = getChild(graphicData, "mc:AlternateContent");
  if (mcElement !== undefined) {
    return processAlternateContent(mcElement, "p:oleObj");
  }

  return undefined;
}
