/**
 * @file PPTX default values and constants
 *
 * Centralized defaults specified by the Office Open XML specification.
 *
 * @see ECMA-376-1:2016 Office Open XML File Formats — Part 1: Fundamentals and Markup Language Reference
 */

// =============================================================================
// Font Defaults
// =============================================================================

/**
 * Default font size in points.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr - Run Properties):
 * The `sz` attribute specifies the size of text in hundredths of a point.
 * When no size is specified, the default is 1800 hundredths of a point (18pt).
 *
 * @example
 * ```xml
 * <a:rPr sz="1800"/>  <!-- 18pt (default) -->
 * <a:rPr sz="2400"/>  <!-- 24pt -->
 * ```
 *
 * @see ECMA-376-1:2016, Section 21.1.2.3.9 (ST_TextFontSize)
 * @see ECMA-376-1:2016, Section 20.1.10.72 (ST_TextFontSize Simple Type)
 */
export const DEFAULT_FONT_SIZE_PT = 18;

/**
 * Default font size in hundredths of a point (OOXML internal unit).
 *
 * OOXML stores font sizes in hundredths of a point (centipoints).
 * This is the raw value that appears in XML attributes.
 *
 * @see ECMA-376-1:2016, Section 20.1.10.72 (ST_TextFontSize Simple Type)
 */
export const DEFAULT_FONT_SIZE_CENTIPOINTS = 1800;

/**
 * Conversion factor from OOXML font size units to points.
 *
 * OOXML stores font size in hundredths of a point.
 * To convert to points: sz_points = sz_centipoints / 100
 *
 * @see ECMA-376-1:2016, Section 20.1.10.72
 */
export const FONT_SIZE_CENTIPOINTS_TO_PT = 100;

// =============================================================================
// Spacing Defaults
// =============================================================================

/**
 * Default line spacing multiplier.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.2.10 (a:lnSpc - Line Spacing):
 * When no line spacing is specified, single line spacing (100%) is used.
 *
 * The value 100000 represents 100% in OOXML percentage units.
 *
 * @see ECMA-376-1:2016, Section 21.1.2.2.10
 * @see ECMA-376-1:2016, Section 20.1.10.40 (ST_TextSpacingPercentOrPercentString)
 */
export const DEFAULT_LINE_SPACING_PCT = 100000;

/**
 * Default paragraph space before/after in points.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.2.19 (a:spcBef) and 21.1.2.2.18 (a:spcAft):
 * When no spacing is specified, the default is 0.
 *
 * @see ECMA-376-1:2016, Section 21.1.2.2.19 (a:spcBef)
 * @see ECMA-376-1:2016, Section 21.1.2.2.18 (a:spcAft)
 */
export const DEFAULT_PARAGRAPH_SPACING_PT = 0;

// =============================================================================
// Margin and Indent Defaults
// =============================================================================

/**
 * Default text margin in EMUs (English Metric Units).
 *
 * Per ECMA-376 Part 1, Section 21.1.2.1.1 (a:bodyPr - Body Properties):
 * Default text inset values are 91440 EMU (0.1 inch).
 *
 * Conversion: 914400 EMU = 1 inch = 96 pixels (at 96 DPI)
 *
 * @see ECMA-376-1:2016, Section 21.1.2.1.1
 * @see ECMA-376-1:2016, Section 20.1.10.16 (ST_Coordinate32)
 */
export const DEFAULT_TEXT_MARGIN_EMU = 91440;

/**
 * Default bullet margin left in EMUs.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr - Paragraph Properties):
 * The marL attribute specifies the left margin. Default is 0.
 *
 * @see ECMA-376-1:2016, Section 21.1.2.2.7
 */
export const DEFAULT_MARGIN_LEFT_EMU = 0;

/**
 * Default bullet indent in EMUs.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr):
 * The indent attribute specifies the indent. Default is 0.
 *
 * @see ECMA-376-1:2016, Section 21.1.2.2.7
 */
export const DEFAULT_INDENT_EMU = 0;

// =============================================================================
// Unit Conversion Constants
// =============================================================================

/**
 * EMUs (English Metric Units) per inch.
 *
 * This is the fundamental unit in OOXML for measurements.
 *
 * @see ECMA-376-1:2016, Section 20.1.10.16 (ST_Coordinate)
 */
export const EMU_PER_INCH = 914400;

/**
 * Standard screen DPI for pixel conversion.
 *
 * While not specified in ECMA-376, 96 DPI is the standard assumption
 * for converting EMU to screen pixels.
 */
export const STANDARD_DPI = 96;

/**
 * EMUs per pixel at standard 96 DPI.
 *
 * Calculated as: EMU_PER_INCH / STANDARD_DPI = 914400 / 96 = 9525
 */
export const EMU_PER_PIXEL = EMU_PER_INCH / STANDARD_DPI;

/**
 * Points per inch.
 *
 * Standard typographic measurement.
 */
export const POINTS_PER_INCH = 72;

/**
 * OOXML percentage to decimal conversion factor.
 *
 * OOXML stores percentages as integers where 100000 = 100%.
 *
 * @see ECMA-376-1:2016, Section 20.1.10.40 (ST_TextSpacingPercentOrPercentString)
 */
export const OOXML_PERCENT_FACTOR = 100000;

// =============================================================================
// Presentation Defaults (Section 19.2)
// =============================================================================

/**
 * Default server zoom percentage.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * The serverZoom attribute specifies the zoom level to use when
 * viewing the presentation in a web browser. Default is 50000 (50%).
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_SERVER_ZOOM = 50000;

/**
 * Default first slide number.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * The firstSlideNum attribute specifies the first slide number.
 * Default is 1.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_FIRST_SLIDE_NUM = 1;

/**
 * Default showSpecialPlsOnTitleSld value.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether special placeholders (date/time, footer, slide number)
 * should appear on title slides. Default is true.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_SHOW_SPECIAL_PLS_ON_TITLE_SLD = true;

/**
 * Default right-to-left direction.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether the presentation is in right-to-left mode.
 * Default is false.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_RTL = false;

/**
 * Default removePersonalInfoOnSave value.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether personal information is removed when saving.
 * Default is false.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_REMOVE_PERSONAL_INFO_ON_SAVE = false;

/**
 * Default compatibility mode value.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether the presentation is in compatibility mode.
 * Default is false.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_COMPAT_MODE = false;

/**
 * Default strictFirstAndLastChars value.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether strict line breaking rules apply for first/last characters.
 * Default is true.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_STRICT_FIRST_AND_LAST_CHARS = true;

/**
 * Default embedTrueTypeFonts value.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether TrueType fonts are embedded in the presentation.
 * Default is false.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_EMBED_TRUETYPE_FONTS = false;

/**
 * Default saveSubsetFonts value.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether only used font subsets are saved.
 * Default is false.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_SAVE_SUBSET_FONTS = false;

/**
 * Default autoCompressPictures value.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies whether pictures are automatically compressed.
 * Default is true.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_AUTO_COMPRESS_PICTURES = true;

/**
 * Default bookmark ID seed.
 *
 * Per ECMA-376 Part 1, Section 19.2.1.26 (p:presentation):
 * Specifies the seed for bookmark IDs. Default is 1.
 *
 * @see ECMA-376-1:2016, Section 19.2.1.26
 */
export const DEFAULT_BOOKMARK_ID_SEED = 1;
