/**
 * @file PdfMultiSelectPanel - Property panel for multi-selected elements
 *
 * Shows common properties (fill, stroke, text formatting, transform) for all selected elements.
 * Uses shared adapters from pdf-adapters.ts (SoT for color conversion and text formatting).
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { PdfDocument, PdfElement, PdfElementId } from "@aurochs/pdf";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { FillFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { OutlineFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { FillFormatting, OutlineFormatting } from "@aurochs-ui/editor-controls/surface";
import {
  pdfFillToFormatting,
  applyFillToGraphicsState,
  pdfStrokeToFormatting,
  applyStrokeToGraphicsState,
} from "./pdf-surface-adapters";
import { PDF_TEXT_FEATURES, pdfTextToFormatting, applyTextFormattingToPdfElement } from "./pdf-adapters";
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
// Styles
// =============================================================================

const containerStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "0", fontSize: "12px" };
const headerStyle: CSSProperties = { padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary, #666)", borderBottom: "1px solid var(--border-subtle, #e8e8e8)" };
const boundsGridStyle: CSSProperties = { padding: "4px 12px", fontSize: 11, display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px" };
const labelStyle: CSSProperties = { color: "var(--text-tertiary, #999)" };

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

// =============================================================================
// Component
// =============================================================================

/** Property panel for multi-selected PDF elements. */
export function PdfMultiSelectPanel({ document, selectedIds, pageHeight: _pageHeight, onUpdateElements, style }: PdfMultiSelectPanelProps) {
  const query = useMemo(() => createDocumentQuery(document), [document]);
  const elements = useMemo(
    () => selectedIds.map((id) => query.getElement(id)).filter((el): el is PdfElement => el !== undefined),
    [selectedIds, query],
  );

  const combinedBounds = useMemo(() => {
    // eslint-disable-next-line no-restricted-syntax -- accumulator updated in loop
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of selectedIds) {
      const b = query.getElementBounds(id);
      if (!b) { continue; }
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    return isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : undefined;
  }, [selectedIds, query]);

  const fillValue = useMemo(() => getMixedFill(elements), [elements]);
  const strokeValue = useMemo(() => getMixedStroke(elements), [elements]);
  const allText = elements.every((el) => el.type === "text");
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
    <div style={{ ...containerStyle, ...style }}>
      <div style={headerStyle}>{selectedIds.length} elements selected</div>

      {combinedBounds && (
        <OptionalPropertySection title="Transform" defaultExpanded>
          <div style={boundsGridStyle}>
            <span style={labelStyle}>X</span><span>{combinedBounds.x.toFixed(1)}</span>
            <span style={labelStyle}>Y</span><span>{combinedBounds.y.toFixed(1)}</span>
            <span style={labelStyle}>W</span><span>{combinedBounds.width.toFixed(1)}</span>
            <span style={labelStyle}>H</span><span>{combinedBounds.height.toFixed(1)}</span>
          </div>
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
        value={fillValue === "mixed" ? ({ type: "solid", color: "#000000" } as FillFormatting) : fillValue}
        createDefault={() => ({ type: "solid" as const, color: "#000000" })}
        onChange={handleFillChange}
        renderEditor={(value, onChange) => <FillFormattingEditor value={value} onChange={onChange} />}
        defaultExpanded
      />

      <OptionalPropertySection
        title="Stroke"
        value={strokeValue === "mixed" ? ({ width: 1, color: "#000000", style: "solid" } as OutlineFormatting) : strokeValue}
        createDefault={() => ({ width: 1, color: "#000000", style: "solid" as const })}
        onChange={handleStrokeChange}
        renderEditor={(value, onChange) => <OutlineFormattingEditor value={value} onChange={onChange} />}
        defaultExpanded
      />
    </div>
  );
}
