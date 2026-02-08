/**
 * @file Color space utilities
 *
 * PDF Reference 8.6 - Color space component counts.
 */

import type { PdfColorSpace, PdfAlternateColorSpace } from "./types";

/**
 * Get number of components for a color space
 *
 * PDF Reference 8.6:
 * - DeviceGray: 1 component
 * - DeviceRGB: 3 components
 * - DeviceCMYK: 4 components
 * - ICCBased: Determined by N value (or alternateColorSpace)
 * - Pattern: 0 components
 */
export function getColorSpaceComponents(
  colorSpace: PdfColorSpace,
  alternateColorSpace?: PdfAlternateColorSpace
): number {
  switch (colorSpace) {
    case "DeviceGray":
      return 1;
    case "DeviceRGB":
      return 3;
    case "DeviceCMYK":
      return 4;
    case "ICCBased":
      if (alternateColorSpace) {
        return getColorSpaceComponents(alternateColorSpace);
      }
      return 3; // Default to RGB
    case "Pattern":
      return 0;
    default:
      return 3;
  }
}
