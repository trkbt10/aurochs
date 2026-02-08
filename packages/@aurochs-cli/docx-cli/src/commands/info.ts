/**
 * @file info command - display document metadata
 */

import { twipsToPoints } from "@aurochs-office/docx";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadDocument } from "./loader";

export type SettingsInfo = {
  readonly trackRevisions?: boolean;
  readonly defaultTabStop?: number;
  readonly zoom?: number;
  readonly protection?: string;
};

export type InfoData = {
  readonly paragraphCount: number;
  readonly tableCount: number;
  readonly sectionCount: number;
  readonly pageSize?: {
    readonly width: number;
    readonly height: number;
    readonly widthTwips: number;
    readonly heightTwips: number;
    readonly orientation?: "portrait" | "landscape";
  };
  readonly hasStyles: boolean;
  readonly hasNumbering: boolean;
  readonly hasHeaders: boolean;
  readonly hasFooters: boolean;
  readonly hasComments: boolean;
  readonly hasSettings: boolean;
  readonly settings?: SettingsInfo;
};

function countParagraphs(content: readonly { type: string }[]): number {
  return content.filter((c) => c.type === "paragraph").length;
}

function countTables(content: readonly { type: string }[]): number {
  return content.filter((c) => c.type === "table").length;
}

function countSections(content: readonly { type: string }[]): number {
  // Section breaks in content + final section
  const sectionBreaks = content.filter((c) => c.type === "sectionBreak").length;
  return sectionBreaks + 1;
}

function buildPageSize(
  pgSz: { w: number; h: number; orient?: "portrait" | "landscape" } | undefined,
): InfoData["pageSize"] {
  if (!pgSz) {
    return undefined;
  }
  return {
    width: twipsToPoints(pgSz.w),
    height: twipsToPoints(pgSz.h),
    widthTwips: pgSz.w,
    heightTwips: pgSz.h,
    orientation: pgSz.orient,
  };
}

type SettingsInput = {
  trackRevisions?: boolean;
  defaultTabStop?: number;
  zoom?: { percent?: number };
  documentProtection?: { edit?: string };
};

function buildSettingsInfo(settings: SettingsInput | undefined): SettingsInfo | undefined {
  if (!settings) {
    return undefined;
  }
  return {
    ...(settings.trackRevisions !== undefined && { trackRevisions: settings.trackRevisions }),
    ...(settings.defaultTabStop !== undefined && { defaultTabStop: settings.defaultTabStop }),
    ...(settings.zoom?.percent !== undefined && { zoom: settings.zoom.percent }),
    ...(settings.documentProtection?.edit && { protection: settings.documentProtection.edit }),
  };
}

/**
 * Get document metadata from a DOCX file.
 */
export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const doc = await loadDocument(filePath);

    const sectPr = doc.body.sectPr;
    const pageSize = buildPageSize(sectPr?.pgSz);

    const settingsInfo = buildSettingsInfo(doc.settings);

    return success({
      paragraphCount: countParagraphs(doc.body.content),
      tableCount: countTables(doc.body.content),
      sectionCount: countSections(doc.body.content),
      pageSize,
      hasStyles: doc.styles !== undefined,
      hasNumbering: doc.numbering !== undefined,
      hasHeaders: doc.headers !== undefined && doc.headers.size > 0,
      hasFooters: doc.footers !== undefined && doc.footers.size > 0,
      hasComments: doc.comments !== undefined && doc.comments.comment.length > 0,
      hasSettings: doc.settings !== undefined,
      ...(settingsInfo && Object.keys(settingsInfo).length > 0 && { settings: settingsInfo }),
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
