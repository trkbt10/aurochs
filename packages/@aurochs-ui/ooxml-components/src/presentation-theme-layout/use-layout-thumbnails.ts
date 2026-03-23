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
import type { Shape, SlideSize, Slide, Background } from "@aurochs-office/pptx/domain";
import type { PackageFile } from "@aurochs-office/opc";
import type { SlideLayoutOption } from "@aurochs-office/pptx/app";
import { loadSlideLayoutBundle, createResourceResolverFromMaps } from "@aurochs-office/pptx/app";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import { enrichSlideContent, type FileReader } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { parseTheme } from "@aurochs-office/pptx/parser/theme/theme-parser";
import { parseSlideMaster } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { createPlaceholderTable } from "@aurochs-office/pptx/parser/slide/resource-adapters";
import { parseLayoutContent } from "@aurochs-office/pptx/parser/slide/layout-parser";
import type { PlaceholderContext, MasterStylesInfo } from "@aurochs-office/pptx/parser/context";
import { DEFAULT_COLOR_MAPPING } from "@aurochs-office/pptx/domain/color/types";
import { renderSlideSvg } from "@aurochs-renderer/pptx/svg";
import { createCoreRenderContext } from "@aurochs-renderer/pptx";
import type { ColorContext, ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { ResourceResolver as DomainResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { FormatScheme } from "@aurochs-office/pptx/domain/theme/types";

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
  readonly presentationFile: PackageFile | undefined;
  readonly layoutOptions: readonly SlideLayoutOption[];
  readonly slideSize: SlideSize;
  /** Override color context from editor state (reflects live theme edits). */
  readonly colorContext?: ColorContext;
  /** Override font scheme from editor state (reflects live theme edits). */
  readonly fontScheme?: FontScheme;
  /** Master background (Background domain type) for inheritance when layout has no own background. */
  readonly masterBackground?: Background;
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

// DEFAULT_COLOR_MAPPING: SoT from @aurochs-office/pptx/domain/color/types

// =============================================================================
// Core Layout Loading
// =============================================================================

function buildColorContext(colorScheme: ColorScheme | undefined): ColorContext | undefined {
  if (!colorScheme) {
    return undefined;
  }
  return { colorScheme, colorMap: DEFAULT_COLOR_MAPPING as Record<string, string> };
}

/**
 * Load layout shapes with full context (PlaceholderContext + MasterStylesInfo)
 * and render SVG.
 *
 * This is the single source of truth for layout loading across
 * thumbnails and the editor canvas.
 */
export function loadLayoutWithContext(options: {
  readonly file: PackageFile;
  readonly layoutPath: string;
  readonly slideSize: SlideSize;
  readonly colorContext?: ColorContext;
  readonly fontScheme?: FontScheme;
  /** Master background (Background domain type) — fallback when layout has no own background (ECMA-376 §19.3.1.2). */
  readonly masterBackground?: Background;
}): LoadedLayoutData | undefined {
  const { file, layoutPath, slideSize } = options;
  try {
    const bundle = loadSlideLayoutBundle(file, layoutPath);

    // Build PlaceholderContext from master for transform inheritance
    const masterTable = createPlaceholderTable(bundle.masterTables);
    const emptyTable = { byIdx: new Map(), byType: {} };
    const placeholderCtx: PlaceholderContext = {
      layout: emptyTable,
      master: masterTable,
    };

    // Build MasterStylesInfo for text style inheritance (SoT: parseSlideMaster)
    const parsedMaster = parseSlideMaster(bundle.master ?? undefined);
    const masterStylesInfo: MasterStylesInfo = {
      masterTextStyles: parsedMaster?.textStyles,
      defaultTextStyle: undefined,
    };

    // Parse theme for color context, font scheme, and format scheme
    const parsedTheme = bundle.theme ? parseTheme(bundle.theme, undefined) : undefined;
    const colorContext = options.colorContext ?? buildColorContext(parsedTheme?.colorScheme);
    const fontScheme = options.fontScheme ?? parsedTheme?.fontScheme;
    const formatScheme = parsedTheme?.formatScheme;

    // Parse shapes and background from layout XML (SoT: parseLayoutContent)
    const layoutContent = parseLayoutContent(bundle.layout, {
      placeholderCtx,
      masterStylesInfo,
      formatScheme,
      masterBackground: options.masterBackground,
      masterDoc: bundle.master,
    });
    if (layoutContent === undefined) {
      return undefined;
    }

    const { shapes, background } = layoutContent;

    // Register all blipFill images in ResourceStore
    const resourceStore = createResourceStore();
    const resourceMaps = [
      bundle.layoutRelationships,
      bundle.masterRelationships,
      bundle.themeRelationships,
    ];
    const fileReader: FileReader = {
      readFile: (path: string) => {
        const buffer = file.readBinary(path);
        return buffer ?? null;
      },
      resolveResource: (id: string) => {
        for (const map of resourceMaps) {
          const target = map.getTarget(id);
          if (target !== undefined) { return target; }
        }
        return undefined;
      },
      getResourceByType: (relType: string) => {
        for (const map of resourceMaps) {
          const target = map.getTargetByType(relType);
          if (target !== undefined) { return target; }
        }
        return undefined;
      },
    };
    enrichSlideContent({ shapes }, fileReader, resourceStore);

    const resources = createResourceResolverFromMaps(file, resourceMaps, resourceStore);

    const pseudoSlide: Slide = { shapes, background };
    const renderCtx = createCoreRenderContext({
      slideSize,
      colorContext,
      resources,
      fontScheme,
      resourceStore,
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
  const { presentationFile, layoutOptions, slideSize, colorContext, fontScheme, masterBackground } = options;

  return useMemo(() => {
    if (!presentationFile) {
      return [];
    }

    return layoutOptions.map((option) => {
      const result = loadLayoutWithContext({ file: presentationFile, layoutPath: option.value, slideSize, colorContext, fontScheme, masterBackground });
      return {
        ...option,
        shapes: result?.shapes ?? [],
        svg: result?.svg ?? "",
      };
    });
  }, [presentationFile, layoutOptions, slideSize, colorContext, fontScheme, masterBackground]);
}
