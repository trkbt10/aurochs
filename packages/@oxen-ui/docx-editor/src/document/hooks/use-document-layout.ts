/**
 * @file Document Layout Hook
 *
 * React hook for computing and caching document layout.
 * Handles paragraph layout and page flow for DOCX documents.
 */

import { useMemo } from "react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxSectionProperties } from "@oxen/docx/domain/section";
import type { DocxNumbering } from "@oxen/docx/domain/numbering";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px } from "@oxen/ooxml/domain/units";
import type {
  LayoutParagraphResult,
  LayoutParagraphInput,
  PagedLayoutResult,
  PageFlowConfig,
  PageBreakHint,
} from "@oxen/text-layout";
import {
  layoutDocument,
  paragraphsToLayoutInputs,
  extractFloatingImages,
  flowIntoPages,
  createSinglePageLayout,
  DEFAULT_PAGE_FLOW_CONFIG,
} from "@oxen/text-layout";
import {
  sectionPropertiesToPageConfig,
  getSectionContentWidth,
} from "@oxen/text-layout";

// =============================================================================
// Types
// =============================================================================

export type DocumentLayoutMode = "paged" | "continuous";

export type UseDocumentLayoutOptions = {
  /** Paragraphs to layout */
  readonly paragraphs: readonly DocxParagraph[];
  /** Content width in pixels (without margins) - overrides sectPr if provided */
  readonly contentWidth?: Pixels;
  /** Layout mode */
  readonly mode?: DocumentLayoutMode;
  /** Page configuration (for paged mode) - overrides sectPr if provided */
  readonly pageConfig?: PageFlowConfig;
  /** Section properties from the document - used to derive page config */
  readonly sectPr?: DocxSectionProperties;
  /** Numbering definitions from the document - for list rendering */
  readonly numbering?: DocxNumbering;
};

export type DocumentLayoutResult = {
  /** Paged layout result */
  readonly pagedLayout: PagedLayoutResult;
  /** Flat layout result (all paragraphs) */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Total document height */
  readonly totalHeight: Pixels;
  /** Layout inputs (for cursor/selection calculations) */
  readonly layoutInputs: readonly LayoutParagraphInput[];
};

// =============================================================================
// Page Break Hint Extraction
// =============================================================================

/**
 * Extract page break hints from DOCX paragraphs.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.25 (pageBreakBefore)
 * @see ECMA-376-1:2016 Section 17.3.1.14 (keepNext)
 * @see ECMA-376-1:2016 Section 17.3.1.15 (keepLines)
 * @see ECMA-376-1:2016 Section 17.6.22 (sectPr type)
 */
function extractPageBreakHints(
  paragraphs: readonly DocxParagraph[],
): readonly (PageBreakHint | undefined)[] {
  return paragraphs.map((para) => {
    const props = para.properties;
    if (props === undefined) {
      return undefined;
    }

    // Check for section break in paragraph (last paragraph of a section)
    const sectionBreakAfter = props.sectPr?.type;

    const hasHint =
      props.pageBreakBefore === true ||
      props.keepNext === true ||
      props.keepLines === true ||
      props.widowControl !== undefined ||
      sectionBreakAfter !== undefined;

    if (!hasHint) {
      return undefined;
    }

    return {
      breakBefore: props.pageBreakBefore,
      keepWithNext: props.keepNext,
      keepTogether: props.keepLines,
      widowControl: props.widowControl,
      sectionBreakAfter,
    };
  });
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for computing document layout.
 *
 * Page configuration is determined in this order:
 * 1. Explicit pageConfig parameter (highest priority)
 * 2. sectPr from the document
 * 3. DEFAULT_PAGE_FLOW_CONFIG (ECMA-376 specification defaults)
 */
export function useDocumentLayout({
  paragraphs,
  contentWidth: explicitContentWidth,
  mode = "paged",
  pageConfig: explicitPageConfig,
  sectPr,
  numbering,
}: UseDocumentLayoutOptions): DocumentLayoutResult {
  // Derive page configuration from sectPr or use defaults
  const pageConfig = useMemo(() => {
    if (explicitPageConfig !== undefined) {
      return explicitPageConfig;
    }
    if (sectPr !== undefined) {
      return sectionPropertiesToPageConfig(sectPr);
    }
    return DEFAULT_PAGE_FLOW_CONFIG;
  }, [explicitPageConfig, sectPr]);

  // Calculate content width from page config or explicit value
  const contentWidth = useMemo(() => {
    if (explicitContentWidth !== undefined) {
      return explicitContentWidth;
    }
    return px(
      (pageConfig.pageWidth as number) -
      (pageConfig.marginLeft as number) -
      (pageConfig.marginRight as number)
    );
  }, [explicitContentWidth, pageConfig]);

  // Convert DOCX paragraphs to layout inputs
  const layoutInputs = useMemo(() => {
    return paragraphsToLayoutInputs(paragraphs, numbering);
  }, [paragraphs, numbering]);

  // Compute paragraph layouts
  const { paragraphs: layoutedParagraphs, totalHeight } = useMemo(() => {
    return layoutDocument(layoutInputs, contentWidth);
  }, [layoutInputs, contentWidth]);

  // Extract page break hints from paragraphs
  const pageBreakHints = useMemo(() => {
    return extractPageBreakHints(paragraphs);
  }, [paragraphs]);

  // Extract floating images from paragraphs
  const floatingImages = useMemo(() => {
    return extractFloatingImages(paragraphs);
  }, [paragraphs]);

  // Compute paged layout
  const pagedLayout = useMemo(() => {
    if (mode === "continuous") {
      // Single page mode - no pagination, pass config for vertical mode support
      return createSinglePageLayout(layoutedParagraphs, contentWidth, totalHeight, pageConfig);
    }

    // Paged mode - split into pages with page break hints and floating images
    return flowIntoPages({
      paragraphs: layoutedParagraphs,
      hints: pageBreakHints,
      config: pageConfig,
      floatingImages,
    });
  }, [layoutedParagraphs, pageBreakHints, mode, pageConfig, contentWidth, totalHeight, floatingImages]);

  return {
    pagedLayout,
    paragraphs: layoutedParagraphs,
    totalHeight,
    layoutInputs,
  };
}

// =============================================================================
// Memoization Helpers
// =============================================================================

/**
 * Create a stable key for paragraph array for caching.
 */
export function createParagraphKey(paragraphs: readonly DocxParagraph[]): string {
  // Simple implementation - could be enhanced with content hashing
  return paragraphs.length.toString();
}

/**
 * Check if paragraphs have changed significantly.
 */
export function haveParagraphsChanged(
  prev: readonly DocxParagraph[],
  next: readonly DocxParagraph[],
): boolean {
  if (prev.length !== next.length) {
    return true;
  }

  // Compare by reference (shallow)
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) {
      return true;
    }
  }

  return false;
}
