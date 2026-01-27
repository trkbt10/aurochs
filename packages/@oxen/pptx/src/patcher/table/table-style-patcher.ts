/**
 * @file Table style patcher (Phase 10)
 *
 * Updates table style references (a:tblPr/a:tableStyleId) on a:tbl.
 */

import { createElement, createText, getChild, isXmlElement, type XmlElement } from "@oxen/xml";
import { removeChildren, replaceChildByName, setChildren } from "../core/xml-mutator";

function requireTable(tableElement: XmlElement): void {
  if (tableElement.name !== "a:tbl") {
    throw new Error(`patchTableStyleId: expected a:tbl, got ${tableElement.name}`);
  }
}

function ensureTblPr(table: XmlElement): XmlElement {
  const tblPr = getChild(table, "a:tblPr");
  if (tblPr) {
    return table;
  }
  const nextChildren = [createElement("a:tblPr"), ...table.children];
  return setChildren(table, nextChildren);
}

export function patchTableStyleId(tableElement: XmlElement, styleId: string | undefined): XmlElement {
  requireTable(tableElement);

  const withTblPr = ensureTblPr(tableElement);
  const tblPr = getChild(withTblPr, "a:tblPr");
  if (!tblPr) {
    throw new Error("patchTableStyleId: missing a:tblPr after ensure");
  }

  if (!styleId) {
    const cleaned = removeChildren(tblPr, (child) => isXmlElement(child) && child.name === "a:tableStyleId");
    return replaceChildByName(withTblPr, "a:tblPr", cleaned);
  }

  const tableStyleId = createElement("a:tableStyleId", {}, [createText(styleId)]);
  if (getChild(tblPr, "a:tableStyleId")) {
    const nextTblPr = replaceChildByName(tblPr, "a:tableStyleId", tableStyleId);
    return replaceChildByName(withTblPr, "a:tblPr", nextTblPr);
  }
  const nextTblPr = setChildren(tblPr, [...tblPr.children, tableStyleId]);
  return replaceChildByName(withTblPr, "a:tblPr", nextTblPr);
}
