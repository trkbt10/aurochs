/**
 * @file PdfPropertyPanel - Property panel for selected PDF elements
 *
 * Uses the same shared UI infrastructure as pptx-editor:
 * - react-editor-ui sections (PositionSection, SizeSection, PropertySection)
 * - editor-controls TextFormattingEditor / FillFormattingEditor / OutlineFormattingEditor
 * - editor-controls OptionalPropertySection pattern
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { PdfElement } from "@aurochs/pdf";
import { PositionSection } from "react-editor-ui/sections/PositionSection";
import { SizeSection } from "react-editor-ui/sections/SizeSection";
import { PropertySection } from "react-editor-ui/PropertySection";
import { FillFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { OutlineFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { FillFormatting, OutlineFormatting } from "@aurochs-ui/editor-controls/surface";
import { PDF_TEXT_FEATURES, pdfTextToFormatting, applyTextFormattingToPdfElement } from "./pdf-adapters";
import {
  pdfFillToFormatting,
  applyFillToGraphicsState,
  pdfStrokeToFormatting,
  applyStrokeToGraphicsState,
} from "./pdf-surface-adapters";
import type { PdfElementId, PdfElementBounds } from "./types";

// =============================================================================
// Types
// =============================================================================

export type PdfPropertyPanelProps = {
  readonly element: PdfElement | undefined;
  readonly elementId: PdfElementId | undefined;
  readonly bounds: PdfElementBounds | undefined;
  readonly pageHeight: number;
  readonly onUpdateElement?: (elementId: PdfElementId, updater: (el: PdfElement) => PdfElement) => void;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "0", fontSize: "12px" };
const emptyStyle: CSSProperties = { padding: "20px", textAlign: "center", color: "var(--text-tertiary, #737373)", fontSize: "13px" };

// =============================================================================
// Component
// =============================================================================

/** Property panel for a selected PDF element with editing support. */
export function PdfPropertyPanel({ element, elementId, bounds: svgBounds, pageHeight, onUpdateElement, style }: PdfPropertyPanelProps) {
  const canEdit = Boolean(elementId && onUpdateElement);

  const updateElement = useCallback(
    (updater: (el: PdfElement) => PdfElement) => {
      if (elementId && onUpdateElement) { onUpdateElement(elementId, updater); }
    },
    [elementId, onUpdateElement],
  );

  // ---- Position / Size handlers ----

  const handlePositionChange = useCallback(
    (data: { x: string; y: string }) => {
      const newX = parseFloat(data.x);
      const newY = parseFloat(data.y);
      if (Number.isNaN(newX) || Number.isNaN(newY)) { return; }
      updateElement((el) => {
        if (el.type === "text") { return { ...el, x: newX, y: pageHeight - newY - el.height }; }
        return el;
      });
    },
    [updateElement, pageHeight],
  );

  const handleSizeChange = useCallback(
    (data: { width: string; height: string }) => {
      const newW = parseFloat(data.width);
      const newH = parseFloat(data.height);
      if (Number.isNaN(newW) || Number.isNaN(newH) || newW <= 0 || newH <= 0) { return; }
      updateElement((el) => {
        if (el.type === "text") { return { ...el, width: newW, height: newH }; }
        return el;
      });
    },
    [updateElement],
  );

  // ---- Text formatting handler (delegates to shared adapter) ----

  const handleTextFormattingChange = useCallback(
    (update: Partial<TextFormatting>) => {
      updateElement((el) => applyTextFormattingToPdfElement(el, update));
    },
    [updateElement],
  );

  // ---- Fill / Stroke handlers (via shared adapters) ----

  const handleFillChange = useCallback(
    (fill: Partial<FillFormatting>) => {
      updateElement((el) => ({
        ...el,
        graphicsState: applyFillToGraphicsState(el.graphicsState, fill),
      }));
    },
    [updateElement],
  );

  const handleStrokeChange = useCallback(
    (outline: Partial<OutlineFormatting>) => {
      updateElement((el) => ({
        ...el,
        graphicsState: applyStrokeToGraphicsState(el.graphicsState, outline),
      }));
    },
    [updateElement],
  );

  if (!element || !svgBounds) {
    return (
      <div style={{ ...containerStyle, ...style }}>
        <div style={emptyStyle}>Select an element to view properties</div>
      </div>
    );
  }

  const fillFormatting = pdfFillToFormatting(element.graphicsState);
  const strokeFormatting = pdfStrokeToFormatting(element.graphicsState);

  return (
    <div style={{ ...containerStyle, ...style }}>
      {/* Position (react-editor-ui PositionSection) — all element types */}
      <PositionSection
        data={{ x: String(svgBounds.x.toFixed(1)), y: String(svgBounds.y.toFixed(1)) }}
        onChange={canEdit ? handlePositionChange : noop}
      />

      {/* Size (react-editor-ui SizeSection) — all element types */}
      <SizeSection
        data={{ width: String(svgBounds.width.toFixed(1)), height: String(svgBounds.height.toFixed(1)) }}
        onChange={canEdit ? handleSizeChange : noop}
      />

      {/* Rotation (read-only display, editing done via rotate handle) */}
      {svgBounds.rotation !== 0 && (
        <PropertySection title="Rotation" defaultExpanded>
          <div style={{ padding: "4px 12px", fontSize: 11 }}>{svgBounds.rotation.toFixed(1)}&deg;</div>
        </PropertySection>
      )}

      {/* Text formatting (shared TextFormattingEditor) */}
      {element.type === "text" && (
        <>
          <TextFormattingEditor
            value={pdfTextToFormatting(element)}
            onChange={canEdit ? handleTextFormattingChange : noop}
            disabled={!canEdit}
            features={PDF_TEXT_FEATURES}
          />
        </>
      )}

      {/* Image dimensions info */}
      {element.type === "image" && (
        <PropertySection title="Image" defaultExpanded>
          <div style={{ padding: "8px 0", fontSize: 11 }}>
            <div>Pixels: {element.width} x {element.height}</div>
          </div>
        </PropertySection>
      )}

      {/* Fill (shared FillFormattingEditor via OptionalPropertySection pattern) */}
      <OptionalPropertySection
        title="Fill"
        value={fillFormatting}
        createDefault={() => ({ type: "solid" as const, color: "#000000" })}
        onChange={canEdit ? handleFillChange : noop}
        renderEditor={(value, onChange) => (
          <FillFormattingEditor value={value} onChange={onChange} disabled={!canEdit} />
        )}
        defaultExpanded
      />

      {/* Stroke (shared OutlineFormattingEditor via OptionalPropertySection pattern) */}
      <OptionalPropertySection
        title="Stroke"
        value={strokeFormatting}
        createDefault={() => ({ width: 1, color: "#000000", style: "solid" as const })}
        onChange={canEdit ? handleStrokeChange : noop}
        renderEditor={(value, onChange) => (
          <OutlineFormattingEditor value={value} onChange={onChange} disabled={!canEdit} />
        )}
        defaultExpanded
      />
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/** No-op function for disabled handlers. */
function noop() {
  // intentionally empty
}
