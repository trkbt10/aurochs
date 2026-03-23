/**
 * @file PdfPropertyPanel - Property panel for selected PDF elements
 *
 * Uses the same shared UI infrastructure as pptx-editor:
 * - react-editor-ui sections (PositionSection, SizeSection, PropertySection)
 * - editor-controls TextFormattingEditor / FillFormattingEditor / OutlineFormattingEditor
 * - editor-controls OptionalPropertySection pattern
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { fontTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { PdfElement, PdfTable, PdfElementId } from "@aurochs/pdf";
import type { PageSizeData } from "@aurochs-ui/editor-core/adapter-types";
import { PositionSection } from "react-editor-ui/sections/PositionSection";
import { SizeSection } from "react-editor-ui/sections/SizeSection";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { PageSizeEditor } from "@aurochs-ui/editor-controls/page";
import { FillFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { OutlineFormattingEditor } from "@aurochs-ui/editor-controls/surface";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { FillFormatting, OutlineFormatting } from "@aurochs-ui/editor-controls/surface";
import { PDF_TEXT_FEATURES, pdfTextToFormatting, applyTextFormattingToPdfElement } from "../../modules/formatting-context/pdf-adapters";
import {
  pdfFillToFormatting,
  applyFillToGraphicsState,
  pdfStrokeToFormatting,
  applyStrokeToGraphicsState,
} from "../../modules/formatting-context/pdf-surface-adapters";
import { PDF_PAGE_PRESETS, findMatchingPreset } from "../../modules/formatting-context/pdf-page-size-adapter";
import { TableCellGrid, TableDimensionEditor, TableStructureToolbar } from "@aurochs-ui/editor-controls/table";
import type { CellPosition } from "@aurochs-ui/editor-core/table-selection";
import { pdfTableOperationAdapter } from "../../modules/formatting-context/pdf-table-adapter";
import type { PdfElementBounds } from "@aurochs-renderer/pdf/svg";

// =============================================================================
// Types
// =============================================================================

export type PdfPropertyPanelProps = {
  readonly element: PdfElement | undefined;
  readonly elementId: PdfElementId | undefined;
  readonly bounds: PdfElementBounds | undefined;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly onUpdateElement?: (elementId: PdfElementId, updater: (el: PdfElement) => PdfElement) => void;
  readonly onPageSizeChange?: (width: number, height: number) => void;
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "0" };

/** Default color for newly created fill/stroke (PDF black) */
const DEFAULT_ELEMENT_COLOR = "#000000";

// =============================================================================
// Table Inspector Sub-component
// =============================================================================

type PdfTableInspectorProps = {
  readonly table: PdfTable;
  readonly elementId: PdfElementId;
  readonly onUpdateElement?: (elementId: PdfElementId, updater: (el: PdfElement) => PdfElement) => void;
  readonly disabled?: boolean;
};

function PdfTableInspector({ table, elementId, onUpdateElement, disabled }: PdfTableInspectorProps) {
  const [selectedCell, setSelectedCell] = useState<CellPosition | undefined>();
  const abstractTable = useMemo(() => pdfTableOperationAdapter.toAbstract(table), [table]);

  const updateTable = useCallback(
    (newTable: PdfTable) => {
      if (onUpdateElement) {
        onUpdateElement(elementId, () => newTable as PdfElement);
      }
    },
    [elementId, onUpdateElement],
  );

  const handleInsertRow = useCallback(
    (position: "above" | "below") => {
      if (!selectedCell) { return; }
      const rowIndex = position === "above" ? selectedCell.row : selectedCell.row + 1;
      updateTable(pdfTableOperationAdapter.insertRow(table, rowIndex));
    },
    [table, selectedCell, updateTable],
  );

  const handleRemoveRow = useCallback(() => {
    if (!selectedCell) { return; }
    updateTable(pdfTableOperationAdapter.removeRow(table, selectedCell.row));
  }, [table, selectedCell, updateTable]);

  const handleInsertColumn = useCallback(
    (position: "before" | "after") => {
      if (!selectedCell) { return; }
      const colIndex = position === "before" ? selectedCell.col : selectedCell.col + 1;
      updateTable(pdfTableOperationAdapter.insertColumn(table, colIndex));
    },
    [table, selectedCell, updateTable],
  );

  const handleRemoveColumn = useCallback(() => {
    if (!selectedCell) { return; }
    updateTable(pdfTableOperationAdapter.removeColumn(table, selectedCell.col));
  }, [table, selectedCell, updateTable]);

  const handleSplitCell = useCallback(() => {
    if (!selectedCell) { return; }
    updateTable(pdfTableOperationAdapter.splitCell(table, selectedCell.row, selectedCell.col));
  }, [table, selectedCell, updateTable]);

  const handleColumnWidthChange = useCallback(
    (colIndex: number, width: number) => {
      updateTable(pdfTableOperationAdapter.setColumnWidth(table, colIndex, width));
    },
    [table, updateTable],
  );

  const handleRowHeightChange = useCallback(
    (rowIndex: number, height: number) => {
      updateTable(pdfTableOperationAdapter.setRowHeight(table, rowIndex, height));
    },
    [table, updateTable],
  );

  return (
    <>
      <OptionalPropertySection title="Table Structure" defaultExpanded>
        <TableStructureToolbar
          onInsertRow={handleInsertRow}
          onRemoveRow={handleRemoveRow}
          onInsertColumn={handleInsertColumn}
          onRemoveColumn={handleRemoveColumn}
          onSplitCell={handleSplitCell}
          hasSelection={selectedCell !== undefined}
          disabled={disabled}
        />
      </OptionalPropertySection>

      <OptionalPropertySection title="Dimensions" defaultExpanded={false}>
        <TableDimensionEditor
          columns={abstractTable.columns}
          rows={abstractTable.rows}
          onColumnWidthChange={handleColumnWidthChange}
          onRowHeightChange={handleRowHeightChange}
          unitLabel="pt"
          disabled={disabled}
        />
      </OptionalPropertySection>

      <OptionalPropertySection title="Cells" defaultExpanded>
        <TableCellGrid
          table={abstractTable}
          selectedCell={selectedCell}
          onCellSelect={setSelectedCell}
          disabled={disabled}
        />
      </OptionalPropertySection>
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

/** Property panel for a selected PDF element with editing support. */
export function PdfPropertyPanel({ element, elementId, bounds: svgBounds, pageWidth, pageHeight, onUpdateElement, onPageSizeChange, style }: PdfPropertyPanelProps) {
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

  const handlePageSizeChange = useCallback(
    (data: PageSizeData) => {
      if (!onPageSizeChange) { return; }
      const preset = PDF_PAGE_PRESETS.find((p) => p.value === data.preset);
      const w = preset?.width ?? parseFloat(data.width);
      const h = preset?.height ?? parseFloat(data.height);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        onPageSizeChange(w, h);
      }
    },
    [onPageSizeChange],
  );

  if (!element || !svgBounds) {
    const pageSizeData: PageSizeData = {
      width: String(pageWidth),
      height: String(pageHeight),
      preset: findMatchingPreset(pageWidth, pageHeight),
    };

    return (
      <div style={{ ...containerStyle, ...style }}>
        <OptionalPropertySection title="Page Size" defaultExpanded>
          <PageSizeEditor
            data={pageSizeData}
            onChange={handlePageSizeChange}
            presets={PDF_PAGE_PRESETS}
            unitLabel="pt"
            disabled={!onPageSizeChange}
            min={1}
            max={14400}
            step={1}
          />
        </OptionalPropertySection>
      </div>
    );
  }

  const fillFormatting = pdfFillToFormatting(element.graphicsState);
  const strokeFormatting = pdfStrokeToFormatting(element.graphicsState);

  return (
    <div style={{ ...containerStyle, ...style }}>
      {/* Transform: position, size, rotation */}
      <OptionalPropertySection title="Transform" defaultExpanded>
        <PositionSection
          data={{ x: String(svgBounds.x.toFixed(1)), y: String(svgBounds.y.toFixed(1)) }}
          onChange={canEdit ? handlePositionChange : noop}
        />
        <SizeSection
          data={{ width: String(svgBounds.width.toFixed(1)), height: String(svgBounds.height.toFixed(1)) }}
          onChange={canEdit ? handleSizeChange : noop}
        />
        {svgBounds.rotation !== 0 && (
          <div style={{ fontSize: fontTokens.size.sm }}>Rotation: {svgBounds.rotation.toFixed(1)}&deg;</div>
        )}
      </OptionalPropertySection>

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
        <OptionalPropertySection title="Image" defaultExpanded>
          <div style={{ fontSize: fontTokens.size.sm }}>Pixels: {element.width} x {element.height}</div>
        </OptionalPropertySection>
      )}

      {/* Fill (shared FillFormattingEditor via OptionalPropertySection pattern) */}
      <OptionalPropertySection
        title="Fill"
        value={fillFormatting}
        createDefault={() => ({ type: "solid" as const, color: DEFAULT_ELEMENT_COLOR })}
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
        createDefault={() => ({ width: 1, color: DEFAULT_ELEMENT_COLOR, style: "solid" as const })}
        onChange={canEdit ? handleStrokeChange : noop}
        renderEditor={(value, onChange) => (
          <OutlineFormattingEditor value={value} onChange={onChange} disabled={!canEdit} />
        )}
        defaultExpanded
      />

      {/* Table editor (when element is a table) */}
      {element.type === "table" && (
        <PdfTableInspector
          table={element}
          elementId={elementId!}
          onUpdateElement={onUpdateElement}
          disabled={!canEdit}
        />
      )}
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
