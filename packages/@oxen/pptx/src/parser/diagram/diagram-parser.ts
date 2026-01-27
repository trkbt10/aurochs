/**
 * @file Diagram (SmartArt) parser
 *
 * Parses DiagramML drawing content to Shape domain objects.
 *
 * TODO: mc:AlternateContent NOT INVESTIGATED in diagram XML.
 * Diagram XML (dgm:*, dsp:*) may contain mc:AlternateContent for
 * version-specific diagram features. This has not been investigated.
 * If mc:AlternateContent is found in diagram XML, use the pattern from
 * shape-parser.ts (processAlternateContent, isChoiceSupported).
 * See: issues/ecma376-mc-alternateContent-compliance.md
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML - Diagrams
 * @see MS-ODRAWXML - Diagram Layout extensions
 * @see ECMA-376 Part 3, Section 10.2.1 (mc:AlternateContent)
 */
/* eslint-disable curly -- diagram parser uses guard clauses for readability */

import type { DiagramContent, DiagramReference, Shape } from "../../domain/shape";
import type { Transform } from "../../domain/types";
import type { XmlDocument, XmlElement } from "@oxen/xml";
import { getAttr, getByPath, getChild, isXmlElement, parseXml } from "@oxen/xml";
import { parseShapeTree, parseShapeElement } from "../shape-parser/index";
import { parseTransform } from "../graphics/transform-parser";

// Note: DiagramContent type is now defined in domain/shape.ts
// Import directly from domain instead of parser

/**
 * Diagram parsing context
 */
export type DiagramParseContext = {
  /** Read file from ZIP */
  readonly readFile: (path: string) => Uint8Array | null;
  /** Resolve resource ID to path */
  readonly resolveResource: (id: string) => string | undefined;
};

// =============================================================================
// Diagram Parsing
// =============================================================================

/**
 * Parse diagram drawing content
 *
 * Diagrams in PPTX contain pre-rendered shapes in a drawing element.
 * The diagram data/layout/style files define how the diagram is built,
 * but the actual rendered shapes are in the drawing.
 *
 * @param drawingDoc - Diagram drawing XML document
 * @returns Parsed diagram content with shapes
 */
export function parseDiagramDrawing(drawingDoc: XmlDocument): DiagramContent {
  // Try different possible paths for diagram drawing content
  // The drawing can be in different locations depending on how it was saved

  // Try p:drawing/p:spTree (most common for SmartArt drawings)
  const drawingSpTree = getByPath(drawingDoc, ["p:drawing", "p:spTree"]);
  if (drawingSpTree) {
    return {
      shapes: parseShapeTree(drawingSpTree as XmlElement),
    };
  }

  // Try dsp:drawing/dsp:spTree (diagram-specific drawing)
  const dspSpTree = getByPath(drawingDoc, ["dsp:drawing", "dsp:spTree"]);
  if (dspSpTree) {
    return {
      shapes: parseDiagramShapeTree(dspSpTree as XmlElement),
    };
  }

  // Try dgm:drawing (direct diagram drawing)
  const dgmDrawing = getByPath(drawingDoc, ["dgm:drawing"]);
  if (dgmDrawing) {
    const spTree = getChild(dgmDrawing as XmlElement, "dgm:spTree");
    if (spTree) {
      return {
        shapes: parseDiagramShapeTree(spTree),
      };
    }
  }

  return { shapes: [] };
}

/**
 * Parse diagram-specific shape tree (dsp:spTree or dgm:spTree)
 *
 * These use slightly different element names than standard p:spTree.
 * Additionally handles diagram-specific attributes like modelId and dsp:txXfrm.
 *
 * @see MS-ODRAWXML Section 2.4.2 (dsp:sp)
 * @see MS-ODRAWXML Section 2.4.4 (dsp:txXfrm)
 */
function parseDiagramShapeTree(spTree: XmlElement): readonly Shape[] {
  const shapes: Shape[] = [];

  for (const child of spTree.children) {
    if (!isXmlElement(child)) continue;

    // Map diagram-specific element names to standard names
    const mappedElement = mapDiagramElement(child);
    if (mappedElement) {
      const shape = parseShapeElement(mappedElement);
      if (shape) {
        // Add diagram-specific attributes for SpShape
        const enrichedShape = addDiagramAttributes(shape, child);
        shapes.push(enrichedShape);
      }
    }
  }

  return shapes;
}

/**
 * Add diagram-specific attributes to a parsed shape
 *
 * Extracts modelId and dsp:txXfrm from original diagram element
 * and adds them to SpShape objects.
 *
 * @param shape - Parsed shape from standard parser
 * @param originalElement - Original dsp:sp or dgm:sp element
 * @returns Shape with diagram-specific attributes added
 *
 * @see MS-ODRAWXML Section 2.4.2 (modelId attribute)
 * @see MS-ODRAWXML Section 2.4.4 (dsp:txXfrm element)
 */
function addDiagramAttributes(shape: Shape, originalElement: XmlElement): Shape {
  // Only SpShape supports diagram-specific attributes
  if (shape.type !== "sp") {
    return shape;
  }

  // Check if this is a diagram shape element
  if (originalElement.name !== "dsp:sp" && originalElement.name !== "dgm:sp") {
    return shape;
  }

  // Extract modelId attribute
  const modelId = getAttr(originalElement, "modelId");

  // Parse dsp:txXfrm element for text positioning
  const txXfrmElement = getChild(originalElement, "dsp:txXfrm");
  const textTransform = parseTextTransform(txXfrmElement);

  // Return enriched shape if any diagram attributes found
  if (modelId || textTransform) {
    return {
      ...shape,
      modelId,
      textTransform,
    };
  }

  return shape;
}

/**
 * Parse dsp:txXfrm element to Transform
 *
 * The dsp:txXfrm element defines the text area separately from shape bounds.
 * It uses the same structure as a:xfrm with a:off and a:ext children.
 *
 * Expected structure:
 * ```xml
 * <dsp:txXfrm rot="0">
 *   <a:off x="914400" y="914400"/>
 *   <a:ext cx="1828800" cy="914400"/>
 * </dsp:txXfrm>
 * ```
 *
 * @see MS-ODRAWXML Section 2.4.4
 */
function parseTextTransform(txXfrm: XmlElement | undefined): Transform | undefined {
  // dsp:txXfrm has the same structure as a:xfrm, so reuse parseTransform
  return parseTransform(txXfrm);
}

/**
 * Map diagram-specific elements to standard PresentationML elements
 *
 * Diagrams use dsp: or dgm: prefixed elements that are structurally
 * similar to p: prefixed elements.
 */
function mapDiagramElement(element: XmlElement): XmlElement | undefined {
  // Diagram elements typically use dsp: prefix
  // Map them to p: prefix for standard parsing

  switch (element.name) {
    case "dsp:sp":
      return createMappedElement("p:sp", element);
    case "dgm:sp":
      return createMappedElement("p:sp", element);
    case "dsp:pic":
      return createMappedElement("p:pic", element);
    case "dsp:grpSp":
      return createMappedElement("p:grpSp", element);
    case "dsp:cxnSp":
      return createMappedElement("p:cxnSp", element);
    // Standard elements pass through
    case "p:sp":
    case "p:pic":
    case "p:grpSp":
    case "p:cxnSp":
    case "p:graphicFrame":
      return element;
    default:
      return undefined;
  }
}

/**
 * Create a mapped element with remapped name
 *
 * This allows diagram elements to be parsed by the standard shape parser.
 */
function createMappedElement(newName: string, source: XmlElement): XmlElement {
  return {
    type: "element",
    name: newName,
    attrs: source.attrs,
    children: source.children.map((child) => {
      if (isXmlElement(child)) {
        // Remap child element names as well
        const newChildName = remapElementName(child.name);
        if (newChildName !== child.name) {
          return createMappedElement(newChildName, child);
        }
      }
      return child;
    }),
  };
}

/**
 * Remap diagram-specific element names to standard names
 */
function remapElementName(name: string): string {
  // Map dsp: and dgm: prefixes to p: or a:
  if (name.startsWith("dsp:nvSpPr")) return "p:nvSpPr";
  if (name.startsWith("dsp:spPr")) return "p:spPr";
  if (name.startsWith("dsp:txBody")) return "p:txBody";
  if (name.startsWith("dsp:style")) return "p:style";
  if (name.startsWith("dsp:")) return name.replace("dsp:", "p:");
  if (name.startsWith("dgm:")) return name.replace("dgm:", "p:");
  return name;
}

/**
 * Load and parse diagram from reference
 *
 * @param reference - Diagram reference with resource IDs
 * @param ctx - Parsing context with file/resource access
 * @returns Parsed diagram content or undefined
 */
export function loadDiagram(reference: DiagramReference, ctx: DiagramParseContext): DiagramContent | undefined {
  // Diagrams have multiple files, but the pre-rendered drawing is what we need
  // The drawing file is typically referenced via a relationship from the slide

  // If no data resource, there's no diagram content to load
  if (!reference.dataResourceId) {
    return undefined;
  }

  // Try to resolve the data file path
  const dataPath = ctx.resolveResource(reference.dataResourceId);
  if (!dataPath) {
    return undefined;
  }

  // The drawing file is typically in the same folder as the data file
  // with a .xml extension, or as a separate drawing relationship
  const drawingPath = dataPath.replace(/\/data\d*\.xml$/, "/drawing1.xml");

  const drawingBuffer = ctx.readFile(drawingPath);
  if (!drawingBuffer) {
    // Try alternative paths
    const altPath = dataPath.replace(/\.xml$/, ".drawing.xml");
    const altBuffer = ctx.readFile(altPath);
    if (!altBuffer) {
      return undefined;
    }

    const decoder = new TextDecoder();
    const xmlText = decoder.decode(altBuffer);
    const doc = parseXml(xmlText);
    if (!doc) return undefined;

    return parseDiagramDrawing(doc);
  }

  const decoder = new TextDecoder();
  const xmlText = decoder.decode(drawingBuffer);
  const doc = parseXml(xmlText);
  if (!doc) return undefined;

  return parseDiagramDrawing(doc);
}

/**
 * Check if diagram has content that can be rendered
 */
export function hasDiagramContent(content: DiagramContent): boolean {
  return content.shapes.length > 0;
}
