/**
 * @file Theme patcher
 *
 * Applies changes to theme.xml (a:theme).
 *
 * @see docs/plans/pptx-export/phase-9-master-layout-theme.md
 */

import { createElement, getChild, isXmlElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import type { Color, SchemeColorName } from "@oxen-office/ooxml/domain/color";
import type { FontScheme } from "@oxen-office/ooxml/domain/font-scheme";
import type { FormatScheme } from "../../domain/theme/types";
import { replaceChildByName, updateDocumentRoot } from "../core/xml-mutator";
import { patchSchemeColor } from "./color-scheme-patcher";
import { patchMajorFont, patchMinorFont } from "./font-scheme-patcher";

/**
 * Color scheme patch - partial color changes to apply to a:clrScheme.
 * Uses Color objects (not hex strings) for proper serialization.
 */
export type ColorSchemePatch = Partial<Record<SchemeColorName, Color>>;

export type ThemeChange =
  | { readonly type: "colorScheme"; readonly scheme: ColorSchemePatch }
  | { readonly type: "fontScheme"; readonly scheme: FontScheme }
  | { readonly type: "formatScheme"; readonly scheme: FormatScheme };

function requireThemeElements(root: XmlElement): XmlElement {
  const themeElements = getChild(root, "a:themeElements");
  if (!themeElements) {
    throw new Error("patchTheme: missing a:themeElements element.");
  }
  return themeElements;
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

function patchFormatSchemeElement(fmtScheme: XmlElement, scheme: FormatScheme): XmlElement {
  const buildStyleList = (name: string, entries: readonly XmlElement[]): XmlElement => {
    const existing = getChild(fmtScheme, name);
    if (!existing) {
      return createElement(name, {}, entries);
    }
    const preserved = existing.children.filter((c) => !isXmlElement(c) || c.name === "a:extLst");
    return {
      ...existing,
      children: [...entries, ...preserved],
    };
  };

  let updated = fmtScheme;
  updated = upsertChildBeforeExtLst(updated, "a:fillStyleLst", buildStyleList("a:fillStyleLst", scheme.fillStyles));
  updated = upsertChildBeforeExtLst(updated, "a:lnStyleLst", buildStyleList("a:lnStyleLst", scheme.lineStyles));
  updated = upsertChildBeforeExtLst(updated, "a:effectStyleLst", buildStyleList("a:effectStyleLst", scheme.effectStyles));
  updated = upsertChildBeforeExtLst(updated, "a:bgFillStyleLst", buildStyleList("a:bgFillStyleLst", scheme.bgFillStyles));
  return updated;
}

function applyColorScheme(themeElements: XmlElement, scheme: ColorSchemePatch): XmlElement {
  const clrScheme = getChild(themeElements, "a:clrScheme");
  if (!clrScheme) {
    throw new Error("patchTheme: missing a:clrScheme.");
  }

  let updatedClrScheme = clrScheme;
  for (const [name, color] of Object.entries(scheme) as Array<[SchemeColorName, Color]>) {
    if (!color) {
      continue;
    }
    updatedClrScheme = patchSchemeColor(updatedClrScheme, name, color);
  }

  return replaceChildByName(themeElements, "a:clrScheme", updatedClrScheme);
}

function applyFontScheme(themeElements: XmlElement, scheme: FontScheme): XmlElement {
  const fontScheme = getChild(themeElements, "a:fontScheme");
  if (!fontScheme) {
    throw new Error("patchTheme: missing a:fontScheme.");
  }
  let updated = fontScheme;
  updated = patchMajorFont(updated, scheme.majorFont);
  updated = patchMinorFont(updated, scheme.minorFont);
  return replaceChildByName(themeElements, "a:fontScheme", updated);
}

function applyFormatScheme(themeElements: XmlElement, scheme: FormatScheme): XmlElement {
  const fmtScheme = getChild(themeElements, "a:fmtScheme");
  if (!fmtScheme) {
    throw new Error("patchTheme: missing a:fmtScheme.");
  }
  const updated = patchFormatSchemeElement(fmtScheme, scheme);
  return replaceChildByName(themeElements, "a:fmtScheme", updated);
}

/**
 * Apply theme changes to theme.xml.
 */
export function patchTheme(themeXml: XmlDocument, changes: readonly ThemeChange[]): XmlDocument {
  if (!themeXml) {
    throw new Error("patchTheme requires themeXml.");
  }
  if (!changes) {
    throw new Error("patchTheme requires changes.");
  }

  let result = themeXml;

  for (const change of changes) {
    result = updateDocumentRoot(result, (root) => {
      if (root.name !== "a:theme") {
        throw new Error(`patchTheme: unexpected root element: ${root.name}`);
      }

      const themeElements = requireThemeElements(root);
      let updatedThemeElements = themeElements;
      switch (change.type) {
        case "colorScheme":
          updatedThemeElements = applyColorScheme(themeElements, change.scheme);
          break;
        case "fontScheme":
          updatedThemeElements = applyFontScheme(themeElements, change.scheme);
          break;
        case "formatScheme":
          updatedThemeElements = applyFormatScheme(themeElements, change.scheme);
          break;
      }

      return replaceChildByName(root, "a:themeElements", updatedThemeElements);
    });
  }

  return result;
}
