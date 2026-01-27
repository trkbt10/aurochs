/**
 * @file Text patcher - apply TextBody changes to shape XML
 */

import { createElement, isXmlElement, type XmlElement } from "@oxen/xml";
import type { TextBodyChange } from "../core/shape-differ";
import { patchTextBodyElement, serializeTextBody } from "../serializer/text";

function findTxBodyIndex(shape: XmlElement): number {
  return shape.children.findIndex(
    (c) => isXmlElement(c) && (c.name === "p:txBody" || c.name === "a:txBody"),
  );
}

function findSpPrIndex(shape: XmlElement): number {
  return shape.children.findIndex((c) => isXmlElement(c) && c.name === "p:spPr");
}

function insertChildAt(shape: XmlElement, index: number, child: XmlElement): XmlElement {
  const nextChildren = [...shape.children];
  nextChildren.splice(index, 0, child);
  return { ...shape, children: nextChildren };
}

function removeTxBody(shape: XmlElement): XmlElement {
  return {
    ...shape,
    children: shape.children.filter(
      (c) => !(isXmlElement(c) && (c.name === "p:txBody" || c.name === "a:txBody")),
    ),
  };
}

function coerceTxBodyElement(txBody: XmlElement): XmlElement {
  // Ensure the element is p:txBody for slide shapes; callers may have a:txBody.
  if (txBody.name === "p:txBody") {
    return txBody;
  }
  return createElement("p:txBody", { ...txBody.attrs }, txBody.children);
}

export function applyTextBodyChangeToShape(shape: XmlElement, change: TextBodyChange): XmlElement {
  const newTextBody = change.newValue;

  if (!newTextBody) {
    return removeTxBody(shape);
  }

  const txBodyIndex = findTxBodyIndex(shape);
  if (txBodyIndex !== -1) {
    const existing = shape.children[txBodyIndex];
    if (!isXmlElement(existing)) {
      return shape;
    }
    const patched = patchTextBodyElement(coerceTxBodyElement(existing), newTextBody);
    return {
      ...shape,
      children: shape.children.map((c, i) => (i === txBodyIndex ? patched : c)),
    };
  }

  const txBody = serializeTextBody(newTextBody);
  const spPrIndex = findSpPrIndex(shape);
  const insertAt = spPrIndex !== -1 ? spPrIndex + 1 : shape.children.length;
  return insertChildAt(shape, insertAt, txBody);
}
