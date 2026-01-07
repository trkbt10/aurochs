/**
 * @file Slide layout utilities for editor usage
 *
 * Discovers and loads slide layouts via OPC relationships.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (p:sldLayout)
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */

import type { PresentationFile } from "../domain";
import type { XmlDocument, XmlElement } from "../../xml";
import type { IndexTables } from "../domain/slide";
import type { ResourceMap } from "../opc";
import { parseContentTypes } from "../opc";
import { getByPath } from "../../xml";
import { parseAppVersion } from "./presentation-info";
import { readXml, getRelationships, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../parser/slide/xml-reader";
import { indexShapeTreeNodes } from "../parser/slide/shape-tree-indexer";
import { findMasterFilename, findThemeFilename } from "../opc";
import { parseRelationships } from "../opc/relationships";
import { getSlideLayoutAttributes } from "../domain/slide/layout";

export type SlideLayoutOption = {
  readonly value: string;
  readonly label: string;
  readonly keywords?: readonly string[];
};

export type SlideLayoutBundle = {
  readonly layout: XmlDocument;
  readonly layoutTables: IndexTables;
  readonly layoutRelationships: ResourceMap;
  readonly master: XmlDocument | null;
  readonly masterTables: IndexTables;
  readonly masterTextStyles: XmlElement | undefined;
  readonly masterRelationships: ResourceMap;
  readonly theme: XmlDocument | null;
  readonly themeRelationships: ResourceMap;
};

function resolveAppVersion(file: PresentationFile): number {
  const appXml = readXml(
    file,
    "docProps/app.xml",
    16,
    false,
    DEFAULT_MARKUP_COMPATIBILITY_OPTIONS,
  );
  return parseAppVersion(appXml) ?? 16;
}

function buildLayoutLabel(
  layoutPath: string,
  attrs: ReturnType<typeof getSlideLayoutAttributes>,
): string {
  const fileName = layoutPath.split("/").pop() ?? layoutPath;
  if (attrs.name && attrs.matchingName && attrs.name !== attrs.matchingName) {
    return `${attrs.name} (${attrs.matchingName})`;
  }
  if (attrs.name) {
    return attrs.name;
  }
  if (attrs.matchingName) {
    return attrs.matchingName;
  }
  if (attrs.type) {
    return `${attrs.type} (${fileName})`;
  }
  return fileName;
}

/**
 * Build slide layout options from a presentation file.
 *
 * Discovers layouts via [Content_Types].xml (OPC compliant).
 *
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */
export function buildSlideLayoutOptions(file: PresentationFile): SlideLayoutOption[] {
  if (!file) {
    throw new Error("buildSlideLayoutOptions requires a presentation file.");
  }

  const appVersion = resolveAppVersion(file);
  const contentTypesXml = readXml(
    file,
    "[Content_Types].xml",
    appVersion,
    false,
    DEFAULT_MARKUP_COMPATIBILITY_OPTIONS,
  );
  if (contentTypesXml === null) {
    throw new Error("Failed to read [Content_Types].xml for slide layout catalog.");
  }

  const contentTypes = parseContentTypes(contentTypesXml);

  return contentTypes.slideLayouts.map((layoutPath) => {
    const layoutXml = readXml(
      file,
      layoutPath,
      appVersion,
      false,
      DEFAULT_MARKUP_COMPATIBILITY_OPTIONS,
    );
    if (layoutXml === null) {
      throw new Error(`Failed to read slide layout XML: ${layoutPath}`);
    }

    const attrs = getSlideLayoutAttributes(layoutXml);
    const label = buildLayoutLabel(layoutPath, attrs);
    const keywords = [
      attrs.name,
      attrs.matchingName,
      attrs.type,
      layoutPath.split("/").pop(),
    ].filter((value): value is string => !!value);

    return {
      value: layoutPath,
      label,
      keywords,
    };
  });
}

/**
 * Load layout bundle data from a layout path.
 *
 * Traverses OPC relationships to load layout, master, and theme data.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function loadSlideLayoutBundle(
  file: PresentationFile,
  layoutPath: string,
): SlideLayoutBundle {
  if (!file) {
    throw new Error("loadSlideLayoutBundle requires a presentation file.");
  }
  if (!layoutPath) {
    throw new Error("loadSlideLayoutBundle requires a layout path.");
  }

  const appVersion = resolveAppVersion(file);
  const layout = readXml(file, layoutPath, appVersion, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  if (layout === null) {
    throw new Error(`Failed to read slide layout XML: ${layoutPath}`);
  }

  const layoutRelationships = getRelationships(file, layoutPath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
  const layoutTables = indexShapeTreeNodes(layout);

  const masterPath = findMasterFilename(layoutRelationships);
  const master = masterPath
    ? readXml(file, masterPath, appVersion, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS)
    : null;
  const masterRelationships = masterPath
    ? getRelationships(file, masterPath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS)
    : parseRelationships(null);
  const masterTables = indexShapeTreeNodes(master);
  const masterTextStyles = master
    ? getByPath(master, ["p:sldMaster", "p:txStyles"])
    : undefined;

  const themePath = masterPath ? findThemeFilename(masterRelationships) : undefined;
  const theme = themePath
    ? readXml(file, themePath, appVersion, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS)
    : null;
  const themeRelationships = themePath
    ? getRelationships(file, themePath, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS)
    : parseRelationships(null);

  return {
    layout,
    layoutTables,
    layoutRelationships,
    master,
    masterTables,
    masterTextStyles,
    masterRelationships,
    theme,
    themeRelationships,
  };
}
