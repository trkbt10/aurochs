/**
 * @file Page Setup Type Definitions
 *
 * Defines types for print and page configuration settings in SpreadsheetML.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.63 (pageMargins)
 * @see ECMA-376 Part 4, Section 18.3.1.64 (pageSetup)
 * @see ECMA-376 Part 4, Section 18.3.1.46 (headerFooter)
 */

// =============================================================================
// Page Setup Types
// =============================================================================

/**
 * Page setup configuration for printing.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.64 (pageSetup)
 */
export type XlsxPageSetup = {
  /**
   * Paper size index.
   *
   * Common values:
   * - 1: Letter (8.5" x 11")
   * - 8: A3 (297mm x 420mm)
   * - 9: A4 (210mm x 297mm)
   * - 11: A5 (148mm x 210mm)
   *
   * @see ECMA-376 Part 4, Section 18.18.54 (ST_PaperSize)
   */
  readonly paperSize?: number;

  /**
   * Page orientation.
   *
   * - "default": Use printer default
   * - "portrait": Tall orientation
   * - "landscape": Wide orientation
   */
  readonly orientation?: "default" | "portrait" | "landscape";

  /**
   * Print scaling percentage (10-400).
   */
  readonly scale?: number;

  /**
   * Number of horizontal pages to fit content to (0 = auto).
   */
  readonly fitToWidth?: number;

  /**
   * Number of vertical pages to fit content to (0 = auto).
   */
  readonly fitToHeight?: number;

  /**
   * First page number.
   */
  readonly firstPageNumber?: number;

  /**
   * Whether to use first page number.
   */
  readonly useFirstPageNumber?: boolean;

  /**
   * Whether to print in black and white.
   */
  readonly blackAndWhite?: boolean;

  /**
   * Whether to print in draft quality.
   */
  readonly draft?: boolean;

  /**
   * Cell comments display mode.
   */
  readonly cellComments?: "none" | "asDisplayed" | "atEnd";

  /**
   * Page ordering for multi-page printing.
   */
  readonly pageOrder?: "downThenOver" | "overThenDown";

  /**
   * Print horizontal resolution (DPI).
   */
  readonly horizontalDpi?: number;

  /**
   * Print vertical resolution (DPI).
   */
  readonly verticalDpi?: number;

  /**
   * Number of copies to print.
   */
  readonly copies?: number;
};

// =============================================================================
// Page Margins Types
// =============================================================================

/**
 * Page margins for printing (in inches).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.63 (pageMargins)
 */
export type XlsxPageMargins = {
  /** Left margin in inches */
  readonly left?: number;

  /** Right margin in inches */
  readonly right?: number;

  /** Top margin in inches */
  readonly top?: number;

  /** Bottom margin in inches */
  readonly bottom?: number;

  /** Header margin (distance from top of page to header) in inches */
  readonly header?: number;

  /** Footer margin (distance from bottom of page to footer) in inches */
  readonly footer?: number;
};

// =============================================================================
// Header/Footer Types
// =============================================================================

/**
 * Header and footer content for printing.
 *
 * Content can include special formatting codes:
 * - &L, &C, &R: Left, Center, Right sections
 * - &P: Current page number
 * - &N: Total page count
 * - &D: Current date
 * - &T: Current time
 * - &F: File name
 * - &A: Sheet name
 *
 * @see ECMA-376 Part 4, Section 18.3.1.46 (headerFooter)
 */
export type XlsxHeaderFooter = {
  /** Header for odd pages (and all pages if differentOddEven is false) */
  readonly oddHeader?: string;

  /** Footer for odd pages (and all pages if differentOddEven is false) */
  readonly oddFooter?: string;

  /** Header for even pages (only used if differentOddEven is true) */
  readonly evenHeader?: string;

  /** Footer for even pages (only used if differentOddEven is true) */
  readonly evenFooter?: string;

  /** Header for the first page (only used if differentFirst is true) */
  readonly firstHeader?: string;

  /** Footer for the first page (only used if differentFirst is true) */
  readonly firstFooter?: string;

  /** Whether odd and even pages have different headers/footers */
  readonly differentOddEven?: boolean;

  /** Whether the first page has a different header/footer */
  readonly differentFirst?: boolean;

  /** Whether to scale headers/footers with document scaling */
  readonly scaleWithDoc?: boolean;

  /** Whether to align headers/footers with page margins */
  readonly alignWithMargins?: boolean;
};

// =============================================================================
// Print Options Types
// =============================================================================

/**
 * Print options for worksheets.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.70 (printOptions)
 */
export type XlsxPrintOptions = {
  /** Whether to print gridlines */
  readonly gridLines?: boolean;

  /** Whether to print row and column headings */
  readonly headings?: boolean;

  /** Whether to print cell gridlines in black and white */
  readonly gridLinesSet?: boolean;

  /** Whether to center content horizontally on the page */
  readonly horizontalCentered?: boolean;

  /** Whether to center content vertically on the page */
  readonly verticalCentered?: boolean;
};
