/**
 * @file Theme ↔ Document synchronization hook
 *
 * Bridges ThemeEditorContext and PresentationEditorContext:
 *
 * 1. Theme → Document: When theme state changes (colorContext, fontScheme, masterBackground),
 *    rebuilds the virtual PresentationDocument and dispatches SET_DOCUMENT.
 *
 * 2. Document → Theme: When shapes are edited via pptx-editor (move, resize, text edit),
 *    notifies the theme layer so changes can be persisted on export.
 */

import { useEffect, useRef } from "react";
import type { PresentationDocument, SlideId } from "@aurochs-office/pptx/app";
import type { Shape } from "@aurochs-office/pptx/domain";
import type { PresentationEditorAction } from "@aurochs-ui/pptx-editor";

// =============================================================================
// Types
// =============================================================================

export type ThemeDocumentSyncOptions = {
  /** Current virtual document (rebuilt from theme state) */
  readonly virtualDocument: PresentationDocument;
  /** Dispatch to PresentationEditorContext */
  readonly presentationDispatch: (action: PresentationEditorAction) => void;
  /** Current document from PresentationEditorContext (for reverse sync) */
  readonly currentDocument: PresentationDocument;
  /** Callback when shapes change in the active layout (for persistence/export) */
  readonly onLayoutShapesChange?: (layoutId: string, shapes: readonly Shape[]) => void;
  /** Currently active layout/slide ID */
  readonly activeSlideId: SlideId | undefined;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Synchronize theme state changes to PresentationEditorContext.
 *
 * When the virtualDocument reference changes (due to theme edits like
 * color scheme changes), dispatches SET_DOCUMENT to update the
 * pptx-editor's document state.
 *
 * Also watches for shape changes in the current document and notifies
 * the theme layer via onLayoutShapesChange.
 */
export function useThemeDocumentSync(options: ThemeDocumentSyncOptions): void {
  const { virtualDocument, presentationDispatch, currentDocument, onLayoutShapesChange, activeSlideId } = options;

  // Track the previous virtualDocument to detect theme-driven changes
  const prevVirtualDocRef = useRef(virtualDocument);

  // Theme → Document sync: dispatch SET_DOCUMENT when theme changes rebuild the virtual document
  useEffect(() => {
    if (virtualDocument !== prevVirtualDocRef.current) {
      prevVirtualDocRef.current = virtualDocument;
      presentationDispatch({ type: "SET_DOCUMENT", document: virtualDocument });
    }
  }, [virtualDocument, presentationDispatch]);

  // Document → Theme sync: notify when shapes change in the active layout
  const prevSlidesRef = useRef(currentDocument.slides);
  useEffect(() => {
    if (!onLayoutShapesChange || !activeSlideId) {
      prevSlidesRef.current = currentDocument.slides;
      return;
    }

    if (currentDocument.slides !== prevSlidesRef.current) {
      const activeSlide = currentDocument.slides.find((s) => s.id === activeSlideId);
      const prevActiveSlide = prevSlidesRef.current.find((s) => s.id === activeSlideId);

      if (activeSlide && activeSlide.slide.shapes !== prevActiveSlide?.slide.shapes) {
        onLayoutShapesChange(activeSlideId, activeSlide.slide.shapes);
      }
    }

    prevSlidesRef.current = currentDocument.slides;
  }, [currentDocument.slides, activeSlideId, onLayoutShapesChange]);
}
