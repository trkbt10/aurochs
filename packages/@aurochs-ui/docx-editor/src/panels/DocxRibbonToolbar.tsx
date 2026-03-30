/**
 * @file DocxRibbonToolbar
 *
 * Ribbon menu toolbar for DOCX editor.
 * Covers all document editing operations organized into tabs:
 * - Home: clipboard, text format, paragraph, lists
 * - Insert: paragraph, table, breaks
 * - Layout: page/section settings
 * - View: zoom
 */

import { useCallback, useMemo, type ReactNode } from "react";
import type { DocxRunProperties } from "@aurochs-office/docx/domain/run";
import {
  BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon,
  SuperscriptIcon, SubscriptIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
  ListIcon, ListOrderedIcon, IndentIncreaseIcon, IndentDecreaseIcon,
  TypeIcon, HighlighterIcon,
  CopyIcon, CutIcon, PasteIcon,
  TrashIcon, TableIcon,
} from "@aurochs-ui/ui-components/icons";
import {
  ToolbarPopoverButton,
  POPOVER_ICON_SIZE,
  POPOVER_STROKE_WIDTH,
} from "@aurochs-ui/editor-controls/toolbar";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import { ZoomControls } from "@aurochs-ui/editor-controls/zoom";
import { RibbonMenu } from "@aurochs-ui/editor-controls/ribbon-menu";
import type { RibbonMenuItemDef, RibbonTabDef } from "@aurochs-ui/editor-controls/ribbon-menu";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";
import { getRunPropertiesAtPosition } from "../text-edit/text-merge/run-properties";
import { docxTextAdapter } from "../adapters/editor-controls/docx-text-adapter";

// =============================================================================
// Props
// =============================================================================

export type DocxRibbonToolbarProps = {
  readonly children?: ReactNode;
};

// =============================================================================
// Helpers
// =============================================================================

type DocxAlignment = "left" | "center" | "right" | "both";

function toDocxAlignment(v: string): DocxAlignment {
  const map: Record<string, DocxAlignment> = { left: "left", center: "center", right: "right", justify: "both" };
  return map[v] ?? "left";
}

// =============================================================================
// Component
// =============================================================================

const ICON = 16;

/** DOCX editor toolbar using RibbonMenu. */
export function DocxRibbonToolbar({ children }: DocxRibbonToolbarProps) {
  const { state, dispatch, selectedElements, primaryElement } = useDocumentEditor();
  const hasSelection = selectedElements.length > 0;

  const insertIndex = useMemo(() => {
    const primaryId = state.selection.element.primaryId;
    if (primaryId === undefined || primaryId === null) { return 0; }
    const idx = parseInt(String(primaryId), 10);
    return Number.isNaN(idx) ? 0 : idx + 1;
  }, [state.selection.element.primaryId]);

  const runProperties = useMemo(() => {
    if (!primaryElement || primaryElement.type !== "paragraph") {
      return undefined;
    }
    return getRunPropertiesAtPosition(primaryElement, 0);
  }, [primaryElement]);

  const textFormatting = useMemo<TextFormatting>(
    () => (runProperties ? docxTextAdapter.toGeneric(runProperties) : {}),
    [runProperties],
  );

  const handleTextFormattingChange = useCallback(
    (update: Partial<TextFormatting>) => {
      if (!runProperties) { return; }
      const updated = docxTextAdapter.applyUpdate(runProperties, update);
      const diff: Record<string, unknown> = {};
      for (const key of Object.keys(updated)) {
        const k = key as keyof DocxRunProperties;
        if (updated[k] !== runProperties[k]) {
          diff[k] = updated[k];
        }
      }
      if (Object.keys(diff).length > 0) {
        dispatch({ type: "APPLY_RUN_FORMAT", format: diff as Partial<DocxRunProperties> });
      }
    },
    [runProperties, dispatch],
  );

  const formatDisabled = !hasSelection;

  const handleExecute = useCallback((id: string) => {
    switch (id) {
      // History
      case "undo": dispatch({ type: "UNDO" }); break;
      case "redo": dispatch({ type: "REDO" }); break;
      // Clipboard
      case "cut": dispatch({ type: "CUT" }); break;
      case "copy": dispatch({ type: "COPY" }); break;
      case "paste": dispatch({ type: "PASTE" }); break;
      // Text toggle
      case "bold": dispatch({ type: "TOGGLE_BOLD" }); break;
      case "italic": dispatch({ type: "TOGGLE_ITALIC" }); break;
      case "underline": dispatch({ type: "TOGGLE_UNDERLINE" }); break;
      case "strikethrough": dispatch({ type: "TOGGLE_STRIKETHROUGH" }); break;
      case "superscript": handleTextFormattingChange({ superscript: !textFormatting.superscript }); break;
      case "subscript": handleTextFormattingChange({ subscript: !textFormatting.subscript }); break;
      case "clear-formatting": dispatch({ type: "CLEAR_FORMATTING" }); break;
      // Alignment
      case "align-left": dispatch({ type: "SET_PARAGRAPH_ALIGNMENT", alignment: toDocxAlignment("left") }); break;
      case "align-center": dispatch({ type: "SET_PARAGRAPH_ALIGNMENT", alignment: toDocxAlignment("center") }); break;
      case "align-right": dispatch({ type: "SET_PARAGRAPH_ALIGNMENT", alignment: toDocxAlignment("right") }); break;
      case "align-justify": dispatch({ type: "SET_PARAGRAPH_ALIGNMENT", alignment: toDocxAlignment("justify") }); break;
      // Lists
      case "bullet-list": dispatch({ type: "TOGGLE_BULLET_LIST" }); break;
      case "numbered-list": dispatch({ type: "TOGGLE_NUMBERED_LIST" }); break;
      case "increase-indent": dispatch({ type: "INCREASE_INDENT" }); break;
      case "decrease-indent": dispatch({ type: "DECREASE_INDENT" }); break;
      // Insert
      case "insert-paragraph": dispatch({ type: "INSERT_PARAGRAPH", index: insertIndex }); break;
      case "insert-table": dispatch({ type: "INSERT_TABLE", index: insertIndex, rows: 3, cols: 3 }); break;
      case "insert-page-break": dispatch({ type: "INSERT_PAGE_BREAK", contentIndex: insertIndex }); break;
      case "insert-section-break": dispatch({ type: "INSERT_SECTION_BREAK", contentIndex: insertIndex }); break;
      // Delete
      case "delete-selection": dispatch({ type: "DELETE_SELECTION" }); break;
    }
  }, [dispatch, handleTextFormattingChange, textFormatting, insertIndex]);

  // --- Item definitions ---
  const reg = useMemo<Record<string, RibbonMenuItemDef>>(() => ({
    // History
    undo: { id: "undo", label: "Undo", icon: <span style={{ fontSize: 12 }}>↩</span> },
    redo: { id: "redo", label: "Redo", icon: <span style={{ fontSize: 12 }}>↪</span> },
    // Clipboard
    cut: { id: "cut", label: "Cut", icon: <CutIcon size={ICON} /> },
    copy: { id: "copy", label: "Copy", icon: <CopyIcon size={ICON} /> },
    paste: { id: "paste", label: "Paste", icon: <PasteIcon size={ICON} /> },
    // Text formatting
    "text-format": {
      id: "text-format", label: "Text Format", icon: <TypeIcon size={ICON} />,
      renderWidget: () => (
        <ToolbarPopoverButton
          icon={<TypeIcon size={POPOVER_ICON_SIZE} strokeWidth={POPOVER_STROKE_WIDTH} />}
          label="Text formatting"
          disabled={formatDisabled}
          panelWidth={280}
        >
          <TextFormattingEditor
            value={textFormatting}
            onChange={handleTextFormattingChange}
            disabled={formatDisabled}
            features={{ showHighlight: true }}
          />
        </ToolbarPopoverButton>
      ),
    },
    bold: { id: "bold", label: "Bold", icon: <BoldIcon size={ICON} /> },
    italic: { id: "italic", label: "Italic", icon: <ItalicIcon size={ICON} /> },
    underline: { id: "underline", label: "Underline", icon: <UnderlineIcon size={ICON} /> },
    strikethrough: { id: "strikethrough", label: "Strikethrough", icon: <StrikethroughIcon size={ICON} /> },
    superscript: { id: "superscript", label: "Superscript", icon: <SuperscriptIcon size={ICON} /> },
    subscript: { id: "subscript", label: "Subscript", icon: <SubscriptIcon size={ICON} /> },
    highlight: { id: "highlight", label: "Highlight", icon: <HighlighterIcon size={ICON} /> },
    "clear-formatting": { id: "clear-formatting", label: "Clear Formatting", icon: <span style={{ fontSize: 12 }}>✕</span> },
    // Alignment
    "align-left": { id: "align-left", label: "Align Left", icon: <AlignLeftIcon size={ICON} /> },
    "align-center": { id: "align-center", label: "Align Center", icon: <AlignCenterIcon size={ICON} /> },
    "align-right": { id: "align-right", label: "Align Right", icon: <AlignRightIcon size={ICON} /> },
    "align-justify": { id: "align-justify", label: "Justify", icon: <AlignJustifyIcon size={ICON} /> },
    // Lists & indent
    "bullet-list": { id: "bullet-list", label: "Bullet List", icon: <ListIcon size={ICON} /> },
    "numbered-list": { id: "numbered-list", label: "Numbered List", icon: <ListOrderedIcon size={ICON} /> },
    "increase-indent": { id: "increase-indent", label: "Increase Indent", icon: <IndentIncreaseIcon size={ICON} /> },
    "decrease-indent": { id: "decrease-indent", label: "Decrease Indent", icon: <IndentDecreaseIcon size={ICON} /> },
    // Insert
    "insert-paragraph": { id: "insert-paragraph", label: "Paragraph", icon: <span style={{ fontSize: 12 }}>¶</span> },
    "insert-table": { id: "insert-table", label: "Table", icon: <TableIcon size={ICON} /> },
    "insert-page-break": { id: "insert-page-break", label: "Page Break", icon: <span style={{ fontSize: 12 }}>⏎</span> },
    "insert-section-break": { id: "insert-section-break", label: "Section Break", icon: <span style={{ fontSize: 12 }}>§</span> },
    // Delete
    "delete-selection": { id: "delete-selection", label: "Delete", icon: <TrashIcon size={ICON} /> },
    // View
    zoom: {
      id: "zoom", label: "Zoom", icon: <span style={{ fontSize: 12 }}>🔍</span>,
      renderWidget: () => <ZoomControls zoom={1} onZoomChange={() => {}} />,
    },
  }), [formatDisabled, textFormatting, handleTextFormattingChange]);

  const paletteItems = useMemo(() => Object.values(reg), [reg]);

  const initialTabs = useMemo<readonly RibbonTabDef[]>(() => [
    {
      id: "home", label: "Home",
      groups: [
        { id: "clipboard", label: "Clipboard", items: [reg.cut, reg.copy, reg.paste] },
        { id: "text", label: "Font", items: [reg["text-format"], reg.bold, reg.italic, reg.underline, reg.strikethrough, reg.superscript, reg.subscript, reg["clear-formatting"]] },
        { id: "paragraph", label: "Paragraph", items: [reg["align-left"], reg["align-center"], reg["align-right"], reg["align-justify"]] },
        { id: "lists", label: "Lists", items: [reg["bullet-list"], reg["numbered-list"], reg["increase-indent"], reg["decrease-indent"]] },
        { id: "editing", label: "Editing", items: [reg["delete-selection"]] },
      ],
    },
    {
      id: "insert", label: "Insert",
      groups: [
        { id: "content", label: "Content", items: [reg["insert-paragraph"]] },
        { id: "tables", label: "Tables", items: [reg["insert-table"]] },
        { id: "breaks", label: "Breaks", items: [reg["insert-page-break"], reg["insert-section-break"]] },
      ],
    },
    {
      id: "view", label: "View",
      groups: [
        { id: "zoom", label: "Zoom", items: [reg.zoom] },
        { id: "history", label: "History", items: [reg.undo, reg.redo] },
      ],
    },
  ], [reg]);

  return (
    <RibbonMenu
      initialTabs={initialTabs}
      paletteItems={paletteItems}
      itemRegistry={reg}
      onExecute={handleExecute}
    >
      {children}
    </RibbonMenu>
  );
}
