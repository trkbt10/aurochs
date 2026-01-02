/**
 * @file Core context creation utilities
 *
 * Factory functions for creating render contexts.
 */

import type { SlideSize } from "../../domain";
import type { ColorContext, FontScheme, ColorScheme, ColorMap } from "../../domain/resolution";
import { px } from "../../domain/types";
import type {
  CoreRenderContext,
  RenderOptions,
  RenderWarning,
  ResolvedBackgroundFill,
  ResourceResolver,
  WarningCollector,
} from "./types";
import { DEFAULT_RENDER_OPTIONS } from "./types";
import type { SlideRenderContext } from "../../reader/slide/accessor";
import { getMimeTypeFromPath, createDataUrl } from "../../core/opc";

// =============================================================================
// Empty Resource Resolver
// =============================================================================

/**
 * Create an empty resource resolver (for testing)
 */
export function createEmptyResourceResolver(): ResourceResolver {
  return {
    resolve: () => undefined,
    getMimeType: () => undefined,
    getFilePath: () => undefined,
    readFile: () => null,
  };
}

// =============================================================================
// Warning Collector
// =============================================================================

/**
 * Create a warning collector
 */
export function createWarningCollector(): WarningCollector {
  const warnings: RenderWarning[] = [];

  return {
    add: (warning) => warnings.push(warning),
    getAll: () => warnings,
    hasErrors: () => warnings.some((w) => w.type === "error"),
  };
}

// =============================================================================
// Core Context Creation
// =============================================================================

/**
 * Configuration for creating a core render context
 */
export type CoreRenderContextConfig = {
  slideSize: SlideSize;
  options?: Partial<RenderOptions>;
  colorContext?: ColorContext;
  resources?: ResourceResolver;
};

/**
 * Create a core render context (format-agnostic)
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

// =============================================================================
// Render Context Builder (from SlideRenderContext)
// =============================================================================

/**
 * Options for creating render context from SlideRenderContext
 */
export type RenderContextFromSlideOptions = {
  readonly renderOptions?: Partial<RenderOptions>;
  readonly resolvedBackground?: ResolvedBackgroundFill;
};

/**
 * Create CoreRenderContext from SlideRenderContext.
 *
 * This factory function bridges the reader layer (SlideRenderContext)
 * to the render layer (CoreRenderContext), extracting all necessary
 * information for rendering slides.
 *
 * @see ECMA-376 Part 1 (Fundamentals and Markup Language Reference)
 */
export function createRenderContext(
  ctx: SlideRenderContext,
  slideSize: SlideSize,
  options?: RenderContextFromSlideOptions,
): CoreRenderContext {
  let shapeId = 0;

  return {
    slideSize,
    options: { ...DEFAULT_RENDER_OPTIONS, ...options?.renderOptions },
    colorContext: buildColorContext(ctx),
    resources: buildResourceResolver(ctx),
    warnings: createWarningCollector(),
    getNextShapeId: () => `shape-${shapeId++}`,
    resolvedBackground: options?.resolvedBackground,
    fontScheme: buildFontScheme(ctx),
  };
}

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
      if (data === null) return null;
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
