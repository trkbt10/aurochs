/**
 * @file PdfMultiSelectPanel - Property panel for multi-selected elements
 *
 * Shows common properties (fill, stroke, text formatting, transform) for all selected elements.
 * Uses shared adapters from pdf-adapters.ts (SoT for color conversion and text formatting).
 * Follows the same SelectionHeader + OptionalPropertySection pattern as pptx-editor MultiSelectPanel.
 */

import { memo, useCallback, useMemo, type CSSProperties } from "react";
import type { PdfDocument, PdfElement, PdfElementId } from "@aurochs/pdf";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { FillFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { OutlineFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { FillFormatting, OutlineFormatting } from "@aurochs-ui/editor-controls/surface";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import { PositionSection } from "react-editor-ui/sections/PositionSection";
import { SizeSection } from "react-editor-ui/sections/SizeSection";
import {
  pdfFillToFormatting,
  applyFillToGraphicsState,
  pdfStrokeToFormatting,
  applyStrokeToGraphicsState,
} from "../../modules/formatting-context/pdf-surface-adapters";
import { PDF_TEXT_FEATURES, pdfTextToFormatting, applyTextFormattingToPdfElement } from "../../modules/formatting-context/pdf-adapters";
import { createDocumentQuery } from "@aurochs-renderer/pdf/svg";

// =============================================================================
// Types
// =============================================================================

export type PdfMultiSelectPanelProps = {
  readonly document: PdfDocument;
  readonly selectedIds: readonly PdfElementId[];
  readonly pageHeight: number;
  readonly onUpdateElements: (updater: (el: PdfElement) => PdfElement) => void;
  readonly style?: CSSProperties;
};

// =============================================================================
// Constants
// =============================================================================

/** Default color for newly created fill/stroke (PDF black) */
const DEFAULT_ELEMENT_COLOR = "#000000";

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Header showing selection count (same pattern as pptx-editor SelectionHeader).
 */
function SelectionHeader({ count }: { readonly count: number }) {
  const headerStyle: CSSProperties = {
    padding: `${spacingTokens.md} ${spacingTokens.lg}`,
    borderBottom: `1px solid ${colorTokens.border.primary}`,
    fontSize: fontTokens.size.lg,
    color: colorTokens.text.primary,
  };

  return (
    <div style={headerStyle}>
      <strong>{count} elements selected</strong>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getMixedFill(elements: readonly PdfElement[]): FillFormatting | "mixed" {
  if (elements.length === 0) { return { type: "none" }; }
  const first = pdfFillToFormatting(elements[0].graphicsState);
  for (const element of elements.slice(1)) {
    const current = pdfFillToFormatting(element.graphicsState);
    if (current.type !== first.type || (current.type === "solid" && first.type === "solid" && current.color !== first.color)) { return "mixed"; }
  }
  return first;
}

function getMixedStroke(elements: readonly PdfElement[]): OutlineFormatting | "mixed" {
  if (elements.length === 0) { return {}; }
  const first = pdfStrokeToFormatting(elements[0].graphicsState);
  for (const element of elements.slice(1)) {
    const current = pdfStrokeToFormatting(element.graphicsState);
    if (current.color !== first.color || current.width !== first.width || current.style !== first.style) { return "mixed"; }
  }
  return first;
}

/** No-op function for read-only handlers. */
function noop() {
  // intentionally empty
}

// =============================================================================
// Component
// =============================================================================

/** Property panel for multi-selected PDF elements. */
export const PdfMultiSelectPanel = memo(function PdfMultiSelectPanel({ document, selectedIds, pageHeight: _pageHeight, onUpdateElements, style }: PdfMultiSelectPanelProps) {
  const query = useMemo(() => createDocumentQuery(document), [document]);
  const elements = useMemo(
    () => selectedIds.map((id) => query.getElement(id)).filter((el): el is PdfElement => el !== undefined),
    [selectedIds, query],
  );

  const combinedBounds = useMemo(() => {
    const bounds = selectedIds
      .map((id) => query.getElementBounds(id))
      .filter((b): b is NonNullable<typeof b> => b !== undefined);
    if (bounds.length === 0) return undefined;
    const minX = Math.min(...bounds.map((b) => b.x));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxX = Math.max(...bounds.map((b) => b.x + b.width));
    const maxY = Math.max(...bounds.map((b) => b.y + b.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [selectedIds, query]);

  const fillValue = useMemo(() => getMixedFill(elements), [elements]);
  const strokeValue = useMemo(() => getMixedStroke(elements), [elements]);
  const allText = elements.every((el) => el.type === "text" || el.type === "textBlock");
  const mixedTextFormatting = useMemo(
    (): TextFormatting => (allText && elements.length > 0 ? pdfTextToFormatting(elements[0]) : {}),
    [allText, elements],
  );

  const handleTextFormattingChange = useCallback(
    (update: Partial<TextFormatting>) => {
      onUpdateElements((el) => applyTextFormattingToPdfElement(el, update));
    },
    [onUpdateElements],
  );

  const handleFillChange = useCallback(
    (fill: Partial<FillFormatting>) => {
      onUpdateElements((el) => ({ ...el, graphicsState: applyFillToGraphicsState(el.graphicsState, fill) }));
    },
    [onUpdateElements],
  );

  const handleStrokeChange = useCallback(
    (outline: Partial<OutlineFormatting>) => {
      onUpdateElements((el) => ({ ...el, graphicsState: applyStrokeToGraphicsState(el.graphicsState, outline) }));
    },
    [onUpdateElements],
  );

  return (
    <div style={style}>
      <SelectionHeader count={selectedIds.length} />

      {combinedBounds && (
        <OptionalPropertySection title="Transform" defaultExpanded>
          <PositionSection
            data={{ x: combinedBounds.x.toFixed(1), y: combinedBounds.y.toFixed(1) }}
            onChange={noop}
          />
          <SizeSection
            data={{ width: combinedBounds.width.toFixed(1), height: combinedBounds.height.toFixed(1) }}
            onChange={noop}
          />
        </OptionalPropertySection>
      )}

      {allText && (
        <TextFormattingEditor
          value={mixedTextFormatting}
          onChange={handleTextFormattingChange}
          features={PDF_TEXT_FEATURES}
        />
      )}

      <OptionalPropertySection
        title="Fill"
        value={fillValue === "mixed" ? ({ type: "solid", color: DEFAULT_ELEMENT_COLOR } as FillFormatting) : fillValue}
        createDefault={() => ({ type: "solid" as const, color: DEFAULT_ELEMENT_COLOR })}
        onChange={handleFillChange}
        renderEditor={(value, onChange) => <FillFormattingEditor value={value} onChange={onChange} />}
        defaultExpanded
      />

      <OptionalPropertySection
        title="Stroke"
        value={strokeValue === "mixed" ? ({ width: 1, color: DEFAULT_ELEMENT_COLOR, style: "solid" } as OutlineFormatting) : strokeValue}
        createDefault={() => ({ width: 1, color: DEFAULT_ELEMENT_COLOR, style: "solid" as const })}
        onChange={handleStrokeChange}
        renderEditor={(value, onChange) => <OutlineFormattingEditor value={value} onChange={onChange} />}
        defaultExpanded
      />
    </div>
  );
});
