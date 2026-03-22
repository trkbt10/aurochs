/**
 * @file opc-embedded-assets — editor UI listing embedded media in an OPC package
 *
 * Discovery is implemented for PresentationML (PPTX / POTX) via `@aurochs-office/pptx/app/media-discovery`.
 * Word / Spreadsheet variants can be added as sibling modules once format-specific discovery APIs exist.
 */

export { AssetPanel, ASSET_DRAG_TYPE, type AssetPanelProps, type AssetInfo } from "./AssetPanel";
