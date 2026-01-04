/**
 * @file Presentation types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.2 - Presentation
 */

import type { Color } from "./color";
import type { Pixels } from "./types";
import type { TextStyleLevels } from "./text-style";
import type { EmbeddedFont } from "./embedded-font";
import type { PrintProperties } from "./print";

// =============================================================================
// Slide Size Types
// =============================================================================

/**
 * Predefined slide size type
 * @see ECMA-376 Part 1, Section 19.7.24 (ST_SlideSizeType)
 */
export type SlideSizeType =
  | "screen4x3"
  | "letter"
  | "A4"
  | "35mm"
  | "overhead"
  | "banner"
  | "custom"
  | "ledger"
  | "A3"
  | "B4ISO"
  | "B5ISO"
  | "B4JIS"
  | "B5JIS"
  | "hagakiCard"
  | "screen16x9"
  | "screen16x10";

/**
 * Slide dimensions
 * @see ECMA-376 Part 1, Section 19.2.1.34 (sldSz)
 */
export type SlideSize = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly type?: SlideSizeType;
};

// =============================================================================
// Custom Show Types
// =============================================================================

/**
 * Custom show definition.
 * @see ECMA-376 Part 1, Section 19.2.1.5 (custShow)
 */
export type CustomShow = {
  readonly id: number;
  readonly name: string;
  readonly slideIds: string[];
};

/**
 * Slide show range definition.
 * @see ECMA-376 Part 1, Section 19.2.1.38 (sldRg)
 */
export type SlideShowRange =
  | { readonly type: "all" }
  | { readonly type: "range"; readonly start: number; readonly end: number }
  | { readonly type: "list"; readonly slideIds: string[] };

// =============================================================================
// Show Properties Types
// =============================================================================

/**
 * Browse slide show settings.
 * @see ECMA-376 Part 1, Section 19.2.1.3 (browse)
 */
export type BrowseShowProperties = {
  readonly showScrollbar?: boolean;
};

/**
 * Kiosk slide show settings.
 * @see ECMA-376 Part 1, Section 19.2.1.18 (kiosk)
 */
export type KioskShowProperties = {
  readonly restart?: number;
};

/**
 * Presenter slide show settings.
 * @see ECMA-376 Part 1, Section 19.2.1.25 (present)
 */
export type PresentShowProperties = Record<string, never>;

/**
 * Presentation show properties.
 * @see ECMA-376 Part 1, Section 19.2.1.30 (showPr)
 */
export type ShowProperties = {
  readonly browse?: BrowseShowProperties;
  readonly kiosk?: KioskShowProperties;
  readonly present?: PresentShowProperties;
  readonly slideRange?: SlideShowRange;
  readonly penColor?: Color;
  readonly showNarration?: boolean;
  readonly useTimings?: boolean;
};

// =============================================================================
// Presentation Properties Types
// =============================================================================

/**
 * Presentation properties (presProps.xml).
 * @see ECMA-376 Part 1, Section 19.2.1.27 (presentationPr)
 */
export type PresentationProperties = {
  readonly showProperties?: ShowProperties;
  readonly recentColors?: Color[];
  readonly printProperties?: PrintProperties;
};

/**
 * Slide synchronization properties.
 * @see ECMA-376 Part 1, Section 19.6.1 (sldSyncPr)
 */
export type SlideSyncProperties = {
  readonly clientInsertedTime?: string;
  readonly serverSldId?: string;
  readonly serverSldModifiedTime?: string;
};

/**
 * Modification verifier for write protection.
 * @see ECMA-376 Part 1, Section 19.2.1.19 (modifyVerifier)
 */
export type ModifyVerifier = {
  readonly algorithmName?: string;
  readonly hashValue?: string;
  readonly saltValue?: string;
  readonly spinCount?: number;
};

// =============================================================================
// Photo Album Types
// =============================================================================

/**
 * Photo album frame shape.
 * @see ECMA-376 Part 1, Section 19.7.7 (ST_PhotoAlbumFrameShape)
 */
export type PhotoAlbumFrameShape =
  | "frameStyle1"
  | "frameStyle2"
  | "frameStyle3"
  | "frameStyle4"
  | "frameStyle5"
  | "frameStyle6"
  | "frameStyle7";

/**
 * Photo album layout.
 * @see ECMA-376 Part 1, Section 19.7.8 (ST_PhotoAlbumLayout)
 */
export type PhotoAlbumLayout =
  | "1pic"
  | "1picTitle"
  | "2pic"
  | "2picTitle"
  | "4pic"
  | "4picTitle"
  | "fitToSlide";

/**
 * Photo album settings.
 * @see ECMA-376 Part 1, Section 19.2.1.24 (photoAlbum)
 */
export type PhotoAlbum = {
  readonly blackAndWhite?: boolean;
  readonly frame?: PhotoAlbumFrameShape;
  readonly layout?: PhotoAlbumLayout;
  readonly showCaptions?: boolean;
};

/**
 * Smart tags reference.
 * @see ECMA-376 Part 1, Section 19.2.1.40 (smartTags)
 */
export type SmartTags = {
  readonly rId: string;
};

// =============================================================================
// Presentation Definition
// =============================================================================

/**
 * Complete presentation definition
 * @see ECMA-376 Part 1, Section 19.2.1.26 (presentation)
 */
export type Presentation = {
  readonly slideSize: SlideSize;
  readonly noteSize?: SlideSize;
  readonly defaultTextStyle?: TextStyleLevels;
  readonly embeddedFonts?: EmbeddedFont[];
  readonly customShows?: CustomShow[];
  readonly photoAlbum?: PhotoAlbum;
  readonly modifyVerifier?: ModifyVerifier;
  readonly smartTags?: SmartTags;
  readonly embedTrueTypeFonts?: boolean;
  readonly saveSubsetFonts?: boolean;
  readonly autoCompressPictures?: boolean;
  readonly bookmarkIdSeed?: number;
  readonly firstSlideNum?: number;
  readonly showSpecialPlsOnTitleSld?: boolean;
  readonly rtl?: boolean;
  readonly removePersonalInfoOnSave?: boolean;
  readonly compatMode?: boolean;
  readonly strictFirstAndLastChars?: boolean;
  readonly serverZoom?: number;
};
