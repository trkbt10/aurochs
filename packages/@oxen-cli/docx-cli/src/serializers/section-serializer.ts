/**
 * @file Section serialization utilities for JSON output
 */

import type { DocxSectionProperties, DocxPageSize, DocxPageMargins, DocxColumns } from "@oxen-office/docx";
import { twipsToPoints } from "@oxen-office/docx";

// =============================================================================
// JSON Types
// =============================================================================

export type PageSizeJson = {
  readonly width: number;
  readonly height: number;
  readonly widthTwips: number;
  readonly heightTwips: number;
  readonly orientation?: "portrait" | "landscape";
};

export type PageMarginsJson = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  readonly header?: number;
  readonly footer?: number;
  readonly gutter?: number;
};

export type ColumnsJson = {
  readonly num?: number;
  readonly equalWidth?: boolean;
  readonly space?: number;
  readonly sep?: boolean;
};

export type SectionJson = {
  readonly type?: string;
  readonly pageSize?: PageSizeJson;
  readonly pageMargins?: PageMarginsJson;
  readonly columns?: ColumnsJson;
  readonly titlePage?: boolean;
  readonly bidi?: boolean;
};

// =============================================================================
// Serialization Functions
// =============================================================================

function serializePageSize(pgSz: DocxPageSize): PageSizeJson {
  return {
    width: twipsToPoints(pgSz.w),
    height: twipsToPoints(pgSz.h),
    widthTwips: pgSz.w,
    heightTwips: pgSz.h,
    orientation: pgSz.orient,
  };
}

function serializePageMargins(pgMar: DocxPageMargins): PageMarginsJson {
  const result: PageMarginsJson = {
    top: twipsToPoints(pgMar.top),
    right: twipsToPoints(pgMar.right),
    bottom: twipsToPoints(pgMar.bottom),
    left: twipsToPoints(pgMar.left),
  };

  if (pgMar.header !== undefined) {
    return { ...result, header: twipsToPoints(pgMar.header) };
  }
  if (pgMar.footer !== undefined) {
    return { ...result, footer: twipsToPoints(pgMar.footer) };
  }
  if (pgMar.gutter !== undefined) {
    return { ...result, gutter: twipsToPoints(pgMar.gutter) };
  }

  return result;
}

function serializeColumns(cols: DocxColumns): ColumnsJson {
  const result: ColumnsJson = {};

  if (cols.num !== undefined) {
    return { ...result, num: cols.num };
  }
  if (cols.equalWidth !== undefined) {
    return { ...result, equalWidth: cols.equalWidth };
  }
  if (cols.space !== undefined) {
    return { ...result, space: twipsToPoints(cols.space) };
  }
  if (cols.sep !== undefined) {
    return { ...result, sep: cols.sep };
  }

  return result;
}

/**
 * Serialize DOCX section properties to JSON format.
 */
export function serializeSection(sectPr: DocxSectionProperties): SectionJson {
  const result: SectionJson = {};

  if (sectPr.type) {
    return { ...result, type: sectPr.type };
  }
  if (sectPr.pgSz) {
    return { ...result, pageSize: serializePageSize(sectPr.pgSz) };
  }
  if (sectPr.pgMar) {
    return { ...result, pageMargins: serializePageMargins(sectPr.pgMar) };
  }
  if (sectPr.cols) {
    return { ...result, columns: serializeColumns(sectPr.cols) };
  }
  if (sectPr.titlePg) {
    return { ...result, titlePage: sectPr.titlePg };
  }
  if (sectPr.bidi) {
    return { ...result, bidi: sectPr.bidi };
  }

  return result;
}
