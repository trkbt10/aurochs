/**
 * @file Theme color scheme patcher
 *
 * Updates a:clrScheme entries (a:dk1, a:lt1, a:accent1, ...).
 *
 * @see docs/plans/pptx-export/phase-9-master-layout-theme.md
 */

import type { XmlElement, XmlNode } from "../../../xml";
import { isXmlElement } from "../../../xml";
import type { Color } from "../../domain/color/types";
import { createElement } from "../core/xml-mutator";
import { serializeColor } from "../serializer/color";

export type SchemeColorName =
  | "dk1" | "lt1" | "dk2" | "lt2"
  | "accent1" | "accent2" | "accent3" | "accent4" | "accent5" | "accent6"
  | "hlink" | "folHlink";

function schemeChildName(name: SchemeColorName): string {
  return `a:${name}`;
}

function upsertChildBeforeExtLst(parent: XmlElement, childName: string, newChild: XmlElement): XmlElement {
  const existingIndex = parent.children.findIndex((c) => isXmlElement(c) && c.name === childName);
  if (existingIndex !== -1) {
    return {
      ...parent,
      children: parent.children.map((c, i) => (i === existingIndex ? newChild : c)),
    };
  }

  const extLstIndex = parent.children.findIndex((c) => isXmlElement(c) && c.name === "a:extLst");
  const insertIndex = extLstIndex === -1 ? parent.children.length : extLstIndex;
  const nextChildren = [...parent.children];
  nextChildren.splice(insertIndex, 0, newChild);
  return { ...parent, children: nextChildren };
}

/**
 * Patch a single scheme color (e.g., accent1).
 *
 * Note: a:clrScheme colors are effectively base colors; this patcher intentionally
 * supports only srgb/system (the common theme representations).
 */
export function patchSchemeColor(
  colorScheme: XmlElement,
  name: SchemeColorName,
  color: Color,
): XmlElement {
  if (!colorScheme) {
    throw new Error("patchSchemeColor requires colorScheme.");
  }
  if (!name) {
    throw new Error("patchSchemeColor requires name.");
  }
  if (!color) {
    throw new Error("patchSchemeColor requires color.");
  }

  if (color.spec.type !== "srgb" && color.spec.type !== "system") {
    throw new Error(`patchSchemeColor only supports srgb/system, got: ${color.spec.type}`);
  }

  const entryName = schemeChildName(name);
  const existingEntry = colorScheme.children.find(
    (c): c is XmlElement => isXmlElement(c) && c.name === entryName,
  );

  const updatedEntry = (() => {
    if (!existingEntry) {
      return createElement(entryName, {}, [serializeColor(color)]);
    }

    const preserved: XmlNode[] = existingEntry.children.filter((c) => {
      if (!isXmlElement(c)) {
        return true;
      }
      return c.name === "a:extLst";
    });

    return createElement(existingEntry.name, { ...existingEntry.attrs }, [
      serializeColor(color),
      ...preserved,
    ]);
  })();

  return upsertChildBeforeExtLst(colorScheme, entryName, updatedEntry);
}
