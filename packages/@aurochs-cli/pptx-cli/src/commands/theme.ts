/**
 * @file theme command - display theme information
 */

import { loadPresentationBundle } from "./loader";
import { openPresentation } from "@aurochs-office/pptx";
import { parseTheme } from "@aurochs-office/pptx/parser/slide/theme-parser";
import { success, error, type Result } from "@aurochs-cli/cli-core";

/**
 * Font info for JSON output
 */
export type FontInfoJson = {
  readonly latin?: string;
  readonly eastAsian?: string;
  readonly complexScript?: string;
};

/**
 * Font scheme for JSON output
 */
export type FontSchemeJson = {
  readonly majorFont: FontInfoJson;
  readonly minorFont: FontInfoJson;
};

/**
 * Color scheme for JSON output
 */
export type ColorSchemeJson = Record<string, string>;

/**
 * Format scheme summary for JSON output
 */
export type FormatSchemeJson = {
  readonly lineStyleCount: number;
  readonly fillStyleCount: number;
  readonly effectStyleCount: number;
  readonly bgFillStyleCount: number;
};

/**
 * Custom color for JSON output
 */
export type CustomColorJson = {
  readonly name?: string;
  readonly color?: string;
  readonly type: "srgb" | "system";
};

/**
 * Theme data for JSON output
 */
export type ThemeData = {
  readonly fontScheme: FontSchemeJson;
  readonly colorScheme: ColorSchemeJson;
  readonly formatScheme: FormatSchemeJson;
  readonly customColors: readonly CustomColorJson[];
  readonly extraColorSchemeCount: number;
  readonly hasObjectDefaults: {
    readonly line: boolean;
    readonly shape: boolean;
    readonly text: boolean;
  };
};

/**
 * Get theme information from a PPTX file.
 */
export async function runTheme(filePath: string): Promise<Result<ThemeData>> {
  try {
    const { presentationFile } = await loadPresentationBundle(filePath);
    const presentation = openPresentation(presentationFile);

    // Get theme from first slide
    const slide = presentation.getSlide(1);
    const theme = parseTheme(slide.theme, slide.themeOverrides);

    return success({
      fontScheme: {
        majorFont: {
          latin: theme.fontScheme.majorFont.latin,
          eastAsian: theme.fontScheme.majorFont.eastAsian,
          complexScript: theme.fontScheme.majorFont.complexScript,
        },
        minorFont: {
          latin: theme.fontScheme.minorFont.latin,
          eastAsian: theme.fontScheme.minorFont.eastAsian,
          complexScript: theme.fontScheme.minorFont.complexScript,
        },
      },
      colorScheme: theme.colorScheme,
      formatScheme: {
        lineStyleCount: theme.formatScheme.lineStyles.length,
        fillStyleCount: theme.formatScheme.fillStyles.length,
        effectStyleCount: theme.formatScheme.effectStyles.length,
        bgFillStyleCount: theme.formatScheme.bgFillStyles.length,
      },
      customColors: theme.customColors.map((c) => ({
        name: c.name,
        color: c.color,
        type: c.type,
      })),
      extraColorSchemeCount: theme.extraColorSchemes.length,
      hasObjectDefaults: {
        line: theme.objectDefaults.lineDefault !== undefined,
        shape: theme.objectDefaults.shapeDefault !== undefined,
        text: theme.objectDefaults.textDefault !== undefined,
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PPTX: ${(err as Error).message}`);
  }
}
