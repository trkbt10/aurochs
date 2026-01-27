/**
 * @file Open Packaging Conventions (OPC) utilities
 *
 * PPTX-focused OPC helpers.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

export * from "./pack-uri";
export * from "./part-name";

export {
  CONTENT_TYPES,
  parseContentTypes,
  extractSlideNumber,
  buildSlideFileInfoList,
} from "./content-types";
export type { SlideFileInfo } from "./content-types";

export { getMimeTypeFromPath } from "./utils";
