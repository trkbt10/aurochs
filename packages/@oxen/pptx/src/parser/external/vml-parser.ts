/**
 * @file VML Drawing parser for legacy OLE object preview images
 *
 * Legacy PPTX files (before ECMA-376-1:2016) store OLE object preview images
 * in VML drawing parts. The connection is made via the spid attribute on p:oleObj.
 *
 * @see MS-OE376 Part 4 Section 4.4.2.4 (oleObj)
 * @see ECMA-376 Part 4 (VML - Vector Markup Language)
 */

import { getByPath, getChild, getChildren, getAttr, type XmlDocument, type XmlElement } from "@oxen/xml";

/**
 * Result of VML image lookup
 */
export type VmlImageInfo = {
  /** Image file path relative to package root (e.g., "ppt/media/image2.wmf") */
  readonly imagePath: string;
  /** Relationship ID in VML drawing */
  readonly relId: string;
};

/**
 * Parse VML drawing XML and find image info for a given shape ID
 *
 * @param vmlXml - Parsed VML drawing XML
 * @param vmlRelsXml - Parsed VML drawing relationships XML
 * @param spid - Shape ID to find (e.g., "_x0000_s681987")
 * @returns Image info if found, undefined otherwise
 */
export function findVmlShapeImage(
  vmlXml: XmlDocument,
  vmlRelsXml: XmlDocument | null,
  spid: string,
): VmlImageInfo | undefined {
  // Find xml root element (VML drawings use "xml" as root)
  const xmlRoot = getByPath(vmlXml, ["xml"]);
  if (!xmlRoot) {return undefined;}

  // Find v:shape with matching id
  const shape = findShapeById(xmlRoot, spid);
  if (!shape) {return undefined;}

  // Get v:imagedata child
  const imagedata = getChild(shape, "v:imagedata");
  if (!imagedata) {return undefined;}

  // Get relationship ID (o:relid attribute)
  const relId = getAttr(imagedata, "o:relid");
  if (!relId) {return undefined;}

  // Resolve relationship to get image path
  if (!vmlRelsXml) {return undefined;}

  const imagePath = resolveVmlRelationship(vmlRelsXml, relId);
  if (!imagePath) {return undefined;}

  return { imagePath, relId };
}

/**
 * Find v:shape element by spid attribute
 *
 * VML shapes use o:spid attribute to match with OLE object's spid.
 * The id attribute is a human-readable name, not the shape ID.
 */
function findShapeById(root: XmlElement, spid: string): XmlElement | undefined {
  // Check all v:shape elements
  for (const child of root.children) {
    if (typeof child !== "object" || child === null) {continue;}
    if (!("type" in child)) {continue;}
    if (child.type !== "element") {continue;}
    const el = child as XmlElement;
    if (el.name === "v:shape") {
      // Check o:spid attribute (primary match for OLE objects)
      const oSpid = getAttr(el, "o:spid");
      if (oSpid === spid) {
        return el;
      }
      // Fallback to id attribute
      const id = getAttr(el, "id");
      if (id === spid) {
        return el;
      }
    }
  }
  return undefined;
}

/**
 * Resolve VML relationship to get target path
 */
function resolveVmlRelationship(relsXml: XmlDocument, relId: string): string | undefined {
  const relationships = getByPath(relsXml, ["Relationships"]);
  if (!relationships) {return undefined;}

  const rels = getChildren(relationships, "Relationship");
  for (const rel of rels) {
    const id = getAttr(rel, "Id");
    if (id === relId) {
      return getAttr(rel, "Target");
    }
  }
  return undefined;
}

/**
 * Build VML drawing relationships file path from VML drawing path
 *
 * @param vmlPath - VML drawing path (e.g., "ppt/drawings/vmlDrawing2.vml")
 * @returns Relationships file path (e.g., "ppt/drawings/_rels/vmlDrawing2.vml.rels")
 */
export function getVmlRelsPath(vmlPath: string): string {
  const parts = vmlPath.split("/");
  const filename = parts.pop() ?? "";
  return [...parts, "_rels", `${filename}.rels`].join("/");
}

/**
 * Normalize VML image path relative to package root
 *
 * VML relationships use relative paths (e.g., "../media/image2.wmf").
 * This function resolves them to package-root-relative paths.
 *
 * @param vmlPath - VML drawing path (e.g., "ppt/drawings/vmlDrawing2.vml")
 * @param imagePath - Relative image path from VML rels (e.g., "../media/image2.wmf")
 * @returns Normalized path (e.g., "ppt/media/image2.wmf")
 */
export function normalizeVmlImagePath(vmlPath: string, imagePath: string): string {
  if (!imagePath.startsWith("..")) {
    return imagePath;
  }

  // Get VML directory
  const parts = vmlPath.split("/");
  parts.pop(); // Remove filename

  // Resolve relative path
  const imageParts = imagePath.split("/");
  for (const part of imageParts) {
    if (part === "..") {
      parts.pop();
    } else if (part !== ".") {
      parts.push(part);
    }
  }

  return parts.join("/");
}
