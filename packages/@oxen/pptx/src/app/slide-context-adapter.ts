/**
 * @file SlideContext to CoreRenderContext adapter
 *
 * Bridges the parser layer (SlideContext) to the render layer (CoreRenderContext).
 * This is app-layer code that orchestrates layer interaction.
 *
 * @see ECMA-376 Part 1 (Fundamentals and Markup Language Reference)
 */

import type { SlideSize, Shape } from "../domain/index";
import type { ColorContext } from "../domain/color/context";
import type { FontScheme } from "../domain/resolution";
import type { ResourceResolver } from "../domain/resource-resolver";
import type { SlideContext } from "../parser/slide/context";
import type { CoreRenderContext } from "../render/render-context";
import type { RenderOptions } from "../render/render-options";
import { DEFAULT_RENDER_OPTIONS } from "../render/render-options";
import type { ResolvedBackgroundFill } from "../render/background-fill";
import { createWarningCollector } from "../render/warnings";
import { getMimeTypeFromPath } from "../opc/utils";
import { toDataUrl } from "@oxen/buffer";

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
    tableStyles: ctx.presentation.tableStyles,
  };
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
 * Build ResourceResolver from SlideContext.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */
function buildResourceResolver(ctx: SlideContext): ResourceResolver {
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
        const mimeType = getMimeTypeFromPath(target) ?? "application/octet-stream";
        return toDataUrl(data, mimeType);
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
