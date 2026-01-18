/**
 * @file Document Text Overlay Component
 *
 * Renders text editing overlay for DOCX documents.
 * Uses a single SVG for all pages to enable unified pointer capture.
 */

import type { ReactNode, CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { forwardRef, useMemo } from "react";
import type { Pixels } from "../../ooxml/domain/units";
import type {
  LayoutResult,
  PagedLayoutResult,
  SelectionRect,
  CursorCoordinates,
} from "../../office-text-layout/types";
import { TextOverlay, CURSOR_ANIMATION_CSS } from "../../office-text-layout";
import { colorTokens, editorLayoutTokens } from "../../office-editor-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

type CursorState = {
  cursor: CursorCoordinates | undefined;
  selectionRects: readonly SelectionRect[];
};

export type DocumentTextOverlayProps = {
  /** Paged layout result from the layout engine */
  readonly pagedLayout: PagedLayoutResult;
  /** Cursor and selection state */
  readonly cursorState: CursorState;
  /** Whether the editor is focused */
  readonly isFocused?: boolean;
  /** Whether cursor should be visible */
  readonly showCursor?: boolean;
  /** Pointer down handler */
  readonly onPointerDown?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  /** Pointer move handler */
  readonly onPointerMove?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  /** Pointer up handler */
  readonly onPointerUp?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  /** Pointer cancel handler */
  readonly onPointerCancel?: (event: ReactPointerEvent<SVGSVGElement>) => void;
};

// =============================================================================
// Styles
// =============================================================================

const overlayContainerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: `${editorLayoutTokens.pageGap}px`,
  padding: `${editorLayoutTokens.pageGap}px`,
};

const svgStyle: CSSProperties = {
  display: "block",
  userSelect: "none",
  backgroundColor: "white",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  cursor: "text",
};

/** Default page width (A4 at 96 DPI) */
const DEFAULT_PAGE_WIDTH = 794;

/** Default page height (A4 at 96 DPI) */
const DEFAULT_PAGE_HEIGHT = 1123;

/**
 * Compute page width from pages array.
 */
function computePageWidth(pages: PagedLayoutResult["pages"]): number {
  if (pages.length === 0) {
    return DEFAULT_PAGE_WIDTH;
  }
  return pages[0].width as number;
}

/**
 * Compute final total height.
 */
function computeFinalHeight(
  accumulatedY: number,
  pageGap: number,
  pages: PagedLayoutResult["pages"],
): number {
  if (accumulatedY > 0) {
    return accumulatedY - pageGap;
  }
  if (pages.length > 0) {
    return pages[0].height as number;
  }
  return DEFAULT_PAGE_HEIGHT;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Document text overlay for multi-page DOCX editing.
 * Uses a single SVG to enable unified pointer capture across pages.
 */
export const DocumentTextOverlay = forwardRef<SVGSVGElement, DocumentTextOverlayProps>(
  function DocumentTextOverlay(
    {
      pagedLayout,
      cursorState,
      isFocused = false,
      showCursor = true,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    ref,
  ): ReactNode {
    const shouldShowCursor = showCursor && isFocused;

    // Calculate total SVG dimensions
    const { totalWidth, totalHeight, pageYOffsets } = useMemo(() => {
      const pageGap = editorLayoutTokens.pageGap;
      const accumulated = pagedLayout.pages.reduce<{ offsets: number[]; currentY: number }>(
        (acc, page) => ({
          offsets: [...acc.offsets, acc.currentY],
          currentY: acc.currentY + (page.height as number) + pageGap,
        }),
        { offsets: [], currentY: 0 },
      );

      const width = computePageWidth(pagedLayout.pages);
      const finalHeight = computeFinalHeight(accumulated.currentY, pageGap, pagedLayout.pages);

      return {
        totalWidth: width,
        totalHeight: finalHeight,
        pageYOffsets: accumulated.offsets,
      };
    }, [pagedLayout.pages]);

    // Convert paged layout to single layout result with adjusted Y positions
    const combinedLayoutResult: LayoutResult = useMemo(() => {
      const paragraphs: LayoutResult["paragraphs"][number][] = [];

      for (let pageIndex = 0; pageIndex < pagedLayout.pages.length; pageIndex++) {
        const page = pagedLayout.pages[pageIndex];
        const pageYOffset = pageYOffsets[pageIndex];

        for (const para of page.paragraphs) {
          // Adjust Y positions for combined SVG
          paragraphs.push({
            ...para,
            lines: para.lines.map((line) => ({
              ...line,
              y: ((line.y as number) + pageYOffset) as Pixels,
            })),
          });
        }
      }

      return {
        paragraphs,
        totalHeight: totalHeight as Pixels,
        yOffset: 0 as Pixels,
      };
    }, [pagedLayout.pages, pageYOffsets, totalHeight]);

    // Adjust selection rects for combined SVG
    const adjustedSelectionRects = useMemo(() => {
      // Selection rects from cursor-utils are already in page-relative coords
      // We need to adjust them for the combined SVG
      // However, since we're now using flat paragraph list, the Y coords are already correct
      return cursorState.selectionRects;
    }, [cursorState.selectionRects]);

    // Adjust cursor coords for combined SVG
    const adjustedCursor = useMemo(() => {
      return cursorState.cursor;
    }, [cursorState.cursor]);

    return (
      <div className="docx-text-overlay" style={overlayContainerStyle}>
        <style>{CURSOR_ANIMATION_CSS}</style>
        <svg
          ref={ref}
          width={totalWidth}
          height={totalHeight}
          style={svgStyle}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          preserveAspectRatio="xMinYMin meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {/* Transparent rect to capture pointer events */}
          <rect
            x={0}
            y={0}
            width={totalWidth}
            height={totalHeight}
            fill="transparent"
            pointerEvents="all"
          />

          {/* Page backgrounds */}
          {pagedLayout.pages.map((page, index) => (
            <rect
              key={`page-bg-${index}`}
              x={0}
              y={pageYOffsets[index]}
              width={page.width as number}
              height={page.height as number}
              fill="white"
              stroke="#e0e0e0"
              strokeWidth={1}
            />
          ))}

          {/* Selection highlights */}
          {adjustedSelectionRects.map((rect, index) => (
            <rect
              key={`sel-${index}`}
              x={rect.x as number}
              y={rect.y as number}
              width={rect.width as number}
              height={rect.height as number}
              fill={colorTokens.selection.primary}
              fillOpacity={0.3}
            />
          ))}

          {/* Rendered text */}
          <TextOverlay layoutResult={combinedLayoutResult} />

          {/* Cursor caret */}
          {shouldShowCursor && adjustedCursor && (
            <line
              className="cursor-caret"
              x1={adjustedCursor.x as number}
              y1={adjustedCursor.y as number}
              x2={adjustedCursor.x as number}
              y2={(adjustedCursor.y as number) + (adjustedCursor.height as number)}
              stroke="#000000"
              strokeWidth={1}
              style={{ animation: "cursor-blink 1s step-end infinite" }}
            />
          )}
        </svg>
      </div>
    );
  },
);

// =============================================================================
// Selection Highlight Component (exported for external use)
// =============================================================================

export type SelectionHighlightProps = {
  readonly rects: readonly SelectionRect[];
  readonly color?: string;
};

/**
 * Standalone selection highlight component.
 */
export function SelectionHighlight({
  rects,
  color = "rgba(59, 130, 246, 0.3)",
}: SelectionHighlightProps): ReactNode {
  if (rects.length === 0) {
    return null;
  }

  return (
    <g className="selection-highlights">
      {rects.map((rect, index) => (
        <rect
          key={index}
          x={rect.x as number}
          y={rect.y as number}
          width={rect.width as number}
          height={rect.height as number}
          fill={color}
        />
      ))}
    </g>
  );
}
