/**
 * @file Resource domain module exports
 *
 * OPC resource types and utilities.
 * No render layer dependencies.
 */

// Types
export type {
  ZipFile,
  ZipEntry,
  ResourceMap,
  PlaceholderTable,
} from "./types";

// Utilities
export { createZipAdapter } from "./zip-adapter";
