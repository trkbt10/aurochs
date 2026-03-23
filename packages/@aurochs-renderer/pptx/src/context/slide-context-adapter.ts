/**
 * @file SlideContext to CoreRenderContext adapter
 *
 * Bridges the parser layer (SlideContext) to the render layer (CoreRenderContext).
 * This is app-layer code that orchestrates layer interaction.
 *
 * @see ECMA-376 Part 1 (Fundamentals and Markup Language Reference)
 */

import type { SlideSize, Shape } from "@aurochs-office/pptx/domain";
import { SCHEME_COLOR_NAMES } from "@aurochs-office/drawing-ml/domain/color";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { DEFAULT_COLOR_MAPPING } from "@aurochs-office/pptx/domain/color/types";
import type { ResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import type { SlideContext } from "@aurochs-office/pptx/parser/slide/context";
import type { CoreRenderContext } from "../render-context";
import { createCoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";
import { getMimeTypeFromPath } from "@aurochs/files";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating render context from SlideContext
 */
export type RenderContextFromSlideOptions = {
  readonly renderOptions?: Partial<RenderOptions>;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly layoutShapes?: readonly Shape[];
  readonly resourceStore: ResourceStore;
};

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create CoreRenderContext from SlideContext.
 *
 * This factory function bridges the parser layer (SlideContext)
 * to the render layer (CoreRenderContext), extracting all necessary
 * information for rendering slides.
 *
 * @see ECMA-376 Part 1 (Fundamentals and Markup Language Reference)
 */
export function createRenderContextFromSlideContext(
  ctx: SlideContext,
  slideSize: SlideSize,
  options: RenderContextFromSlideOptions,
): CoreRenderContext {
  return createCoreRenderContext({
    slideSize,
    options: options.renderOptions,
    colorContext: buildColorContext(ctx),
    resources: buildResourceResolver(ctx, options.resourceStore),
    fontScheme: buildFontScheme(ctx),
    resolvedBackground: options.resolvedBackground,
    layoutShapes: options.layoutShapes,
    tableStyles: ctx.presentation.tableStyles,
    resourceStore: options.resourceStore,
  });
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Build ColorContext from SlideContext.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.10 (a:clrScheme)
 */
function buildColorContext(ctx: SlideContext): ColorContext {
  const scheme = ctx.presentation.theme.colorScheme;
  const masterMap = ctx.master.colorMap;
  const overrideMap = ctx.slide.colorMapOverride;

  const colorScheme: Record<string, string> = {};
  for (const name of SCHEME_COLOR_NAMES) {
    const value = scheme[name];
    if (value !== undefined) {
      colorScheme[name] = value;
    }
  }

  const colorMap: Record<string, string> = {};
  const colorMappingKeys = Object.keys(DEFAULT_COLOR_MAPPING);
  for (const name of colorMappingKeys) {
    if (overrideMap !== undefined) {
      const value = overrideMap[name];
      if (value !== undefined) {
        colorMap[name] = value;
        continue;
      }
    }
    const value = masterMap[name];
    if (value !== undefined) {
      colorMap[name] = value;
    }
  }

  return { colorScheme, colorMap };
}

/**
 * Build ResourceResolver from SlideContext and ResourceStore.
 *
 * resolve() delegates to ResourceStore.toDataUrl() — ResourceStore is the
 * single source of truth for all resolved image/resource data.
 * All images must be registered in ResourceStore before rendering
 * (via enrichSlideContent / registerSlideBlipFillImages).
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */
function buildResourceResolver(ctx: SlideContext, resourceStore: ResourceStore): ResourceResolver {
  return {
    getTarget: (id: string) => ctx.slide.resources.getTarget(id),
    getType: (id: string) => ctx.slide.resources.getType(id),
    resolve: (id: string) => resourceStore.toDataUrl(id),
    getMimeType: (id: string) => {
      const entry = resourceStore.get(id);
      if (entry?.mimeType !== undefined) {
        return entry.mimeType;
      }
      const target = ctx.resolveResource(id);
      if (target === undefined) {
        return undefined;
      }
      return getMimeTypeFromPath(target);
    },
    getFilePath: (id: string) => {
      const entry = resourceStore.get(id);
      if (entry?.path !== undefined) {
        return entry.path;
      }
      return ctx.resolveResource(id);
    },
    readFile: (path: string) => {
      const data = ctx.readFile(path);
      if (data === null) {
        return null;
      }
      return new Uint8Array(data);
    },
    getResourceByType: (relType: string) => {
      return ctx.slide.resources.getTargetByType(relType);
    },
  };
}

/**
 * Build FontScheme from SlideContext.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 */
function buildFontScheme(ctx: SlideContext): FontScheme {
  const fontScheme = ctx.presentation.theme.fontScheme;
  return {
    majorFont: {
      latin: fontScheme.majorFont.latin,
      eastAsian: fontScheme.majorFont.eastAsian,
      complexScript: fontScheme.majorFont.complexScript,
    },
    minorFont: {
      latin: fontScheme.minorFont.latin,
      eastAsian: fontScheme.minorFont.eastAsian,
      complexScript: fontScheme.minorFont.complexScript,
    },
  };
}
