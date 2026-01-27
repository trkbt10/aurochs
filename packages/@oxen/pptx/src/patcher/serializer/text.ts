/**
 * @file Text serializer - TextBody (p:txBody)
 *
 * Serializes domain TextBody to DrawingML text body XML.
 */

import { createElement, isXmlElement, type XmlElement, type XmlNode } from "@oxen/xml";
import type { TextBody } from "../../domain/text";
import { serializeParagraph } from "./paragraph";
import { serializeBodyProperties } from "./text-properties";

function createEmptyParagraph(): XmlElement {
  return createElement("a:p");
}

export function serializeTextBody(textBody: TextBody): XmlElement {
  const paragraphs: XmlElement[] = [];
  if (textBody.paragraphs.length > 0) {
    paragraphs.push(...textBody.paragraphs.map(serializeParagraph));
  } else {
    paragraphs.push(createEmptyParagraph());
  }

  return createElement("p:txBody", {}, [
    serializeBodyProperties(textBody.bodyProperties),
    createElement("a:lstStyle"),
    ...paragraphs,
  ]);
}

export function serializeDrawingTextBody(textBody: TextBody): XmlElement {
  const paragraphs: XmlElement[] = [];
  if (textBody.paragraphs.length > 0) {
    paragraphs.push(...textBody.paragraphs.map(serializeParagraph));
  } else {
    paragraphs.push(createEmptyParagraph());
  }

  return createElement("a:txBody", {}, [
    serializeBodyProperties(textBody.bodyProperties),
    createElement("a:lstStyle"),
    ...paragraphs,
  ]);
}

/**
 * Patch a p:txBody element, preserving existing bodyPr/lstStyle while replacing paragraphs.
 */
export function patchTextBodyElement(existingTxBody: XmlElement, textBody: TextBody): XmlElement {
  const existingBodyPr = existingTxBody.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === "a:bodyPr",
  );
  const existingLstStyle = existingTxBody.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === "a:lstStyle",
  );

  const otherChildren: XmlNode[] = existingTxBody.children.filter((c) => {
    if (!isXmlElement(c)) {
      return true;
    }
    return c.name !== "a:bodyPr" && c.name !== "a:lstStyle" && c.name !== "a:p";
  });

  const paragraphs: XmlElement[] = [];
  if (textBody.paragraphs.length > 0) {
    paragraphs.push(...textBody.paragraphs.map(serializeParagraph));
  } else {
    paragraphs.push(createEmptyParagraph());
  }

  return createElement(existingTxBody.name, { ...existingTxBody.attrs }, [
    existingBodyPr ?? serializeBodyProperties(textBody.bodyProperties),
    existingLstStyle ?? createElement("a:lstStyle"),
    ...paragraphs,
    ...otherChildren,
  ]);
}
