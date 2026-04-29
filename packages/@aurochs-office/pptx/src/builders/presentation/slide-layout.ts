/**
 * @file Blank slide-layout builder
 *
 * Office-layer minimal slide-layout. The rich variant that consumes a
 * full Background / colorMapOverride / transition lives in
 * `@aurochs-builder/pptx/builders` (it pulls in domain serializers).
 *
 * @see ECMA-376 Part 1, §19.3.1.39 (CT_SlideLayout)
 */

import { createElement, type XmlDocument } from "@aurochs/xml";
import type { SlideLayoutType } from "../../domain";
import { PRESENTATIONML_ROOT_XMLNS, buildClrMapOvr, buildEmptySpTree } from "./common";

export type BuildBlankSlideLayoutOptions = {
  /** Layout `type` attribute (defaults to "blank"). */
  readonly type?: SlideLayoutType;
  /** Layout `name` attribute on `<p:cSld>` (defaults to "Blank"). */
  readonly name?: string;
  /** When true, set `preserve="1"` on the layout. */
  readonly preserve?: boolean;
  /** When false (default true), emit `showMasterSp="0"`. */
  readonly showMasterShapes?: boolean;
};

/**
 * Build a structurally complete blank slide layout.
 *
 * Emits the canonical `<p:cSld>`+`<p:clrMapOvr>` skeleton with no
 * placeholders. Use this when generating a deck from scratch where
 * authoring layout placeholders is out of scope.
 */
export function buildBlankSlideLayout(options: BuildBlankSlideLayoutOptions = {}): XmlDocument {
  const type = options.type ?? "blank";
  const attrs: Record<string, string> = { ...PRESENTATIONML_ROOT_XMLNS, type };
  if (options.preserve) {attrs.preserve = "1";}
  if (options.showMasterShapes === false) {attrs.showMasterSp = "0";}

  const cSldName = options.name ?? "Blank";

  return {
    children: [
      createElement("p:sldLayout", attrs, [
        createElement("p:cSld", { name: cSldName }, [buildEmptySpTree()]),
        buildClrMapOvr(),
      ]),
    ],
  };
}
