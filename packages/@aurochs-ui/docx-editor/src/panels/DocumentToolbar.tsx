/**
 * @file DocumentToolbar
 *
 * Toolbar for common DOCX document editing operations.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxNumberingProperties } from "@aurochs-office/docx/domain/paragraph";
import type { DocxRunProperties } from "@aurochs-office/docx/domain/run";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { NumberFormat } from "@aurochs-office/ooxml";
import { ToggleButton } from "@aurochs-ui/ui-components/primitives";
import { ToolbarButton, TOOLBAR_BUTTON_ICON_SIZE } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { ToolbarSeparator } from "@aurochs-ui/ui-components/primitives/ToolbarSeparator";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  RedoIcon,
  UndoIcon,
} from "@aurochs-ui/ui-components/icons";
import {
  Bold,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useDocumentEditor } from "../context/document/DocumentEditorContext";
import { getRunPropertiesAtPosition } from "../text-edit/text-merge/run-properties";

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
  const { hasSelection, canEdit, runProperties, listFormat } = useToolbarState();

  const isBold = runProperties?.b === true;
  const isItalic = runProperties?.i === true;
  const isUnderline = runProperties?.u !== undefined;
  const isStrikethrough = runProperties?.strike === true;

  const isBulletList = listFormat === "bullet";
  const isNumberList = typeof listFormat === "string" && listFormat !== "bullet" && listFormat !== "none";

  const formatDisabled = !canEdit || !hasSelection;

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, [dispatch]);

  const handleToggleBold = useCallback(() => {
    dispatch({ type: "TOGGLE_BOLD" });
  }, [dispatch]);

  const handleToggleItalic = useCallback(() => {
    dispatch({ type: "TOGGLE_ITALIC" });
  }, [dispatch]);

  const handleToggleUnderline = useCallback(() => {
    dispatch({ type: "TOGGLE_UNDERLINE" });
  }, [dispatch]);

  const handleToggleStrikethrough = useCallback(() => {
    dispatch({ type: "TOGGLE_STRIKETHROUGH" });
  }, [dispatch]);

  const handleAlign = useCallback(
    (alignment: "left" | "center" | "right" | "both") => {
      dispatch({ type: "SET_PARAGRAPH_ALIGNMENT", alignment });
    },
    [dispatch],
  );

  const handleToggleBullet = useCallback(() => {
    dispatch({ type: "TOGGLE_BULLET_LIST" });
  }, [dispatch]);

  const handleToggleNumber = useCallback(() => {
    dispatch({ type: "TOGGLE_NUMBERED_LIST" });
  }, [dispatch]);

  const handleIncreaseIndent = useCallback(() => {
    dispatch({ type: "INCREASE_INDENT" });
  }, [dispatch]);

  const handleDecreaseIndent = useCallback(() => {
    dispatch({ type: "DECREASE_INDENT" });
  }, [dispatch]);

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-xs)",
    padding: "var(--spacing-xs)",
    ...style,
  };

  const groupStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--spacing-xs)" };
  const iconSize = TOOLBAR_BUTTON_ICON_SIZE.sm.icon;
  const strokeWidth = iconTokens.strokeWidth;

  const toolbarClassName = useMemo(() => mergeClassName("document-toolbar", className), [className]);

  return (
    <div className={toolbarClassName} style={containerStyle}>
      {/* 履歴操作 */}
      <div style={groupStyle}>
        <ToolbarButton
          icon={<UndoIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Undo (Ctrl+Z)"
          onClick={handleUndo}
          disabled={!canUndo}
          size="sm"
        />
        <ToolbarButton
          icon={<RedoIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Redo (Ctrl+Y)"
          onClick={handleRedo}
          disabled={!canRedo}
          size="sm"
        />
      </div>

      <ToolbarSeparator />

      {/* テキスト書式 */}
      <div style={groupStyle}>
        <ToggleButton
          label="Bold"
          pressed={isBold}
          disabled={formatDisabled}
          onChange={() => {
            handleToggleBold();
          }}
        >
          <Bold size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
        <ToggleButton
          label="Italic"
          pressed={isItalic}
          disabled={formatDisabled}
          onChange={() => {
            handleToggleItalic();
          }}
        >
          <Italic size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
        <ToggleButton
          label="Underline"
          pressed={isUnderline}
          disabled={formatDisabled}
          onChange={() => {
            handleToggleUnderline();
          }}
        >
          <Underline size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
        <ToggleButton
          label="Strikethrough"
          pressed={isStrikethrough}
          disabled={formatDisabled}
          onChange={() => {
            handleToggleStrikethrough();
          }}
        >
          <Strikethrough size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
      </div>

      <ToolbarSeparator />

      {/* 段落書式 */}
      <div style={groupStyle}>
        <ToolbarButton
          icon={<AlignLeftIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Align left"
          onClick={() => handleAlign("left")}
          disabled={formatDisabled}
          size="sm"
        />
        <ToolbarButton
          icon={<AlignCenterIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Align center"
          onClick={() => handleAlign("center")}
          disabled={formatDisabled}
          size="sm"
        />
        <ToolbarButton
          icon={<AlignRightIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Align right"
          onClick={() => handleAlign("right")}
          disabled={formatDisabled}
          size="sm"
        />
        <ToolbarButton
          icon={<AlignJustifyIcon size={iconSize} strokeWidth={strokeWidth} />}
          label="Align justify"
          onClick={() => handleAlign("both")}
          disabled={formatDisabled}
          size="sm"
        />
      </div>

      <ToolbarSeparator />

      {/* リスト */}
      <div style={groupStyle}>
        <ToggleButton
          label="Bulleted list"
          pressed={isBulletList}
          disabled={formatDisabled}
          onChange={() => {
            handleToggleBullet();
          }}
        >
          <List size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
        <ToggleButton
          label="Numbered list"
          pressed={isNumberList}
          disabled={formatDisabled}
          onChange={() => {
            handleToggleNumber();
          }}
        >
          <ListOrdered size={iconSize} strokeWidth={strokeWidth} />
        </ToggleButton>
        <ToolbarButton
          icon={<IndentIncrease size={iconSize} strokeWidth={strokeWidth} />}
          label="Increase indent"
          onClick={handleIncreaseIndent}
          disabled={formatDisabled}
          size="sm"
        />
        <ToolbarButton
          icon={<IndentDecrease size={iconSize} strokeWidth={strokeWidth} />}
          label="Decrease indent"
          onClick={handleDecreaseIndent}
          disabled={formatDisabled}
          size="sm"
        />
      </div>
    </div>
  );
}
