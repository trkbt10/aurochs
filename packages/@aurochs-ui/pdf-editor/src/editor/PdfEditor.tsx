/**
 * @file PdfEditor - Interactive PDF editor
 *
 * Uses the same EditorShell layout as PresentationEditor (pptx-editor)
 * for consistent cross-format editor structure. Provides element selection,
 * drag-move, resize, text editing, property panel, and undo/redo.
 */

import React, { useCallback, useMemo, useReducer, useRef, useState } from "react";
import { TextEditInputFrame } from "@aurochs-ui/editor-controls/text-edit";
import { useTextComposition } from "@aurochs-ui/editor-controls/text-edit";
import { ZoomControls, type ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { Button } from "@aurochs-ui/ui-components/primitives";
import { UndoIcon, RedoIcon, DeleteIcon } from "@aurochs-ui/ui-components/icons";
import { ContextMenu } from "@aurochs-ui/ui-components/context-menu";
import type { MenuEntry } from "@aurochs-ui/ui-components/context-menu";
import { InspectorPanelWithTabs, type InspectorTab } from "@aurochs-ui/editor-controls/ui";
import type { PdfDocument, PdfElement, PdfText } from "@aurochs/pdf";
import { renderPdfPageToSvg, renderPdfElementToSvg } from "@aurochs-renderer/pdf/svg";
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

const RULER_THICKNESS = 20;

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

  const query = useMemo(() => createDocumentQuery(document), [document]);
  const currentPage = document.pages[state.currentPageIndex];

  const selectedElement = useMemo(() => {
    if (!state.selection.primaryId) return undefined;
    return query.getElement(state.selection.primaryId);
  }, [state.selection.primaryId, query]);

  // ---- Callbacks ----

  const handleSelect = useCallback(
    (elementId: PdfElementId, add: boolean) => dispatch({ type: "SELECT", elementId, addToSelection: add }),
    [],
  );
  const handleClearSelection = useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), []);

  const handleStartMove = useCallback(
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
      if (el?.type !== "text") return;
      const bounds = query.getElementBounds(elementId);
      if (!bounds) return;
      dispatch({ type: "START_TEXT_EDIT", elementId, text: el.text, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } });
    },
    [query],
  );

  // ---- Keyboard shortcuts (shared processShortcutHandlers pattern) ----

  usePdfKeyboardShortcuts(dispatch);

  // ---- Panels (same EditorPanel structure as PresentationEditor) ----

  const [rightTab, setRightTab] = useState("properties");

  const propertiesContent = state.selection.selectedIds.length > 1 ? (
    <PdfMultiSelectPanel
      document={document}
      selectedIds={state.selection.selectedIds}
      pageHeight={currentPage.height}
      onUpdateElements={handleUpdateSelectedElements}
    />
  ) : (
    <PdfPropertyPanel
      element={selectedElement}
      elementId={state.selection.primaryId}
      bounds={state.selection.primaryId ? query.getElementBounds(state.selection.primaryId) : undefined}
      pageHeight={currentPage.height}
      onUpdateElement={handleUpdateElement}
    />
  );

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
          onClearSelection={handleClearSelection}
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

  // ---- Text edit support (using shared TextEditInputFrame from editor-controls) ----

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [composition, setComposition] = useState({ isComposing: false, text: "", startOffset: 0 });
  const compositionHandlers = useTextComposition({ setComposition, initialCompositionState: { isComposing: false, text: "", startOffset: 0 } });

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      dispatch({ type: "UPDATE_TEXT_EDIT", text: e.target.value });
    },
    [],
  );

  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch({ type: "CANCEL_TEXT_EDIT" });
      } else if (e.key === "Enter" && !e.shiftKey && !composition.isComposing) {
        e.preventDefault();
        dispatch({ type: "COMMIT_TEXT_EDIT" });
      }
    },
    [composition.isComposing],
  );


  // ---- Content SVG (with editing element excluded) and overlay SVG ----

  const excludeSet = useMemo(() => {
    if (!state.textEdit.active) { return undefined; }
    return new Set([parseElementId(state.textEdit.elementId).elementIndex]);
  }, [state.textEdit]);

  const contentSvg = useMemo(() => {
    if (!currentPage) { return ""; }
    return renderPdfPageToSvg(currentPage, { excludeElementIndices: excludeSet });
  }, [currentPage, excludeSet]);

  const overlaySvg = useMemo(() => {
    if (!state.textEdit.active || !currentPage) { return undefined; }
    const el = query.getElement(state.textEdit.elementId);
    if (!el || el.type !== "text") { return undefined; }
    const liveElement: PdfText = { ...el, text: state.textEdit.text };
    return renderPdfElementToSvg(liveElement, currentPage.height);
  }, [state.textEdit, currentPage, query]);

  const textEditFont = useMemo(() => {
    if (!state.textEdit.active) return undefined;
    return query.getTextFontInfo(state.textEdit.elementId);
  }, [state.textEdit, query]);

  const textEditOverlayNode = state.textEdit.active ? (
    <TextEditInputFrame
      bounds={{ ...state.textEdit.bounds, rotation: 0 }}
      canvasWidth={currentPage.width}
      canvasHeight={currentPage.height}
      textareaRef={textareaRef}
      value={state.textEdit.text}
      onChange={handleTextChange}
      onKeyDown={handleTextKeyDown}
      onCompositionStart={compositionHandlers.handleCompositionStart}
      onCompositionUpdate={compositionHandlers.handleCompositionUpdate}
      onCompositionEnd={compositionHandlers.handleCompositionEnd}
      showFrameOutline
      showTextSelection
      textFont={textEditFont}
    >
      <div />
    </TextEditInputFrame>
  ) : undefined;

  // ---- Center content (CanvasArea, same as PresentationEditor) ----

  const centerContent = renderCenterContent();

  function renderCenterContent() {
    if (!currentPage) { return null; }
    return (
      <CanvasArea>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
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
          overlaySvg={overlaySvg}
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

  const toolbar = (
    <div style={{ display: "flex", alignItems: "center", padding: "0 8px", gap: "4px" }}>
      <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "UNDO" })} disabled={!canUndoNow} aria-label="Undo" title="Undo (⌘Z)">
        <UndoIcon size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "REDO" })} disabled={!canRedoNow} aria-label="Redo" title="Redo (⌘⇧Z)">
        <RedoIcon size={16} />
      </Button>
      <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border-subtle, #e0e0e0)", margin: "0 4px" }} />
      <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "DELETE_SELECTED" })} disabled={!hasSelection} aria-label="Delete" title="Delete">
        <DeleteIcon size={16} />
      </Button>
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

