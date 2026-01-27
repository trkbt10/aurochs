/**
 * @file Theme importer utility
 *
 * Extracts theme (color scheme, font scheme) from existing PPTX files.
 */

import { loadZipPackage } from "@oxen/zip";
import { parseXml, getChildren, isXmlElement } from "@oxen/xml";
import { parseColorScheme, parseFontScheme } from "@oxen/pptx/parser/drawing-ml/theme";
import type { ThemePreset } from "./types";
import { OFFICE_THEME } from "./presets";

/** OPC relationship namespace */
const THEME_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";

/**
 * Find the main presentation theme path from relationships.
 *
 * Parses ppt/_rels/presentation.xml.rels to find the theme relationship.
 * Falls back to sorting theme files if relationships are unavailable.
 */
function findPresentationThemePath(pkg: {
  listFiles: () => readonly string[];
  readText: (path: string) => string | null | undefined;
}): string | undefined {
  // Try to read presentation relationships
  const relsXml = pkg.readText("ppt/_rels/presentation.xml.rels");
  if (relsXml) {
    const relsDoc = parseXml(relsXml);
    if (relsDoc) {
      const relsRoot = relsDoc.children.find(isXmlElement);
      if (!relsRoot) {
        return undefined;
      }
      // Find theme relationship
      const relationships = getChildren(relsRoot, "Relationship");
      for (const rel of relationships) {
        if (rel.attrs?.Type === THEME_REL_TYPE) {
          const target = rel.attrs?.Target;
          if (target) {
            // Target is relative to ppt/ directory
            return `ppt/${target}`;
          }
        }
      }
    }
  }

  // Fallback: sort theme files and use first one
  const themeFiles = pkg
    .listFiles()
    .filter((f) => f.startsWith("ppt/theme/") && f.endsWith(".xml"))
    .sort();
  return themeFiles[0];
}

/**
 * Result of theme extraction
 */
export type ThemeExtractionResult =
  | { readonly success: true; readonly theme: ThemePreset }
  | { readonly success: false; readonly error: string };

/**
 * Extract theme from a PPTX file.
 *
 * @param file - The PPTX file to extract theme from
 * @returns ThemePreset extracted from the file
 */
export async function extractThemeFromPptx(file: File): Promise<ThemeExtractionResult> {
  try {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Load as zip package
    const pkg = await loadZipPackage(buffer);

    // Find theme file from presentation relationships
    // This ensures we get the correct theme (not notes theme)
    const themePath = findPresentationThemePath(pkg);
    if (!themePath) {
      return { success: false, error: "No theme file found in PPTX" };
    }

    // Read and parse the theme file
    const themeXml = pkg.readText(themePath);
    if (!themeXml) {
      return { success: false, error: "Could not read theme file" };
    }

    const themeDoc = parseXml(themeXml);
    if (!themeDoc) {
      return { success: false, error: "Could not parse theme XML" };
    }

    // Extract color scheme and font scheme
    const colorScheme = parseColorScheme(themeDoc);
    const fontScheme = parseFontScheme(themeDoc);

    // Create theme preset
    const theme: ThemePreset = {
      id: `imported-${Date.now()}`,
      name: file.name.replace(/\.p[op]tx$/i, ""),
      colorScheme: {
        // Ensure all 12 colors are present with fallbacks from OFFICE_THEME
        dk1: colorScheme.dk1 ?? OFFICE_THEME.colorScheme.dk1,
        lt1: colorScheme.lt1 ?? OFFICE_THEME.colorScheme.lt1,
        dk2: colorScheme.dk2 ?? OFFICE_THEME.colorScheme.dk2,
        lt2: colorScheme.lt2 ?? OFFICE_THEME.colorScheme.lt2,
        accent1: colorScheme.accent1 ?? OFFICE_THEME.colorScheme.accent1,
        accent2: colorScheme.accent2 ?? OFFICE_THEME.colorScheme.accent2,
        accent3: colorScheme.accent3 ?? OFFICE_THEME.colorScheme.accent3,
        accent4: colorScheme.accent4 ?? OFFICE_THEME.colorScheme.accent4,
        accent5: colorScheme.accent5 ?? OFFICE_THEME.colorScheme.accent5,
        accent6: colorScheme.accent6 ?? OFFICE_THEME.colorScheme.accent6,
        hlink: colorScheme.hlink ?? OFFICE_THEME.colorScheme.hlink,
        folHlink: colorScheme.folHlink ?? OFFICE_THEME.colorScheme.folHlink,
      },
      fontScheme: {
        majorFont: {
          latin: fontScheme.majorFont.latin ?? OFFICE_THEME.fontScheme.majorFont.latin,
          eastAsian: fontScheme.majorFont.eastAsian,
          complexScript: fontScheme.majorFont.complexScript,
        },
        minorFont: {
          latin: fontScheme.minorFont.latin ?? OFFICE_THEME.fontScheme.minorFont.latin,
          eastAsian: fontScheme.minorFont.eastAsian,
          complexScript: fontScheme.minorFont.complexScript,
        },
      },
    };

    return { success: true, theme };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to extract theme: ${message}` };
  }
}
