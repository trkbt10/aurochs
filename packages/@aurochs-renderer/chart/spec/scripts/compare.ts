/**
 * @file Image comparison utilities for chart visual regression tests
 *
 * Provides SVG to PNG conversion and comparison types.
 */

import { Resvg } from "@resvg/resvg-js";

export type CompareResult = {
  match: boolean;
  diffPixels: number;
  diffPercent: number;
  totalPixels: number;
  diffImagePath: string | null;
};

export type CompareOptions = {
  /** Threshold for color difference (0-1, default: 0.1) */
  threshold?: number;
  /** Maximum allowed diff percentage (0-100, default: 0.1) */
  maxDiffPercent?: number;
  /** Include anti-aliased pixels in diff (default: false) */
  includeAA?: boolean;
  /**
   * Extra font files to load into resvg.
   */
  resvgFontFiles?: readonly string[];
  /** Whether to load system fonts (default: true). */
  resvgLoadSystemFonts?: boolean;
};

/**
 * Convert SVG string to PNG buffer using resvg.
 */
export function svgToPng(
  svg: string,
  width?: number,
  options: Pick<CompareOptions, "resvgFontFiles" | "resvgLoadSystemFonts"> = {}
): Buffer {
  const opts: {
    fitTo?: { mode: "width"; value: number };
    font?: { loadSystemFonts?: boolean; fontFiles?: string[] };
  } = {};

  if (width !== undefined) {
    opts.fitTo = { mode: "width", value: width };
  }

  if (options.resvgFontFiles && options.resvgFontFiles.length > 0) {
    opts.font = {
      loadSystemFonts: options.resvgLoadSystemFonts ?? true,
      fontFiles: [...options.resvgFontFiles],
    };
  }

  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
