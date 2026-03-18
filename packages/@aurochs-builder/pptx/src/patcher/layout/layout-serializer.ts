/**
 * @file Layout serializer
 *
 * Generates and patches slide layout XML documents.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (p:sldLayout)
 */

import { createElement, type XmlDocument } from "@aurochs/xml";
import type { SlideLayoutType } from "@aurochs-office/pptx/domain/slide/types";
import {
  applySlideLayoutAttributes,
  type SlideLayoutAttributes,
} from "@aurochs-office/pptx/parser/slide/layout-parser";

// =============================================================================
// Types
// =============================================================================

/**
 * Parameters for creating a new blank slide layout XML.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (p:sldLayout)
 */
export type SerializeSlideLayoutParams = {
  /** User-defined name for p:cSld@name */
  readonly name?: string;
  /** Layout type (e.g., "blank", "title", "obj") @see ST_SlideLayoutType */
  readonly type?: SlideLayoutType;
  /** Whether layout is preserved during save */
  readonly preserve?: boolean;
  /** Whether layout was user-drawn */
  readonly userDrawn?: boolean;
  /** Whether to show master shapes (showMasterSp) */
  readonly showMasterShapes?: boolean;
};

// =============================================================================
// Layout Serializer
// =============================================================================

/**
 * Build root attributes for p:sldLayout element.
 *
 * Only includes attributes that are explicitly provided.
 * Boolean values are serialized as "1"/"0" per ECMA-376.
 */
function buildLayoutAttrs(params: SerializeSlideLayoutParams): Record<string, string> {
  const attrs: Record<string, string> = {
    "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
  };

  if (params.type !== undefined) {
    attrs.type = params.type;
  }
  if (params.preserve !== undefined) {
    attrs.preserve = params.preserve ? "1" : "0";
  }
  if (params.userDrawn !== undefined) {
    attrs.userDrawn = params.userDrawn ? "1" : "0";
  }
  if (params.showMasterShapes !== undefined) {
    attrs.showMasterSp = params.showMasterShapes ? "1" : "0";
  }

  return attrs;
}

/**
 * Build p:cSld element with optional name attribute.
 *
 * Contains an empty p:spTree with group shape properties.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.18 (p:cSld)
 */
function buildCommonSlideElement(name: string | undefined): ReturnType<typeof createElement> {
  const cSldAttrs: Record<string, string> = {};
  if (name !== undefined) {
    cSldAttrs.name = name;
  }

  return createElement("p:cSld", cSldAttrs, [
    createElement("p:spTree", {}, [
      createElement("p:nvGrpSpPr", {}, [
        createElement("p:cNvPr", { id: "1", name: "" }),
        createElement("p:cNvGrpSpPr"),
        createElement("p:nvPr"),
      ]),
      createElement("p:grpSpPr", {}, [
        createElement("a:xfrm", {}, [
          createElement("a:off", { x: "0", y: "0" }),
          createElement("a:ext", { cx: "0", cy: "0" }),
          createElement("a:chOff", { x: "0", y: "0" }),
          createElement("a:chExt", { cx: "0", cy: "0" }),
        ]),
      ]),
    ]),
  ]);
}

/**
 * Generate a p:sldLayout XML document for a new blank layout.
 *
 * Creates a minimal valid slide layout with:
 * - Root p:sldLayout with ECMA-376 namespaces
 * - p:cSld containing an empty p:spTree
 * - p:clrMapOvr with a:masterClrMapping
 *
 * @param params - Layout configuration parameters
 * @returns XmlDocument representing the slide layout
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (p:sldLayout)
 */
export function serializeSlideLayout(params: SerializeSlideLayoutParams = {}): XmlDocument {
  return {
    children: [
      createElement("p:sldLayout", buildLayoutAttrs(params), [
        buildCommonSlideElement(params.name),
        createElement("p:clrMapOvr", {}, [createElement("a:masterClrMapping")]),
      ]),
    ],
  };
}

/**
 * Patch existing layout XML attributes.
 *
 * Delegates to `applySlideLayoutAttributes` from the layout parser,
 * which handles attribute updates on p:sldLayout and p:cSld elements.
 *
 * @param layoutDoc - Existing layout XML document
 * @param updates - Attributes to update
 * @returns Updated layout XML document
 *
 * @see applySlideLayoutAttributes
 */
export function patchSlideLayoutAttributes(layoutDoc: XmlDocument, updates: SlideLayoutAttributes): XmlDocument {
  return applySlideLayoutAttributes(layoutDoc, updates);
}
