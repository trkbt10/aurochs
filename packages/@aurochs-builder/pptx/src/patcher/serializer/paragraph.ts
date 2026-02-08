/**
 * @file Text serializer - paragraph (a:p) and run (a:r/a:br/a:fld)
 */

import { createElement, type XmlElement } from "@aurochs/xml";
import type { FieldRun, LineBreakRun, Paragraph, RegularRun, TextRun } from "@aurochs-office/pptx/domain/text";
import {
  serializeEndParaRunProperties,
  serializeParagraphProperties,
  serializeRunProperties,
  serializeText,
} from "./text-properties";

/** Serialize a text run to a:r element */
export function serializeTextRun(run: RegularRun): XmlElement {
  const children: XmlElement[] = [];
  if (run.properties) {
    children.push(serializeRunProperties(run.properties));
  }
  children.push(serializeText(run.text));
  return createElement("a:r", {}, children);
}

/** Serialize a line break to a:br element */
export function serializeLineBreak(lineBreak: LineBreakRun): XmlElement {
  const children: XmlElement[] = [];
  if (lineBreak.properties) {
    children.push(serializeRunProperties(lineBreak.properties));
  }
  return createElement("a:br", {}, children);
}

/** Serialize a text field to a:fld element */
export function serializeTextField(field: FieldRun): XmlElement {
  const children: XmlElement[] = [];
  if (field.properties) {
    children.push(serializeRunProperties(field.properties));
  }
  children.push(serializeText(field.text));
  return createElement("a:fld", { id: field.id, type: field.fieldType }, children);
}

/** Serialize a text run of any type */
export function serializeRun(run: TextRun): XmlElement {
  switch (run.type) {
    case "text":
      return serializeTextRun(run);
    case "break":
      return serializeLineBreak(run);
    case "field":
      return serializeTextField(run);
  }
}

/** Serialize a paragraph to a:p element */
export function serializeParagraph(paragraph: Paragraph): XmlElement {
  const children: XmlElement[] = [];

  if (Object.keys(paragraph.properties).length > 0) {
    children.push(serializeParagraphProperties(paragraph.properties));
  }

  for (const run of paragraph.runs) {
    children.push(serializeRun(run));
  }

  if (paragraph.endProperties) {
    children.push(serializeEndParaRunProperties(paragraph.endProperties));
  }

  return createElement("a:p", {}, children);
}
