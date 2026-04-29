/**
 * @file Presentation-properties part builder (`ppt/presProps.xml`).
 *
 * @see ECMA-376 Part 1, §19.2.1.45 (CT_PresentationPr)
 */

import { createElement, type XmlDocument } from "@aurochs/xml";
import { PRESENTATIONML_ROOT_XMLNS } from "./common";

/**
 * Build the canonical empty `<p:presentationPr>` document.
 *
 * `CT_PresentationPr` has no required children. Office still emits
 * the part to record the show/print/colorMru defaults; we emit an
 * empty root so the content-types/relationship graph is satisfied
 * without bringing in domain-specific knobs.
 */
export function buildPresProps(): XmlDocument {
  return {
    children: [createElement("p:presentationPr", PRESENTATIONML_ROOT_XMLNS)],
  };
}
