/**
 * @file Presentation converter
 *
 * Converts LoadedPresentation (from pptx-loader) to PresentationDocument (for editor)
 *
 * Extracts theme colors, fonts, and resources for proper rendering in the editor.
 */

import type { LoadedPresentation } from "./pptx-loader";
import type { PresentationDocument, SlideWithId } from "./presentation-document";
import type { Presentation as DomainPresentation, PresentationFile } from "../domain";
import type { ColorContext, ColorScheme, ColorMap } from "../domain/color/context";
import type { FontScheme } from "../domain/resolution";
import type { ResourceResolver } from "../domain/resource-resolver";
import type { Slide as ApiSlide } from "./types";
import { parseSlide } from "../parser/slide/slide-parser";
import { createParseContext } from "../parser/context";
import { parseColorScheme, parseFontScheme, parseColorMap } from "../parser/drawing-ml";
import { getByPath } from "@oxen/xml";
import { createRenderContext } from "./render-context";
import { getMimeTypeFromPath } from "../opc/utils";
import { createZipAdapter } from "../domain";
import { toDataUrl } from "@oxen/buffer";

// =============================================================================
// Color Context Building
// =============================================================================

/**
 * Extract ColorScheme from theme XML
 */
function extractColorScheme(apiSlide: ApiSlide): ColorScheme {
  if (!apiSlide.theme) {
    return {};
  }
  return parseColorScheme(apiSlide.theme);
}

/**
 * Extract ColorMap from master XML
 */
function extractColorMap(apiSlide: ApiSlide): ColorMap {
  if (!apiSlide.master) {
    return {};
  }
  const clrMapElement = getByPath(apiSlide.master, ["p:sldMaster", "p:clrMap"]);
  return parseColorMap(clrMapElement);
}

/**
 * Build ColorContext from API Slide
 */
function buildColorContext(apiSlide: ApiSlide): ColorContext {
  return {
    colorScheme: extractColorScheme(apiSlide),
    colorMap: extractColorMap(apiSlide),
  };
}

// =============================================================================
// Font Scheme Building
// =============================================================================

/**
 * Extract FontScheme from theme XML
 */
function extractFontScheme(apiSlide: ApiSlide): FontScheme | undefined {
  if (!apiSlide.theme) {
    return undefined;
  }
  return parseFontScheme(apiSlide.theme);
}

// =============================================================================
// Resource Resolver Building
// =============================================================================

/**
 * Create a ResourceResolver from the presentation file
 *
 * This allows the editor to resolve image and embedded resource references.
 */
function createResourceResolverFromFile(file: PresentationFile, apiSlide: ApiSlide): ResourceResolver {
  const resolveTarget = (id: string): string | undefined =>
    apiSlide.relationships.getTarget(id)
    ?? apiSlide.layoutRelationships.getTarget(id)
    ?? apiSlide.masterRelationships.getTarget(id)
    ?? apiSlide.themeRelationships.getTarget(id);

  const resolveType = (id: string): string | undefined =>
    apiSlide.relationships.getType(id)
    ?? apiSlide.layoutRelationships.getType(id)
    ?? apiSlide.masterRelationships.getType(id)
    ?? apiSlide.themeRelationships.getType(id);

  const resolveTargetByType = (relType: string): string | undefined =>
    apiSlide.relationships.getTargetByType(relType)
    ?? apiSlide.layoutRelationships.getTargetByType(relType)
    ?? apiSlide.masterRelationships.getTargetByType(relType)
    ?? apiSlide.themeRelationships.getTargetByType(relType);

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

  // Build color context from first slide's theme/master
  const colorContext = firstApiSlide ? buildColorContext(firstApiSlide) : { colorScheme: {}, colorMap: {} };

  // Build font scheme from first slide's theme
  const fontScheme = firstApiSlide ? extractFontScheme(firstApiSlide) : undefined;

  // Build resource resolver from presentation file
  const resources = buildResourceResolver(presentationFile, firstApiSlide);

  // Convert each slide from API Slide to domain Slide
  const slides: SlideWithId[] = [];

  for (let i = 1; i <= slideCount; i++) {
    const apiSlide = presentation.getSlide(i);

    // Build SlideRenderContext for proper parsing with style inheritance
    const renderContext = createRenderContext(apiSlide, zipFile, slideSize);

    // Create ParseContext with placeholder tables, master styles, format scheme
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
    colorContext,
    fontScheme,
    resources,
    presentationFile,
  };
}

function buildResourceResolver(file: PresentationFile, firstApiSlide: ApiSlide | null): ResourceResolver {
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
