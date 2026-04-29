/**
 * @file Root package relationships builder
 *
 * Builds `_rels/.rels` — the OPC root relationship part that wires the
 * presentation as the OPC officeDocument and docProps/app.xml as the
 * extended-properties part.
 *
 * @see ECMA-376 Part 2, §9.3 (Relationships)
 * @see ECMA-376 Part 2, §11.2 (Package Relationships)
 */

import { OFFICE_RELATIONSHIP_TYPES, serializeRelationships, type OpcRelationship } from "@aurochs-office/opc";
import type { XmlDocument } from "@aurochs/xml";

/**
 * Build the package root relationships document (`_rels/.rels`).
 *
 * Always emits the canonical pair:
 *   rId1 → ppt/presentation.xml (officeDocument)
 *   rId2 → docProps/app.xml     (extended-properties)
 *
 * Use {@link buildRootRelsWithCore} to additionally wire docProps/core.xml.
 */
export function buildRootRels(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: OFFICE_RELATIONSHIP_TYPES.officeDocument, target: "ppt/presentation.xml" },
    { id: "rId2", type: OFFICE_RELATIONSHIP_TYPES.extendedProperties, target: "docProps/app.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}

/**
 * Build root rels including the OPC core-properties part edge.
 *
 * @see ECMA-376 Part 2, §11.3 (Core Properties)
 */
export function buildRootRelsWithCore(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: OFFICE_RELATIONSHIP_TYPES.officeDocument, target: "ppt/presentation.xml" },
    { id: "rId2", type: OFFICE_RELATIONSHIP_TYPES.extendedProperties, target: "docProps/app.xml" },
    { id: "rId3", type: OFFICE_RELATIONSHIP_TYPES.coreProperties, target: "docProps/core.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}
