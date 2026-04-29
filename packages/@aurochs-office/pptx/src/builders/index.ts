/**
 * @file @aurochs-office/pptx/builders — office-layer SoT builders
 *
 * Authoritative builders for the OPC scaffolding and PresentationML
 * structural parts of a PPTX package. Each builder owns exactly one
 * ECMA-376 element/part — see the per-file headers for the section
 * reference.
 *
 * The office layer intentionally does not pull in domain-specific
 * serializers (fills/lines/effects/text). The richer builders that
 * synthesise full master/layout/theme content from domain types live
 * in `@aurochs-builder/pptx/builders` and re-export from this module.
 */

// OPC scaffolding (ECMA-376 Part 2)
export { buildRootRels, buildRootRelsWithCore } from "./parts/root-rels";
export { buildContentTypes } from "./parts/content-types";
export type { BuildContentTypesOptions } from "./parts/content-types";
export {
  buildAppProperties,
  buildCoreProperties,
} from "./parts/document-properties";
export type {
  BuildAppPropertiesOptions,
  BuildCoreXmlOptions,
} from "./parts/document-properties";

// PresentationML structural fragments
export {
  PRESENTATIONML_ROOT_XMLNS,
  buildRootNvGrpSpPr,
  buildEmptyGroupSpPr,
  buildEmptySpTree,
  buildClrMapOvr,
} from "./presentation/common";

// Top-level PresentationML parts
export { buildPresentation } from "./presentation/presentation-part";
export type { BuildPresentationOptions } from "./presentation/presentation-part";
export { buildPresentationRels } from "./presentation/presentation-rels";
export type { BuildPresentationRelsOptions } from "./presentation/presentation-rels";
export { buildBlankSlide } from "./presentation/slide";
export { buildSlideRels } from "./presentation/slide-rels";
export type { BuildSlideRelsOptions } from "./presentation/slide-rels";
export { buildBlankSlideLayout } from "./presentation/slide-layout";
export type { BuildBlankSlideLayoutOptions } from "./presentation/slide-layout";
export { buildLayoutRels } from "./presentation/layout-rels";
export { buildBlankSlideMaster } from "./presentation/slide-master";
export type { BuildBlankSlideMasterOptions } from "./presentation/slide-master";
export { buildMasterRels } from "./presentation/master-rels";
export {
  buildBlankNotesMaster,
  buildNotesMasterRels,
} from "./presentation/notes-master";
export {
  buildNotesSlide,
  buildNotesSlideRels,
} from "./presentation/notes-slide";
export {
  buildBlankHandoutMaster,
  buildHandoutMasterRels,
} from "./presentation/handout-master";
export { buildPresProps } from "./presentation/pres-props";
export { buildViewProps } from "./presentation/view-props";
export { buildTableStyles } from "./presentation/table-styles";
export type { BuildTableStylesOptions } from "./presentation/table-styles";

// Theme (minimal, hardcoded — no domain serializer dependency)
export { buildMinimalTheme } from "./theme/minimal-theme";
export type { BuildMinimalThemeOptions } from "./theme/minimal-theme";
