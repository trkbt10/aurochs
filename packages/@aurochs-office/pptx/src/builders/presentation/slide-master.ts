/**
 * @file Blank slide-master builder
 *
 * Office-layer minimal slide-master. The schema requires `p:clrMap`
 * and `p:sldLayoutIdLst`; both are emitted with canonical defaults so
 * PowerPoint accepts the file without rewriting it.
 *
 * The rich variant that consumes a Background and a domain
 * MasterTextStyles object lives in the builder layer (it pulls in
 * domain-specific serializers for fills/lines/text).
 *
 * @see ECMA-376 Part 1, §19.3.1.42 (CT_SlideMaster)
 */

import { createElement, type XmlDocument, type XmlElement } from "@aurochs/xml";
import { DEFAULT_COLOR_MAPPING, type ColorMapping } from "../../domain/color/types";
import { PRESENTATIONML_ROOT_XMLNS, buildEmptySpTree } from "./common";

export type BuildBlankSlideMasterOptions = {
  /** Color-map override (`p:clrMap`). Defaults to identity. */
  readonly colorMapping?: ColorMapping;
  /**
   * Number of slide layouts referenced by the master. Each layout
   * needs an `<p:sldLayoutId>` entry. The layout IDs follow Office's
   * convention (`2147483649 + i`).
   */
  readonly layoutCount: number;
};

/**
 * Build a structurally complete but empty `<p:sldMaster>`.
 *
 * - `<p:cSld>` carries an empty `<p:spTree>` (no placeholder shapes).
 * - `<p:clrMap>` holds the canonical identity mapping (or the override
 *    supplied via options).
 * - `<p:sldLayoutIdLst>` references each `slideLayout{N}.xml` via
 *    `rId{N}` allocated by `buildMasterRels(layoutCount)`.
 * - `<p:txStyles>` emits empty title/body/other style stubs — required
 *    by PowerPoint's reader even though minOccurs=0 in the schema.
 */
export function buildBlankSlideMaster(options: BuildBlankSlideMasterOptions): XmlDocument {
  if (!Number.isInteger(options.layoutCount) || options.layoutCount < 1) {
    throw new Error(`buildBlankSlideMaster: layoutCount must be a positive integer, got ${options.layoutCount}`);
  }
  const clrMap = options.colorMapping ?? DEFAULT_COLOR_MAPPING;

  const sldLayoutIds: XmlElement[] = Array.from({ length: options.layoutCount }, (_, i) =>
    createElement("p:sldLayoutId", {
      id: String(2147483649 + i),
      "r:id": `rId${i + 1}`,
    }),
  );

  return {
    children: [
      createElement("p:sldMaster", PRESENTATIONML_ROOT_XMLNS, [
        createElement("p:cSld", {}, [buildEmptySpTree()]),
        createElement("p:clrMap", clrMap as Record<string, string>),
        createElement("p:sldLayoutIdLst", {}, sldLayoutIds),
        createElement("p:txStyles", {}, [
          createElement("p:titleStyle"),
          createElement("p:bodyStyle"),
          createElement("p:otherStyle"),
        ]),
      ]),
    ],
  };
}
