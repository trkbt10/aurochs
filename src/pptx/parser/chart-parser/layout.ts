/**
 * @file Layout parsing for charts
 *
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */

import type { Layout, ManualLayout } from "../../domain/chart";
import { getChild, getAttr as xmlGetAttr, type XmlElement } from "../../../xml";
import { getFloatAttr } from "../primitive";

/**
 * Safe getAttr that handles undefined elements
 */
function getAttr(element: XmlElement | undefined, name: string): string | undefined {
  if (!element) {return undefined;}
  return xmlGetAttr(element, name);
}

/**
 * Parse manual layout element
 * @see ECMA-376 Part 1, Section 21.2.2.95 (manualLayout)
 */
export function parseManualLayout(manualLayoutEl: XmlElement): ManualLayout {
  const layoutTargetEl = getChild(manualLayoutEl, "c:layoutTarget");
  const xModeEl = getChild(manualLayoutEl, "c:xMode");
  const yModeEl = getChild(manualLayoutEl, "c:yMode");
  const wModeEl = getChild(manualLayoutEl, "c:wMode");
  const hModeEl = getChild(manualLayoutEl, "c:hMode");
  const xEl = getChild(manualLayoutEl, "c:x");
  const yEl = getChild(manualLayoutEl, "c:y");
  const wEl = getChild(manualLayoutEl, "c:w");
  const hEl = getChild(manualLayoutEl, "c:h");

  return {
    layoutTarget: getAttr(layoutTargetEl, "val") as "inner" | "outer" | undefined,
    xMode: getAttr(xModeEl, "val") as "edge" | "factor" | undefined,
    yMode: getAttr(yModeEl, "val") as "edge" | "factor" | undefined,
    wMode: getAttr(wModeEl, "val") as "edge" | "factor" | undefined,
    hMode: getAttr(hModeEl, "val") as "edge" | "factor" | undefined,
    x: getFloatAttr(xEl, "val"),
    y: getFloatAttr(yEl, "val"),
    w: getFloatAttr(wEl, "val"),
    h: getFloatAttr(hEl, "val"),
  };
}

/**
 * Parse layout element
 * @see ECMA-376 Part 1, Section 21.2.2.81 (layout)
 */
export function parseLayout(layoutEl: XmlElement | undefined): Layout | undefined {
  if (!layoutEl) {return undefined;}

  const manualLayoutEl = getChild(layoutEl, "c:manualLayout");
  if (!manualLayoutEl) {
    // Empty layout element = automatic layout
    return {};
  }

  return {
    manualLayout: parseManualLayout(manualLayoutEl),
  };
}
