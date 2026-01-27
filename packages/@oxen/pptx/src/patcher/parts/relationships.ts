import { createElement, type XmlDocument, type XmlElement } from "@oxen/xml";

export const RELATIONSHIPS_XMLNS = "http://schemas.openxmlformats.org/package/2006/relationships";

export type RelationshipTargetMode = "External";

export type RelationshipDefinition = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly targetMode?: RelationshipTargetMode;
};

export function createRelationshipsDocument(
  relationships: readonly RelationshipDefinition[] = [],
): XmlDocument {
  const children: XmlElement[] = relationships.map((relationship) => {
    const attrs: Record<string, string> = {
      Id: relationship.id,
      Type: relationship.type,
      Target: relationship.target,
    };
    if (relationship.targetMode) {
      attrs.TargetMode = relationship.targetMode;
    }
    return createElement("Relationship", attrs);
  });

  return {
    children: [createElement("Relationships", { xmlns: RELATIONSHIPS_XMLNS }, children)],
  };
}

