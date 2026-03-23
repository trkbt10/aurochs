/**
 * @file Presentation converter
 *
 * Converts LoadedPresentation (from pptx-loader) to PresentationDocument (for editor)
 *
 * Extracts theme colors, fonts, and resources for proper rendering in the editor.
 */

import type { LoadedPresentation } from "./pptx-loader";
import type { PresentationDocument, SlideWithId } from "./presentation-document";
import type { Presentation as DomainPresentation } from "../domain";
import type { PackageFile } from "@aurochs-office/opc";
import type { ExtractedTheme } from "../domain";
import type { ResourceMap } from "@aurochs-office/opc";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResourceResolver } from "../domain/resource-resolver";
import type { Slide as ApiSlide } from "./types";
import { parseSlide } from "../parser/slide/slide-parser";
import { createParseContext } from "../parser/context";
import { extractThemeData } from "../parser/theme/theme-parser";
import { createRenderContext } from "@aurochs-renderer/pptx";
import { getMimeTypeFromPath } from "@aurochs/files";
import { createZipAdapter } from "../domain";
import { toDataUrl } from "@aurochs/buffer";

// =============================================================================
// Resource Resolver Building
// =============================================================================

/**
 * Create a ResourceResolver from the presentation file
 *
 * This allows the editor to resolve image and embedded resource references.
 */
function createResourceResolverFromFile(file: PackageFile, apiSlide: ApiSlide): ResourceResolver {
  const resolveTarget = (id: string): string | undefined =>
    apiSlide.relationships.getTarget(id) ??
    apiSlide.layoutRelationships.getTarget(id) ??
    apiSlide.masterRelationships.getTarget(id) ??
    apiSlide.themeRelationships.getTarget(id);

  const resolveType = (id: string): string | undefined =>
    apiSlide.relationships.getType(id) ??
    apiSlide.layoutRelationships.getType(id) ??
    apiSlide.masterRelationships.getType(id) ??
    apiSlide.themeRelationships.getType(id);

  const resolveTargetByType = (relType: string): string | undefined =>
    apiSlide.relationships.getTargetByType(relType) ??
    apiSlide.layoutRelationships.getTargetByType(relType) ??
    apiSlide.masterRelationships.getTargetByType(relType) ??
    apiSlide.themeRelationships.getTargetByType(relType);

  return {
    getTarget: resolveTarget,
    getType: resolveType,
    resolve: (id: string) => {
      const target = resolveTarget(id);
      if (!target) {
        return undefined;
      }

      // Normalize path (remove leading ../ and convert to ppt/ path)
      const normalizedPath = normalizePptxPath(target);
      const buffer = file.readBinary(normalizedPath);
      if (!buffer) {
        return undefined;
      }

      // Convert to data URL
      const mimeType = getMimeTypeFromPath(normalizedPath);
      if (!mimeType) {
        return undefined;
      }

      return toDataUrl(buffer, mimeType);
    },

    getMimeType: (id: string) => {
      const target = resolveTarget(id);
      if (!target) {
        return undefined;
      }
      return getMimeTypeFromPath(target);
    },

    getFilePath: (id: string) => {
      return resolveTarget(id);
    },

    readFile: (path: string) => {
      const normalizedPath = normalizePptxPath(path);
      const buffer = file.readBinary(normalizedPath);
      if (!buffer) {
        return null;
      }
      return new Uint8Array(buffer);
    },

    getResourceByType: (relType: string) => {
      return resolveTargetByType(relType);
    },
  };
}

/**
 * Create a ResourceResolver from multiple ResourceMap layers and a PackageFile.
 *
 * Chains resolution through the provided resource maps in order (first match wins).
 * Used by the layout editor where no ApiSlide is available.
 *
 * @param file - PackageFile for reading binary content
 * @param resourceMaps - ResourceMap layers to chain (e.g., layout, master, theme)
 */
export function createResourceResolverFromMaps(
  file: PackageFile,
  resourceMaps: readonly ResourceMap[],
): ResourceResolver {
  const resolveTarget = (id: string): string | undefined => {
    for (const map of resourceMaps) {
      const target = map.getTarget(id);
      if (target !== undefined) { return target; }
    }
    return undefined;
  };

  const resolveType = (id: string): string | undefined => {
    for (const map of resourceMaps) {
      const type = map.getType(id);
      if (type !== undefined) { return type; }
    }
    return undefined;
  };

  const resolveTargetByType = (relType: string): string | undefined => {
    for (const map of resourceMaps) {
      const target = map.getTargetByType(relType);
      if (target !== undefined) { return target; }
    }
    return undefined;
  };

  return {
    getTarget: resolveTarget,
    getType: resolveType,
    resolve: (id: string) => {
      const target = resolveTarget(id);
      if (!target) { return undefined; }
      const normalizedPath = normalizePptxPath(target);
      const buffer = file.readBinary(normalizedPath);
      if (!buffer) { return undefined; }
      const mimeType = getMimeTypeFromPath(normalizedPath);
      if (!mimeType) { return undefined; }
      return toDataUrl(buffer, mimeType);
    },
    getMimeType: (id: string) => {
      const target = resolveTarget(id);
      if (!target) { return undefined; }
      return getMimeTypeFromPath(target);
    },
    getFilePath: (id: string) => resolveTarget(id),
    readFile: (path: string) => {
      const normalizedPath = normalizePptxPath(path);
      const buffer = file.readBinary(normalizedPath);
      if (!buffer) { return null; }
      return new Uint8Array(buffer);
    },
    getResourceByType: (relType: string) => resolveTargetByType(relType),
  };
}

/**
 * Normalize a PPTX internal path
 *
 * Converts relative paths like "../media/image1.png" to absolute paths like "ppt/media/image1.png"
 */
function normalizePptxPath(path: string): string {
  // Remove leading slashes
  const normalized = path.replace(/^\/+/, "");

  // Handle relative paths from slide/layout/master directories
  if (normalized.startsWith("../")) {
    // Assume we're coming from ppt/slides/, ppt/slideLayouts/, or ppt/slideMasters/
    // ../media/image.png → ppt/media/image.png
    return `ppt/${normalized.replace(/\.\.\//g, "")}`;
  }

  return normalized;
}

// =============================================================================
// Main Converter
// =============================================================================

/**
 * Convert a LoadedPresentation to a PresentationDocument for the editor
 */
export function convertToPresentationDocument(loaded: LoadedPresentation): PresentationDocument {
  const { presentation, presentationFile } = loaded;
  const slideCount = presentation.count;
  const slideSize = presentation.size;
  const zipFile = createZipAdapter(presentationFile);

  // Get first slide to extract theme/master info (shared across presentation)
  const firstApiSlide = slideCount > 0 ? presentation.getSlide(1) : null;

  // Extract theme via parser SoT (single parse, no redundant calls)
  const themeData = extractThemeFromFirstSlide(firstApiSlide);
  const theme = themeData?.theme;
  const colorContext = buildColorContextFromThemeData(themeData);
  const fontScheme = themeData?.theme.fontScheme ?? EMPTY_FONT_SCHEME;

  // Build resource resolver from presentation file
  const resources = buildResourceResolver(presentationFile, firstApiSlide);

  // Convert each slide from API Slide to domain Slide
  const slides: SlideWithId[] = [];

  for (let i = 1; i <= slideCount; i++) {
    const apiSlide = presentation.getSlide(i);

    // Build SlideRenderContext for proper parsing with style inheritance
    const renderContext = createRenderContext({ apiSlide, zip: zipFile, slideSize });

    // Create ParseContext with placeholder tables, master styles, format scheme
    if (!renderContext.slideRenderContext) {
      throw new Error("slideRenderContext is required when apiSlide is provided");
    }
    const parseCtx = createParseContext(renderContext.slideRenderContext);

    // Parse the XML content with full context
    const domainSlide = parseSlide(apiSlide.content, parseCtx);

    if (domainSlide) {
      slides.push({
        id: `slide-${i}`,
        slide: domainSlide,
        apiSlide, // Store API slide for proper rendering context
      });
    }
  }

  // Create domain Presentation
  const domainPresentation: DomainPresentation = {
    slideSize,
  };

  return {
    presentation: domainPresentation,
    slides,
    slideWidth: slideSize.width,
    slideHeight: slideSize.height,
    theme,
    colorContext,
    fontScheme,
    resources,
    presentationFile,
  };
}

function extractThemeFromFirstSlide(firstApiSlide: ApiSlide | null): ExtractedTheme | undefined {
  if (!firstApiSlide) { return undefined; }
  return extractThemeData({
    theme: firstApiSlide.theme,
    themeOverrides: firstApiSlide.themeOverrides ?? [],
    master: firstApiSlide.master,
  });
}

function buildColorContextFromThemeData(themeData: ExtractedTheme | undefined): ColorContext {
  if (!themeData) { return { colorScheme: {}, colorMap: {} }; }
  return { colorScheme: themeData.theme.colorScheme, colorMap: themeData.colorMap };
}

function buildResourceResolver(file: PackageFile, firstApiSlide: ApiSlide | null): ResourceResolver {
  if (!firstApiSlide) {
    return createEmptyResourceResolver();
  }

  return createResourceResolverFromFile(file, firstApiSlide);
}

/**
 * Create an empty resource resolver (fallback)
 */
function createEmptyResourceResolver(): ResourceResolver {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
    resolve: () => undefined,
    getMimeType: () => undefined,
    getFilePath: () => undefined,
    readFile: () => null,
    getResourceByType: () => undefined,
  };
}
