/**
 * @file Notes patcher
 *
 * Provides functions for adding and updating speaker notes in PPTX files.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.26 (notes)
 */

import {
  createElement,
  getByPath,
  getChild,
  getChildren,
  isXmlElement,
  parseXml,
  serializeDocument,
  type XmlDocument,
  type XmlElement,
} from "@oxen/xml";
import type { ZipPackage } from "@oxen/zip";
import { setChildren } from "../core/xml-mutator";
import {
  addRelationship,
  ensureRelationshipsDocument,
  type RelationshipType,
} from "../resources/relationship-manager";
import { addOverride } from "../resources/content-types-manager";

const NOTES_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml";
const NOTES_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" as RelationshipType;

const P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/**
 * Simple notes specification.
 */
export type SimpleNotesSpec = {
  /** Notes text (plain text) */
  readonly text: string;
};

// =============================================================================
// Helper Functions
// =============================================================================

function getSlideRelsPath(slidePath: string): string {
  return slidePath.replace(/\/([^/]+)\.xml$/, "/_rels/$1.xml.rels");
}

function getNotesPath(slidePath: string): string {
  const slideNum = slidePath.match(/slide(\d+)\.xml$/)?.[1] ?? "1";
  return `ppt/notesSlides/notesSlide${slideNum}.xml`;
}

/**
 * Create a minimal notes slide XML document.
 */
function createNotesSlideDocument(slideRId: string, text: string): XmlDocument {
  // Create text body with the notes content
  const textBody = createElement("p:txBody", {}, [
    createElement("a:bodyPr"),
    createElement("a:lstStyle"),
    createElement("a:p", {}, [
      createElement("a:r", {}, [
        createElement("a:rPr", { lang: "en-US" }),
        createElement("a:t", {}, [{ type: "text", value: text }]),
      ]),
      createElement("a:endParaRPr", { lang: "en-US" }),
    ]),
  ]);

  // Create the notes body shape with placeholder type
  const notesBodyShape = createElement("p:sp", {}, [
    createElement("p:nvSpPr", {}, [
      createElement("p:cNvPr", { id: "2", name: "Notes Placeholder 2" }),
      createElement("p:cNvSpPr", {}, [
        createElement("a:spLocks", { noGrp: "1" }),
      ]),
      createElement("p:nvPr", {}, [
        createElement("p:ph", { type: "body", idx: "1" }),
      ]),
    ]),
    createElement("p:spPr"),
    textBody,
  ]);

  // Create slide image placeholder
  const slideImageShape = createElement("p:sp", {}, [
    createElement("p:nvSpPr", {}, [
      createElement("p:cNvPr", { id: "3", name: "Slide Image Placeholder 3" }),
      createElement("p:cNvSpPr", {}, [
        createElement("a:spLocks", { noGrp: "1", noRot: "1", noChangeAspect: "1" }),
      ]),
      createElement("p:nvPr", {}, [
        createElement("p:ph", { type: "sldImg" }),
      ]),
    ]),
    createElement("p:spPr"),
  ]);

  const spTree = createElement("p:spTree", {}, [
    createElement("p:nvGrpSpPr", {}, [
      createElement("p:cNvPr", { id: "1", name: "" }),
      createElement("p:cNvGrpSpPr"),
      createElement("p:nvPr"),
    ]),
    createElement("p:grpSpPr", {}, [
      createElement("a:xfrm", {}, [
        createElement("a:off", { x: "0", y: "0" }),
        createElement("a:ext", { cx: "0", cy: "0" }),
        createElement("a:chOff", { x: "0", y: "0" }),
        createElement("a:chExt", { cx: "0", cy: "0" }),
      ]),
    ]),
    slideImageShape,
    notesBodyShape,
  ]);

  const cSld = createElement("p:cSld", {}, [spTree]);

  const notes = createElement(
    "p:notes",
    {
      "xmlns:a": A_NS,
      "xmlns:r": R_NS,
      "xmlns:p": P_NS,
    },
    [cSld],
  );

  return { children: [notes] };
}

/**
 * Find the notes body placeholder in a notes slide.
 */
function findNotesBodyPlaceholder(notesDoc: XmlDocument): XmlElement | null {
  const spTree = getByPath(notesDoc, ["p:notes", "p:cSld", "p:spTree"]);
  if (!spTree) return null;

  const shapes = getChildren(spTree, "p:sp");
  for (const sp of shapes) {
    const nvSpPr = getChild(sp, "p:nvSpPr");
    if (!nvSpPr) continue;

    const nvPr = getChild(nvSpPr, "p:nvPr");
    if (!nvPr) continue;

    const ph = getChild(nvPr, "p:ph");
    if (!ph) continue;

    // Check for body placeholder type
    const phType = ph.attrs.type;
    if (phType === "body" || phType === undefined) {
      return sp;
    }
  }

  return null;
}

/**
 * Update the text in a notes body placeholder.
 */
function updateNotesText(notesDoc: XmlDocument, text: string): XmlDocument {
  const placeholder = findNotesBodyPlaceholder(notesDoc);
  if (!placeholder) {
    return notesDoc;
  }

  // Create new text body
  const newTextBody = createElement("p:txBody", {}, [
    createElement("a:bodyPr"),
    createElement("a:lstStyle"),
    createElement("a:p", {}, [
      createElement("a:r", {}, [
        createElement("a:rPr", { lang: "en-US" }),
        createElement("a:t", {}, [{ type: "text", value: text }]),
      ]),
      createElement("a:endParaRPr", { lang: "en-US" }),
    ]),
  ]);

  // Replace txBody in placeholder
  const newChildren = placeholder.children.map((child) => {
    if (isXmlElement(child) && child.name === "p:txBody") {
      return newTextBody;
    }
    return child;
  });

  const newPlaceholder = setChildren(placeholder, newChildren);

  // Replace placeholder in spTree
  const spTree = getByPath(notesDoc, ["p:notes", "p:cSld", "p:spTree"]);
  if (!spTree) return notesDoc;

  const newSpTreeChildren = spTree.children.map((child) => {
    if (child === placeholder) {
      return newPlaceholder;
    }
    return child;
  });

  const newSpTree = setChildren(spTree, newSpTreeChildren);

  // Rebuild document
  const cSld = getByPath(notesDoc, ["p:notes", "p:cSld"]);
  if (!cSld) return notesDoc;

  const newCsldChildren = cSld.children.map((child) => {
    if (isXmlElement(child) && child.name === "p:spTree") {
      return newSpTree;
    }
    return child;
  });

  const newCsld = setChildren(cSld, newCsldChildren);

  const notes = getByPath(notesDoc, ["p:notes"]);
  if (!notes) return notesDoc;

  const newNotesChildren = notes.children.map((child) => {
    if (isXmlElement(child) && child.name === "p:cSld") {
      return newCsld;
    }
    return child;
  });

  const newNotes = setChildren(notes, newNotesChildren);

  return {
    children: notesDoc.children.map((child) => {
      if (isXmlElement(child) && child.name === "p:notes") {
        return newNotes;
      }
      return child;
    }),
  };
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Set the speaker notes for a slide.
 *
 * Creates a new notes slide if one doesn't exist.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @param slidePath - Path to the slide XML (e.g., "ppt/slides/slide1.xml")
 * @param spec - Notes specification
 */
export function setSlideNotes(
  pkg: ZipPackage,
  slidePath: string,
  spec: SimpleNotesSpec,
): void {
  const notesPath = getNotesPath(slidePath);
  const notesXml = pkg.readText(notesPath);

  if (notesXml) {
    // Update existing notes
    const notesDoc = parseXml(notesXml);
    const updatedDoc = updateNotesText(notesDoc, spec.text);
    const updatedXml = serializeDocument(updatedDoc, { declaration: true, standalone: true });
    pkg.writeText(notesPath, updatedXml);
  } else {
    // Create new notes slide
    // First, find the slide's relationship ID
    const slideRelsPath = getSlideRelsPath(slidePath);
    const slideRelsXml = pkg.readText(slideRelsPath);
    const slideFilename = slidePath.split("/").pop()!;
    const slideRId = "rId1"; // This is typically the slide's self-reference

    const notesDoc = createNotesSlideDocument(slideRId, spec.text);
    const notesXmlOut = serializeDocument(notesDoc, { declaration: true, standalone: true });
    pkg.writeText(notesPath, notesXmlOut);

    // Ensure content type
    const contentTypesPath = "[Content_Types].xml";
    const contentTypesXml = pkg.readText(contentTypesPath);
    if (contentTypesXml) {
      const ctDoc = parseXml(contentTypesXml);
      const updatedCtDoc = addOverride(ctDoc, `/${notesPath}`, NOTES_CONTENT_TYPE);
      pkg.writeText(contentTypesPath, serializeDocument(updatedCtDoc, { declaration: true, standalone: true }));
    }

    // Add relationship from slide to notes
    const relsDoc = ensureRelationshipsDocument(slideRelsXml ? parseXml(slideRelsXml) : null);
    const notesFilename = notesPath.split("/").pop()!;
    const { updatedXml: newRelsDoc } = addRelationship(
      relsDoc,
      `../notesSlides/${notesFilename}`,
      NOTES_REL_TYPE,
    );
    pkg.writeText(slideRelsPath, serializeDocument(newRelsDoc, { declaration: true, standalone: true }));

    // Create notes rels file
    const notesRelsPath = notesPath.replace(/\/([^/]+)\.xml$/, "/_rels/$1.xml.rels");
    const slideNum = slidePath.match(/slide(\d+)\.xml$/)?.[1] ?? "1";
    const notesRelsDoc: XmlDocument = {
      children: [
        createElement(
          "Relationships",
          { xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" },
          [
            createElement("Relationship", {
              Id: "rId1",
              Type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
              Target: `../slides/slide${slideNum}.xml`,
            }),
          ],
        ),
      ],
    };
    pkg.writeText(notesRelsPath, serializeDocument(notesRelsDoc, { declaration: true, standalone: true }));
  }
}

/**
 * Get the speaker notes text for a slide.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @param slidePath - Path to the slide XML
 * @returns Notes text, or undefined if no notes
 */
export function getSlideNotes(pkg: ZipPackage, slidePath: string): string | undefined {
  const notesPath = getNotesPath(slidePath);
  const notesXml = pkg.readText(notesPath);

  if (!notesXml) {
    return undefined;
  }

  const notesDoc = parseXml(notesXml);
  const placeholder = findNotesBodyPlaceholder(notesDoc);

  if (!placeholder) {
    return undefined;
  }

  const txBody = getChild(placeholder, "p:txBody");
  if (!txBody) {
    return undefined;
  }

  // Extract text from all paragraphs
  const paragraphs = getChildren(txBody, "a:p");
  const textParts: string[] = [];

  for (const p of paragraphs) {
    const runs = getChildren(p, "a:r");
    for (const r of runs) {
      const t = getChild(r, "a:t");
      if (t) {
        const textNode = t.children.find((c) => c.type === "text");
        if (textNode && textNode.type === "text") {
          textParts.push(textNode.value);
        }
      }
    }
  }

  return textParts.join("");
}
