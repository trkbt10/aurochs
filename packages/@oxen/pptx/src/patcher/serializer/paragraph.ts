/**
 * @file Text serializer - paragraph (a:p) and run (a:r/a:br/a:fld)
 */

import { createElement, type XmlElement } from "@oxen/xml";
import type { FieldRun, LineBreakRun, Paragraph, RegularRun, TextRun } from "../../domain/text";
import {
  serializeEndParaRunProperties,
  serializeParagraphProperties,
  serializeRunProperties,
  serializeText,
} from "./text-properties";

export function serializeTextRun(run: RegularRun): XmlElement {
  const children: XmlElement[] = [];
  if (run.properties) {
    children.push(serializeRunProperties(run.properties));
  }
  children.push(serializeText(run.text));
  return createElement("a:r", {}, children);
}

export function serializeLineBreak(lineBreak: LineBreakRun): XmlElement {
  const children: XmlElement[] = [];
  if (lineBreak.properties) {
    children.push(serializeRunProperties(lineBreak.properties));
  }
  return createElement("a:br", {}, children);
}

export function serializeTextField(field: FieldRun): XmlElement {
  const children: XmlElement[] = [];
  if (field.properties) {
    children.push(serializeRunProperties(field.properties));
  }
  children.push(serializeText(field.text));
  return createElement("a:fld", { id: field.id, type: field.fieldType }, children);
}

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

