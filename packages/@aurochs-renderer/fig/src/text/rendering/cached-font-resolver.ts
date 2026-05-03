/**
 * @file Adapter from an explicit loaded-font cache to text glyph resolution.
 */

import type { FontLoadOptions, LoadedFont } from "../../font/types";
import type { TextFontResolver } from "./types";

export type CachedTextFontSource = {
  readonly getCachedFont: (options: FontLoadOptions) => LoadedFont | undefined;
  readonly getCachedFallbackFont?: (options: FontLoadOptions) => LoadedFont | undefined;
};

function normalizeFontStyle(style: string | undefined): "normal" | "italic" | "oblique" {
  if (style === "italic" || style === "oblique") {
    return style;
  }
  return "normal";
}

/** Create a synchronous text outline resolver from an explicitly preloaded font cache. */
export function createCachedTextFontResolver(source: CachedTextFontSource): TextFontResolver {
  return (request) => {
    const options = {
      family: request.fontFamily,
      weight: request.fontWeight,
      style: normalizeFontStyle(request.fontStyle),
    };
    return source.getCachedFont(options)?.font ?? source.getCachedFallbackFont?.(options)?.font;
  };
}
