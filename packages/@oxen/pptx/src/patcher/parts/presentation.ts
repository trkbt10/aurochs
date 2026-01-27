/**
 * @file presentation.xml patch helpers (slide list)
 *
 * Updates <p:sldIdLst> for slide insert/remove/reorder.
 */

import { createElement, isXmlElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import {
  getDocumentRoot,
  replaceChildByName,
  setChildren,
  updateDocumentRoot,
} from "../core/xml-mutator";

function requirePresentationRoot(doc: XmlDocument): XmlElement {
  const root = getDocumentRoot(doc);
  if (!root) {
    throw new Error("presentation.xml: missing root element");
  }
  if (root.name !== "p:presentation") {
    throw new Error(`presentation.xml: expected root p:presentation, got ${root.name}`);
  }
  return root;
}

function requireSldIdLst(root: XmlElement): XmlElement {
  const sldIdLst = root.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === "p:sldIdLst",
  );
  if (!sldIdLst) {
    throw new Error("presentation.xml: missing p:sldIdLst");
  }
  return sldIdLst;
}

function getSldIdElements(sldIdLst: XmlElement): XmlElement[] {
  return sldIdLst.children.filter(
    (c): c is XmlElement => isXmlElement(c) && c.name === "p:sldId",
  );
}

/**
 * Add a slide to <p:sldIdLst>.
 */
export function addSlideToList(
  presentationXml: XmlDocument,
  slideId: number,
  rId: string,
  position?: number,
): XmlDocument {
  if (!Number.isInteger(slideId) || slideId <= 0) {
    throw new Error(`addSlideToList: invalid slideId: ${slideId}`);
  }
  if (!rId) {
    throw new Error("addSlideToList: rId is required");
  }

  return updateDocumentRoot(presentationXml, (root) => {
    const pres = requirePresentationRoot({ children: [root] });
    const sldIdLst = requireSldIdLst(pres);

    const slides = getSldIdElements(sldIdLst);
    const insertIndex = position ?? slides.length;
    if (insertIndex < 0 || insertIndex > slides.length) {
      throw new Error(`addSlideToList: position out of range: ${insertIndex}`);
    }

    const nextSlides = [...slides];
    nextSlides.splice(
      insertIndex,
      0,
      createElement("p:sldId", { id: String(slideId), "r:id": rId }),
    );

    const updatedSldIdLst = setChildren(sldIdLst, nextSlides);
    return replaceChildByName(pres, "p:sldIdLst", updatedSldIdLst);
  });
}

/**
 * Remove a slide from <p:sldIdLst> by slide ID.
 */
export function removeSlideFromList(presentationXml: XmlDocument, slideId: number): XmlDocument {
  if (!Number.isInteger(slideId) || slideId <= 0) {
    throw new Error(`removeSlideFromList: invalid slideId: ${slideId}`);
  }

  return updateDocumentRoot(presentationXml, (root) => {
    const pres = requirePresentationRoot({ children: [root] });
    const sldIdLst = requireSldIdLst(pres);
    const slides = getSldIdElements(sldIdLst);

    const nextSlides = slides.filter((sld) => sld.attrs.id !== String(slideId));
    if (nextSlides.length === slides.length) {
      throw new Error(`removeSlideFromList: slideId not found: ${slideId}`);
    }

    const updatedSldIdLst = setChildren(sldIdLst, nextSlides);
    return replaceChildByName(pres, "p:sldIdLst", updatedSldIdLst);
  });
}

/**
 * Reorder a slide within <p:sldIdLst>.
 */
export function reorderSlideInList(
  presentationXml: XmlDocument,
  slideId: number,
  newPosition: number,
): XmlDocument {
  if (!Number.isInteger(slideId) || slideId <= 0) {
    throw new Error(`reorderSlideInList: invalid slideId: ${slideId}`);
  }
  if (!Number.isInteger(newPosition) || newPosition < 0) {
    throw new Error(`reorderSlideInList: invalid newPosition: ${newPosition}`);
  }

  return updateDocumentRoot(presentationXml, (root) => {
    const pres = requirePresentationRoot({ children: [root] });
    const sldIdLst = requireSldIdLst(pres);
    const slides = getSldIdElements(sldIdLst);
    if (newPosition >= slides.length) {
      throw new Error(`reorderSlideInList: newPosition out of range: ${newPosition}`);
    }

    const index = slides.findIndex((sld) => sld.attrs.id === String(slideId));
    if (index === -1) {
      throw new Error(`reorderSlideInList: slideId not found: ${slideId}`);
    }

    const nextSlides = [...slides];
    const [moved] = nextSlides.splice(index, 1);
    nextSlides.splice(newPosition, 0, moved);

    const updatedSldIdLst = setChildren(sldIdLst, nextSlides);
    return replaceChildByName(pres, "p:sldIdLst", updatedSldIdLst);
  });
}

