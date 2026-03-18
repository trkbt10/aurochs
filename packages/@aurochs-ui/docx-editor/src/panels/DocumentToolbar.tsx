/**
 * @file DocumentToolbar
 *
 * Toolbar for common DOCX document editing operations.
 * Uses shared toolbar groups and ToolbarPopoverButton for text formatting.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxNumberingProperties } from "@aurochs-office/docx/domain/paragraph";
import type { DocxRunProperties } from "@aurochs-office/docx/domain/run";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { NumberFormat } from "@aurochs-office/ooxml";
import { ToolbarSeparator } from "@aurochs-ui/ui-components/primitives/ToolbarSeparator";
import { TypeIcon } from "@aurochs-ui/ui-components/icons";
import {
  UndoRedoGroup,
  AlignmentGroup,
  ListIndentGroup,
  ToolbarPopoverButton,
  POPOVER_ICON_SIZE,
  POPOVER_STROKE_WIDTH,
  type AlignmentValue,
} from "@aurochs-ui/editor-controls/toolbar";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import { ZoomControls } from "@aurochs-ui/editor-controls/zoom";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";
import { getRunPropertiesAtPosition } from "../text-edit/text-merge/run-properties";
import { docxTextAdapter } from "../adapters/editor-controls/docx-text-adapter";

// =============================================================================
// Types
// =============================================================================

export type DocumentToolbarProps = {
  readonly className?: string;
  readonly style?: CSSProperties;
};

type ToolbarState = {
  readonly hasSelection: boolean;
  readonly canEdit: boolean;
  readonly runProperties: DocxRunProperties | undefined;
  readonly paragraphAlignment: "left" | "center" | "right" | "both" | undefined;
  readonly listFormat: NumberFormat | undefined;
};

// =============================================================================
// Helpers
// =============================================================================

function mergeClassName(...parts: readonly (string | undefined)[]): string | undefined {
  const merged = parts.filter((p) => p && p.trim().length > 0).join(" ");
  return merged.length > 0 ? merged : undefined;
}

function getParagraphAtIndex(document: DocxDocument, index: number): DocxParagraph | undefined {
  const el = document.body.content[index];
  return el?.type === "paragraph" ? el : undefined;
}

function getSelectedParagraph({
  document,
  selectionMode,
  elementPrimaryId,
  textParagraphIndex,
}: {
  document: DocxDocument;
  selectionMode: "element" | "text";
  elementPrimaryId: string | undefined;
  textParagraphIndex: number | undefined;
}): DocxParagraph | undefined {
  if (selectionMode === "text") {
    return typeof textParagraphIndex === "number" ? getParagraphAtIndex(document, textParagraphIndex) : undefined;
  }

  if (!elementPrimaryId) {
    return undefined;
  }
  const index = parseInt(elementPrimaryId, 10);
  if (Number.isNaN(index)) {
    return undefined;
  }
  return getParagraphAtIndex(document, index);
}

type ParagraphAlignment = "left" | "center" | "right" | "both";

function getParagraphAlignment(paragraph: DocxParagraph | undefined): ParagraphAlignment | undefined {
  const jc = paragraph?.properties?.jc;
  if (jc === "left" || jc === "center" || jc === "right" || jc === "both") {
    return jc;
  }
  return undefined;
}

function getRunPropertiesForSelection(args: {
  paragraph: DocxParagraph | undefined;
  selectionMode: "element" | "text";
  charOffset: number | undefined;
}): DocxRunProperties | undefined {
  const { paragraph, selectionMode, charOffset } = args;
  if (!paragraph) {
    return undefined;
  }
  if (selectionMode === "text") {
    return getRunPropertiesAtPosition(paragraph, charOffset ?? 0);
  }
  return getRunPropertiesAtPosition(paragraph, 0);
}

function getNumberFormatForParagraph(
  document: DocxDocument,
  numPr: DocxNumberingProperties | undefined,
): NumberFormat | undefined {
  const numId = numPr?.numId;
  if (!numId) {
    return undefined;
  }
  const numbering = document.numbering;
  if (!numbering) {
    return undefined;
  }

  const num = numbering.num.find((n) => n.numId === numId);
  if (!num) {
    return undefined;
  }
  const abstractNum = numbering.abstractNum.find((a) => a.abstractNumId === num.abstractNumId);
  if (!abstractNum) {
    return undefined;
  }

  const ilvl = (numPr?.ilvl ?? 0) as number;
  const override = num.lvlOverride?.find((o) => o.ilvl === ilvl);
  if (override?.lvl?.numFmt) {
    return override.lvl.numFmt;
  }

  return abstractNum.lvl.find((l) => l.ilvl === ilvl)?.numFmt;
}

/** Map DOCX "both" ↔ shared "justify" */
function docxAlignToShared(jc: ParagraphAlignment | undefined): AlignmentValue | undefined {
  if (jc === "both") {
    return "justify";
  }
  return jc;
}

function sharedAlignToDocx(value: AlignmentValue): "left" | "center" | "right" | "both" {
  if (value === "justify") {
    return "both";
  }
  return value;
}

function useToolbarState(): ToolbarState {
  const { document, selectedElements, state, editorMode } = useDocumentEditor();
  const selection = state.selection;

  return useMemo(() => {
    const hasTextSelection =
      selection.mode === "text" && (selection.text.cursor !== undefined || selection.text.range !== undefined);
    const hasElementSelection = selection.mode === "element" && selectedElements.length > 0;
    const hasSelection = hasTextSelection || hasElementSelection;
    const canEdit = editorMode === "editing";

    const textPosition = selection.text.cursor ?? selection.text.range?.start;
    const paragraph = getSelectedParagraph({
      document,
      selectionMode: selection.mode,
      elementPrimaryId: selection.element.primaryId,
      textParagraphIndex: textPosition?.paragraphIndex,
    });

    const runProperties = getRunPropertiesForSelection({
      paragraph,
      selectionMode: selection.mode,
      charOffset: textPosition?.charOffset,
    });

    const paragraphAlignment = getParagraphAlignment(paragraph);

    const listFormat = getNumberFormatForParagraph(document, paragraph?.properties?.numPr);

    return {
      hasSelection,
      canEdit,
      runProperties,
      paragraphAlignment,
      listFormat,
    };
  }, [document, editorMode, selectedElements.length, selection]);
}

// =============================================================================
// Component
// =============================================================================

/**
 * Toolbar component providing common DOCX document editing operations.
 */
export function DocumentToolbar({ className, style }: DocumentToolbarProps) {
  const { dispatch, canUndo, canRedo } = useDocumentEditor();
  const { hasSelection, canEdit, runProperties, paragraphAlignment, listFormat } = useToolbarState();

  const [zoom, setZoom] = useState(1);

  const isBulletList = listFormat === "bullet";
  const isNumberList = typeof listFormat === "string" && listFormat !== "bullet" && listFormat !== "none";

  const formatDisabled = !canEdit || !hasSelection;

  const handleUndo = useCallback(() => dispatch({ type: "UNDO" }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: "REDO" }), [dispatch]);

  // Text formatting via adapter → APPLY_RUN_FORMAT
  const textFormatting = useMemo<TextFormatting>(
    () => (runProperties ? docxTextAdapter.toGeneric(runProperties) : {}),
    [runProperties],
  );

  const handleTextFormattingChange = useCallback(
    (update: Partial<TextFormatting>) => {
      if (!runProperties) {
        return;
      }
      const updated = docxTextAdapter.applyUpdate(runProperties, update);
      // Compute diff: only send changed fields
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

  const handleAlign = useCallback(
    (alignment: AlignmentValue | undefined) => {
      if (alignment === undefined) {
        return;
      }
      dispatch({ type: "SET_PARAGRAPH_ALIGNMENT", alignment: sharedAlignToDocx(alignment) });
    },
    [dispatch],
  );

  const handleToggleBullet = useCallback(() => dispatch({ type: "TOGGLE_BULLET_LIST" }), [dispatch]);
  const handleToggleNumber = useCallback(() => dispatch({ type: "TOGGLE_NUMBERED_LIST" }), [dispatch]);
  const handleIncreaseIndent = useCallback(() => dispatch({ type: "INCREASE_INDENT" }), [dispatch]);
  const handleDecreaseIndent = useCallback(() => dispatch({ type: "DECREASE_INDENT" }), [dispatch]);

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-xs)",
    padding: "var(--spacing-xs)",
    ...style,
  };

  const groupStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--spacing-xs)" };

  const toolbarClassName = useMemo(() => mergeClassName("document-toolbar", className), [className]);

  return (
    <div className={toolbarClassName} style={containerStyle}>
      {/* 履歴操作 */}
      <div style={groupStyle}>
        <UndoRedoGroup canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo} />
      </div>

      <ToolbarSeparator />

      {/* テキスト書式ポップオーバー */}
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
          features={{
            showHighlight: true,
          }}
        />
      </ToolbarPopoverButton>

      <ToolbarSeparator />

      {/* 段落書式 */}
      <div style={groupStyle}>
        <AlignmentGroup
          value={docxAlignToShared(paragraphAlignment)}
          onChange={handleAlign}
          showJustify
          disabled={formatDisabled}
        />
      </div>

      <ToolbarSeparator />

      {/* リスト */}
      <div style={groupStyle}>
        <ListIndentGroup
          bullet={{ pressed: isBulletList, onToggle: handleToggleBullet }}
          numbered={{ pressed: isNumberList, onToggle: handleToggleNumber }}
          onIncreaseIndent={handleIncreaseIndent}
          onDecreaseIndent={handleDecreaseIndent}
          disabled={formatDisabled}
        />
      </div>

      {/* スペーサー + ZoomControls */}
      <div style={{ flex: 1 }} />
      <ZoomControls
        zoom={zoom}
        onZoomChange={setZoom}
      />
    </div>
  );
}
