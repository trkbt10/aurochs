/**
 * @file Figma renderer types (renderer-specific only)
 */

import type { FigBlob, FigImage } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import type { FontLoader } from "./font";

// =============================================================================
// SVG Render Context
// =============================================================================

/**
 * SVG defs collector for gradients, patterns, clip paths
 */
export type DefsCollector = {
  /** Add a def element (raw SVG string) */
  readonly add: (def: string) => void;
  /** Generate unique ID for a def */
  readonly generateId: (prefix: string) => string;
  /** Get all collected defs */
  readonly getAll: () => readonly string[];
  /** Check if any defs were collected */
  readonly hasAny: () => boolean;
};

/**
 * SVG render context for Figma nodes
 */
export type FigSvgRenderContext = {
  /** Defs collector for gradients, patterns, etc. */
  readonly defs: DefsCollector;
  /** Canvas size for viewport */
  readonly canvasSize: { width: number; height: number };
  /** Blobs from parsed .fig file for path decoding */
  readonly blobs: readonly FigBlob[];
  /** Images extracted from .fig file (keyed by imageRef) */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Whether to render hidden nodes (visible: false) */
  readonly showHiddenNodes: boolean;
  /** Symbol map for INSTANCE node resolution (GUID string -> FigNode) */
  readonly symbolMap?: ReadonlyMap<string, FigNode>;
  /** Pre-resolved SYMBOL cache (GUID string -> resolved FigNode with expanded children) */
  readonly resolvedSymbolCache?: ReadonlyMap<string, FigNode>;
  /** Font loader for path-based text rendering */
  readonly fontLoader?: FontLoader;
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
  /** Symbol map for INSTANCE node resolution (GUID string -> FigNode) */
  readonly symbolMap?: ReadonlyMap<string, FigNode>;
  /** Pre-resolved SYMBOL cache (GUID string -> resolved FigNode with expanded children) */
  readonly resolvedSymbolCache?: ReadonlyMap<string, FigNode>;
  /** Font loader for path-based text rendering */
  readonly fontLoader?: FontLoader;
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
