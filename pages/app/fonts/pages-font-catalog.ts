/**
 * @file Demo font catalog wiring for pages app
 */

import type { FontCatalog } from "@lib/pptx-editor";
import { createGoogleFontsCatalog } from "./google-fonts-catalog";

/**
 * Creates the Google Fonts-backed catalog used by the demo pages.
 */
export function createPagesFontCatalog(): FontCatalog {
  return createGoogleFontsCatalog({
    familiesUrl: `${import.meta.env.BASE_URL}fonts/google-fonts-families.json`,
    cssBaseUrl: "https://fonts.googleapis.com/css2",
    display: "swap",
    weights: [400, 500, 600, 700],
    cacheKey: "web-pptx:google-fonts-families:v1",
    cacheTtlMs: 1000 * 60 * 60 * 24 * 7, // 7 days
    timeoutMs: 10_000,
  });
}
