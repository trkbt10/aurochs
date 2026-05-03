/** @file SceneGraph construction hook for fig editor canvas renderers. */

import { useMemo } from "react";
import type { FigPage, FigDesignNode, FigStyleRegistry } from "@aurochs/fig/domain";
import type { FigImage } from "@aurochs/fig/parser";
import { buildSceneGraph, type BuildSceneGraphOptions } from "@aurochs-renderer/fig/scene-graph";
import type { TextFontResolver } from "@aurochs-renderer/fig/text";

export type UseFigSceneGraphParams = {
  readonly page: FigPage | null | undefined;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly viewportX?: number;
  readonly viewportY?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly images: ReadonlyMap<string, FigImage>;
  readonly blobs: BuildSceneGraphOptions["blobs"];
  readonly symbolMap: ReadonlyMap<string, FigDesignNode>;
  readonly styleRegistry: FigStyleRegistry;
  readonly textFontResolver?: TextFontResolver;
};

/** Build the renderer-neutral SceneGraph consumed by React, SVG, and WebGL. */
export function useFigSceneGraph({
  page,
  canvasWidth,
  canvasHeight,
  viewportX = 0,
  viewportY = 0,
  viewportWidth = canvasWidth,
  viewportHeight = canvasHeight,
  images,
  blobs,
  symbolMap,
  styleRegistry,
  textFontResolver,
}: UseFigSceneGraphParams) {
  const contentSceneGraph = useMemo(() => {
    if (!page || page.children.length === 0) {
      return null;
    }

    return buildSceneGraph(page.children, {
      blobs,
      images,
      canvasSize: { width: 0, height: 0 },
      viewport: { x: 0, y: 0, width: 0, height: 0 },
      symbolMap,
      styleRegistry,
      showHiddenNodes: false,
      warnings: [],
      textFontResolver,
    });
  }, [page, images, blobs, symbolMap, styleRegistry, textFontResolver]);

  return useMemo(() => {
    if (!contentSceneGraph) {
      return null;
    }

    return {
      ...contentSceneGraph,
      width: canvasWidth,
      height: canvasHeight,
      viewport: { x: viewportX, y: viewportY, width: viewportWidth, height: viewportHeight },
    };
  }, [contentSceneGraph, canvasWidth, canvasHeight, viewportX, viewportY, viewportWidth, viewportHeight]);
}
