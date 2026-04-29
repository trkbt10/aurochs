/**
 * @file Slide-part builder
 *
 * @see ECMA-376 Part 1, §19.3.1.38 (CT_Slide)
 */

import { createElement, type XmlDocument } from "@aurochs/xml";
import { PRESENTATIONML_ROOT_XMLNS, buildClrMapOvr, buildEmptySpTree } from "./common";

/**
 * Build an empty `<p:sld>` document.
 *
 * Layout: `<p:cSld>` containing an empty `<p:spTree>`, followed by a
 * `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>`. Callers patch
 * additional shapes into the spTree afterwards.
 */
export function buildBlankSlide(): XmlDocument {
  return {
    children: [
      createElement("p:sld", PRESENTATIONML_ROOT_XMLNS, [
        createElement("p:cSld", {}, [buildEmptySpTree()]),
        buildClrMapOvr(),
      ]),
    ],
  };
}
