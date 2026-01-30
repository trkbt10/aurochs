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

  const withFill = upsertChildBeforeExtLst(fmtScheme, "a:fillStyleLst", buildStyleList("a:fillStyleLst", scheme.fillStyles));
  const withLine = upsertChildBeforeExtLst(withFill, "a:lnStyleLst", buildStyleList("a:lnStyleLst", scheme.lineStyles));
  const withEffect = upsertChildBeforeExtLst(withLine, "a:effectStyleLst", buildStyleList("a:effectStyleLst", scheme.effectStyles));
  return upsertChildBeforeExtLst(withEffect, "a:bgFillStyleLst", buildStyleList("a:bgFillStyleLst", scheme.bgFillStyles));
}

function applyColorScheme(themeElements: XmlElement, scheme: ColorSchemePatch): XmlElement {
  const clrScheme = getChild(themeElements, "a:clrScheme");
  if (!clrScheme) {
    throw new Error("patchTheme: missing a:clrScheme.");
  }

  const entries = Object.entries(scheme) as Array<[SchemeColorName, Color]>;
  const updatedClrScheme = entries.reduce((current, [name, color]) => {
    if (!color) {
      return current;
    }
    return patchSchemeColor(current, name, color);
  }, clrScheme);

  return replaceChildByName(themeElements, "a:clrScheme", updatedClrScheme);
}

function applyFontScheme(themeElements: XmlElement, scheme: FontScheme): XmlElement {
  const fontScheme = getChild(themeElements, "a:fontScheme");
  if (!fontScheme) {
    throw new Error("patchTheme: missing a:fontScheme.");
  }
  const withMajor = patchMajorFont(fontScheme, scheme.majorFont);
  const updated = patchMinorFont(withMajor, scheme.minorFont);
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

  return changes.reduce((current, change) => {
    return updateDocumentRoot(current, (root) => {
      if (root.name !== "a:theme") {
        throw new Error(`patchTheme: unexpected root element: ${root.name}`);
      }

      const themeElements = requireThemeElements(root);
      const updatedThemeElements = (() => {
        switch (change.type) {
          case "colorScheme":
            return applyColorScheme(themeElements, change.scheme);
          case "fontScheme":
            return applyFontScheme(themeElements, change.scheme);
          case "formatScheme":
            return applyFormatScheme(themeElements, change.scheme);
        }
      })();

      return replaceChildByName(root, "a:themeElements", updatedThemeElements);
    });
  }, themeXml);
}
