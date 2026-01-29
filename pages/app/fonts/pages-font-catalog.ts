/**
 * @file Demo font catalog wiring for pages app
 */

import type { FontCatalog } from "@oxen-ui/pptx-editor";
import { createGoogleFontsCatalog } from "./google-fonts-catalog";
import { GOOGLE_FONTS_FAMILIES_UPDATED_AT } from "./google-fonts-families.version";

/**
 * Creates the Google Fonts-backed catalog used by the demo pages.
 */
export function createPagesFontCatalog(): FontCatalog {
  function resolveFamiliesUrl(): string {
    if (typeof window === "undefined") {
      throw new Error("createPagesFontCatalog: window is required to resolve the families URL");
    }

    // Resolve relative to the current location so this works for both:
    // - GitHub Pages (https://.../web-pptx/#/...)
    // - local dev (http://localhost:5174/web-pptx/#/...)
    return new URL("fonts/google-fonts-families.json", window.location.href).toString();
  }

  const catalog = createGoogleFontsCatalog({
    familiesUrl: resolveFamiliesUrl(),
    cssBaseUrl: "https://fonts.googleapis.com/css2",
    display: "swap",
    weights: [400, 500, 600, 700],
    // Ties localStorage cache invalidation to the checked-in families list version.
    cacheKey: `web-pptx:google-fonts-families:${GOOGLE_FONTS_FAMILIES_UPDATED_AT}`,
    cacheTtlMs: 1000 * 60 * 60 * 24 * 7, // 7 days
    timeoutMs: 10_000,
  });

  const listFamilyRecords = catalog.listFamilyRecords;

  const baseCatalog: FontCatalog = {
    label: catalog.label,
    async listFamilies() {
      try {
        return await Promise.resolve(catalog.listFamilies());
      } catch (error) {
        console.warn("createPagesFontCatalog: failed to load Google Fonts families", error);
        throw error;
      }
    },
    async ensureFamilyLoaded(family: string) {
      return await catalog.ensureFamilyLoaded(family);
    },
  };

  if (!listFamilyRecords) {
    return baseCatalog;
  }

  return {
    ...baseCatalog,
    async listFamilyRecords() {
      try {
        return await Promise.resolve(listFamilyRecords());
      } catch (error) {
        console.warn("createPagesFontCatalog: failed to load Google Fonts family records", error);
        throw error;
      }
    },
  };
}
