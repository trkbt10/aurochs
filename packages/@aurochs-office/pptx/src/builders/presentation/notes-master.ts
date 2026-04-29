/**
 * @file Notes-master builders
 *
 * Authoritative builders for the notes-master part and its
 * relationship document.
 *
 * @see ECMA-376 Part 1, §19.3.1.27 (CT_NotesMaster)
 */

import { serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import { createElement, type XmlDocument } from "@aurochs/xml";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { PRESENTATIONML_ROOT_XMLNS, buildClrMapOvr, buildEmptySpTree } from "./common";

/**
 * Build a structurally complete but empty notes master.
 *
 * Layout: `<p:cSld>` (empty spTree) + `<p:clrMapOvr>` (master mapping)
 * + empty `<p:hf>` for header/footer placeholders + empty
 * `<p:notesStyle>` text-style holder.
 */
export function buildBlankNotesMaster(): XmlDocument {
  return {
    children: [
      createElement("p:notesMaster", PRESENTATIONML_ROOT_XMLNS, [
        createElement("p:cSld", {}, [buildEmptySpTree()]),
        buildClrMapOvr(),
        createElement("p:hf"),
        createElement("p:notesStyle"),
      ]),
    ],
  };
}

/**
 * Build the notes-master relationships (single edge to the theme).
 *
 * Office's notes master conventionally borrows the deck theme
 * (`../theme/theme1.xml`); supply a different target via
 * `themeTarget` for theme-overridden notes.
 */
export function buildNotesMasterRels(themeTarget: string = "../theme/theme1.xml"): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.THEME, target: themeTarget },
  ];
  return { children: [serializeRelationships(rels)] };
}
