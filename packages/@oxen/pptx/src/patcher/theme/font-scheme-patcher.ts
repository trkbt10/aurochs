/**
 * @file Theme font scheme patcher
 *
 * Updates a:fontScheme major/minor font entries.
 *
 * @see docs/plans/pptx-export/phase-9-master-layout-theme.md
 */

import { createElement, getChild, isXmlElement, type XmlElement } from "@oxen/xml";
import type { FontSpec } from "../../domain/resolution";

function upsertTypeface(
  fontElement: XmlElement,
  childName: "a:latin" | "a:ea" | "a:cs",
  typeface: string | undefined,
): XmlElement {
  if (typeface === undefined) {
    return fontElement;
  }

  const existingIndex = fontElement.children.findIndex(
    (c) => isXmlElement(c) && c.name === childName,
  );
  const updatedChild = (() => {
    if (existingIndex === -1) {
      return createElement(childName, { typeface }, []);
    }
    const existingChild = fontElement.children[existingIndex] as XmlElement;
    return {
      ...existingChild,
      attrs: {
        ...existingChild.attrs,
        typeface,
      },
    };
  })();

  if (existingIndex !== -1) {
    return {
      ...fontElement,
      children: fontElement.children.map((c, i) => (i === existingIndex ? updatedChild : c)),
    };
  }

  const extLstIndex = fontElement.children.findIndex(
    (c) => isXmlElement(c) && c.name === "a:extLst",
  );
  const insertIndex = extLstIndex === -1 ? fontElement.children.length : extLstIndex;
  const nextChildren = [...fontElement.children];
  nextChildren.splice(insertIndex, 0, updatedChild);
  return { ...fontElement, children: nextChildren };
}

function patchFont(
  fontScheme: XmlElement,
  fontName: "a:majorFont" | "a:minorFont",
  fontFamily: FontSpec,
): XmlElement {
  const existing = getChild(fontScheme, fontName) ?? createElement(fontName, {}, []);
  const withLatin = upsertTypeface(existing, "a:latin", fontFamily.latin);
  const withEa = upsertTypeface(withLatin, "a:ea", fontFamily.eastAsian);
  const withCs = upsertTypeface(withEa, "a:cs", fontFamily.complexScript);

  const existingIndex = fontScheme.children.findIndex(
    (c) => isXmlElement(c) && c.name === fontName,
  );
  if (existingIndex !== -1) {
    return {
      ...fontScheme,
      children: fontScheme.children.map((c, i) => (i === existingIndex ? withCs : c)),
    };
  }

  const extLstIndex = fontScheme.children.findIndex((c) => isXmlElement(c) && c.name === "a:extLst");
  const insertIndex = extLstIndex === -1 ? fontScheme.children.length : extLstIndex;
  const nextChildren = [...fontScheme.children];
  nextChildren.splice(insertIndex, 0, withCs);
  return { ...fontScheme, children: nextChildren };
}

export function patchMajorFont(fontScheme: XmlElement, fontFamily: FontSpec): XmlElement {
  if (!fontScheme) {
    throw new Error("patchMajorFont requires fontScheme.");
  }
  if (!fontFamily) {
    throw new Error("patchMajorFont requires fontFamily.");
  }
  return patchFont(fontScheme, "a:majorFont", fontFamily);
}

export function patchMinorFont(fontScheme: XmlElement, fontFamily: FontSpec): XmlElement {
  if (!fontScheme) {
    throw new Error("patchMinorFont requires fontScheme.");
  }
  if (!fontFamily) {
    throw new Error("patchMinorFont requires fontFamily.");
  }
  return patchFont(fontScheme, "a:minorFont", fontFamily);
}
