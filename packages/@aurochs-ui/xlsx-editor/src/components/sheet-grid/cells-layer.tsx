/**
 * @file Sheet grid cells layer
 *
 * Thin wrapper around CoreCellsLayer from @aurochs-ui/xlsx-sheet.
 * Maintains the existing XlsxSheetGridCellsLayer API for editor consumers
 * (FrozenPanesLayer, sheet-grid-layers, tests).
 */

import { CoreCellsLayer, type CoreCellsLayerProps } from "@aurochs-ui/xlsx-sheet/core";

/**
 * Renders the visible cell grid region as positioned divs.
 *
 * Delegates to CoreCellsLayer — the single source of truth for cell rendering.
 */
export function XlsxSheetGridCellsLayer(props: CoreCellsLayerProps) {
  return <CoreCellsLayer {...props} />;
}
