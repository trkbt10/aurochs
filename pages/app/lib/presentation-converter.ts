/**
 * @file Presentation converter
 *
 * Converts LoadedPresentation (from pptx-loader) to PresentationDocument (for editor)
 *
 * Extracts theme colors, fonts, and resources for proper rendering in the editor.
 */

import type { LoadedPresentation } from "./pptx-loader";
import type { PresentationDocument, SlideWithId } from "@lib/pptx-editor";
import type { Slide as DomainSlide, Presentation as DomainPresentation } from "@lib/pptx/domain";
import type { ColorContext, FontScheme, ColorScheme, ColorMap } from "@lib/pptx/domain/resolution";
import type { ResourceResolver } from "@lib/pptx/render/core";
import type { Slide as ApiSlide } from "@lib/pptx/types/api";
import { parseSlide } from "@lib/pptx/parser/slide/slide-parser";
import { createParseContext } from "@lib/pptx/parser/context";
import { parseColorScheme, parseFontScheme, parseColorMap } from "@lib/pptx/core/dml/parser/theme";
import { getByPath } from "@lib/xml";
import { getMimeTypeFromPath } from "@lib/pptx/core/opc";
import { createSlideRenderContextFromApiSlide } from "@lib/pptx-editor/presentation/slide-render-context-builder";

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

type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

/**
 * Create a ResourceResolver from the file cache
 *
 * This allows the editor to resolve image and embedded resource references.
 */
function createResourceResolverFromCache(
  cache: FileCache,
  apiSlide: ApiSlide
): ResourceResolver {
  // Build a relationship lookup from slide/layout/master relationships
  const relationships = new Map<string, string>();

  // Collect relationships from slide
  for (const [rId, rel] of Object.entries(apiSlide.relationships)) {
    relationships.set(rId, rel.target);
  }

  // Collect from layout
  for (const [rId, rel] of Object.entries(apiSlide.layoutRelationships)) {
    if (!relationships.has(rId)) {
      relationships.set(rId, rel.target);
    }
  }

  // Collect from master
  for (const [rId, rel] of Object.entries(apiSlide.masterRelationships)) {
    if (!relationships.has(rId)) {
      relationships.set(rId, rel.target);
    }
  }

  // Collect from theme
  for (const [rId, rel] of Object.entries(apiSlide.themeRelationships)) {
    if (!relationships.has(rId)) {
      relationships.set(rId, rel.target);
    }
  }

  return {
    resolve: (id: string) => {
      const target = relationships.get(id);
      if (!target) {
        return undefined;
      }

      // Normalize path (remove leading ../ and convert to ppt/ path)
      const normalizedPath = normalizePptxPath(target);
      const entry = cache.get(normalizedPath);
      if (!entry) {
        return undefined;
      }

      // Convert to data URL
      const mimeType = getMimeTypeFromPath(normalizedPath);
      if (!mimeType) {
        return undefined;
      }

      const base64 = arrayBufferToBase64(entry.buffer);
      return `data:${mimeType};base64,${base64}`;
    },

    getMimeType: (id: string) => {
      const target = relationships.get(id);
      if (!target) {
        return undefined;
      }
      return getMimeTypeFromPath(target);
    },

    getFilePath: (id: string) => {
      return relationships.get(id);
    },

    readFile: (path: string) => {
      const normalizedPath = normalizePptxPath(path);
      const entry = cache.get(normalizedPath);
      if (!entry) {
        return null;
      }
      return new Uint8Array(entry.buffer);
    },

    getResourceByType: (_relType: string) => {
      // Not implemented for editor (would need to iterate all relationships)
      return undefined;
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
  let normalized = path.replace(/^\/+/, "");

  // Handle relative paths from slide/layout/master directories
  if (normalized.startsWith("../")) {
    // Assume we're coming from ppt/slides/, ppt/slideLayouts/, or ppt/slideMasters/
    // ../media/image.png → ppt/media/image.png
    normalized = "ppt/" + normalized.replace(/\.\.\//g, "");
  }

  return normalized;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// =============================================================================
// Main Converter
// =============================================================================

/**
 * Convert a LoadedPresentation to a PresentationDocument for the editor
 */
export function convertToPresentationDocument(loaded: LoadedPresentation): PresentationDocument {
  const { presentation, cache } = loaded;
  const slideCount = presentation.count;
  const slideSize = presentation.size;

  // Get first slide to extract theme/master info (shared across presentation)
  const firstApiSlide = slideCount > 0 ? presentation.getSlide(1) : null;

  // Build color context from first slide's theme/master
  const colorContext = firstApiSlide
    ? buildColorContext(firstApiSlide)
    : { colorScheme: {}, colorMap: {} };

  // Build font scheme from first slide's theme
  const fontScheme = firstApiSlide ? extractFontScheme(firstApiSlide) : undefined;

  // Build resource resolver from cache
  const resources = firstApiSlide
    ? createResourceResolverFromCache(cache, firstApiSlide)
    : createEmptyResourceResolver();

  // Convert each slide from API Slide to domain Slide
  const slides: SlideWithId[] = [];

  for (let i = 1; i <= slideCount; i++) {
    const apiSlide = presentation.getSlide(i);

    // Build SlideRenderContext for proper parsing with style inheritance
    const slideRenderCtx = createSlideRenderContextFromApiSlide(apiSlide, cache);

    // Create ParseContext with placeholder tables, master styles, format scheme
    const parseCtx = createParseContext(slideRenderCtx);

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
    slides: slides.map((s) => s.slide),
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
    fileCache: cache,
  };
}

/**
 * Create an empty resource resolver (fallback)
 */
function createEmptyResourceResolver(): ResourceResolver {
  return {
    resolve: () => undefined,
    getMimeType: () => undefined,
    getFilePath: () => undefined,
    readFile: () => null,
    getResourceByType: () => undefined,
  };
}
