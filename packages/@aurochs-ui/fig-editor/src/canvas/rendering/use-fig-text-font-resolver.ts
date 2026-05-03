/** @file Explicit text font preloading for renderer-neutral glyph outlines. */

import { useEffect, useMemo, useState } from "react";
import type { FigDesignNode, FigPage } from "@aurochs/fig/domain";
import { createCachedTextFontResolver, type TextFontResolver } from "@aurochs-renderer/fig/text";
import type { CachingFontLoader, FontLoadOptions } from "@aurochs-renderer/fig/font";
import { detectWeight, isItalic, isOblique } from "@aurochs-renderer/fig/font";

export type UseFigTextFontResolverParams = {
  readonly page: FigPage | null | undefined;
  readonly fontLoader: CachingFontLoader | undefined;
};

function normalizeStyle(style: string | undefined): "normal" | "italic" | "oblique" {
  if (isItalic(style)) {
    return "italic";
  }
  if (isOblique(style)) {
    return "oblique";
  }
  return "normal";
}

function fontKey(options: FontLoadOptions): string {
  return `${options.family}:${options.weight ?? 400}:${options.style ?? "normal"}`;
}

function collectTextFontOptionsFromNode(node: FigDesignNode): readonly FontLoadOptions[] {
  const selfOptions = textNodeFontOptions(node);
  const childOptions = node.children?.flatMap(collectTextFontOptionsFromNode) ?? [];
  return [...selfOptions, ...childOptions];
}

function textNodeFontOptions(node: FigDesignNode): readonly FontLoadOptions[] {
  if (node.type !== "TEXT" || !node.textData) {
    return [];
  }
  return [{
    family: node.textData.fontName.family,
    weight: detectWeight(node.textData.fontName.style),
    style: normalizeStyle(node.textData.fontName.style),
  }];
}

function collectTextFontOptions(page: FigPage | null | undefined): readonly FontLoadOptions[] {
  if (!page) {
    return [];
  }
  const byKey = new Map<string, FontLoadOptions>();
  for (const options of page.children.flatMap(collectTextFontOptionsFromNode)) {
    byKey.set(fontKey(options), options);
  }
  return [...byKey.values()];
}

/** Preload fonts and expose a synchronous resolver for SceneGraph construction. */
export function useFigTextFontResolver({
  page,
  fontLoader,
}: UseFigTextFontResolverParams): TextFontResolver | undefined {
  const fontOptions = useMemo(() => collectTextFontOptions(page), [page]);
  const [loadedVersion, setLoadedVersion] = useState(0);

  useEffect(() => {
    if (!fontLoader || fontOptions.length === 0) {
      return;
    }
    const cancelledRef = { value: false };
    void Promise.all(fontOptions.map(async (options) => {
      const font = await fontLoader.loadFont(options);
      if (font) {
        return;
      }
      if (fontLoader.loadFallbackFont) {
        await fontLoader.loadFallbackFont(options);
      }
    })).then(() => {
      if (!cancelledRef.value) {
        setLoadedVersion((version) => version + 1);
      }
    });
    return () => {
      cancelledRef.value = true;
    };
  }, [fontLoader, fontOptions]);

  return useMemo(() => {
    if (!fontLoader) {
      return undefined;
    }
    return createCachedTextFontResolver(fontLoader);
  }, [fontLoader, loadedVersion]);
}
