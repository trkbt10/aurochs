/**
 * @file View-properties part builder (`ppt/viewProps.xml`).
 *
 * @see ECMA-376 Part 1, §19.2.1.50 (CT_ViewPr)
 */

import { createElement, type XmlDocument } from "@aurochs/xml";
import { PRESENTATIONML_ROOT_XMLNS } from "./common";

/**
 * Build the canonical empty `<p:viewPr>` document.
 *
 * `CT_ViewPr` has no required children. The part exists to anchor the
 * normalViewPr / slideViewPr / outlineViewPr / sorterViewPr layouts —
 * we emit a bare root so callers don't need to wire view geometry to
 * use the rest of the SoT.
 */
export function buildViewProps(): XmlDocument {
  return {
    children: [createElement("p:viewPr", PRESENTATIONML_ROOT_XMLNS)],
  };
}
