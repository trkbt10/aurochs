/** @file Relationship manager for .rels file manipulation */
import { createElement, isXmlElement, type XmlDocument } from "@aurochs/xml";
import {
  listRelationships,
  OFFICE_RELATIONSHIP_TYPES,
  PRESENTATIONML_RELATIONSHIP_TYPES,
} from "@aurochs-office/opc";
import { getDocumentRoot, updateDocumentRoot } from "../core/xml-mutator";
import { createRelationshipsDocument, RELATIONSHIPS_XMLNS, type RelationshipTargetMode } from "../parts/relationships";

export type RelationshipType =
  | typeof OFFICE_RELATIONSHIP_TYPES.image
  | typeof OFFICE_RELATIONSHIP_TYPES.video
  | typeof OFFICE_RELATIONSHIP_TYPES.audio
  | typeof OFFICE_RELATIONSHIP_TYPES.chart
  | typeof OFFICE_RELATIONSHIP_TYPES.hyperlink
  | typeof OFFICE_RELATIONSHIP_TYPES.oleObject
  | typeof OFFICE_RELATIONSHIP_TYPES.font
  | typeof PRESENTATIONML_RELATIONSHIP_TYPES.notesSlide
  | typeof PRESENTATIONML_RELATIONSHIP_TYPES.comments
  | typeof PRESENTATIONML_RELATIONSHIP_TYPES.commentAuthors;

/** Generate a unique relationship ID */
export function generateRelationshipId(existingIds: readonly string[]): string {
  const used = new Set<number>();
  for (const id of existingIds) {
    const match = /^rId(\d+)$/.exec(id);
    if (!match) {
      continue;
    }
    used.add(Number(match[1]));
  }

  const findNext = (n: number): string => {
    if (!used.has(n)) {
      return `rId${n}`;
    }
    return findNext(n + 1);
  };
  return findNext(1);
}

/** Add a relationship to a rels document */
export function addRelationship(
  relsXml: XmlDocument,
  target: string,
  type: RelationshipType,
): { readonly updatedXml: XmlDocument; readonly rId: string } {
  if (!target) {
    throw new Error("addRelationship: target is required");
  }

  const existing = listRelationships(relsXml).find((rel) => rel.type === type && rel.target === target);
  if (existing) {
    return { updatedXml: relsXml, rId: existing.id };
  }

  const root = getDocumentRoot(relsXml);
  if (!root || root.name !== "Relationships") {
    throw new Error("addRelationship: invalid .rels document (missing Relationships root)");
  }

  const existingIds = listRelationships(relsXml).map((rel) => rel.id);
  const rId = generateRelationshipId(existingIds);

  const relationshipAttrs: Record<string, string> = {
    Id: rId,
    Type: type,
    Target: target,
  };

  const targetMode = inferTargetMode(type, target);
  if (targetMode) {
    relationshipAttrs.TargetMode = targetMode;
  }

  const relationshipEl = createElement("Relationship", relationshipAttrs);

  const updated = updateDocumentRoot(relsXml, (rootEl) => {
    if (rootEl.name !== "Relationships") {
      return rootEl;
    }
    const nextAttrs = { ...rootEl.attrs };
    if (nextAttrs.xmlns === undefined) {
      nextAttrs.xmlns = RELATIONSHIPS_XMLNS;
    }
    return {
      ...rootEl,
      attrs: nextAttrs,
      children: [...rootEl.children, relationshipEl],
    };
  });

  return { updatedXml: updated, rId };
}

/** Remove a relationship by ID from a rels document */
export function removeRelationship(relsXml: XmlDocument, rId: string): XmlDocument {
  if (!rId) {
    throw new Error("removeRelationship: rId is required");
  }

  return updateDocumentRoot(relsXml, (root) => {
    if (root.name !== "Relationships") {
      return root;
    }
    return {
      ...root,
      children: root.children.filter(
        (child) => !(isXmlElement(child) && child.name === "Relationship" && child.attrs.Id === rId),
      ),
    };
  });
}

/** Ensure a valid rels document exists, creating an empty one if needed */
export function ensureRelationshipsDocument(relsXml: XmlDocument | null): XmlDocument {
  if (relsXml === null) {
    return createRelationshipsDocument();
  }
  const root = getDocumentRoot(relsXml);
  if (!root || root.name !== "Relationships") {
    return createRelationshipsDocument();
  }
  return relsXml;
}

function inferTargetMode(type: RelationshipType, target: string): RelationshipTargetMode | undefined {
  if (type !== OFFICE_RELATIONSHIP_TYPES.hyperlink) {
    return undefined;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
    return "External";
  }
  return undefined;
}
