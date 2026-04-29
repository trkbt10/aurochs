/**
 * @file presentation.xml.rels builder
 *
 * Wires the presentation part to its slide master, all slides, the
 * theme, and optionally the auxiliary parts (presProps, viewProps,
 * tableStyles, notesMaster, handoutMaster).
 *
 * Without the theme edge from the presentation part, PowerPoint shows
 * a "couldn't read some content" dialog even though the slide master
 * also references the theme.
 */

import { serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import type { XmlDocument } from "@aurochs/xml";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";

export type BuildPresentationRelsOptions = {
  /** Number of slides; default 1. Each slide gets a rId after the master. */
  readonly slideCount?: number;
  /** Emit the theme relationship edge (defaults to true). */
  readonly includeTheme?: boolean;
  /** Emit a notesMaster relationship edge. */
  readonly includeNotesMaster?: boolean;
  /** Emit a handoutMaster relationship edge. */
  readonly includeHandoutMaster?: boolean;
  /** Emit a presProps.xml relationship edge. */
  readonly includePresProps?: boolean;
  /** Emit a viewProps.xml relationship edge. */
  readonly includeViewProps?: boolean;
  /** Emit a tableStyles.xml relationship edge. */
  readonly includeTableStyles?: boolean;
};

/**
 * Build the presentation part's relationship document.
 *
 * Allocation order is fixed so that downstream parts can predict
 * relationship IDs:
 *   rId1                    → slideMaster1
 *   rId2..rId(1+N)          → slides/slide{1..N}.xml
 *   rId(2+N)                → theme1.xml (when includeTheme)
 *   subsequent rIds         → optional aux parts in declaration order:
 *                             notesMaster, handoutMaster,
 *                             presProps, viewProps, tableStyles
 */
export function buildPresentationRels(options: BuildPresentationRelsOptions = {}): XmlDocument {
  const slideCount = options.slideCount ?? 1;
  if (!Number.isInteger(slideCount) || slideCount < 1) {
    throw new Error(`buildPresentationRels: slideCount must be a positive integer, got ${slideCount}`);
  }
  const includeTheme = options.includeTheme ?? true;

  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE_MASTER, target: "slideMasters/slideMaster1.xml" },
  ];
  for (let i = 1; i <= slideCount; i++) {
    rels.push({ id: `rId${i + 1}`, type: RELATIONSHIP_TYPES.SLIDE, target: `slides/slide${i}.xml` });
  }

  // eslint-disable-next-line no-restricted-syntax -- monotonic counter is required for canonical rId allocation
  let nextRid = slideCount + 2;
  if (includeTheme) {
    rels.push({ id: `rId${nextRid++}`, type: RELATIONSHIP_TYPES.THEME, target: "theme/theme1.xml" });
  }
  if (options.includeNotesMaster) {
    rels.push({ id: `rId${nextRid++}`, type: RELATIONSHIP_TYPES.NOTES_MASTER, target: "notesMasters/notesMaster1.xml" });
  }
  if (options.includeHandoutMaster) {
    rels.push({ id: `rId${nextRid++}`, type: RELATIONSHIP_TYPES.HANDOUT_MASTER, target: "handoutMasters/handoutMaster1.xml" });
  }
  if (options.includePresProps) {
    rels.push({ id: `rId${nextRid++}`, type: RELATIONSHIP_TYPES.PRES_PROPS, target: "presProps.xml" });
  }
  if (options.includeViewProps) {
    rels.push({ id: `rId${nextRid++}`, type: RELATIONSHIP_TYPES.VIEW_PROPS, target: "viewProps.xml" });
  }
  if (options.includeTableStyles) {
    rels.push({ id: `rId${nextRid++}`, type: RELATIONSHIP_TYPES.TABLE_STYLES, target: "tableStyles.xml" });
  }

  return { children: [serializeRelationships(rels)] };
}
