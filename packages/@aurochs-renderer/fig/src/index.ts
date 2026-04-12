/**
 * @file Figma renderer package entry point
 *
 * This package provides SVG rendering for Figma nodes.
 *
 * For parsing .fig files, import from @aurochs/fig/parser:
 *   import { parseFigFile, parseFigFileSync } from "@aurochs/fig/parser";
 *
 * For Figma types (FigNodeType, FigMatrix, FigColor, etc.), import from @aurochs/fig/types:
 *   import type { FigNodeType, FigMatrix, FigColor } from "@aurochs/fig/types";
 */

// =============================================================================
// Renderer-specific types
// =============================================================================

export type { DefsCollector, FigSvgRenderContext, FigSvgRenderContextConfig, FigSvgRenderResult } from "./types";
