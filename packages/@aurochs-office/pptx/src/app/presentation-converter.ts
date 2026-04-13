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
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { Slide as ApiSlide } from "./types";
import { parseSlide } from "../parser/slide/slide-parser";
import { createParseContext } from "../parser/context";
import { extractThemeData } from "../parser/theme/theme-parser";
import { createSlideContextFromApiSlide, getLayoutNonPlaceholderShapes } from "../parser/slide/context";
import { getBackgroundFillData, toResolvedBackgroundFill } from "../parser/slide/background-parser";
import { loadSlideExternalContent } from "../parser/slide/external-content-loader";

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
  // Get first slide to extract theme/master info (shared across presentation)
  const firstApiSlide = slideCount > 0 ? presentation.getSlide(1) : null;

  // Extract theme via parser SoT (single parse, no redundant calls)
  const themeData = extractThemeFromFirstSlide(firstApiSlide);
  const theme = themeData?.theme;
  const colorContext = buildColorContextFromThemeData(themeData);
  const fontScheme = themeData?.theme.fontScheme ?? EMPTY_FONT_SCHEME;

  // ResourceStore is the SoT for all resolved resources.
  // All images, charts, diagrams, OLE objects are registered here.
  const resourceStore = createResourceStore();

  // Convert each slide from API Slide to domain Slide
  const slides: SlideWithId[] = [];

  for (let i = 1; i <= slideCount; i++) {
    const apiSlide = presentation.getSlide(i);

    // Build SlideContext for proper parsing with style inheritance
    const slideCtx = createSlideContextFromApiSlide(apiSlide);
    const fileReader = slideCtx.toFileReader();

    const parseCtx = createParseContext(slideCtx);

    // Parse the XML content with full context
    const domainSlide = parseSlide(apiSlide.content, parseCtx);

    if (domainSlide) {
      // Register all resources (images, charts, diagrams, OLE) in ResourceStore
      const enrichedSlide = loadSlideExternalContent(domainSlide, fileReader, resourceStore);

      slides.push({
        id: `slide-${i}`,
        slide: enrichedSlide,
        apiSlide,
        colorContext: slideCtx.toRendererColorContext(),
        fontScheme: slideCtx.toFontScheme(),
        resolvedBackground: toResolvedBackgroundFill(getBackgroundFillData(slideCtx)),
        layoutShapes: getLayoutNonPlaceholderShapes(slideCtx),
      });
    }
  }

  // Create domain Presentation
  const domainPresentation: DomainPresentation = {
    slideSize,
  };

  // Table styles from ppt/tableStyles.xml — needed for table cell fill resolution
  const tableStyles = presentation.tableStyles ?? undefined;

  return {
    presentation: domainPresentation,
    slides,
    slideWidth: slideSize.width,
    slideHeight: slideSize.height,
    theme,
    colorContext,
    fontScheme,
    resourceStore,
    presentationFile,
    tableStyles,
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


