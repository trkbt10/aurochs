/**
 * @file Slide layout domain helpers
 */

import type { XmlDocument, XmlElement } from "../../../xml";
import { getByPath } from "../../../xml";
import type { SlideLayoutType } from "./types";

export type SlideLayoutAttributes = {
  readonly type?: SlideLayoutType;
  readonly name?: string;
  readonly matchingName?: string;
  readonly showMasterShapes?: boolean;
  readonly showMasterPhAnim?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
};

type AttrUpdates = Record<string, string | undefined>;

function toBooleanAttr(value: boolean | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? "1" : "0";
}

function updateAttrs(attrs: Readonly<Record<string, string>>, updates: AttrUpdates): Record<string, string> {
  const nextAttrs: Record<string, string> = { ...attrs };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete nextAttrs[key];
    } else {
      nextAttrs[key] = value;
    }
  }
  return nextAttrs;
}

function updateElementAttrs(element: XmlElement, updates: AttrUpdates): XmlElement {
  return {
    ...element,
    attrs: updateAttrs(element.attrs, updates),
  };
}

function updateChildElement(
  element: XmlElement,
  childName: string,
  updater: (child: XmlElement) => XmlElement,
): XmlElement {
  let updated = false;
  const children = element.children.map((child) => {
    if (child.type !== "element") {
      return child;
    }
    if (child.name !== childName) {
      return child;
    }
    updated = true;
    return updater(child);
  });

  if (!updated) {
    throw new Error(`Missing ${childName} element for slide layout update.`);
  }

  return {
    ...element,
    children,
  };
}

function requireLayoutElement(layoutDoc: XmlDocument): XmlElement {
  const layoutElement = getByPath(layoutDoc, ["p:sldLayout"]);
  if (!layoutElement) {
    throw new Error("Slide layout document missing p:sldLayout element.");
  }
  return layoutElement;
}

function requireCommonSlideElement(layoutElement: XmlElement): XmlElement {
  const commonSlide = getByPath(layoutElement, ["p:cSld"]);
  if (!commonSlide) {
    throw new Error("Slide layout missing p:cSld element.");
  }
  return commonSlide;
}

/**
 * Extract slide layout attributes from layout XML.
 */
export function getSlideLayoutAttributes(layoutDoc: XmlDocument): SlideLayoutAttributes {
  if (!layoutDoc) {
    throw new Error("getSlideLayoutAttributes requires a layout document.");
  }

  const layoutElement = requireLayoutElement(layoutDoc);
  const commonSlide = requireCommonSlideElement(layoutElement);

  const rawType = layoutElement.attrs["type"];
  const rawMatchingName = layoutElement.attrs["matchingName"];
  const rawShowMasterShapes = layoutElement.attrs["showMasterSp"];
  const rawShowMasterPhAnim = layoutElement.attrs["showMasterPhAnim"];
  const rawPreserve = layoutElement.attrs["preserve"];
  const rawUserDrawn = layoutElement.attrs["userDrawn"];
  const rawName = commonSlide.attrs["name"];

  return {
    type: rawType as SlideLayoutType | undefined,
    name: rawName,
    matchingName: rawMatchingName,
    showMasterShapes: rawShowMasterShapes === undefined ? undefined : rawShowMasterShapes !== "0",
    showMasterPhAnim: rawShowMasterPhAnim === undefined ? undefined : rawShowMasterPhAnim !== "0",
    preserve: rawPreserve === undefined ? undefined : rawPreserve !== "0",
    userDrawn: rawUserDrawn === undefined ? undefined : rawUserDrawn !== "0",
  };
}

/**
 * Apply slide layout attribute updates to a layout document.
 */
export function applySlideLayoutAttributes(
  layoutDoc: XmlDocument,
  attributes: SlideLayoutAttributes,
): XmlDocument {
  if (!layoutDoc) {
    throw new Error("applySlideLayoutAttributes requires a layout document.");
  }
  if (!attributes) {
    throw new Error("applySlideLayoutAttributes requires attributes.");
  }

  const layoutElement = requireLayoutElement(layoutDoc);
  const updatedLayout = updateElementAttrs(layoutElement, {
    type: attributes.type,
    matchingName: attributes.matchingName,
    showMasterSp: toBooleanAttr(attributes.showMasterShapes),
    showMasterPhAnim: toBooleanAttr(attributes.showMasterPhAnim),
    preserve: toBooleanAttr(attributes.preserve),
    userDrawn: toBooleanAttr(attributes.userDrawn),
  });

  const updatedLayoutWithName = updateChildElement(updatedLayout, "p:cSld", (child) =>
    updateElementAttrs(child, { name: attributes.name }),
  );

  return {
    ...layoutDoc,
    children: layoutDoc.children.map((child) => {
      if (child.type !== "element") {
        return child;
      }
      return child.name === "p:sldLayout" ? updatedLayoutWithName : child;
    }),
  };
}
