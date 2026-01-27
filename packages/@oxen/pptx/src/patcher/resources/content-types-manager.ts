import { createElement, isXmlElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import { getDocumentRoot, updateDocumentRoot } from "../core/xml-mutator";

export function addContentType(
  contentTypesXml: XmlDocument,
  extension: string,
  contentType: string,
): XmlDocument {
  if (!extension) {
    throw new Error("addContentType: extension is required");
  }
  if (!contentType) {
    throw new Error("addContentType: contentType is required");
  }

  const root = getDocumentRoot(contentTypesXml);
  if (!root || root.name !== "Types") {
    throw new Error("addContentType: invalid [Content_Types].xml (missing Types root)");
  }

  const normalizedExt = extension.replace(/^\./, "").toLowerCase();
  const existing = findDefault(root, normalizedExt);
  if (existing) {
    const existingType = existing.attrs.ContentType;
    if (existingType && existingType !== contentType) {
      throw new Error(
        `addContentType: extension "${normalizedExt}" already exists with ContentType "${existingType}"`,
      );
    }
    return contentTypesXml;
  }

  const newDefault = createElement("Default", {
    Extension: normalizedExt,
    ContentType: contentType,
  });

  return updateDocumentRoot(contentTypesXml, (typesEl) => {
    if (typesEl.name !== "Types") return typesEl;

    const firstOverrideIndex = typesEl.children.findIndex(
      (child) => isXmlElement(child) && child.name === "Override",
    );
    const insertIndex = firstOverrideIndex === -1 ? typesEl.children.length : firstOverrideIndex;
    const children = [...typesEl.children];
    children.splice(insertIndex, 0, newDefault);
    return { ...typesEl, children };
  });
}

export function addOverride(
  contentTypesXml: XmlDocument,
  partName: string,
  contentType: string,
): XmlDocument {
  if (!partName) {
    throw new Error("addOverride: partName is required");
  }
  if (!contentType) {
    throw new Error("addOverride: contentType is required");
  }

  const root = getDocumentRoot(contentTypesXml);
  if (!root || root.name !== "Types") {
    throw new Error("addOverride: invalid [Content_Types].xml (missing Types root)");
  }

  const normalizedPartName = partName.startsWith("/") ? partName : `/${partName}`;
  const existing = findOverride(root, normalizedPartName);
  if (existing) {
    const existingType = existing.attrs.ContentType;
    if (existingType && existingType !== contentType) {
      throw new Error(
        `addOverride: part "${normalizedPartName}" already exists with ContentType "${existingType}"`,
      );
    }
    return contentTypesXml;
  }

  const overrideEl = createElement("Override", {
    PartName: normalizedPartName,
    ContentType: contentType,
  });

  return updateDocumentRoot(contentTypesXml, (typesEl) => {
    if (typesEl.name !== "Types") return typesEl;
    return { ...typesEl, children: [...typesEl.children, overrideEl] };
  });
}

export function removeUnusedContentTypes(
  contentTypesXml: XmlDocument,
  usedParts: readonly string[],
): XmlDocument {
  const root = getDocumentRoot(contentTypesXml);
  if (!root || root.name !== "Types") {
    throw new Error("removeUnusedContentTypes: invalid [Content_Types].xml (missing Types root)");
  }

  const normalizedUsedParts = new Set(usedParts.map((p) => (p.startsWith("/") ? p.slice(1) : p)));
  const usedExtensions = new Set<string>(["xml", "rels"]);
  for (const part of normalizedUsedParts) {
    const ext = getExtension(part);
    if (ext) {
      usedExtensions.add(ext);
    }
  }

  return updateDocumentRoot(contentTypesXml, (typesEl) => {
    if (typesEl.name !== "Types") return typesEl;

    const nextChildren: (typeof typesEl.children)[number][] = [];
    for (const child of typesEl.children) {
      if (!isXmlElement(child)) {
        nextChildren.push(child);
        continue;
      }

      if (child.name === "Default") {
        const ext = child.attrs.Extension?.toLowerCase();
        if (ext && usedExtensions.has(ext)) {
          nextChildren.push(child);
        }
        continue;
      }

      if (child.name === "Override") {
        const partName = child.attrs.PartName;
        if (!partName) {
          continue;
        }
        const normalized = partName.startsWith("/") ? partName.slice(1) : partName;
        if (normalizedUsedParts.has(normalized)) {
          nextChildren.push(child);
        }
        continue;
      }

      nextChildren.push(child);
    }

    return { ...typesEl, children: nextChildren };
  });
}

function findDefault(typesEl: XmlElement, extension: string): XmlElement | undefined {
  return typesEl.children.find(
    (child): child is XmlElement =>
      isXmlElement(child) &&
      child.name === "Default" &&
      child.attrs.Extension?.toLowerCase() === extension.toLowerCase(),
  );
}

function findOverride(typesEl: XmlElement, partName: string): XmlElement | undefined {
  return typesEl.children.find(
    (child): child is XmlElement =>
      isXmlElement(child) &&
      child.name === "Override" &&
      child.attrs.PartName === partName,
  );
}

function getExtension(path: string): string | null {
  const basename = path.split("/").pop();
  if (!basename) return null;
  const dot = basename.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = basename.slice(dot + 1).toLowerCase();
  return ext.length > 0 ? ext : null;
}
