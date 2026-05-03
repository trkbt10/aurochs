/**
 * @file Fig page renderer component
 *
 * Selects the concrete fig renderer backend consumed by the React editor
 * shell. React owns mounting and editor chrome; node pixels come from the
 * SVG or WebGL backend.
 */

import type { FigPage, FigDesignNode, FigStyleRegistry } from "@aurochs/fig/domain";
import type { FigImage } from "@aurochs/fig/parser";
import type { BuildSceneGraphOptions, SceneGraph } from "@aurochs-renderer/fig/scene-graph";
import { useFigSceneGraph } from "./use-fig-scene-graph";
import { FigWebGLViewportCanvas } from "./FigWebGLViewportCanvas";
import { FigSvgViewportImage } from "./FigSvgViewportImage";
import type { FigEditorRendererKind } from "./renderer-kind";
import type { TextFontResolver } from "@aurochs-renderer/fig/text";

// =============================================================================
// Types
// =============================================================================

type FigPageRendererProps = {
  readonly page: FigPage;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly images: ReadonlyMap<string, FigImage>;
  /** Binary blobs for geometry decoding (from FigDesignDocument.blobs) */
  readonly blobs: BuildSceneGraphOptions["blobs"];
  /** Symbol/component map for INSTANCE resolution */
  /**
   * Symbol map for INSTANCE resolution. Pass an empty Map when the page
   * has no INSTANCE references — the component does not silently default.
   */
  readonly symbolMap: ReadonlyMap<string, FigDesignNode>;
  /**
   * Style registry for per-path style override resolution. Pass
   * `EMPTY_FIG_STYLE_REGISTRY` when the page carries no shared styles.
   */
  readonly styleRegistry: FigStyleRegistry;
  readonly renderer?: FigEditorRendererKind;
  readonly sceneGraph?: SceneGraph | null;
  readonly viewportX?: number;
  readonly viewportY?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly viewportScale?: number;
  readonly webglPlacement?: "world" | "screen";
  readonly textFontResolver?: TextFontResolver;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a fig page through the selected renderer backend.
 *
 * Builds a scene graph from the page's FigDesignNode tree (domain objects)
 * and hands that scene graph to either the SVG or WebGL backend layer.
 *
 * The scene graph is memoized and only recomputed when the page content,
 * dimensions, or resources change.
 */
export function FigPageRenderer({
  page,
  canvasWidth,
  canvasHeight,
  images,
  blobs,
  symbolMap,
  styleRegistry,
  renderer = "svg",
  sceneGraph: sceneGraphProp,
  viewportX = 0,
  viewportY = 0,
  viewportWidth,
  viewportHeight,
  viewportScale = 1,
  webglPlacement = "world",
  textFontResolver,
}: FigPageRendererProps) {
  const builtSceneGraph = useFigSceneGraph({
    page,
    canvasWidth,
    canvasHeight,
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
    images,
    blobs,
    symbolMap,
    styleRegistry,
    textFontResolver,
  });
  const sceneGraph = sceneGraphProp ?? builtSceneGraph;

  if (!sceneGraph) {
    return <g />;
  }

  switch (renderer) {
    case "svg":
      return <FigSvgViewportImage sceneGraph={sceneGraph} />;
    case "webgl":
      return <FigWebGLViewportCanvas sceneGraph={sceneGraph} viewportScale={viewportScale} placement={webglPlacement} />;
  }
}
