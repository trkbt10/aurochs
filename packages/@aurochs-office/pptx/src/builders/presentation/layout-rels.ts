/**
 * @file Slide-layout relationship builder
 *
 * Builds `ppt/slideLayouts/_rels/slideLayout{N}.xml.rels` — every layout
 * has a single edge back to its master.
 */

import { serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import type { XmlDocument } from "@aurochs/xml";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";

/**
 * Build a slide-layout's relationships (single edge to slideMaster1).
 */
export function buildLayoutRels(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE_MASTER, target: "../slideMasters/slideMaster1.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}
