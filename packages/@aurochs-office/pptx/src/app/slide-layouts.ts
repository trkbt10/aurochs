/**
 * @file Slide layout utilities for editor usage
 *
 * Discovers and loads slide layouts via OPC relationships.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (p:sldLayout)
 * @see ECMA-376 Part 2, Section 10.1.2 (Content Types)
 */

import type { Background, SlideLayoutType } from "../domain";
import type { ColorMapOverride } from "../domain/color/types";
import type { SlideTransition } from "../domain/transition";
import type { XmlDocument } from "@aurochs/xml";
import type { PackageFile, ResourceMap } from "@aurochs-office/opc";
import { parseContentTypes } from "../domain/content-types";
import { parseAppVersion } from "./presentation-info";
import { readPart } from "../parser/part-reader";
import { indexShapeTreeNodes, type IndexTables } from "../parser/slide/shape-tree-indexer";
import { loadRelationships, findMasterPath, findThemePath } from "../parser/relationships";
import { createEmptyResourceMap } from "../domain/relationships";
import { getSlideLayoutAttributes } from "../parser/slide/layout-parser";
import { parseSlideLayout } from "../parser/slide/slide-parser";

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
  readonly masterRelationships: ResourceMap;
  readonly theme: XmlDocument | null;
  readonly themeRelationships: ResourceMap;
};

function resolveAppVersion(file: PackageFile): number {
  const appXml = readPart(file,"docProps/app.xml");
  return parseAppVersion(appXml) ?? 16;
}

function buildLayoutLabel(layoutPath: string, attrs: ReturnType<typeof getSlideLayoutAttributes>): string {
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
export function buildSlideLayoutOptions(file: PackageFile): SlideLayoutOption[] {
  if (!file) {
    throw new Error("buildSlideLayoutOptions requires a presentation file.");
  }

  const appVersion = resolveAppVersion(file);
  const contentTypesXml = readPart(file,"[Content_Types].xml", { appVersion });
  if (contentTypesXml === null) {
    throw new Error("Failed to read [Content_Types].xml for slide layout catalog.");
  }

  const contentTypes = parseContentTypes(contentTypesXml);

  return contentTypes.slideLayouts.map((layoutPath) => {
    const layoutXml = readPart(file,layoutPath, { appVersion });
    if (layoutXml === null) {
      throw new Error(`Failed to read slide layout XML: ${layoutPath}`);
    }

    const attrs = getSlideLayoutAttributes(layoutXml);
    const label = buildLayoutLabel(layoutPath, attrs);
    const keywords = [attrs.name, attrs.matchingName, attrs.type, layoutPath.split("/").pop()].filter(
      (value): value is string => !!value,
    );

    return {
      value: layoutPath,
      label,
      keywords,
    };
  });
}

/**
 * Slide layout entry with full ECMA-376 §19.3.1.39 metadata.
 *
 * Extends SlideLayoutOption with parsed layout data including
 * background, color map override, transition, and layout attributes.
 */
export type SlideLayoutEntry = SlideLayoutOption & {
  readonly type: SlideLayoutType;
  readonly matchingName?: string;
  readonly showMasterShapes?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
  readonly background?: Background;
  readonly colorMapOverride?: ColorMapOverride;
  readonly transition?: SlideTransition;
};

/**
 * Build slide layout entries with full ECMA-376 metadata from a presentation file.
 *
 * Unlike buildSlideLayoutOptions (which returns only path/label),
 * this function calls parseSlideLayout to extract all layout-level attributes:
 * type, background, colorMapOverride, transition, showMasterShapes, preserve, userDrawn.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (p:sldLayout)
 */
export function buildSlideLayoutEntries(file: PackageFile): SlideLayoutEntry[] {
  if (!file) {
    throw new Error("buildSlideLayoutEntries requires a presentation file.");
  }

  const appVersion = resolveAppVersion(file);
  const contentTypesXml = readPart(file, "[Content_Types].xml", { appVersion });
  if (contentTypesXml === null) {
    throw new Error("Failed to read [Content_Types].xml for slide layout catalog.");
  }

  const contentTypes = parseContentTypes(contentTypesXml);

  return contentTypes.slideLayouts.map((layoutPath) => {
    const layoutXml = readPart(file, layoutPath, { appVersion });
    if (layoutXml === null) {
      throw new Error(`Failed to read slide layout XML: ${layoutPath}`);
    }

    const attrs = getSlideLayoutAttributes(layoutXml);
    const label = buildLayoutLabel(layoutPath, attrs);
    const keywords = [attrs.name, attrs.matchingName, attrs.type, layoutPath.split("/").pop()].filter(
      (value): value is string => !!value,
    );

    const parsed = parseSlideLayout(layoutXml);

    return {
      value: layoutPath,
      label,
      keywords,
      type: parsed?.type ?? "blank",
      matchingName: parsed?.matchingName,
      showMasterShapes: parsed?.showMasterShapes,
      preserve: parsed?.preserve,
      userDrawn: parsed?.userDrawn,
      background: parsed?.background,
      colorMapOverride: parsed?.colorMapOverride,
      transition: parsed?.transition,
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
export function loadSlideLayoutBundle(file: PackageFile, layoutPath: string): SlideLayoutBundle {
  if (!file) {
    throw new Error("loadSlideLayoutBundle requires a presentation file.");
  }
  if (!layoutPath) {
    throw new Error("loadSlideLayoutBundle requires a layout path.");
  }

  const appVersion = resolveAppVersion(file);
  const layout = readPart(file,layoutPath, { appVersion });
  if (layout === null) {
    throw new Error(`Failed to read slide layout XML: ${layoutPath}`);
  }

  const layoutRelationships = loadRelationships(file, layoutPath);
  const layoutTables = indexShapeTreeNodes(layout);

  const masterPath = findMasterPath(layoutRelationships);
  const master = masterPath ? readPart(file,masterPath, { appVersion }) : null;
  const masterRelationships = masterPath ? loadRelationships(file, masterPath) : createEmptyResourceMap();
  const masterTables = indexShapeTreeNodes(master);

  const themePath = masterPath ? findThemePath(masterRelationships) : undefined;
  const theme = themePath ? readPart(file,themePath, { appVersion }) : null;
  const themeRelationships = themePath ? loadRelationships(file, themePath) : createEmptyResourceMap();

  return {
    layout,
    layoutTables,
    layoutRelationships,
    master,
    masterTables,
    masterRelationships,
    theme,
    themeRelationships,
  };
}
