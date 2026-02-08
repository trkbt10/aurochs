/**
 * @file strings command - display shared strings with rich text formatting
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import type { SharedStringItem, RichTextRun, RichTextProperties } from "@aurochs-office/xlsx/parser";

// =============================================================================
// Types
// =============================================================================

export type RichTextRunJson = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strike?: boolean;
  readonly fontSize?: number;
  readonly fontName?: string;
  readonly color?: string;
};

export type StringItemJson = {
  readonly index: number;
  readonly type: "plain" | "rich";
  readonly text: string;
  readonly runs?: readonly RichTextRunJson[];
};

export type StringsData = {
  readonly count: number;
  readonly strings: readonly StringItemJson[];
};

export type StringsOptions = {
  readonly richText?: boolean;
};

// =============================================================================
// Serialization
// =============================================================================

function formatColor(color: RichTextProperties["color"]): string | undefined {
  if (!color) {
    return undefined;
  }
  switch (color.type) {
    case "rgb":
      return `#${color.value}`;
    case "theme":
      return `theme:${color.theme}${color.tint ? `:${color.tint}` : ""}`;
    case "indexed":
      return `indexed:${color.index}`;
    case "auto":
      return "auto";
  }
}

function serializeRun(run: RichTextRun): RichTextRunJson {
  const props = run.properties;
  return {
    text: run.text,
    ...(props?.bold && { bold: true }),
    ...(props?.italic && { italic: true }),
    ...(props?.underline && { underline: true }),
    ...(props?.strike && { strike: true }),
    ...(props?.fontSize && { fontSize: props.fontSize }),
    ...(props?.fontName && { fontName: props.fontName }),
    ...(props?.color && { color: formatColor(props.color) }),
  };
}

function serializeStringItem(item: SharedStringItem, index: number): StringItemJson {
  if (item.type === "plain") {
    return { index, type: "plain", text: item.text };
  }
  const text = item.runs.map((r) => r.text).join("");
  const runs = item.runs.map(serializeRun);
  return { index, type: "rich", text, runs };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display shared strings from an XLSX file.
 */
export async function runStrings(filePath: string, options: StringsOptions = {}): Promise<Result<StringsData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath, { includeRichText: options.richText });

    if (options.richText && workbook.sharedStringsRich) {
      const strings = workbook.sharedStringsRich.map(serializeStringItem);
      return success({
        count: strings.length,
        strings,
      });
    }

    // Plain text mode
    const strings: StringItemJson[] = workbook.sharedStrings.map((text, index) => ({
      index,
      type: "plain" as const,
      text,
    }));

    return success({
      count: strings.length,
      strings,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
