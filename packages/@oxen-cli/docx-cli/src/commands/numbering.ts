/**
 * @file numbering command - display numbering definitions
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadDocument } from "./loader";
import type { DocxLevel, DocxAbstractNum, DocxNum } from "@oxen-office/docx/domain/numbering";

// =============================================================================
// Types
// =============================================================================

export type LevelJson = {
  readonly ilvl: number;
  readonly start?: number;
  readonly numFmt?: string;
  readonly lvlText?: string;
  readonly lvlJc?: string;
  readonly suff?: string;
  readonly pStyle?: string;
};

export type AbstractNumJson = {
  readonly abstractNumId: number;
  readonly multiLevelType?: string;
  readonly nsid?: string;
  readonly levels: readonly LevelJson[];
};

export type NumJson = {
  readonly numId: number;
  readonly abstractNumId: number;
  readonly hasOverrides: boolean;
};

export type NumberingData = {
  readonly abstractNumCount: number;
  readonly numCount: number;
  readonly abstractNums: readonly AbstractNumJson[];
  readonly nums: readonly NumJson[];
};

// =============================================================================
// Serialization Helpers
// =============================================================================

function serializeLevel(level: DocxLevel): LevelJson {
  return {
    ilvl: level.ilvl,
    ...(level.start !== undefined && { start: level.start }),
    ...(level.numFmt && { numFmt: level.numFmt }),
    ...(level.lvlText?.val && { lvlText: level.lvlText.val }),
    ...(level.lvlJc && { lvlJc: level.lvlJc }),
    ...(level.suff && { suff: level.suff }),
    ...(level.pStyle && { pStyle: level.pStyle as string }),
  };
}

function serializeAbstractNum(abstractNum: DocxAbstractNum): AbstractNumJson {
  return {
    abstractNumId: abstractNum.abstractNumId,
    ...(abstractNum.multiLevelType && { multiLevelType: abstractNum.multiLevelType }),
    ...(abstractNum.nsid && { nsid: abstractNum.nsid }),
    levels: abstractNum.lvl.map(serializeLevel),
  };
}

function serializeNum(num: DocxNum): NumJson {
  return {
    numId: num.numId,
    abstractNumId: num.abstractNumId,
    hasOverrides: (num.lvlOverride?.length ?? 0) > 0,
  };
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display numbering definitions from a DOCX file.
 */
export async function runNumbering(filePath: string): Promise<Result<NumberingData>> {
  try {
    const doc = await loadDocument(filePath);

    if (!doc.numbering) {
      return success({
        abstractNumCount: 0,
        numCount: 0,
        abstractNums: [],
        nums: [],
      });
    }

    const abstractNums = doc.numbering.abstractNum.map(serializeAbstractNum);
    const nums = doc.numbering.num.map(serializeNum);

    return success({
      abstractNumCount: abstractNums.length,
      numCount: nums.length,
      abstractNums,
      nums,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
