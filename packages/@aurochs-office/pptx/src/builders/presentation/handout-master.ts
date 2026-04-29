/**
 * @file Handout-master builders
 *
 * @see ECMA-376 Part 1, §19.3.1.24 (CT_HandoutMaster)
 */

import { serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import { createElement, type XmlDocument } from "@aurochs/xml";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { PRESENTATIONML_ROOT_XMLNS, buildClrMapOvr, buildEmptySpTree } from "./common";

/**
 * Build a structurally complete but empty handout master.
 *
 * Layout: `<p:cSld>` (empty spTree) + `<p:clrMapOvr>` + empty `<p:hf>`.
 */
export function buildBlankHandoutMaster(): XmlDocument {
  return {
    children: [
      createElement("p:handoutMaster", PRESENTATIONML_ROOT_XMLNS, [
        createElement("p:cSld", {}, [buildEmptySpTree()]),
        buildClrMapOvr(),
        createElement("p:hf"),
      ]),
    ],
  };
}

/**
 * Build the handout-master relationships (single edge to the theme).
 */
export function buildHandoutMasterRels(themeTarget: string = "../theme/theme1.xml"): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.THEME, target: themeTarget },
  ];
  return { children: [serializeRelationships(rels)] };
}
