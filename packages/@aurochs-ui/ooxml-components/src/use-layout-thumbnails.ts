/**
 * @file Hook for layout thumbnail data
 *
 * Loads and caches layout shapes for thumbnail preview.
 * Generates SVG thumbnails using renderSlideSvg for accurate rendering.
 *
 * Parses shapes with full PlaceholderContext and MasterStylesInfo
 * for correct transform/text style inheritance from slide master.
 */

import { useMemo } from "react";
import type { PresentationFile, Shape, SlideSize, Slide } from "@aurochs-office/pptx/domain";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import { loadSlideLayoutBundle, createResourceResolverFromMaps } from "@aurochs-office/pptx/app";
import { parseShapeTree } from "@aurochs-office/pptx/parser";
import { parseTheme, parseMasterTextStyles } from "@aurochs-office/pptx/parser/slide/theme-parser";
import { createPlaceholderTable } from "@aurochs-office/pptx/parser/slide/resource-adapters";
import type { PlaceholderContext, MasterStylesInfo } from "@aurochs-office/pptx/parser/context";
import { getChild, getByPath } from "@aurochs/xml";
import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createCoreRenderContext } from "@aurochs-renderer/pptx";
import type { ColorContext, ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { ResourceResolver as DomainResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";

// =============================================================================
// Types
// =============================================================================

export type LayoutThumbnailData = SlideLayoutOption & {
  /** Layout shapes for preview */
  readonly shapes: readonly Shape[];
  /** SVG string for thumbnail rendering */
  readonly svg: string;
};

export type UseLayoutThumbnailsOptions = {
  readonly presentationFile: PresentationFile | undefined;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly slideSize: SlideSize;
};

/**
 * Loaded layout data with rendering context.
 * Returned by loadLayoutWithContext for use in both thumbnails and canvas.
 */
export type LoadedLayoutData = {
  readonly shapes: readonly Shape[];
  readonly pseudoSlide: Slide;
  readonly colorContext: ColorContext | undefined;
  readonly fontScheme: FontScheme | undefined;
  readonly resources: DomainResourceResolver;
  readonly slideSize: SlideSize;
  readonly svg: string;
};

// =============================================================================
// Constants
// =============================================================================

/** Default color map (identity mapping) */
const DEFAULT_COLOR_MAP: Record<string, string> = {
  bg1: "lt1",
  tx1: "dk1",
  bg2: "lt2",
  tx2: "dk2",
  accent1: "accent1",
  accent2: "accent2",
  accent3: "accent3",
  accent4: "accent4",
  accent5: "accent5",
  accent6: "accent6",
  hlink: "hlink",
  folHlink: "folHlink",
};

// =============================================================================
// Core Layout Loading
// =============================================================================

function buildColorContext(colorScheme: ColorScheme | undefined): ColorContext | undefined {
  if (!colorScheme) {
    return undefined;
  }
  return { colorScheme, colorMap: DEFAULT_COLOR_MAP };
}

/**
 * Load layout shapes with full context (PlaceholderContext + MasterStylesInfo)
 * and render SVG.
 *
 * This is the single source of truth for layout loading across
 * thumbnails and the editor canvas.
 */
export function loadLayoutWithContext(
  file: PresentationFile,
  layoutPath: string,
  slideSize: SlideSize,
): LoadedLayoutData | undefined {
  try {
    const bundle = loadSlideLayoutBundle(file, layoutPath);
    const layoutContent = getByPath(bundle.layout, ["p:sldLayout"]);
    if (layoutContent === undefined) {
      return undefined;
    }

    const cSld = getChild(layoutContent, "p:cSld");
    if (cSld === undefined) {
      return undefined;
    }

    const spTree = getChild(cSld, "p:spTree");
    if (spTree === undefined) {
      return undefined;
    }

    // Build PlaceholderContext from master for transform inheritance
    const masterTable = createPlaceholderTable(bundle.masterTables);
    const emptyTable = { byIdx: new Map(), byType: {} };
    const placeholderCtx: PlaceholderContext = {
      layout: emptyTable,
      master: masterTable,
    };

    // Build MasterStylesInfo for text style inheritance
    const masterTextStyles = parseMasterTextStyles(bundle.masterTextStyles ?? undefined);
    const masterStylesInfo: MasterStylesInfo = {
      masterTextStyles,
      defaultTextStyle: undefined,
    };

    // Parse theme for color context, font scheme, and format scheme
    const parsedTheme = bundle.theme ? parseTheme(bundle.theme, undefined) : undefined;
    const colorContext = buildColorContext(parsedTheme?.colorScheme);
    const fontScheme = parsedTheme?.fontScheme;
    const formatScheme = parsedTheme?.formatScheme;

    // Parse shapes with full context
    const shapes = parseShapeTree({
      spTree,
      ctx: placeholderCtx,
      masterStylesInfo,
      formatScheme,
    });

    // Create resource resolver for layout images
    const resources = createResourceResolverFromMaps(file, [
      bundle.layoutRelationships,
      bundle.masterRelationships,
      bundle.themeRelationships,
    ]);

    // Render SVG
    const pseudoSlide: Slide = { shapes };
    const renderCtx = createCoreRenderContext({
      slideSize,
      colorContext,
      resources,
      fontScheme,
    });
    const result = renderSlideSvg(pseudoSlide, renderCtx);

    return { shapes, pseudoSlide, colorContext, fontScheme, resources, slideSize, svg: result.svg };
  } catch (error) {
    console.warn("Failed to load layout:", error);
    return undefined;
  }
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Load layout shapes and generate SVG thumbnails for preview.
 *
 * Returns layout options augmented with parsed shapes and SVG strings.
 */
export function useLayoutThumbnails(options: UseLayoutThumbnailsOptions): readonly LayoutThumbnailData[] {
  const { presentationFile, layoutOptions, slideSize } = options;

  return useMemo(() => {
    if (!presentationFile) {
      return [];
    }

    return layoutOptions.map((option) => {
      const result = loadLayoutWithContext(presentationFile, option.value, slideSize);
      return {
        ...option,
        shapes: result?.shapes ?? [],
        svg: result?.svg ?? "",
      };
    });
  }, [presentationFile, layoutOptions, slideSize]);
}
