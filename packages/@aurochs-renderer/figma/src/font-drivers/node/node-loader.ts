/**
 * @file Node.js font loader implementation
 *
 * Loads fonts from the filesystem using common system font directories.
 * macOS, Linux, and Windows font paths are supported.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseFont, type Font } from "opentype.js";
import type { FontLoader } from "../../font/loader";
import type { FontLoadOptions, LoadedFont } from "../../font/types";
import { CJK_FALLBACK_FONTS } from "../../font/helpers";

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
  if (lower.includes("thin") || lower.includes("hairline")) return 100;
  if (lower.includes("extralight") || lower.includes("ultralight")) return 200;
  if (lower.includes("light")) return 300;
  if (lower.includes("regular") || lower.includes("normal") || lower.includes("book")) return 400;
  if (lower.includes("medium")) return 500;
  if (lower.includes("semibold") || lower.includes("demibold")) return 600;
  if (lower.includes("extrabold") || lower.includes("ultrabold")) return 800;
  if (lower.includes("bold")) return 700;
  if (lower.includes("black") || lower.includes("heavy")) return 900;
  return 400;
}

/**
 * Get font style from font name
 */
function getStyleFromName(name: string): "normal" | "italic" | "oblique" {
  const lower = name.toLowerCase();
  if (lower.includes("italic")) return "italic";
  if (lower.includes("oblique")) return "oblique";
  return "normal";
}

/**
 * Calculate weight distance (closer to 0 is better)
 */
function weightDistance(requested: number, actual: number): number {
  return Math.abs(requested - actual);
}

/**
 * Node.js font loader using system fonts
 */
export class NodeFontLoader implements FontLoader {
  private fontIndex: Map<string, FontFileInfo[]> | null = null;
  private indexPromise: Promise<void> | null = null;
  private customFontDirs: readonly string[];

  constructor(options?: { fontDirs?: readonly string[] }) {
    this.customFontDirs = options?.fontDirs ?? [];
  }

  /**
   * Get all font directories to search
   */
  private getFontDirs(): readonly string[] {
    return [...this.customFontDirs, ...getSystemFontDirs()];
  }

  /**
   * Index fonts from a directory (recursive)
   */
  private async indexDirectory(
    dir: string,
    index: Map<string, FontFileInfo[]>
  ): Promise<void> {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.indexDirectory(fullPath, index);
        } else if (this.isFontFile(entry.name)) {
          try {
            const info = await this.getFontInfo(fullPath);
            if (info) {
              const familyLower = info.family.toLowerCase();
              const existing = index.get(familyLower) ?? [];
              index.set(familyLower, [...existing, info]);
            }
          } catch {
            // Skip unreadable fonts
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  /**
   * Check if file is a font file
   *
   * Note: .ttc (TrueType Collection) files are NOT supported by opentype.js
   * so they are excluded. This affects CJK fallback on macOS which uses TTC files
   * for Hiragino and other system fonts. Consider installing @fontsource CJK
   * font packages for CJK support.
   */
  private isFontFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return [".ttf", ".otf", ".woff", ".woff2"].includes(ext);
  }

  /**
   * Get font info from a font file
   */
  private async getFontInfo(fontPath: string): Promise<FontFileInfo | null> {
    try {
      const data = fs.readFileSync(fontPath);
      const font = parseFont(data.buffer as ArrayBuffer);

      // Get font family name - try standard name first, fall back to preferredFamily
      const names = font.names as unknown as Record<string, { en?: string } | undefined>;
      const family = font.names.fontFamily?.en ?? names.preferredFamily?.en ?? "";
      const subfamily = font.names.fontSubfamily?.en ?? "";
      const postscriptName = font.names.postScriptName?.en;

      if (!family) return null;

      return {
        path: fontPath,
        family,
        weight: getWeightFromName(subfamily || family),
        style: getStyleFromName(subfamily || family),
        postscriptName,
      };
    } catch {
      return null;
    }
  }

  /**
   * Build font index (lazy, once)
   */
  private async ensureIndex(): Promise<Map<string, FontFileInfo[]>> {
    if (this.fontIndex) {
      return this.fontIndex;
    }

    if (!this.indexPromise) {
      this.indexPromise = (async () => {
        const index = new Map<string, FontFileInfo[]>();
        const dirs = this.getFontDirs();

        for (const dir of dirs) {
          await this.indexDirectory(dir, index);
        }

        this.fontIndex = index;
      })();
    }

    await this.indexPromise;
    return this.fontIndex!;
  }

  /**
   * Load a font matching the given options
   */
  async loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    const index = await this.ensureIndex();
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
      if (aIsLatin !== bIsLatin) return aIsLatin - bIsLatin;

      // Style match is secondary
      const aStyleMatch = a.style === targetStyle ? 0 : 1;
      const bStyleMatch = b.style === targetStyle ? 0 : 1;
      if (aStyleMatch !== bStyleMatch) return aStyleMatch - bStyleMatch;

      // Weight distance is tertiary
      return weightDistance(targetWeight, a.weight) - weightDistance(targetWeight, b.weight);
    });

    const bestMatch = sorted[0];
    if (!bestMatch) return undefined;

    // Load the font
    try {
      const data = fs.readFileSync(bestMatch.path);
      const font = parseFont(data.buffer as ArrayBuffer) as unknown as LoadedFont["font"];

      return {
        font,
        family: bestMatch.family,
        weight: bestMatch.weight,
        style: bestMatch.style,
        postscriptName: bestMatch.postscriptName,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a font is available
   */
  async isFontAvailable(family: string): Promise<boolean> {
    const index = await this.ensureIndex();
    return index.has(family.toLowerCase());
  }

  /**
   * List available font families
   */
  async listFontFamilies(): Promise<readonly string[]> {
    const index = await this.ensureIndex();
    // Return original family names (from first variant of each family)
    return Array.from(index.values()).map((variants) => variants[0].family);
  }

  /**
   * Add a custom font file
   */
  async addFontFile(fontPath: string): Promise<void> {
    const index = await this.ensureIndex();
    const info = await this.getFontInfo(fontPath);

    if (info) {
      const familyLower = info.family.toLowerCase();
      const existing = index.get(familyLower) ?? [];
      index.set(familyLower, [...existing, info]);
    }
  }

  /**
   * Load a fallback font for CJK characters
   *
   * Tries CJK fallback fonts in order until one is found.
   */
  async loadFallbackFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    const platform = process.platform as keyof typeof CJK_FALLBACK_FONTS;
    const fallbackFonts = CJK_FALLBACK_FONTS[platform] ?? [];

    for (const family of fallbackFonts) {
      const font = await this.loadFont({
        family,
        weight: options.weight,
        style: options.style,
      });
      if (font) {
        return font;
      }
    }

    return undefined;
  }
}

/**
 * Create a Node.js font loader with default settings
 */
export function createNodeFontLoader(
  options?: { fontDirs?: readonly string[] }
): FontLoader {
  return new NodeFontLoader(options);
}

/**
 * Create a Node.js font loader that includes @fontsource fonts
 *
 * Automatically scans node_modules/@fontsource for installed font packages.
 */
export function createNodeFontLoaderWithFontsource(): FontLoader {
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
    } catch {
      // Ignore errors
    }
  }

  return new NodeFontLoader({ fontDirs: fontsourceDirs });
}
