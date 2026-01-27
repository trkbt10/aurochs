import { createElement, isXmlElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import { getDocumentRoot, updateDocumentRoot } from "../core/xml-mutator";
import { createRelationshipsDocument, RELATIONSHIPS_XMLNS, type RelationshipTargetMode } from "../parts/relationships";

export type RelationshipType =
  | "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
  | "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video"
  | "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio"
  | "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
  | "http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject"
  | "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";

export type RelationshipInfo = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly targetMode?: RelationshipTargetMode;
};

export function listRelationships(relsXml: XmlDocument): RelationshipInfo[] {
  const root = getDocumentRoot(relsXml);
  if (!root || root.name !== "Relationships") {
    return [];
  }

  const relationships: RelationshipInfo[] = [];
  for (const child of root.children) {
    if (!isXmlElement(child) || child.name !== "Relationship") {
      continue;
    }
    const id = child.attrs.Id;
    const target = child.attrs.Target;
    if (!id || !target) {
      continue;
    }
    relationships.push({
      id,
      type: child.attrs.Type ?? "",
      target,
      targetMode: child.attrs.TargetMode as RelationshipTargetMode | undefined,
    });
  }
  return relationships;
}

export function generateRelationshipId(existingIds: readonly string[]): string {
  const used = new Set<number>();
  for (const id of existingIds) {
    const match = /^rId(\d+)$/.exec(id);
    if (!match) continue;
    used.add(Number(match[1]));
  }

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }
  return `rId${next}`;
}

export function addRelationship(
  relsXml: XmlDocument,
  target: string,
  type: RelationshipType,
): { readonly updatedXml: XmlDocument; readonly rId: string } {
  if (!target) {
    throw new Error("addRelationship: target is required");
  }

  const existing = listRelationships(relsXml).find(
    (rel) => rel.type === type && rel.target === target,
  );
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
    if (rootEl.name !== "Relationships") return rootEl;
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
        (child) =>
          !(
            isXmlElement(child) &&
            child.name === "Relationship" &&
            child.attrs.Id === rId
          ),
      ),
    };
  });
}

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

function inferTargetMode(
  type: RelationshipType,
  target: string,
): RelationshipTargetMode | undefined {
  if (type !== "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink") {
    return undefined;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
    return "External";
  }
  return undefined;
}
