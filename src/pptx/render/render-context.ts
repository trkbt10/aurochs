/**
 * @file Core render context
 *
 * Format-agnostic render context shared by HTML and SVG renderers.
 */

import type { SlideSize, Shape } from "../domain";
import type { ColorContext, FontScheme } from "../domain/resolution";
import type { ResourceResolver } from "../domain/resource-resolver";
import { createEmptyResourceResolver } from "../domain/resource-resolver";
import { px } from "../domain/types";
import type { RenderOptions } from "./render-options";
import { DEFAULT_RENDER_OPTIONS } from "./render-options";
import type { ResolvedBackgroundFill } from "./background-fill";
import type { WarningCollector } from "./warnings";
import { createWarningCollector } from "./warnings";
import type { SlideRenderContext } from "./slide-context";
import { getMimeTypeFromPath, createDataUrl } from "../opc";

// =============================================================================
// Types
// =============================================================================

/**
 * Core render context shared by both HTML and SVG renderers.
 * Does NOT include format-specific utilities like StyleCollector.
 */
export type CoreRenderContext = {
  /** Slide dimensions */
  readonly slideSize: SlideSize;

  /** Render options */
  readonly options: RenderOptions;

  /** Color resolution context */
  readonly colorContext: ColorContext;

  /** Resource resolver */
  readonly resources: ResourceResolver;

  /** Warning collector */
  readonly warnings: WarningCollector;

  /** Current shape ID counter */
  readonly getNextShapeId: () => string;

  /**
   * Pre-resolved background fill (after slide → layout → master inheritance).
   * If provided, this takes precedence over the slide's parsed background.
   */
  readonly resolvedBackground?: ResolvedBackgroundFill;

  /**
   * Font scheme for resolving theme font references (+mj-lt, +mn-lt, etc.).
   * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
   */
  readonly fontScheme?: FontScheme;

  /**
   * Non-placeholder shapes from slide layout.
   * These are decorative shapes that should be rendered behind slide content.
   *
   * Per ECMA-376 Part 1, Section 19.3.1.39 (sldLayout):
   * Layout shapes provide visual decoration that is inherited by slides.
   * Only non-placeholder shapes are included here.
   *
   * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
   */
  readonly layoutShapes?: readonly Shape[];
};

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for creating a core render context.
 *
 * This is the configuration type used by all render context factories.
 * All optional fields have sensible defaults when not provided.
 */
export type CoreRenderContextConfig = {
  readonly slideSize: SlideSize;
  readonly options?: Partial<RenderOptions>;
  readonly colorContext?: ColorContext;
  readonly resources?: ResourceResolver;
  readonly fontScheme?: FontScheme;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly layoutShapes?: readonly Shape[];
};

/**
 * Options for creating render context from SlideRenderContext
 */
export type RenderContextFromSlideOptions = {
  readonly renderOptions?: Partial<RenderOptions>;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly layoutShapes?: readonly Shape[];
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a core render context (format-agnostic).
 *
 * This is the primary factory for creating render contexts.
 * HTML and SVG contexts extend this with format-specific features.
 */
export function createCoreRenderContext(config: CoreRenderContextConfig): CoreRenderContext {
  const shapeId = { value: 0 };

  return {
    slideSize: config.slideSize,
    options: { ...DEFAULT_RENDER_OPTIONS, ...config.options },
    colorContext: config.colorContext ?? { colorScheme: {}, colorMap: {} },
    resources: config.resources ?? createEmptyResourceResolver(),
    warnings: createWarningCollector(),
    getNextShapeId: () => `shape-${shapeId.value++}`,
    fontScheme: config.fontScheme,
    resolvedBackground: config.resolvedBackground,
    layoutShapes: config.layoutShapes,
  };
}

/**
 * Create an empty core render context (for testing)
 */
export function createEmptyCoreRenderContext(): CoreRenderContext {
  return createCoreRenderContext({
    slideSize: { width: px(960), height: px(540) },
  });
}

/**
 * Create CoreRenderContext from SlideRenderContext.
 *
 * This factory function bridges the reader layer (SlideRenderContext)
 * to the render layer (CoreRenderContext), extracting all necessary
 * information for rendering slides.
 *
 * @see ECMA-376 Part 1 (Fundamentals and Markup Language Reference)
 */
export function createRenderContextFromSlideContext(
  ctx: SlideRenderContext,
  slideSize: SlideSize,
  options?: RenderContextFromSlideOptions,
): CoreRenderContext {
  const shapeId = { value: 0 };

  return {
    slideSize,
    options: { ...DEFAULT_RENDER_OPTIONS, ...options?.renderOptions },
    colorContext: buildColorContext(ctx),
    resources: buildResourceResolver(ctx),
    warnings: createWarningCollector(),
    getNextShapeId: () => `shape-${shapeId.value++}`,
    resolvedBackground: options?.resolvedBackground,
    fontScheme: buildFontScheme(ctx),
    layoutShapes: options?.layoutShapes,
  };
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Build ColorContext from SlideRenderContext.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.10 (a:clrScheme)
 */
function buildColorContext(ctx: SlideRenderContext): ColorContext {
  const scheme = ctx.presentation.theme.colorScheme;
  const masterMap = ctx.master.colorMap;
  const overrideMap = ctx.slide.colorMapOverride;

  const colorScheme: Record<string, string> = {};
  const schemeColors = [
    "dk1", "lt1", "dk2", "lt2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink",
  ];
  for (const name of schemeColors) {
    const value = scheme[name];
    if (value !== undefined) {
      colorScheme[name] = value;
    }
  }

  const colorMap: Record<string, string> = {};
  const mappedColors = [
    "tx1", "tx2", "bg1", "bg2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink",
  ];
  for (const name of mappedColors) {
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
 * Build ResourceResolver from SlideRenderContext.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */
function buildResourceResolver(ctx: SlideRenderContext): ResourceResolver {
  return {
    getTarget: (id: string) => ctx.slide.resources.getTarget(id),
    getType: (id: string) => ctx.slide.resources.getType(id),
    resolve: (id: string) => {
      const target = ctx.resolveResource(id);
      if (target === undefined) {
        return undefined;
      }

      const data = ctx.readFile(target);
      if (data !== null) {
        return createDataUrl(data, target);
      }

      return target;
    },
    getMimeType: (id: string) => {
      const target = ctx.resolveResource(id);
      if (target === undefined) {
        return undefined;
      }
      return getMimeTypeFromPath(target);
    },
    getFilePath: (id: string) => {
      return ctx.resolveResource(id);
    },
    readFile: (path: string) => {
      const data = ctx.readFile(path);
      if (data === null) {return null;}
      return new Uint8Array(data);
    },
    getResourceByType: (relType: string) => {
      return ctx.slide.resources.getTargetByType(relType);
    },
  };
}

/**
 * Build FontScheme from SlideRenderContext.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 */
function buildFontScheme(ctx: SlideRenderContext): FontScheme {
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
