/**
 * @file Core sheet viewport
 *
 * Composition container for the cell grid area. Provides the clipping
 * container and composes gridlines, cell content (children), borders,
 * and drawings in the correct z-order.
 *
 * This is the single source of truth for the cell grid area structure.
 * Both the editor and viewer use this component identically.
 *
 * The editor places interactive overlays (selection, editing) as siblings
 * of this component, positioned at the same coordinates.
 *
 * Context-free: all data is passed via props.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { colorTokens } from "@aurochs-ui/ui-components";
import { CoreSheetViewportProvider, type CoreSheetViewportContextValue } from "./CoreSheetViewportContext";
import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxDrawing } from "@aurochs-office/xlsx/domain/drawing/types";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { SheetLayout } from "../selectors/sheet-layout";
import type { NormalizedMergeRange } from "../sheet/merge-range";
import { CoreGridlinesLayer } from "./CoreGridlinesLayer";
import { CoreBordersLayer } from "./CoreBordersLayer";
import { CoreDrawingLayer } from "./CoreDrawingLayer";
import type { VisibleRange } from "./types";

export type CoreSheetViewportProps = {
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly layout: SheetLayout;
  readonly rowRange: VisibleRange;
  readonly colRange: VisibleRange;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  /** Viewport width in pixels (unscaled, grid area only, excluding headers) */
  readonly viewportWidth: number;
  /** Viewport height in pixels (unscaled, grid area only, excluding headers) */
  readonly viewportHeight: number;
  readonly rowCount: number;
  readonly colCount: number;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  /** Offset from the left edge (header width) in pixels */
  readonly headerOffsetX: number;
  /** Offset from the top edge (header height) in pixels */
  readonly headerOffsetY: number;
  /** Drawing data from the sheet */
  readonly drawing?: XlsxDrawing;
  /** Resource store for resolving drawing images */
  readonly resourceStore?: ResourceStore;
  /**
   * Whether to render cell borders.
   * Default: true.
   */
  readonly showBorders?: boolean;
  /**
   * Cell content layer (e.g. CoreCellsLayer).
   * Rendered between gridlines (below) and borders (above).
   */
  readonly children: ReactNode;
};

/**
 * Viewport container style — single source of truth.
 *
 * Exported so that the editor can apply the same style to its
 * interactive overlay sibling, ensuring pixel-perfect alignment.
 */
export const viewportContainerBaseStyle: CSSProperties = {
  position: "absolute",
  overflow: "hidden",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
};

/**
 * Core sheet viewport container.
 *
 * Renders in this z-order (bottom to top):
 * 1. Gridlines (SVG, merge-aware)
 * 2. Children (cell content layer)
 * 3. Borders (SVG, cell border styles)
 * 4. Drawings (images, shapes, charts)
 */
export function CoreSheetViewport({
  sheet,
  styles,
  layout,
  rowRange,
  colRange,
  scrollTop,
  scrollLeft,
  viewportWidth,
  viewportHeight,
  rowCount,
  colCount,
  normalizedMerges,
  headerOffsetX,
  headerOffsetY,
  drawing,
  resourceStore,
  showBorders = true,
  children,
}: CoreSheetViewportProps) {
  const viewportContext = useMemo<CoreSheetViewportContextValue>(
    () => ({ viewportWidth, viewportHeight }),
    [viewportWidth, viewportHeight],
  );

  return (
    <CoreSheetViewportProvider value={viewportContext}>
    <div
      style={{
        ...viewportContainerBaseStyle,
        left: headerOffsetX,
        top: headerOffsetY,
        width: viewportWidth,
        height: viewportHeight,
      }}
    >
      {/* 1. Gridlines */}
      <CoreGridlinesLayer
        sheet={sheet}
        layout={layout}
        rowRange={rowRange}
        colRange={colRange}
        scrollTop={scrollTop}
        scrollLeft={scrollLeft}
        viewportWidth={viewportWidth}
        viewportHeight={viewportHeight}
        normalizedMerges={normalizedMerges}
        rowCount={rowCount}
        colCount={colCount}
      />

      {/* 2. Cell content */}
      {children}

      {/* 3. Borders */}
      {showBorders && (
        <CoreBordersLayer
          sheet={sheet}
          styles={styles}
          layout={layout}
          rowRange={rowRange}
          colRange={colRange}
          scrollTop={scrollTop}
          scrollLeft={scrollLeft}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          rowCount={rowCount}
          colCount={colCount}
        />
      )}

      {/* 4. Drawings */}
      <CoreDrawingLayer
        drawing={drawing}
        layout={layout}
        resourceStore={resourceStore}
        scrollLeft={scrollLeft}
        scrollTop={scrollTop}
      />
    </div>
    </CoreSheetViewportProvider>
  );
}
