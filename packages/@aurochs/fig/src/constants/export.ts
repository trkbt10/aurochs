/**
 * @file Export-related constants for Figma fig format
 */

/** Image type values for export */
export const IMAGE_TYPE_VALUES = {
  PNG: 0,
  JPG: 1,
  JPEG: 1, // Alias for JPG
  SVG: 2,
  PDF: 3,
  WEBP: 4,
} as const;

export type ImageType = keyof typeof IMAGE_TYPE_VALUES;

/** Export constraint type values */
export const EXPORT_CONSTRAINT_VALUES = {
  CONTENT_SCALE: 0,
  CONTENT_WIDTH: 1,
  CONTENT_HEIGHT: 2,
} as const;

export type ExportConstraintType = keyof typeof EXPORT_CONSTRAINT_VALUES;

/** Export color profile values */
export const EXPORT_COLOR_PROFILE_VALUES = {
  DOCUMENT: 0,
  SRGB: 1,
  P3: 2,
  DISPLAY_P3_V4: 2, // Alias for P3
} as const;

export type ExportColorProfile = keyof typeof EXPORT_COLOR_PROFILE_VALUES;

/** SVG ID mode values */
export const SVG_ID_MODE_VALUES = {
  IF_NEEDED: 0,
  ALWAYS: 1,
  NEVER: 2,
} as const;

export type ExportSVGIDMode = keyof typeof SVG_ID_MODE_VALUES;
