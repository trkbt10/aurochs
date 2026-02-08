/**
 * @file Structured Document Tag (SDT) domain types
 *
 * Defines types for content controls in WordprocessingML documents.
 * SDTs are used for data binding, form fields, and content control.
 *
 * @see ECMA-376 Part 1, Section 17.5.2 (Structured Document Tags)
 */

import type { DocxRun } from "./run";

// =============================================================================
// SDT Lock Types
// =============================================================================

/**
 * SDT locking behavior.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.23 (lock)
 */
export type DocxSdtLock =
  | "sdtLocked"        // SDT cannot be deleted, contents can be edited
  | "contentLocked"    // Contents cannot be edited, SDT can be deleted
  | "sdtContentLocked" // Neither SDT nor contents can be modified
  | "unlocked";        // No restrictions

// =============================================================================
// SDT Types
// =============================================================================

/**
 * SDT content type categories.
 *
 * @see ECMA-376 Part 1, Section 17.5.2 (Structured Document Tags)
 */
export type DocxSdtType =
  | "richText"      // Rich text content
  | "text"          // Plain text only
  | "picture"       // Picture content
  | "date"          // Date picker
  | "dropDownList"  // Drop-down list
  | "comboBox"      // Combo box (drop-down with edit)
  | "checkbox"      // Checkbox
  | "buildingBlockGallery" // Building block (Quick Parts)
  | "citation"      // Citation
  | "group"         // Group container
  | "bibliography"  // Bibliography
  | "docPartObj"    // Document part object
  | "equation"      // Equation
  | "repeatingSection"     // Repeating section
  | "repeatingSectionItem" // Item in repeating section
  | "unknown";      // Unknown/generic

// =============================================================================
// SDT List Items
// =============================================================================

/**
 * Drop-down list or combo box item.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.21 (listItem)
 */
export type DocxSdtListItem = {
  /** Display text */
  readonly displayText?: string;
  /** Value stored when selected */
  readonly value: string;
};

// =============================================================================
// SDT Properties
// =============================================================================

/**
 * SDT date properties.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.7 (date)
 */
export type DocxSdtDateProperties = {
  /** Current date value (ISO 8601) */
  readonly fullDate?: string;
  /** Date format string (e.g., "yyyy-MM-dd") */
  readonly dateFormat?: string;
  /** Locale ID */
  readonly lid?: string;
  /** Storage format */
  readonly storeMappedDataAs?: "date" | "dateTime" | "text";
  /** Calendar type */
  readonly calendar?: string;
};

/**
 * SDT text properties.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.44 (text)
 */
export type DocxSdtTextProperties = {
  /** Allow multiple lines */
  readonly multiLine?: boolean;
};

/**
 * SDT placeholder text.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.25 (placeholder)
 */
export type DocxSdtPlaceholder = {
  /** Document part reference for placeholder */
  readonly docPart?: string;
};

/**
 * Data binding for SDT.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.6 (dataBinding)
 */
export type DocxSdtDataBinding = {
  /** Prefix mappings for XPath */
  readonly prefixMappings?: string;
  /** XPath expression */
  readonly xpath?: string;
  /** Store item ID */
  readonly storeItemID?: string;
};

/**
 * SDT properties.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.38 (sdtPr)
 */
export type DocxSdtProperties = {
  /** User-friendly name/alias */
  readonly alias?: string;
  /** Tag for programmatic identification */
  readonly tag?: string;
  /** Unique numeric identifier */
  readonly id?: number;
  /** Locking behavior */
  readonly lock?: DocxSdtLock;
  /** Placeholder text */
  readonly placeholder?: DocxSdtPlaceholder;
  /** Whether to show placeholder when no content */
  readonly showingPlcHdr?: boolean;
  /** Data binding configuration */
  readonly dataBinding?: DocxSdtDataBinding;
  /** SDT type indicator */
  readonly sdtType?: DocxSdtType;
  /** Date picker properties */
  readonly date?: DocxSdtDateProperties;
  /** Text properties */
  readonly text?: DocxSdtTextProperties;
  /** Drop-down list items */
  readonly dropDownList?: readonly DocxSdtListItem[];
  /** Combo box items */
  readonly comboBox?: readonly DocxSdtListItem[];
  /** Checkbox checked state */
  readonly checked?: boolean;
  /** Whether content is temporary */
  readonly temporary?: boolean;
  /** Color for content control */
  readonly color?: string;
  /** Appearance style (boundingBox or tags) */
  readonly appearance?: "boundingBox" | "tags" | "hidden";
};

// =============================================================================
// Inline SDT (Run-level)
// =============================================================================

/**
 * Inline SDT (run-level structured document tag).
 *
 * Contains run-level content within a paragraph.
 *
 * @see ECMA-376 Part 1, Section 17.5.2.31 (sdt in run context)
 */
export type DocxInlineSdt = {
  readonly type: "sdt";
  /** SDT properties */
  readonly properties?: DocxSdtProperties;
  /** Run content */
  readonly content: readonly DocxRun[];
};

// =============================================================================
// Block-level SDT
// =============================================================================

// Note: Block-level SDT (containing paragraphs/tables) is defined in document.ts
// since it needs to reference DocxBlockContent which depends on DocxParagraph
