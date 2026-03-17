/**
 * @file DOCX page size adapter
 *
 * Presets and conversion logic for PageSizeEditor in the DOCX editor.
 * Units are twips (1 twip = 1/1440 inch = 1/20 point).
 *
 * Standard paper sizes from ECMA-376:
 * - US Letter: 12240 x 15840 twips (8.5 x 11 in)
 * - A4: 11906 x 16838 twips (210 x 297 mm)
 */

import type { PageSizePreset, PageSizeData } from "@aurochs-ui/editor-core/adapter-types";
import type { DocxPageSize } from "@aurochs-office/docx/domain/section";
import { twips, type Twips } from "@aurochs-office/docx/domain/types";

export const DOCX_PAGE_PRESETS: readonly PageSizePreset[] = [
  { value: "letter", label: "US Letter", width: 12240, height: 15840 },
  { value: "A4", label: "A4", width: 11906, height: 16838 },
  { value: "A3", label: "A3", width: 16838, height: 23811 },
  { value: "legal", label: "US Legal", width: 12240, height: 20160 },
  { value: "tabloid", label: "Tabloid", width: 15840, height: 24480 },
  { value: "A5", label: "A5", width: 8391, height: 11906 },
  { value: "B5", label: "B5 (JIS)", width: 10319, height: 14571 },
  { value: "executive", label: "Executive", width: 10440, height: 15120 },
];

/**
 * Find matching preset for a given page size in twips (within 10 twips tolerance).
 */
export function findDocxMatchingPreset(w: number, h: number): string {
  const tolerance = 10;
  for (const preset of DOCX_PAGE_PRESETS) {
    if (Math.abs(preset.width - w) < tolerance && Math.abs(preset.height - h) < tolerance) {
      return preset.value;
    }
  }
  return "";
}

/**
 * Convert DocxPageSize to PageSizeData for the PageSizeEditor.
 *
 * Handles orientation: when landscape, the stored w/h are swapped
 * relative to the logical (portrait) orientation.
 */
export function docxPageSizeToData(pgSz: DocxPageSize | undefined): PageSizeData {
  const w = pgSz?.w ?? 12240; // default: US Letter
  const h = pgSz?.h ?? 15840;
  return {
    width: String(w),
    height: String(h),
    preset: findDocxMatchingPreset(w, h),
  };
}

/**
 * Derive orientation from a PageSizeData.
 */
export function deriveOrientation(data: PageSizeData): "portrait" | "landscape" {
  const w = parseFloat(data.width);
  const h = parseFloat(data.height);
  return w > h ? "landscape" : "portrait";
}

/**
 * Convert PageSizeData back to DocxPageSize.
 */
export function dataToDocxPageSize(data: PageSizeData): DocxPageSize {
  const w = parseFloat(data.width);
  const h = parseFloat(data.height);
  return {
    w: twips(Math.round(w)) as Twips,
    h: twips(Math.round(h)) as Twips,
    orient: w > h ? "landscape" : "portrait",
  };
}
