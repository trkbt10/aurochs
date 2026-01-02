/**
 * @file PPTX domain types
 *
 * Core domain types for PPTX processing. These types represent the
 * domain model and are used by both parser and render layers.
 *
 * Organized by ECMA-376 sections:
 * - OPC infrastructure (Part 2)
 * - DrawingML types (Part 1, Section 20.1)
 * - PresentationML types (Part 1, Section 19)
 *
 * @see ECMA-376 Part 1 (PresentationML, DrawingML)
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

import type { XmlDocument, XmlElement } from "../../../../xml/index";
import type {
  ColorScheme as ColorSchemeType,
  ColorMap as ColorMapType,
  FontScheme as FontSchemeType,
} from "../../../domain/resolution";

// =============================================================================
// OPC Infrastructure Types (ECMA-376 Part 2)
// =============================================================================

/**
 * Zip file interface for OPC package access.
 *
 * @see ECMA-376 Part 2, Section 8 (Physical Package)
 */
export type ZipFile = {
  file(path: string): ZipEntry | null;
  /** Load new zip data. Optional - only needed for initial loading. */
  load?(data: ArrayBuffer): ZipFile;
};

/**
 * Zip entry interface for file access.
 */
export type ZipEntry = {
  asText(): string;
  asArrayBuffer(): ArrayBuffer;
};

/**
 * Resource map for relationship ID resolution.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type ResourceMap = {
  /** Get target path by relationship ID */
  getTarget(rId: string): string | undefined;
  /** Get relationship type by ID */
  getType(rId: string): string | undefined;
  /** Get first target matching a relationship type */
  getTargetByType(relType: string): string | undefined;
};

/**
 * Placeholder lookup table.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 */
export type PlaceholderTable = {
  /** Shapes indexed by p:ph/@idx (xsd:unsignedInt) */
  readonly byIdx: Map<number, XmlElement>;
  /** Shapes indexed by p:ph/@type (ST_PlaceholderType) */
  readonly byType: Record<string, XmlElement>;
};

// =============================================================================
// Theme Types (ECMA-376 Part 1, Section 20.1.6)
// =============================================================================

/**
 * Custom color definition from theme.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.8 (a:custClr)
 */
export type CustomColor = {
  readonly name?: string;
  readonly color?: string;
  readonly type: "srgb" | "system";
  readonly systemColor?: string;
};

/**
 * Extra color scheme from theme.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.4 (a:extraClrScheme)
 */
export type ExtraColorScheme = {
  readonly name?: string;
  readonly colorScheme: ColorSchemeType;
  readonly colorMap: ColorMapType;
};

/**
 * Object defaults from theme.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.7 (a:objectDefaults)
 */
export type ObjectDefaults = {
  readonly lineDefault?: XmlElement;
  readonly shapeDefault?: XmlElement;
  readonly textDefault?: XmlElement;
};

/**
 * Format scheme containing style lists.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.14 (a:fmtScheme)
 */
export type FormatScheme = {
  readonly lineStyles: readonly XmlElement[];
  readonly fillStyles: readonly XmlElement[];
  readonly effectStyles: readonly XmlElement[];
  /**
   * Background fill styles (a:bgFillStyleLst).
   * Used by p:bgRef with idx >= 1001.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
   */
  readonly bgFillStyles: readonly XmlElement[];
};

/**
 * Complete theme definition.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
export type Theme = {
  readonly fontScheme: FontSchemeType;
  readonly colorScheme: ColorSchemeType;
  readonly formatScheme: FormatScheme;
  readonly customColors: readonly CustomColor[];
  readonly extraColorSchemes: readonly ExtraColorScheme[];
  readonly themeElements?: XmlElement;
  readonly themeManager?: XmlElement;
  readonly themeOverrides: readonly XmlDocument[];
  readonly objectDefaults: ObjectDefaults;
};

// =============================================================================
// Master Text Styles (ECMA-376 Part 1, Section 19.3.1.51)
// =============================================================================

/**
 * Master text styles from slide master.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
 */
export type MasterTextStyles = {
  readonly titleStyle: XmlElement | undefined;
  readonly bodyStyle: XmlElement | undefined;
  readonly otherStyle: XmlElement | undefined;
};
