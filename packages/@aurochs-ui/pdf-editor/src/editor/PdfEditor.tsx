/**
 * @file PdfEditor - Interactive PDF editor
 *
 * Uses the same EditorShell layout as PresentationEditor (pptx-editor)
 * for consistent cross-format editor structure. Provides element selection,
 * drag-move, resize, text editing, property panel, and undo/redo.
 */

import React, { useCallback, useMemo, useReducer, useState } from "react";
import { ZoomControls, type ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { UndoRedoGroup, DeleteDuplicateGroup, ToolbarPopoverButton, POPOVER_ICON_SIZE, POPOVER_STROKE_WIDTH } from "@aurochs-ui/editor-controls/toolbar";
import { ToolbarSeparator } from "@aurochs-ui/ui-components/primitives/ToolbarSeparator";
import { TypeIcon } from "@aurochs-ui/ui-components/icons";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import { pdfTextAdapter } from "./pdf-text-adapter";
import { ContextMenu } from "@aurochs-ui/ui-components/context-menu";
import type { MenuEntry } from "@aurochs-ui/ui-components/context-menu";
import { InspectorPanelWithTabs, type InspectorTab } from "@aurochs-ui/editor-controls/ui";
import type { PdfDocument, PdfElement } from "@aurochs/pdf";
import { renderPdfPageToSvg } from "@aurochs-renderer/pdf/svg";

import { canUndo, canRedo } from "@aurochs-ui/editor-core/history";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/drag-state";
import type { AlignmentType } from "@aurochs-ui/editor-core/alignment";
import { EditorShell, CanvasArea, type EditorPanel } from "@aurochs-ui/editor-controls/editor-shell";
import { PdfPageCanvas } from "./PdfPageCanvas";
import { pdfEditorReducer, createInitialState } from "./reducer";
import { usePdfKeyboardShortcuts } from "./use-keyboard-shortcuts";
import { PdfPropertyPanel } from "./PdfPropertyPanel";
import { PdfPageListPanel } from "./PdfPageListPanel";
import { PdfLayerPanel } from "./PdfLayerPanel";
import { PdfMultiSelectPanel } from "./PdfMultiSelectPanel";
import type { PdfElementId } from "./types";
import { parseElementId } from "./types";
import { createDocumentQuery } from "./pdf-document-query";
import { PdfTextEditController } from "./text-edit";

const _RULER_THICKNESS = 20;

// =============================================================================
// Types
// =============================================================================

export type PdfEditorProps = {
  readonly document: PdfDocument;
  readonly className?: string;
};

// =============================================================================
// Component
// =============================================================================

/** Interactive PDF editor using shared EditorShell layout. */
export function PdfEditor({ document: initialDocument, className }: PdfEditorProps) {
  const [state, dispatch] = useReducer(pdfEditorReducer, initialDocument, createInitialState);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [displayZoom, setDisplayZoom] = useState(1);
  const document = state.documentHistory.present;

  const handlePageSelect = useCallback(
    (pageIndex: number) => dispatch({ type: "SET_PAGE", pageIndex }),
    [],
  );

  const handleAddPage = useCallback(
    (gapIndex: number) => {
      // ItemList gap index: 0 = before first, N = after Nth
      // Reducer ADD_PAGE afterIndex: page after which to insert (-1 = insert at start)
      dispatch({ type: "ADD_PAGE", afterIndex: gapIndex - 1 });
    },
    [],
  );

  const handleDeletePages = useCallback(
    (pageIndices: readonly number[]) => dispatch({ type: "DELETE_PAGES", pageIndices }),
    [],
  );

  const handleDuplicatePages = useCallback(
    (pageIndices: readonly number[]) => dispatch({ type: "DUPLICATE_PAGES", pageIndices }),
    [],
  );

  const handleMovePages = useCallback(
    (pageIndices: readonly number[], toIndex: number) => dispatch({ type: "REORDER_PAGES", pageIndices, toIndex }),
    [],
  );

  const query = useMemo(() => createDocumentQuery(document), [document]);
  const currentPage = document.pages[state.currentPageIndex];

  const selectedElement = useMemo(() => {
    if (!state.selection.primaryId) { return undefined; }
    return query.getElement(state.selection.primaryId);
  }, [state.selection.primaryId, query]);

  // ---- Callbacks ----

  const handleSelect = useCallback(
    (elementId: PdfElementId, add: boolean) => dispatch({ type: "SELECT", elementId, addToSelection: add }),
    [],
  );
  const handleClearSelection = useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), []);

  const handleStartMove = useCallback(
    // eslint-disable-next-line custom/max-params -- matches EditorCanvas callback signature
    (startX: number, startY: number, clientX: number, clientY: number) => dispatch({ type: "START_PENDING_MOVE", startX, startY, startClientX: clientX, startClientY: clientY }),
    [],
  );
  const handleConfirmMove = useCallback(
    (clientX: number, clientY: number) => dispatch({ type: "CONFIRM_MOVE", clientX, clientY }),
    [],
  );
  const handleUpdateMove = useCallback(
    (currentX: number, currentY: number) => dispatch({ type: "UPDATE_MOVE", currentX, currentY }),
    [],
  );
  const handleEndMove = useCallback(() => dispatch({ type: "END_MOVE" }), []);

  const handleStartResize = useCallback(
    (handle: ResizeHandlePosition, startX: number, startY: number) => dispatch({ type: "START_RESIZE", handle, startX, startY }),
    [],
  );
  const handleUpdateResize = useCallback(
    (currentX: number, currentY: number) => dispatch({ type: "UPDATE_RESIZE", currentX, currentY }),
    [],
  );
  const handleEndResize = useCallback(() => dispatch({ type: "END_RESIZE" }), []);

  const handleStartRotate = useCallback(
    (startX: number, startY: number) => dispatch({ type: "START_ROTATE", startX, startY }),
    [],
  );
  const handleUpdateRotate = useCallback(
    (currentX: number, currentY: number) => dispatch({ type: "UPDATE_ROTATE", currentX, currentY }),
    [],
  );
  const handleEndRotate = useCallback(() => dispatch({ type: "END_ROTATE" }), []);

  const handleSelectMultiple = useCallback(
    (elementIds: readonly PdfElementId[]) => dispatch({ type: "SELECT_MULTIPLE", elementIds }),
    [],
  );

  const handleCancelTextEdit = useCallback(() => dispatch({ type: "CANCEL_TEXT_EDIT" }), []);

  const handleUpdateElement = useCallback(
    (elementId: PdfElementId, updater: (el: PdfElement) => PdfElement) => dispatch({ type: "UPDATE_ELEMENT", elementId, updater }),
    [],
  );

  const handleUpdateSelectedElements = useCallback(
    (updater: (el: PdfElement) => PdfElement) => {
      for (const id of state.selection.selectedIds) {
        dispatch({ type: "UPDATE_ELEMENT", elementId: id, updater });
      }
    },
    [state.selection.selectedIds],
  );

  const handleDoubleClick = useCallback(
    (elementId: PdfElementId) => {
      const el = query.getElement(elementId);
      if (el?.type !== "text") { return; }
      const bounds = query.getElementBounds(elementId);
      if (!bounds) { return; }
      dispatch({ type: "START_TEXT_EDIT", elementId, text: el.text, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
    },
    [query],
  );

  // ---- Keyboard shortcuts (shared processShortcutHandlers pattern) ----

  usePdfKeyboardShortcuts(dispatch);

  // ---- Panels (same EditorPanel structure as PresentationEditor) ----

  const [rightTab, setRightTab] = useState("properties");

  const pageWidth = currentPage?.width ?? 612;
  const pageHeight = currentPage?.height ?? 792;

  const handlePageSizeChange = useCallback(
    (width: number, height: number) => dispatch({ type: "UPDATE_PAGE_SIZE", pageIndex: state.currentPageIndex, width, height }),
    [state.currentPageIndex],
  );

  const propertiesContent = renderPropertiesContent();

  function renderPropertiesContent() {
    if (state.selection.selectedIds.length > 1) {
      return (
        <PdfMultiSelectPanel
          document={document}
          selectedIds={state.selection.selectedIds}
          pageHeight={pageHeight}
          onUpdateElements={handleUpdateSelectedElements}
        />
      );
    }
    return (
      <PdfPropertyPanel
        element={selectedElement}
        elementId={state.selection.primaryId}
        bounds={state.selection.primaryId ? query.getElementBounds(state.selection.primaryId) : undefined}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        onUpdateElement={handleUpdateElement}
        onPageSizeChange={handlePageSizeChange}
      />
    );
  }

  const inspectorTabs: InspectorTab[] = useMemo(() => [
    { id: "properties", label: "Properties", content: propertiesContent },
    {
      id: "layers",
      label: "Layers",
      content: (
        <PdfLayerPanel
          page={currentPage}
          pageIndex={state.currentPageIndex}
          selectedElementIds={state.selection.selectedIds}
          onSelect={handleSelect}
        />
      ),
    },
  ], [propertiesContent, currentPage, state.currentPageIndex, state.selection.selectedIds, handleSelect, handleClearSelection]);

  const rightPanelContent = (
    <InspectorPanelWithTabs
      tabs={inspectorTabs}
      activeTabId={rightTab}
      onActiveTabChange={setRightTab}
    />
  );

  const panels: EditorPanel[] = [
    {
      id: "pages",
      position: "left",
      scrollable: true,
      drawerLabel: "Pages",
      content: (
        <PdfPageListPanel
          pages={document.pages}
          currentPageIndex={state.currentPageIndex}
          onPageSelect={handlePageSelect}
          onAddPage={handleAddPage}
          onDeletePages={handleDeletePages}
          onDuplicatePages={handleDuplicatePages}
          onMovePages={handleMovePages}
        />
      ),
    },
    {
      id: "right",
      position: "right",
      size: "280px",
      scrollable: false,
      drawerLabel: "Inspector",
      content: rightPanelContent,
    },
  ];

  // ---- Context menu ----

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | undefined>(undefined);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (state.selection.selectedIds.length > 0) {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }
    },
    [state.selection.selectedIds.length],
  );

  const hasMultiSelect = state.selection.selectedIds.length >= 2;
  const contextMenuItems: readonly MenuEntry[] = useMemo(() => {
    const items: MenuEntry[] = [
      { id: "copy", label: "Copy", shortcut: "⌘C" },
      { id: "cut", label: "Cut", shortcut: "⌘X" },
      { id: "paste", label: "Paste", shortcut: "⌘V", disabled: !state.clipboard },
      { id: "duplicate", label: "Duplicate", shortcut: "⌘D" },
      { type: "separator" as const },
      { id: "delete", label: "Delete", shortcut: "⌫", danger: true },
    ];
    if (hasMultiSelect) {
      items.push(
        { type: "separator" as const },
        { type: "submenu" as const, id: "align", label: "Align", children: [
          { id: "align:left", label: "Align Left" },
          { id: "align:center", label: "Align Center" },
          { id: "align:right", label: "Align Right" },
          { type: "separator" as const },
          { id: "align:top", label: "Align Top" },
          { id: "align:middle", label: "Align Middle" },
          { id: "align:bottom", label: "Align Bottom" },
          { type: "separator" as const },
          { id: "align:distributeH", label: "Distribute Horizontally", disabled: state.selection.selectedIds.length < 3 },
          { id: "align:distributeV", label: "Distribute Vertically", disabled: state.selection.selectedIds.length < 3 },
        ]},
      );
    }
    return items;
  }, [state.clipboard, hasMultiSelect, state.selection.selectedIds.length]);

  const handleContextMenuAction = useCallback(
    (actionId: string) => {
      setContextMenu(undefined);
      if (actionId.startsWith("align:")) {
        dispatch({ type: "ALIGN", alignment: actionId.slice(6) as AlignmentType });
        return;
      }
      switch (actionId) {
        case "copy": dispatch({ type: "COPY" }); break;
        case "cut": dispatch({ type: "CUT" }); break;
        case "paste": dispatch({ type: "PASTE" }); break;
        case "duplicate": dispatch({ type: "DUPLICATE" }); break;
        case "delete": dispatch({ type: "DELETE_SELECTED" }); break;
      }
    },
    [],
  );

  const handleContextMenuClose = useCallback(() => setContextMenu(undefined), []);

  // ---- Content SVG (with editing element excluded) ----

  const excludeSet = useMemo(() => {
    if (!state.textEdit.active) { return undefined; }
    return new Set([parseElementId(state.textEdit.elementId).elementIndex]);
  }, [state.textEdit]);

  const contentSvg = useMemo(() => {
    if (!currentPage) { return ""; }
    return renderPdfPageToSvg(currentPage, { excludeElementIndices: excludeSet });
  }, [currentPage, excludeSet]);

  // ---- Text edit controller (PPTX-style: SVG text + cursor + selection in one component) ----
  // Delegates text rendering to renderPdfElementToSvg (same SoT as contentSvg)
  // to guarantee font/position parity between editing and display.

  const textEditElement = useMemo(() => {
    if (!state.textEdit.active) { return undefined; }
    const el = query.getElement(state.textEdit.elementId);
    if (!el || el.type !== "text") { return undefined; }
    return el;
  }, [state.textEdit, query]);

  const textEditOverlayNode = renderTextEditOverlay();

  function renderTextEditOverlay() {
    if (!state.textEdit.active || !currentPage || !textEditElement) { return undefined; }
    return (
      <PdfTextEditController
        bounds={{ ...state.textEdit.bounds, rotation: 0 }}
        element={textEditElement}
        pageHeight={currentPage.height}
        canvasWidth={currentPage.width}
        canvasHeight={currentPage.height}
        onComplete={(text) => dispatch({ type: "COMMIT_TEXT_EDIT", text })}
        onCancel={() => dispatch({ type: "CANCEL_TEXT_EDIT" })}
      />
    );
  }

  // ---- Center content (CanvasArea, same as PresentationEditor) ----

  const centerContent = renderCenterContent();

  function renderCenterContent() {
    if (!currentPage) { return null; }
    return (
      <CanvasArea>
        <div onContextMenu={handleContextMenu} style={{ display: "contents" }}>
        <PdfPageCanvas
          page={currentPage}
          pageIndex={state.currentPageIndex}
          selection={state.selection}
          drag={state.drag}
          zoomMode={zoomMode}
          onZoomModeChange={setZoomMode}
          onDisplayZoomChange={setDisplayZoom}
          showRulers
          contentSvg={contentSvg}
          viewportOverlay={textEditOverlayNode}
          isTextEditing={state.textEdit.active}
          onSelect={handleSelect}
          onClearSelection={handleClearSelection}
          onSelectMultiple={handleSelectMultiple}
          onStartMove={handleStartMove}
          onConfirmMove={handleConfirmMove}
          onUpdateMove={handleUpdateMove}
          onEndMove={handleEndMove}
          onStartResize={handleStartResize}
          onUpdateResize={handleUpdateResize}
          onEndResize={handleEndResize}
          onStartRotate={handleStartRotate}
          onUpdateRotate={handleUpdateRotate}
          onEndRotate={handleEndRotate}
          onDoubleClick={handleDoubleClick}
          onCancelTextEdit={handleCancelTextEdit}
        />
        </div>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenuItems}
            onAction={handleContextMenuAction}
            onClose={handleContextMenuClose}
          />
        )}
      </CanvasArea>
    );
  }

  // ---- Render: same EditorShell structure as PresentationEditor ----

  const canUndoNow = canUndo(state.documentHistory);
  const canRedoNow = canRedo(state.documentHistory);
  const hasSelection = state.selection.selectedIds.length > 0;

  // Text formatting for selected text element
  const isTextElement = selectedElement?.type === "text";
  const textFormatting = useMemo<TextFormatting>(
    () => (isTextElement ? pdfTextAdapter.toGeneric(selectedElement) : {}),
    [isTextElement, selectedElement],
  );

  const handleTextFormattingChange = useCallback(
    (update: Partial<TextFormatting>) => {
      if (!state.selection.primaryId || !isTextElement) {
        return;
      }
      const elementId = state.selection.primaryId;
      dispatch({
        type: "UPDATE_ELEMENT",
        elementId,
        updater: (el) => {
          if (el.type !== "text") {
            return el;
          }
          return pdfTextAdapter.applyUpdate(el, update);
        },
      });
    },
    [state.selection.primaryId, isTextElement],
  );

  const toolbar = (
    <div style={{ display: "flex", alignItems: "center", padding: "0 8px", gap: "4px" }}>
      <UndoRedoGroup
        canUndo={canUndoNow}
        canRedo={canRedoNow}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
      />
      <ToolbarSeparator />
      <DeleteDuplicateGroup
        onDelete={() => dispatch({ type: "DELETE_SELECTED" })}
        disabled={!hasSelection}
      />
      <ToolbarSeparator />
      <ToolbarPopoverButton
        icon={<TypeIcon size={POPOVER_ICON_SIZE} strokeWidth={POPOVER_STROKE_WIDTH} />}
        label="Text formatting"
        disabled={!isTextElement}
        panelWidth={280}
      >
        <TextFormattingEditor
          value={textFormatting}
          onChange={handleTextFormattingChange}
          disabled={!isTextElement}
          features={{
            showFontFamily: true,
            showFontSize: true,
            showBold: false,
            showItalic: false,
            showUnderline: false,
            showStrikethrough: false,
            showTextColor: true,
          }}
        />
      </ToolbarPopoverButton>
      <div style={{ flex: 1 }} />
      <ZoomControls
        zoom={displayZoom}
        onZoomChange={(z) => setZoomMode(z)}
        includeFit
        fitMode={zoomMode === "fit"}
        onFitModeChange={(fit) => setZoomMode(fit ? "fit" : displayZoom)}
      />
    </div>
  );

  return (
    <EditorShell
      toolbar={toolbar}
      panels={panels}
      className={className}
    >
      {centerContent}
    </EditorShell>
  );
}

