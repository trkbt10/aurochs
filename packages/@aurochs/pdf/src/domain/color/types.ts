/**
 * @file PDF color types
 *
 * Types for PDF color spaces and color values.
 * PDF Reference 8.6 - Color Spaces
 */

/**
 * PDF Color Space types
 *
 * PDF Reference 8.6 defines multiple color space families:
 * - Device color spaces: DeviceGray, DeviceRGB, DeviceCMYK
 * - CIE-based color spaces: CalGray, CalRGB, Lab, ICCBased
 * - Special color spaces: Indexed, Pattern, Separation, DeviceN
 *
 * Currently supported: Device color spaces and ICCBased (with fallback)
 */
export type PdfColorSpace = "DeviceGray" | "DeviceRGB" | "DeviceCMYK" | "ICCBased" | "Pattern";

/**
 * Alternate color space for ICCBased colors
 * Used when ICC profile parsing is not available
 */
export type PdfAlternateColorSpace = "DeviceGray" | "DeviceRGB" | "DeviceCMYK";

/**
 * PDF color value
 */
export type PdfColor = {
  readonly colorSpace: PdfColorSpace;
  readonly components: readonly number[];
  /**
   * For ICCBased color spaces, the alternate color space to use
   * when ICC profile parsing is not available.
   * Determined by the N (number of components) value in the ICC profile stream.
   *
   * PDF Reference 8.6.5.5:
   * - N=1: Alternate is DeviceGray
   * - N=3: Alternate is DeviceRGB (or Lab)
   * - N=4: Alternate is DeviceCMYK
   */
  readonly alternateColorSpace?: PdfAlternateColorSpace;
};
