/**
 * @file Shared PresentationML element helpers
 *
 * Tiny, reusable element builders for PresentationML structural
 * fragments that recur across slide / layout / master / notes.
 *
 * @see ECMA-376 Part 1, §19.3 (Slide-related parts)
 */

import { DRAWINGML_NAMESPACES, OFFICE_NAMESPACES, PRESENTATIONML_NAMESPACES } from "@aurochs-office/opc";
import { createElement, type XmlElement } from "@aurochs/xml";

/**
 * Standard PresentationML namespace declarations used on every
 * top-level part root (`p:sld`, `p:sldLayout`, `p:sldMaster`, `p:notes`,
 * `p:notesMaster`, `p:handoutMaster`, `p:presentation`, `p:viewPr`,
 * `p:presentationPr`).
 */
export const PRESENTATIONML_ROOT_XMLNS = {
  "xmlns:p": PRESENTATIONML_NAMESPACES.main,
  "xmlns:a": DRAWINGML_NAMESPACES.main,
  "xmlns:r": OFFICE_NAMESPACES.relationships,
} as const;

/**
 * Build the standard root `<p:nvGrpSpPr>` for an empty `p:spTree`.
 *
 * Per §19.3.1.43 (CT_GroupShapeNonVisual) the root group's non-visual
 * properties are id="1", name="" — every PowerPoint-emitted file uses
 * exactly these values.
 */
export function buildRootNvGrpSpPr(): XmlElement {
  return createElement("p:nvGrpSpPr", {}, [
    createElement("p:cNvPr", { id: "1", name: "" }),
    createElement("p:cNvGrpSpPr"),
    createElement("p:nvPr"),
  ]);
}

/**
 * Build an empty `<p:grpSpPr>` containing the canonical identity
 * `<a:xfrm>` (off/ext/chOff/chExt all zero).
 *
 * Although ECMA-376 marks `xfrm` as optional under `CT_GroupShapeProperties`,
 * PowerPoint flags an entirely empty `<p:grpSpPr/>` as a repair candidate.
 * Emitting the identity transform satisfies both schema and reader.
 */
export function buildEmptyGroupSpPr(): XmlElement {
  return createElement("p:grpSpPr", {}, [
    createElement("a:xfrm", {}, [
      createElement("a:off", { x: "0", y: "0" }),
      createElement("a:ext", { cx: "0", cy: "0" }),
      createElement("a:chOff", { x: "0", y: "0" }),
      createElement("a:chExt", { cx: "0", cy: "0" }),
    ]),
  ]);
}

/**
 * Build an empty `<p:spTree>` containing only the root group skeleton
 * (`p:nvGrpSpPr` + `p:grpSpPr`). Callers append shape children as needed.
 */
export function buildEmptySpTree(): XmlElement {
  return createElement("p:spTree", {}, [
    buildRootNvGrpSpPr(),
    buildEmptyGroupSpPr(),
  ]);
}

/**
 * Build the master color-map override element (`<p:clrMapOvr>`).
 *
 * Slides and layouts typically reference the master's color map
 * directly via `<a:masterClrMapping/>`; supply the optional
 * `overrides` map to emit `<a:overrideClrMapping ...>` instead.
 *
 * @see ECMA-376 Part 1, §19.3.1.7 (CT_ColorMappingOverride)
 */
export function buildClrMapOvr(overrides?: Readonly<Record<string, string>>): XmlElement {
  if (overrides && Object.keys(overrides).length > 0) {
    return createElement("p:clrMapOvr", {}, [createElement("a:overrideClrMapping", overrides)]);
  }
  return createElement("p:clrMapOvr", {}, [createElement("a:masterClrMapping")]);
}
