/**
 * @file Protection Type Definitions
 *
 * Defines types for workbook and worksheet protection settings in SpreadsheetML.
 *
 * @see ECMA-376 Part 4, Section 18.2.29 (workbookProtection)
 * @see ECMA-376 Part 4, Section 18.3.1.85 (sheetProtection)
 */

// =============================================================================
// Workbook Protection Types
// =============================================================================

/**
 * Workbook protection settings.
 *
 * Controls whether the workbook structure and windows can be modified.
 *
 * @see ECMA-376 Part 4, Section 18.2.29 (workbookProtection)
 */
export type XlsxWorkbookProtection = {
  /**
   * Whether the workbook structure is locked.
   *
   * When true, prevents:
   * - Adding, deleting, renaming sheets
   * - Moving sheets
   * - Hiding/unhiding sheets
   */
  readonly lockStructure?: boolean;

  /**
   * Whether the workbook windows are locked.
   *
   * When true, prevents:
   * - Resizing windows
   * - Moving windows
   * - Changing window state
   */
  readonly lockWindows?: boolean;

  /**
   * Whether a revision password is set.
   */
  readonly lockRevision?: boolean;

  /**
   * Password hash for workbook protection (legacy).
   */
  readonly workbookPassword?: string;

  /**
   * Password hash for revision protection (legacy).
   */
  readonly revisionsPassword?: string;

  /**
   * Hash algorithm for workbook password (ECMA-376 enhanced protection).
   */
  readonly workbookAlgorithmName?: string;

  /**
   * Hash value for workbook password (ECMA-376 enhanced protection).
   */
  readonly workbookHashValue?: string;

  /**
   * Salt value for workbook password (ECMA-376 enhanced protection).
   */
  readonly workbookSaltValue?: string;

  /**
   * Spin count for workbook password (ECMA-376 enhanced protection).
   */
  readonly workbookSpinCount?: number;
};

// =============================================================================
// Sheet Protection Types
// =============================================================================

/**
 * Worksheet protection settings.
 *
 * Controls which operations are allowed on a protected sheet.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.85 (sheetProtection)
 */
export type XlsxSheetProtection = {
  /**
   * Whether the sheet is protected.
   */
  readonly sheet?: boolean;

  /**
   * Whether objects (shapes, charts, etc.) are protected.
   */
  readonly objects?: boolean;

  /**
   * Whether scenarios are protected.
   */
  readonly scenarios?: boolean;

  /**
   * Whether cell formatting is allowed.
   */
  readonly formatCells?: boolean;

  /**
   * Whether column formatting is allowed.
   */
  readonly formatColumns?: boolean;

  /**
   * Whether row formatting is allowed.
   */
  readonly formatRows?: boolean;

  /**
   * Whether column insertion is allowed.
   */
  readonly insertColumns?: boolean;

  /**
   * Whether row insertion is allowed.
   */
  readonly insertRows?: boolean;

  /**
   * Whether hyperlink insertion is allowed.
   */
  readonly insertHyperlinks?: boolean;

  /**
   * Whether column deletion is allowed.
   */
  readonly deleteColumns?: boolean;

  /**
   * Whether row deletion is allowed.
   */
  readonly deleteRows?: boolean;

  /**
   * Whether locked cells can be selected.
   */
  readonly selectLockedCells?: boolean;

  /**
   * Whether sorting is allowed.
   */
  readonly sort?: boolean;

  /**
   * Whether auto-filter is allowed.
   */
  readonly autoFilter?: boolean;

  /**
   * Whether pivot tables can be used.
   */
  readonly pivotTables?: boolean;

  /**
   * Whether unlocked cells can be selected.
   */
  readonly selectUnlockedCells?: boolean;

  /**
   * Password hash (legacy).
   */
  readonly password?: string;

  /**
   * Hash algorithm (ECMA-376 enhanced protection).
   */
  readonly algorithmName?: string;

  /**
   * Hash value (ECMA-376 enhanced protection).
   */
  readonly hashValue?: string;

  /**
   * Salt value (ECMA-376 enhanced protection).
   */
  readonly saltValue?: string;

  /**
   * Spin count (ECMA-376 enhanced protection).
   */
  readonly spinCount?: number;
};
