/**
 * @file Figma renderer types (renderer-specific only)
 */

import type { FigBlob, FigImage } from "@aurochs/fig/parser";
import type { FigStyleRegistry } from "@aurochs/fig/domain";

import type { FontLoader } from "./font";
import type { FigResolver } from "./symbols/fig-resolver";

// =============================================================================
// SVG Render Context
// =============================================================================

/**
 * Render context for the legacy text-path helpers
 * (`renderTextNodeAsPath` / `renderDerivedPathText`).
 *
 * These helpers predate the `SceneGraph` → `RenderTree` pipeline and only
 * consume `fontLoader` + `blobs`. All other fields are carried so call sites
 * can share a context object across helpers, but SVG defs and IDs for
 * gradients / masks / clip-paths are NOT produced here — those flow through
 * `scene-graph/render-tree/resolve.ts` which is the single source of truth
 * for SVG def IDs (see `IdGenerator` in `scene-graph/render/fill.ts`).
 *
 * Keeping `FigSvgRenderContext` scoped to text-path rendering preserves a
 * single ID-generation pathway for the three rendering backends
 * (SVG / React / WebGL) and prevents the ID-namespace split that caused
 * the Link 190:3213 zoom-dependent clip regression.
 */
export type FigSvgRenderContext = {
  /** Canvas size for viewport */
  readonly canvasSize: { width: number; height: number };
  /** Blobs from parsed .fig file for path decoding */
  readonly blobs: readonly FigBlob[];
  /** Images extracted from .fig file (keyed by imageRef) */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Whether to render hidden nodes (visible: false) */
  readonly showHiddenNodes: boolean;
  /** Instance resolver for SYMBOL/COMPONENT/INSTANCE resolution */
  readonly resolver?: FigResolver;
  /** Font loader for path-based text rendering */
  readonly fontLoader?: FontLoader;
  /** Style registry for resolving stale fillPaints via styleIdForFill */
  readonly styleRegistry: FigStyleRegistry;
};

/**
 * Configuration for creating SVG render context
 */
export type FigSvgRenderContextConfig = {
  readonly canvasSize?: { width: number; height: number };
  readonly blobs?: readonly FigBlob[];
  readonly images?: ReadonlyMap<string, FigImage>;
  /** Whether to render hidden nodes (visible: false) */
  readonly showHiddenNodes?: boolean;
  /** Instance resolver for SYMBOL/COMPONENT/INSTANCE resolution */
  readonly resolver?: FigResolver;
  /** Font loader for path-based text rendering */
  readonly fontLoader?: FontLoader;
  /** Style registry for resolving stale fillPaints via styleIdForFill */
  readonly styleRegistry?: FigStyleRegistry;
};

/**
 * SVG render result
 */
export type FigSvgRenderResult = {
  /** Generated SVG string */
  readonly svg: string;
  /** Warnings generated during rendering */
  readonly warnings: readonly string[];
};
