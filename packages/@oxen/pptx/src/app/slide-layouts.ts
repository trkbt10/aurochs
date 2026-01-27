/**
 * @file Slide layout utilities for editor usage
 *
 * Discovers and loads slide layouts via OPC relationships.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (p:sldLayout)
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */

import type { PresentationFile } from "../domain";
import type { XmlDocument, XmlElement } from "@oxen/xml";
import type { ResourceMap } from "../domain/opc";
import { parseContentTypes } from "../opc/content-types";
import { getByPath } from "@oxen/xml";
import { parseAppVersion } from "./presentation-info";
import { readXml, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../parser/slide/xml-reader";
import { indexShapeTreeNodes, type IndexTables } from "../parser/slide/shape-tree-indexer";
import {
  loadRelationships,
  findMasterPath,
  findThemePath,
} from "../parser/relationships";
import { createEmptyResourceMap } from "../domain/relationships";
import { getSlideLayoutAttributes } from "../parser/slide/layout-parser";

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

  const layoutRelationships = loadRelationships(file, layoutPath);
  const layoutTables = indexShapeTreeNodes(layout);

  const masterPath = findMasterPath(layoutRelationships);
  const master = masterPath
    ? readXml(file, masterPath, appVersion, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS)
    : null;
  const masterRelationships = masterPath
    ? loadRelationships(file, masterPath)
    : createEmptyResourceMap();
  const masterTables = indexShapeTreeNodes(master);
  const masterTextStyles = master
    ? getByPath(master, ["p:sldMaster", "p:txStyles"])
    : undefined;

  const themePath = masterPath ? findThemePath(masterRelationships) : undefined;
  const theme = themePath
    ? readXml(file, themePath, appVersion, false, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS)
    : null;
  const themeRelationships = themePath
    ? loadRelationships(file, themePath)
    : createEmptyResourceMap();

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
