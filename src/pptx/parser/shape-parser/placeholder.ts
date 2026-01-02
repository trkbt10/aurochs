/**
 * @file Placeholder resolution for shapes
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 */

import { getAttr, getChild, type XmlElement } from "../../../xml";
import type { PlaceholderContext } from "../context";

/**
 * Resolved placeholder nodes for inheritance
 */
export type ResolvedPlaceholders = {
  layout: XmlElement | undefined;
  master: XmlElement | undefined;
};

/**
 * Extract placeholder type from a shape node.
 *
 * Path: p:sp/p:nvSpPr/p:nvPr/p:ph@type
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 */
export function getPlaceholderTypeFromNode(node: XmlElement | undefined): string | undefined {
  if (!node) {
    return undefined;
  }

  const nvSpPr = getChild(node, "p:nvSpPr");
  if (!nvSpPr) {
    return undefined;
  }

  const nvPr = getChild(nvSpPr, "p:nvPr");
  if (!nvPr) {
    return undefined;
  }

  const ph = getChild(nvPr, "p:ph");
  if (!ph) {
    return undefined;
  }

  return getAttr(ph, "type");
}

/**
 * Resolve placeholder type from inheritance chain.
 *
 * Per ECMA-376 Part 1, Section 19.3.1.36:
 * When a placeholder has only idx (no type), the type should be
 * inherited from the corresponding placeholder in the layout or master.
 *
 * Inheritance order: slide -> layout -> master
 *
 * @param directType - Type directly specified on the slide placeholder
 * @param layoutNode - Resolved layout placeholder node
 * @param masterNode - Resolved master placeholder node
 * @returns Resolved placeholder type
 */
export function resolvePlaceholderType(
  directType: string | undefined,
  layoutNode: XmlElement | undefined,
  masterNode: XmlElement | undefined,
): string | undefined {
  // 1. Use direct type if specified
  if (directType !== undefined) {
    return directType;
  }

  // 2. Inherit from layout placeholder
  const layoutType = getPlaceholderTypeFromNode(layoutNode);
  if (layoutType !== undefined) {
    return layoutType;
  }

  // 3. Inherit from master placeholder
  const masterType = getPlaceholderTypeFromNode(masterNode);
  if (masterType !== undefined) {
    return masterType;
  }

  return undefined;
}

/**
 * Resolve layout and master placeholder nodes for a shape.
 * Uses idx first (if present), then falls back to type.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 */
export function resolveLayoutAndMasterNodes(
  ctx: PlaceholderContext | undefined,
  idx: number | undefined,
  type: string | undefined,
): ResolvedPlaceholders {
  if (ctx === undefined) {
    return { layout: undefined, master: undefined };
  }

  // Prefer idx over type for matching (idx is number per ECMA-376 xsd:unsignedInt)
  if (idx !== undefined) {
    return {
      layout: ctx.layout.byIdx.get(idx),
      master: resolveMasterForIdx(ctx, idx, type),
    };
  }
  if (type !== undefined) {
    return {
      layout: ctx.layout.byType[type],
      master: ctx.master.byType[type],
    };
  }

  return { layout: undefined, master: undefined };
}

function resolveMasterForIdx(
  ctx: PlaceholderContext,
  idx: number,
  type: string | undefined,
): XmlElement | undefined {
  if (type !== undefined) {
    return ctx.master.byType[type];
  }
  return ctx.master.byIdx.get(idx);
}
