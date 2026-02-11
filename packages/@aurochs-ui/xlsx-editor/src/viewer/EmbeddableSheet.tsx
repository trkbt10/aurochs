/**
 * @file EmbeddableSheet
 *
 * Lightweight embeddable sheet viewer for iframes or cards.
 */

import { useMemo, useState, useCallback, type CSSProperties } from "react";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { ZoomControls, getNextZoomValue } from "@aurochs-ui/editor-controls/zoom";
import {
  EmbeddableContainer,
  EmbeddableContent,
  EmbeddableFooter,
  PositionIndicator,
  useItemNavigation,
  useViewerKeyboard,
} from "@aurochs-ui/ui-components/viewer";
import { SheetTabViewer, ReadonlySheetGrid } from "./components";

export type EmbeddableSheetProps = {
  /** The workbook to display */
  readonly workbook: XlsxWorkbook;
  /** Initial sheet index (0-based, default: 0) */
  readonly initialSheet?: number;
  /** Initial zoom level (default: 1.0) */
  readonly initialZoom?: number;
  /** Grid metrics configuration */
  readonly metrics?: {
    readonly rowCount?: number;
    readonly colCount?: number;
    readonly rowHeightPx?: number;
    readonly colWidthPx?: number;
    readonly rowHeaderWidthPx?: number;
    readonly colHeaderHeightPx?: number;
  };
  /** Show sheet tabs (default: true) */
  readonly showSheetTabs?: boolean;
  /** Show sheet indicator (default: true) */
  readonly showSheetIndicator?: boolean;
  /** Show zoom controls (default: false) */
  readonly showZoom?: boolean;
  /** Show gridlines (default: true) */
  readonly showGridlines?: boolean;
  /** Show row/column headers (default: true) */
  readonly showHeaders?: boolean;
  /** Maximum width of the container */
  readonly maxWidth?: string | number;
  /** Maximum height of the container */
  readonly maxHeight?: string | number;
  /** Callback when sheet changes */
  readonly onSheetChange?: (sheetIndex: number) => void;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const DEFAULT_METRICS = {
  rowCount: 50,
  colCount: 20,
  rowHeightPx: 24,
  colWidthPx: 80,
  rowHeaderWidthPx: 40,
  colHeaderHeightPx: 24,
};

/**
 * Lightweight embeddable sheet viewer.
 */
export function EmbeddableSheet({
  workbook,
  initialSheet = 0,
  initialZoom = 1.0,
  metrics: metricsOverride,
  showSheetTabs = true,
  showSheetIndicator = true,
  showZoom = false,
  showGridlines = true,
  showHeaders = true,
  maxWidth,
  maxHeight,
  onSheetChange,
  className,
  style,
}: EmbeddableSheetProps) {
  const metrics = useMemo(
    () => ({
      ...DEFAULT_METRICS,
      ...metricsOverride,
    }),
    [metricsOverride],
  );

  const sheetNames = useMemo(() => workbook.sheets.map((s) => s.name), [workbook.sheets]);

  const nav = useItemNavigation({
    totalItems: workbook.sheets.length,
    initialIndex: initialSheet,
    onItemChange: onSheetChange,
  });

  const [zoom, setZoom] = useState(initialZoom);

  const handleZoomIn = useCallback(() => {
    setZoom(getNextZoomValue(zoom, "in"));
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(getNextZoomValue(zoom, "out"));
  }, [zoom]);

  useViewerKeyboard(
    useMemo(
      () => ({
        goToNext: nav.goToNext,
        goToPrev: nav.goToPrev,
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
      }),
      [nav, handleZoomIn, handleZoomOut],
    ),
  );

  const currentSheet = workbook.sheets[nav.currentIndex];
  const currentSheetName = sheetNames[nav.currentIndex] ?? "";

  if (!currentSheet) {
    return null;
  }

  return (
    <EmbeddableContainer maxWidth={maxWidth} maxHeight={maxHeight} style={style} className={className}>
      <EmbeddableContent variant="grid">
        <ReadonlySheetGrid
          workbook={workbook}
          sheet={currentSheet}
          sheetIndex={nav.currentIndex}
          metrics={metrics}
          zoom={zoom}
          showGridlines={showGridlines}
          showHeaders={showHeaders}
        />
      </EmbeddableContent>

      {showSheetTabs && workbook.sheets.length > 1 && (
        <SheetTabViewer
          sheetNames={sheetNames}
          activeSheetIndex={nav.currentIndex}
          onSheetSelect={nav.goToIndex}
        />
      )}

      <EmbeddableFooter
        left={
          showSheetIndicator && (
            <PositionIndicator
              current={nav.currentNumber}
              total={nav.totalItems}
              label={currentSheetName}
              variant="minimal"
            />
          )
        }
        right={showZoom && <ZoomControls zoom={zoom} onZoomChange={setZoom} />}
      />
    </EmbeddableContainer>
  );
}
