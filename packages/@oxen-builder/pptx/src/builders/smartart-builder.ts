/**
 * @file SmartArt builder for build command
 *
 * Updates SmartArt diagrams on slides using the patcher APIs.
 */

import {
  parseXml,
  serializeDocument,
  getChildren,
  isXmlElement,
} from "@oxen/xml";
import type { ZipPackage } from "@oxen/zip";
import { patchDiagram, type DiagramChange, type DiagramFiles } from "@oxen-builder/pptx/patcher";
import type { SmartArtUpdateSpec, DiagramChangeSpec } from "../types";

/**
 * Get the relationship path for a slide.
 */
function getSlideRelsPath(slidePath: string): string {
  return slidePath.replace(/\/([^/]+)\.xml$/, "/_rels/$1.xml.rels");
}

/**
 * Find the diagram data path from a relationship.
 */
function findDiagramPaths(
  pkg: ZipPackage,
  slideRelsPath: string,
  resourceId: string,
): { data: string; layout: string; colors: string; quickStyle: string } | null {
  const relsXml = pkg.readText(slideRelsPath);
  if (!relsXml) {
    return null;
  }

  const relsDoc = parseXml(relsXml);
  const root = relsDoc.children.find(isXmlElement);
  if (!root) {
    return null;
  }

  const rels = getChildren(root, "Relationship");
  const diagramRel = rels.find((r) => r.attrs.Id === resourceId);

  if (!diagramRel) {
    return null;
  }

  // Find all diagram-related relationships
  const pathsFromRels = rels.reduce(
    (acc, rel) => {
      const relType = rel.attrs.Type ?? "";
      const target = rel.attrs.Target ?? "";

      if (relType.includes("diagramData") && !acc.data) {
        return { ...acc, data: normalizeRelPath(slideRelsPath, target) };
      }
      if (relType.includes("diagramLayout") && !acc.layout) {
        return { ...acc, layout: normalizeRelPath(slideRelsPath, target) };
      }
      if (relType.includes("diagramColors") && !acc.colors) {
        return { ...acc, colors: normalizeRelPath(slideRelsPath, target) };
      }
      if (relType.includes("diagramQuickStyle") && !acc.quickStyle) {
        return { ...acc, quickStyle: normalizeRelPath(slideRelsPath, target) };
      }
      return acc;
    },
    { data: null as string | null, layout: null as string | null, colors: null as string | null, quickStyle: null as string | null },
  );

  // If not found directly, try looking for diagram parts in common locations
  const findDiagramFile = (suffix: string): string | null => {
    const files = pkg.listFiles();
    return files.find((f) => f.includes("diagrams/") && f.endsWith(suffix)) ?? null;
  };

  const dataPath = pathsFromRels.data ?? findDiagramFile("data1.xml");
  const layoutPath = pathsFromRels.layout ?? findDiagramFile("layout1.xml");
  const colorsPath = pathsFromRels.colors ?? findDiagramFile("colors1.xml");
  const quickStylePath = pathsFromRels.quickStyle ?? findDiagramFile("quickStyle1.xml");

  if (!dataPath || !layoutPath || !colorsPath || !quickStylePath) {
    return null;
  }

  return {
    data: dataPath,
    layout: layoutPath,
    colors: colorsPath,
    quickStyle: quickStylePath,
  };
}

/**
 * Normalize a relative path from the rels file location.
 */
function normalizeRelPath(relsPath: string, target: string): string {
  if (target.startsWith("/")) {
    return target.slice(1);
  }

  const baseDir = relsPath.replace(/_rels\/[^/]+\.rels$/, "");
  const parts = baseDir.split("/").filter(Boolean);

  for (const segment of target.split("/")) {
    if (segment === "..") {
      parts.pop();
    } else if (segment !== ".") {
      parts.push(segment);
    }
  }

  return parts.join("/");
}

/**
 * Convert CLI change spec to patcher change type.
 */
function convertChange(spec: DiagramChangeSpec): DiagramChange {
  return spec as DiagramChange;
}

/**
 * Apply SmartArt updates to a slide.
 *
 * @param pkg - The ZipPackage containing the PPTX
 * @param slidePath - Path to the slide XML
 * @param specs - SmartArt update specifications
 */
export function applySmartArtUpdates(
  pkg: ZipPackage,
  slidePath: string,
  specs: readonly SmartArtUpdateSpec[],
): void {
  if (specs.length === 0) {
    return;
  }

  const slideRelsPath = getSlideRelsPath(slidePath);

  for (const spec of specs) {
    const paths = findDiagramPaths(pkg, slideRelsPath, spec.resourceId);
    if (!paths) {
      console.warn(`SmartArt update: could not find diagram for resourceId ${spec.resourceId}`);
      continue;
    }

    // Read diagram files
    const dataXml = pkg.readText(paths.data);
    const layoutXml = pkg.readText(paths.layout);
    const colorsXml = pkg.readText(paths.colors);
    const quickStyleXml = pkg.readText(paths.quickStyle);

    if (!dataXml || !layoutXml || !colorsXml || !quickStyleXml) {
      console.warn(`SmartArt update: missing diagram files for resourceId ${spec.resourceId}`);
      continue;
    }

    const diagramFiles: DiagramFiles = {
      data: parseXml(dataXml),
      layout: parseXml(layoutXml),
      colors: parseXml(colorsXml),
      quickStyle: parseXml(quickStyleXml),
    };

    // Apply changes
    const changes = spec.changes.map(convertChange);
    const updatedFiles = patchDiagram(diagramFiles, changes);

    // Write back
    pkg.writeText(paths.data, serializeDocument(updatedFiles.data, { declaration: true, standalone: true }));
  }
}
