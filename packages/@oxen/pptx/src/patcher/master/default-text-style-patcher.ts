/**
 * @file Master text style patching helpers
 *
 * Patches p:txStyles list-style levels (a:defPPr, a:lvl1pPr..a:lvl9pPr) while
 * preserving unspecified attributes/children to avoid breaking inheritance.
 *
 * @see docs/plans/pptx-export/phase-9-master-layout-theme.md
 */

import { createElement, isXmlElement, type XmlElement, type XmlNode } from "@oxen/xml";
import type { ParagraphProperties, TextLevelStyle, TextStyleLevels } from "../../domain";
import { serializeParagraphProperties } from "../serializer";

const BULLET_ELEMENT_NAMES = [
  "a:buNone",
  "a:buAutoNum",
  "a:buChar",
  "a:buBlip",
  "a:buClr",
  "a:buClrTx",
  "a:buSzTx",
  "a:buSzPct",
  "a:buSzPts",
  "a:buFontTx",
  "a:buFont",
] as const;

type BulletElementName = (typeof BULLET_ELEMENT_NAMES)[number];

function hasAnyParagraphPatch(props: ParagraphProperties): boolean {
  return Object.keys(props).length > 0;
}

function getTextStyleLevelElementName(level: number): string {
  if (!Number.isInteger(level) || level < 1 || level > 9) {
    throw new Error(`Text style level must be an integer 1-9, got: ${String(level)}`);
  }
  return `a:lvl${level}pPr`;
}

function buildParagraphPropertiesPatch(style: TextLevelStyle): ParagraphProperties | null {
  const base = style.paragraphProperties ?? {};
  const merged = (() => {
    if (style.defaultRunProperties === undefined) {
      return base;
    }
    return { ...base, defaultRunProperties: style.defaultRunProperties };
  })();

  if (!hasAnyParagraphPatch(merged)) {
    return null;
  }
  return merged;
}

function getChildElement(parent: XmlElement, name: string): XmlElement | undefined {
  return parent.children.find((c): c is XmlElement => isXmlElement(c) && c.name === name);
}

function upsertChildBeforeExtLst(
  parent: XmlElement,
  childName: string,
  newChild: XmlElement,
): XmlElement {
  const existingIndex = parent.children.findIndex(
    (c) => isXmlElement(c) && c.name === childName,
  );
  if (existingIndex !== -1) {
    return {
      ...parent,
      children: parent.children.map((c, i) => (i === existingIndex ? newChild : c)),
    };
  }

  const extLstIndex = parent.children.findIndex(
    (c) => isXmlElement(c) && c.name === "a:extLst",
  );
  const insertIndex = extLstIndex === -1 ? parent.children.length : extLstIndex;
  const nextChildren = [...parent.children];
  nextChildren.splice(insertIndex, 0, newChild);
  return { ...parent, children: nextChildren };
}

function renameElement(element: XmlElement, name: string): XmlElement {
  return { ...element, name };
}

function findElementsByName(children: readonly XmlNode[], name: string): XmlElement[] {
  return children.filter((c): c is XmlElement => isXmlElement(c) && c.name === name);
}

function shouldPatchBulletStyle(props: ParagraphProperties): boolean {
  return props.bulletStyle !== undefined;
}

function shouldPatchTabStops(props: ParagraphProperties): boolean {
  // Empty array means explicit clear.
  return props.tabStops !== undefined;
}

function shouldPatchDefaultRunProperties(props: ParagraphProperties): boolean {
  return props.defaultRunProperties !== undefined;
}

function buildPatchedChildren(
  serialized: XmlElement,
  patch: ParagraphProperties,
): XmlElement[] {
  const children: XmlElement[] = [];

  if (patch.lineSpacing !== undefined) {
    children.push(...findElementsByName(serialized.children, "a:lnSpc"));
  }
  if (patch.spaceBefore !== undefined) {
    children.push(...findElementsByName(serialized.children, "a:spcBef"));
  }
  if (patch.spaceAfter !== undefined) {
    children.push(...findElementsByName(serialized.children, "a:spcAft"));
  }

  if (shouldPatchBulletStyle(patch)) {
    children.push(
      ...serialized.children.filter(
        (c): c is XmlElement =>
          isXmlElement(c) && (BULLET_ELEMENT_NAMES as readonly string[]).includes(c.name),
      ),
    );
  }

  if (shouldPatchTabStops(patch)) {
    children.push(...findElementsByName(serialized.children, "a:tabLst"));
  }

  if (shouldPatchDefaultRunProperties(patch)) {
    children.push(...findElementsByName(serialized.children, "a:defRPr"));
  }

  return children;
}

function buildRemovalSet(patch: ParagraphProperties): ReadonlySet<string> {
  const remove = new Set<string>();

  if (patch.lineSpacing !== undefined) remove.add("a:lnSpc");
  if (patch.spaceBefore !== undefined) remove.add("a:spcBef");
  if (patch.spaceAfter !== undefined) remove.add("a:spcAft");
  if (shouldPatchTabStops(patch)) remove.add("a:tabLst");
  if (shouldPatchDefaultRunProperties(patch)) remove.add("a:defRPr");
  if (shouldPatchBulletStyle(patch)) {
    for (const name of BULLET_ELEMENT_NAMES) remove.add(name);
  }

  return remove;
}

/**
 * Patch an existing master/list-style level element (a:defPPr or a:lvlNpPr).
 *
 * - Merges attributes (existing preserved unless explicitly provided)
 * - Replaces only explicitly-patched child groups (spacing, bullets, tabs, defRPr)
 * - Inserts patched children before a:extLst when present
 */
export function patchTextStyleLevelElement(
  existing: XmlElement,
  patch: ParagraphProperties,
): XmlElement {
  const serialized = renameElement(serializeParagraphProperties(patch), existing.name);
  const mergedAttrs: Record<string, string> = { ...existing.attrs, ...serialized.attrs };

  const removal = buildRemovalSet(patch);
  const keptChildren = existing.children.filter(
    (c) => !(isXmlElement(c) && removal.has(c.name)),
  );

  const toInsert = buildPatchedChildren(serialized, patch);

  const extLstIndex = keptChildren.findIndex(
    (c) => isXmlElement(c) && c.name === "a:extLst",
  );
  const before = extLstIndex === -1 ? keptChildren : keptChildren.slice(0, extLstIndex);
  const after = extLstIndex === -1 ? [] : keptChildren.slice(extLstIndex);

  return createElement(existing.name, mergedAttrs, [...before, ...toInsert, ...after]);
}

/**
 * Patch a p:titleStyle/p:bodyStyle/p:otherStyle element using TextStyleLevels.
 */
export function patchTextStyleLevelsElement(
  styleElement: XmlElement,
  levels: TextStyleLevels,
): XmlElement {
  let updated = styleElement;

  const apply = (childName: string, levelStyle: TextLevelStyle | undefined) => {
    if (!levelStyle) {
      return;
    }
    const patch = buildParagraphPropertiesPatch(levelStyle);
    if (!patch) {
      return;
    }
    const existing = getChildElement(updated, childName);
    if (existing) {
      updated = upsertChildBeforeExtLst(
        updated,
        childName,
        patchTextStyleLevelElement(existing, patch),
      );
      return;
    }
    const created = renameElement(serializeParagraphProperties(patch), childName);
    updated = upsertChildBeforeExtLst(updated, childName, created);
  };

  apply("a:defPPr", levels.defaultStyle);
  apply("a:lvl1pPr", levels.level1);
  apply("a:lvl2pPr", levels.level2);
  apply("a:lvl3pPr", levels.level3);
  apply("a:lvl4pPr", levels.level4);
  apply("a:lvl5pPr", levels.level5);
  apply("a:lvl6pPr", levels.level6);
  apply("a:lvl7pPr", levels.level7);
  apply("a:lvl8pPr", levels.level8);
  apply("a:lvl9pPr", levels.level9);

  return updated;
}

/**
 * Patch a specific text style level (1-9) in a style container element.
 */
export function patchTextStyleLevelByNumber(
  styleElement: XmlElement,
  level: number,
  patch: ParagraphProperties,
): XmlElement {
  const childName = getTextStyleLevelElementName(level);
  const existing = getChildElement(styleElement, childName);
  if (existing) {
    return upsertChildBeforeExtLst(
      styleElement,
      childName,
      patchTextStyleLevelElement(existing, patch),
    );
  }
  const created = renameElement(serializeParagraphProperties(patch), childName);
  return upsertChildBeforeExtLst(styleElement, childName, created);
}

export type { BulletElementName };
