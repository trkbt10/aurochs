/**
 * @file PDF page size adapter
 *
 * Presets and conversion logic for PageSizeEditor in the PDF editor.
 * Units are PDF points (1 point = 1/72 inch).
 */

import type { PageSizePreset } from "@aurochs-ui/editor-core/adapter-types";

export const PDF_PAGE_PRESETS: readonly PageSizePreset[] = [
  { value: "letter", label: "US Letter", width: 612, height: 792 },
  { value: "A4", label: "A4", width: 595.28, height: 841.89 },
  { value: "A3", label: "A3", width: 841.89, height: 1190.55 },
  { value: "legal", label: "US Legal", width: 612, height: 1008 },
  { value: "tabloid", label: "Tabloid", width: 792, height: 1224 },
  { value: "A5", label: "A5", width: 419.53, height: 595.28 },
  { value: "B5", label: "B5", width: 498.9, height: 708.66 },
];

/**
 * Find matching preset for a given page width/height (within 0.5pt tolerance).
 */
export function findMatchingPreset(width: number, height: number): string {
  const tolerance = 0.5;
  for (const preset of PDF_PAGE_PRESETS) {
    if (Math.abs(preset.width - width) < tolerance && Math.abs(preset.height - height) < tolerance) {
      return preset.value;
    }
  }
  return "";
}
