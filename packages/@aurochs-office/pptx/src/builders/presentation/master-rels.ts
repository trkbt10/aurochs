/**
 * @file Slide-master relationship builder
 *
 * Builds `ppt/slideMasters/_rels/slideMaster1.xml.rels` — the master
 * references every layout it owns plus the theme.
 */

import { serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import type { XmlDocument } from "@aurochs/xml";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";

/**
 * Build slide-master relationships.
 *
 * Allocates `rId1..rId{layoutCount}` for each layout in declaration
 * order, then `rId{layoutCount+1}` for the theme. Theme rId is the
 * highest because Office writes layouts before theme in the rels list.
 */
export function buildMasterRels(layoutCount: number): XmlDocument {
  if (!Number.isInteger(layoutCount) || layoutCount < 1) {
    throw new Error(`buildMasterRels: layoutCount must be a positive integer, got ${layoutCount}`);
  }
  const rels: OpcRelationship[] = [];
  for (let i = 1; i <= layoutCount; i++) {
    rels.push({
      id: `rId${i}`,
      type: RELATIONSHIP_TYPES.SLIDE_LAYOUT,
      target: `../slideLayouts/slideLayout${i}.xml`,
    });
  }
  rels.push({ id: `rId${layoutCount + 1}`, type: RELATIONSHIP_TYPES.THEME, target: "../theme/theme1.xml" });
  return { children: [serializeRelationships(rels)] };
}
