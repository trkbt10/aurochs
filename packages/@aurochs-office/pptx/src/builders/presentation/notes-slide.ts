/**
 * @file Notes-slide builders
 *
 * Authoritative builders for per-slide notes parts and their rels.
 *
 * @see ECMA-376 Part 1, §19.3.1.26 (CT_NotesSlide)
 */

import { serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import { createElement, createText, type XmlDocument, type XmlElement } from "@aurochs/xml";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import {
  PRESENTATIONML_ROOT_XMLNS,
  buildClrMapOvr,
  buildEmptyGroupSpPr,
  buildEmptySpTree,
  buildRootNvGrpSpPr,
} from "./common";

/**
 * Build a blank notes slide carrying optional body text.
 *
 * When `bodyText` is provided, a single body placeholder is added with
 * the text as one paragraph run. The placeholder uses the canonical
 * `type="body" idx="1"` slot.
 *
 * The empty form delegates entirely to `buildEmptySpTree` (the SoT
 * for blank spTree skeletons); the bodied form composes the same root
 * shapes (`buildRootNvGrpSpPr` + `buildEmptyGroupSpPr`) and appends
 * the placeholder.
 */
export function buildNotesSlide(bodyText?: string): XmlDocument {
  const spTree = bodyText === undefined
    ? buildEmptySpTree()
    : createElement("p:spTree", {}, [
        buildRootNvGrpSpPr(),
        buildEmptyGroupSpPr(),
        buildBodyPlaceholderShape(bodyText),
      ]);

  return {
    children: [
      createElement("p:notes", PRESENTATIONML_ROOT_XMLNS, [
        createElement("p:cSld", {}, [spTree]),
        buildClrMapOvr(),
      ]),
    ],
  };
}

/**
 * Build a notes-slide relationship document.
 *
 * - `rId1` → ../slides/slide{slideIndex}.xml (slide back-reference)
 * - `rId2` → ../notesMasters/notesMaster1.xml (when emitNotesMaster).
 */
export function buildNotesSlideRels(slideIndex: number, emitNotesMaster: boolean = true): XmlDocument {
  if (!Number.isInteger(slideIndex) || slideIndex < 1) {
    throw new Error(`buildNotesSlideRels: slideIndex must be a positive integer, got ${slideIndex}`);
  }
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE, target: `../slides/slide${slideIndex}.xml` },
  ];
  if (emitNotesMaster) {
    rels.push({ id: "rId2", type: RELATIONSHIP_TYPES.NOTES_MASTER, target: "../notesMasters/notesMaster1.xml" });
  }
  return { children: [serializeRelationships(rels)] };
}

function buildBodyPlaceholderShape(text: string): XmlElement {
  return createElement("p:sp", {}, [
    createElement("p:nvSpPr", {}, [
      createElement("p:cNvPr", { id: "2", name: "Notes Placeholder" }),
      createElement("p:cNvSpPr", {}, [createElement("a:spLocks", { noGrp: "1" })]),
      createElement("p:nvPr", {}, [createElement("p:ph", { type: "body", idx: "1" })]),
    ]),
    createElement("p:spPr"),
    createElement("p:txBody", {}, [
      createElement("a:bodyPr"),
      createElement("a:lstStyle"),
      createElement("a:p", {}, [
        createElement("a:r", {}, [
          createElement("a:rPr", { lang: "en-US", dirty: "0" }),
          createElement("a:t", {}, [createText(text)]),
        ]),
      ]),
    ]),
  ]);
}
