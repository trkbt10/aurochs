/**
 * @file Node.js font loader implementation
 *
 * Loads fonts from the filesystem using common system font directories.
 * macOS, Linux, and Windows font paths are supported.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseFont } from "opentype.js";
import type { FontLoader } from "../../font/loader";
import type { FontLoadOptions, LoadedFont } from "../../font/types";
import { CJK_FALLBACK_FONTS } from "../../font/helpers";

type FontNameRecord = Record<string, { en?: string } | undefined>;

/** Type guard to treat opentype.js names as a generic record for accessing non-standard properties */
function isNameRecord(names: unknown): names is FontNameRecord {
  return typeof names === "object" && names !== null;
}

/** Convert font names object to a generic record for non-standard property access */
function toNameRecord(names: unknown): FontNameRecord {
  if (isNameRecord(names)) {
    return names;
  }
  return {};
}

/** Type guard to treat parsed font as LoadedFont type */
function isLoadedFontType(font: unknown): font is LoadedFont["font"] {
  return typeof font === "object" && font !== null;
}

/** Convert parsed opentype font to LoadedFont font type */
function toLoadedFontType(font: unknown): LoadedFont["font"] {
  if (isLoadedFontType(font)) {
    return font;
  }
  throw new Error("Invalid font data");
}

/**
 * Font file metadata from scanning
 */
type FontFileInfo = {
  readonly path: string;
  readonly family: string;
  readonly weight: number;
  readonly style: "normal" | "italic" | "oblique";
  readonly postscriptName?: string;
};

/**
 * System font directories by platform
 */
const SYSTEM_FONT_DIRS: Record<string, readonly string[]> = {
  darwin: [
    "/System/Library/Fonts",
    "/Library/Fonts",
    `${process.env.HOME}/Library/Fonts`,
  ],
  linux: [
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    `${process.env.HOME}/.fonts`,
    `${process.env.HOME}/.local/share/fonts`,
  ],
  win32: [
    "C:\\Windows\\Fonts",
    `${process.env.LOCALAPPDATA}\\Microsoft\\Windows\\Fonts`,
  ],
};

/**
 * Get font directories for current platform
 */
function getSystemFontDirs(): readonly string[] {
  const platform = process.platform;
  return SYSTEM_FONT_DIRS[platform] ?? [];
}

/**
 * Get font weight from font name
 */
function getWeightFromName(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("thin") || lower.includes("hairline")) {return 100;}
  if (lower.includes("extralight") || lower.includes("ultralight")) {return 200;}
  if (lower.includes("light")) {return 300;}
  if (lower.includes("regular") || lower.includes("normal") || lower.includes("book")) {return 400;}
  if (lower.includes("medium")) {return 500;}
  if (lower.includes("semibold") || lower.includes("demibold")) {return 600;}
  if (lower.includes("extrabold") || lower.includes("ultrabold")) {return 800;}
  if (lower.includes("bold")) {return 700;}
  if (lower.includes("black") || lower.includes("heavy")) {return 900;}
  return 400;
}

/**
 * Get font style from font name
 */
function getStyleFromName(name: string): "normal" | "italic" | "oblique" {
  const lower = name.toLowerCase();
  if (lower.includes("italic")) {return "italic";}
  if (lower.includes("oblique")) {return "oblique";}
  return "normal";
}

/**
 * Calculate weight distance (closer to 0 is better)
 */
function weightDistance(requested: number, actual: number): number {
  return Math.abs(requested - actual);
}

/** Node font loader with additional capabilities */
export type NodeFontLoaderInstance = FontLoader & {
  /** List available font families */
  listFontFamilies(): Promise<readonly string[]>;
  /** Add a custom font file */
  addFontFile(fontPath: string): Promise<void>;
  /** Load a fallback font for CJK characters */
  loadFallbackFont(options: FontLoadOptions): Promise<LoadedFont | undefined>;
};

/**
 * Check if file is a font file
 *
 * Note: .ttc (TrueType Collection) files are NOT supported by opentype.js
 * so they are excluded. This affects CJK fallback on macOS which uses TTC files
 * for Hiragino and other system fonts. Consider installing @fontsource CJK
 * font packages for CJK support.
 */
function isFontFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return [".ttf", ".otf", ".woff", ".woff2"].includes(ext);
}

/**
 * Get font info from a font file
 */
async function getFontInfo(fontPath: string): Promise<FontFileInfo | null> {
  try {
    const data = fs.readFileSync(fontPath);
    const font = parseFont(data.buffer as ArrayBuffer);

    // Get font family name - try standard name first, fall back to preferredFamily
    const names = toNameRecord(font.names);
    const family = font.names.fontFamily?.en ?? names.preferredFamily?.en ?? "";
    const subfamily = font.names.fontSubfamily?.en ?? "";
    const postscriptName = font.names.postScriptName?.en;

    if (!family) {return null;}

    return {
      path: fontPath,
      family,
      weight: getWeightFromName(subfamily || family),
      style: getStyleFromName(subfamily || family),
      postscriptName,
    };
  } catch (error) {
    console.debug("Caught error:", error);
    return null;
  }
}

/** Attempt to index a single font file, silently skipping on failure */
async function tryIndexFontFile(
  fullPath: string,
  index: Map<string, FontFileInfo[]>
): Promise<void> {
  try {
    const info = await getFontInfo(fullPath);
    if (info) {
      const familyLower = info.family.toLowerCase();
      const existing = index.get(familyLower) ?? [];
      index.set(familyLower, [...existing, info]);
    }
  } catch (error) {
    console.debug("Skip unreadable fonts" + ":", error);
  }
}

/**
 * Index fonts from a directory (recursive)
 */
async function indexDirectory(
  dir: string,
  index: Map<string, FontFileInfo[]>
): Promise<void> {
  if (!fs.existsSync(dir)) {return;}

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await indexDirectory(fullPath, index);
      } else if (isFontFile(entry.name)) {
        await tryIndexFontFile(fullPath, index);
      }
    }
  } catch (error) {
    console.debug("Skip unreadable directories" + ":", error);
  }
}

/**
 * Create a Node.js font loader with default settings
 */
export function createNodeFontLoader(
  options?: { fontDirs?: readonly string[] }
): NodeFontLoaderInstance {
  const customFontDirs = options?.fontDirs ?? [];
  const fontIndexRef = { value: null as Map<string, FontFileInfo[]> | null };
  const indexPromiseRef = { value: null as Promise<void> | null };

  function getFontDirs(): readonly string[] {
    return [...customFontDirs, ...getSystemFontDirs()];
  }

  async function buildFontIndex(): Promise<void> {
    const index = new Map<string, FontFileInfo[]>();
    const dirs = getFontDirs();

    for (const dir of dirs) {
      await indexDirectory(dir, index);
    }

    fontIndexRef.value = index;
  }

  async function ensureIndex(): Promise<Map<string, FontFileInfo[]>> {
    if (fontIndexRef.value) {
      return fontIndexRef.value;
    }

    if (!indexPromiseRef.value) {
      indexPromiseRef.value = buildFontIndex();
    }

    await indexPromiseRef.value;
    return fontIndexRef.value!;
  }

  async function loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    const index = await ensureIndex();
    const familyLower = options.family.toLowerCase();
    const variants = index.get(familyLower);

    if (!variants || variants.length === 0) {
      return undefined;
    }

    // Find best match
    const targetWeight = options.weight ?? 400;
    const targetStyle = options.style ?? "normal";

    // Sort by match quality
    const sorted = [...variants].sort((a, b) => {
      // Prefer latin subset (most common use case)
      const aIsLatin = a.path.includes("-latin-") ? 0 : 1;
      const bIsLatin = b.path.includes("-latin-") ? 0 : 1;
      if (aIsLatin !== bIsLatin) {return aIsLatin - bIsLatin;}

      // Style match is secondary
      const aStyleMatch = a.style === targetStyle ? 0 : 1;
      const bStyleMatch = b.style === targetStyle ? 0 : 1;
      if (aStyleMatch !== bStyleMatch) {return aStyleMatch - bStyleMatch;}

      // Weight distance is tertiary
      return weightDistance(targetWeight, a.weight) - weightDistance(targetWeight, b.weight);
    });

    const bestMatch = sorted[0];
    if (!bestMatch) {return undefined;}

    // Load the font
    try {
      const data = fs.readFileSync(bestMatch.path);
      const font = toLoadedFontType(parseFont(data.buffer as ArrayBuffer));

      return {
        font,
        family: bestMatch.family,
        weight: bestMatch.weight,
        style: bestMatch.style,
        postscriptName: bestMatch.postscriptName,
      };
    } catch (error) {
      console.debug("Caught error:", error);
      return undefined;
    }
  }

  return {
    loadFont,

    async isFontAvailable(family: string): Promise<boolean> {
      const index = await ensureIndex();
      return index.has(family.toLowerCase());
    },

    async listFontFamilies(): Promise<readonly string[]> {
      const index = await ensureIndex();
      // Return original family names (from first variant of each family)
      return Array.from(index.values()).map((variants) => variants[0].family);
    },

    async addFontFile(fontPath: string): Promise<void> {
      const index = await ensureIndex();
      const info = await getFontInfo(fontPath);

      if (info) {
        const familyLower = info.family.toLowerCase();
        const existing = index.get(familyLower) ?? [];
        index.set(familyLower, [...existing, info]);
      }
    },

    async loadFallbackFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
      const platform = process.platform as keyof typeof CJK_FALLBACK_FONTS;
      const fallbackFonts = CJK_FALLBACK_FONTS[platform] ?? [];

      for (const family of fallbackFonts) {
        const font = await loadFont({
          family,
          weight: options.weight,
          style: options.style,
        });
        if (font) {
          return font;
        }
      }

      return undefined;
    },
  };
}

/**
 * Create a Node.js font loader that includes @fontsource fonts
 *
 * Automatically scans node_modules/@fontsource for installed font packages.
 */
export function createNodeFontLoaderWithFontsource(): NodeFontLoaderInstance {
  const fontsourceDirs: string[] = [];

  // Look for @fontsource packages in node_modules
  const nodeModulesPath = path.resolve(process.cwd(), "node_modules/@fontsource");
  if (fs.existsSync(nodeModulesPath)) {
    try {
      const packages = fs.readdirSync(nodeModulesPath);
      for (const pkg of packages) {
        const filesDir = path.join(nodeModulesPath, pkg, "files");
        if (fs.existsSync(filesDir)) {
          fontsourceDirs.push(filesDir);
        }
      }
    } catch (error) {
      console.debug("Fontsource directory scan error:", error);
    }
  }

  return createNodeFontLoader({ fontDirs: fontsourceDirs });
}
