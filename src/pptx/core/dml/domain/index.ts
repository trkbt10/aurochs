/**
 * @file PPTX domain types
 *
 * Core domain types for PPTX processing.
 *
 * @see ECMA-376 Part 1 (PresentationML, DrawingML)
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

// OPC infrastructure types
export type {
  ZipFile,
  ZipEntry,
  ResourceMap,
  PlaceholderTable,
} from "./types";

// Theme types
export type {
  CustomColor,
  ExtraColorScheme,
  ObjectDefaults,
  FormatScheme,
  Theme,
} from "./types";

// Text style types
export type {
  MasterTextStyles,
} from "./types";
