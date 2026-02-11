/**
 * @file WorkbookViewer
 *
 * Full-featured workbook viewer with sheet tabs and navigation.
 */

import { useMemo, useState, useCallback, type CSSProperties, type ReactNode } from "react";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { ZoomControls, getNextZoomValue } from "@aurochs-ui/editor-controls/zoom";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  ViewerContainer,
  ViewerToolbar,
  ViewerFooter,
  PositionIndicator,
  useItemNavigation,
  useViewerKeyboard,
} from "@aurochs-ui/ui-components/viewer";
import { SheetTabViewer, ReadonlySheetGrid } from "./components";

export type WorkbookViewerProps = {
  /** The workbook to display */
  readonly workbook: XlsxWorkbook;
  /** Grid metrics configuration */
  readonly metrics?: {
    readonly rowCount?: number;
    readonly colCount?: number;
    readonly rowHeightPx?: number;
    readonly colWidthPx?: number;
    readonly rowHeaderWidthPx?: number;
    readonly colHeaderHeightPx?: number;
  };
  /** Initial sheet index (0-based, default: 0) */
  readonly initialSheet?: number;
  /** Initial zoom level (default: 1.0) */
  readonly initialZoom?: number;
  /** Show sheet tabs (default: true) */
  readonly showSheetTabs?: boolean;
  /** Show toolbar (default: true) */
  readonly showToolbar?: boolean;
  /** Show zoom controls (default: true) */
  readonly showZoom?: boolean;
  /** Show gridlines (default: true) */
  readonly showGridlines?: boolean;
  /** Show row/column headers (default: true) */
  readonly showHeaders?: boolean;
  /** Callback when sheet changes */
  readonly onSheetChange?: (sheetIndex: number) => void;
  /** Callback when zoom changes */
  readonly onZoomChange?: (zoom: number) => void;
  /** Callback when exiting viewer */
  readonly onExit?: () => void;
  /** Custom header content */
  readonly header?: ReactNode;
  /** Custom footer content */
  readonly footer?: ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Additional inline styles */
  readonly style?: CSSProperties;
};

const DEFAULT_METRICS = {
  rowCount: 100,
  colCount: 26,
  rowHeightPx: 24,
  colWidthPx: 80,
  rowHeaderWidthPx: 40,
  colHeaderHeightPx: 24,
};

const gridAreaStyle: CSSProperties = {
  flex: 1,
  overflow: "hidden",
  backgroundColor: colorTokens.background.tertiary,
};

/**
 * Full-featured workbook viewer with sheet tabs and navigation.
 */
export function WorkbookViewer({
  workbook,
  metrics: metricsOverride,
  initialSheet = 0,
  initialZoom = 1.0,
  showSheetTabs = true,
  showToolbar = true,
  showZoom = true,
  showGridlines = true,
  showHeaders = true,
  onSheetChange,
  onZoomChange,
  onExit,
  header,
  footer,
  className,
  style,
}: WorkbookViewerProps) {
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

  const handleZoomChange = useCallback(
    (next: number) => {
      setZoom(next);
      onZoomChange?.(next);
    },
    [onZoomChange],
  );

  const handleZoomIn = useCallback(() => {
    handleZoomChange(getNextZoomValue(zoom, "in"));
  }, [zoom, handleZoomChange]);

  const handleZoomOut = useCallback(() => {
    handleZoomChange(getNextZoomValue(zoom, "out"));
  }, [zoom, handleZoomChange]);

  useViewerKeyboard(
    useMemo(
      () => ({
        goToNext: nav.goToNext,
        goToPrev: nav.goToPrev,
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        onExit,
      }),
      [nav, handleZoomIn, handleZoomOut, onExit],
    ),
  );

  const currentSheet = workbook.sheets[nav.currentIndex];
  const currentSheetName = sheetNames[nav.currentIndex] ?? "";

  if (!currentSheet) {
    return null;
  }

  return (
    <ViewerContainer style={style} className={className}>
      {header}

      {showToolbar && (
        <ViewerToolbar
          left={
            <PositionIndicator
              current={nav.currentNumber}
              total={nav.totalItems}
              label={currentSheetName}
              variant="default"
            />
          }
          right={showZoom && <ZoomControls zoom={zoom} onZoomChange={handleZoomChange} />}
        />
      )}

      <div style={gridAreaStyle}>
        <ReadonlySheetGrid
          workbook={workbook}
          sheet={currentSheet}
          sheetIndex={nav.currentIndex}
          metrics={metrics}
          zoom={zoom}
          showGridlines={showGridlines}
          showHeaders={showHeaders}
        />
      </div>

      {showSheetTabs && (
        <SheetTabViewer
          sheetNames={sheetNames}
          activeSheetIndex={nav.currentIndex}
          onSheetSelect={nav.goToIndex}
        />
      )}

      {footer ?? (
        <ViewerFooter
          left={
            <span>
              {nav.totalItems} sheet{nav.totalItems !== 1 ? "s" : ""}
            </span>
          }
          right={<span>{Math.round(zoom * 100)}% | Ctrl+PageUp/Down to navigate sheets</span>}
        />
      )}
    </ViewerContainer>
  );
}
