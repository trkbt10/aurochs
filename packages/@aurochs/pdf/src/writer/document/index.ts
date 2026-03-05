/**
 * @file Document Builders - Barrel Export
 */

export {
  PdfObjectTracker,
  type PdfObjectEntry,
} from "./object-tracker";

export {
  buildResourceDict,
  buildEmptyResourceDict,
  type ResourceRefs,
} from "./resource-builder";

export {
  buildType1Font,
  buildEmbeddedFont,
  buildFonts,
} from "./font-builder";

export {
  buildImageXObject,
  buildImages,
} from "./image-builder";

export {
  buildPage,
  type PageBuildResult,
  type BuildPageOptions,
} from "./page-builder";
