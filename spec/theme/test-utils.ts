/**
 * @file Shared test utilities for theme tests
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import type { PresentationFile } from "@aurochs-office/pptx";

export const THEMES_PPTX_PATH = "fixtures/poi-test-data/test-data/slideshow/themes.pptx";

/**
 * Helper to create presentation file interface from buffer
 */
export async function createPresentationFile(pptxPath: string): Promise<PresentationFile> {
  const { presentationFile } = await loadPptxFile(pptxPath);
  return presentationFile;
}

/**
 * Helper to extract colors from SVG
 */
export function extractSvgColors(svg: string): Set<string> {
  const colorPatterns = [
    /#[0-9a-fA-F]{6}/g, // hex colors
    /#[0-9a-fA-F]{3}/g, // short hex colors
    /stop-color="([^"]+)"/g, // gradient stops
  ];
  const colors = new Set<string>();

  for (const pattern of colorPatterns) {
    const matches = svg.matchAll(pattern);
    for (const match of matches) {
      const color = match[1] ?? match[0];
      colors.add(color.toLowerCase().replace("#", ""));
    }
  }

  return colors;
}
