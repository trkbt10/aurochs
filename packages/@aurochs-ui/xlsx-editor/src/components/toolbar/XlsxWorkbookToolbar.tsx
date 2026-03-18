/**
 * @file XlsxWorkbookToolbar
 *
 * Toolbar: Undo/Redo + text formatting popover + alignment + cell operations + zoom.
 */

import { useCallback, useMemo, type CSSProperties } from "react";
import {
  Button,
  Input,
  spacingTokens,
  MergeCellsIcon,
  UnmergeCellsIcon,
} from "@aurochs-ui/ui-components";
import { TypeIcon } from "@aurochs-ui/ui-components/icons";
import { ZoomControls } from "@aurochs-ui/editor-controls/zoom";
import {
  UndoRedoGroup,
  AlignmentGroup,
  ToolbarPopoverButton,
  POPOVER_ICON_SIZE,
  POPOVER_STROKE_WIDTH,
  type AlignmentValue,
} from "@aurochs-ui/editor-controls/toolbar";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { VbaProgramIr } from "@aurochs-office/vba";
import { indexToColumnLetter, type CellAddress, type CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import { colIdx } from "@aurochs-office/xlsx/domain/types";
import { StylePicker } from "./StylePicker";
import { XlsxFormulaBar } from "./XlsxFormulaBar";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { getCell } from "../../cell/query";
import { resolveCellStyleDetails } from "../../selectors/cell-style-details";
import { resolveSelectionFormatFlags } from "../../selectors/selection-format-flags";
import type { XlsxAlignment } from "@aurochs-office/xlsx/domain/style/types";
import { xlsxTextAdapter } from "../../adapters/editor-controls/xlsx-text-adapter";

export type XlsxWorkbookToolbarProps = {
  readonly sheetIndex: number;
  readonly zoom: number;
  readonly onZoomChange: (next: number) => void;
  /** VBA program (if loaded from XLSM) */
  readonly vbaProgram?: VbaProgramIr;
  /** Callback when macro button is clicked */
  readonly onMacroClick?: () => void;
};

const barStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
};

const addressInputStyle: CSSProperties = {
  width: 90,
};

const formulaInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 120,
};

function createA1AddressText(address: CellAddress): string {
  const col = indexToColumnLetter(colIdx(address.col as number));
  const row = String(address.row as number);
  return `${col}${row}`;
}

function getTargetRange(params: {
  readonly activeCell: CellAddress | undefined;
  readonly selectedRange: CellRange | undefined;
}): CellRange | undefined {
  if (params.selectedRange) {
    return params.selectedRange;
  }
  if (params.activeCell) {
    return { start: params.activeCell, end: params.activeCell };
  }
  return undefined;
}

function setHorizontalAlignment(
  baseAlignment: XlsxAlignment | undefined,
  horizontal: XlsxAlignment["horizontal"],
): XlsxAlignment {
  return { ...(baseAlignment ?? {}), horizontal };
}

function clearHorizontalAlignment(baseAlignment: XlsxAlignment | undefined): XlsxAlignment | null {
  if (!baseAlignment) {
    return null;
  }
  const { horizontal: _removed, ...rest } = baseAlignment;
  return Object.keys(rest).length === 0 ? null : rest;
}

/**
 * Workbook toolbar for a single sheet.
 */
export function XlsxWorkbookToolbar({
  sheetIndex,
  zoom,
  onZoomChange,
  vbaProgram,
  onMacroClick,
}: XlsxWorkbookToolbarProps) {
  const { dispatch, workbook, canUndo, canRedo, selection, editing } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet not found: index=${sheetIndex}`);
  }

  const activeCell = selection.activeCell;
  const activeCellText = useMemo(() => {
    return activeCell ? createA1AddressText(activeCell) : "";
  }, [activeCell]);

  const disableInputs = editing !== undefined;
  const targetRange = useMemo(
    () => getTargetRange({ activeCell, selectedRange: selection.selectedRange }),
    [activeCell, selection.selectedRange],
  );

  const styleDetails = useMemo(() => {
    if (!activeCell) {
      return undefined;
    }
    const cell = getCell(sheet, activeCell);
    return resolveCellStyleDetails({ styles: workbook.styles, sheet, address: activeCell, cell });
  }, [activeCell, sheet, workbook.styles]);

  const font = styleDetails?.font;
  const baseAlignment = styleDetails?.xf.alignment;
  const toolbarCanFormat = Boolean(targetRange && font && !disableInputs);
  const selectionFormatFlags = useMemo(() => {
    if (!targetRange) {
      return undefined;
    }
    return resolveSelectionFormatFlags({ sheet, styles: workbook.styles, range: targetRange });
  }, [sheet, targetRange, workbook.styles]);

  const selectedHorizontalAlignment = selectionFormatFlags?.horizontal;
  const horizontalMixed = selectedHorizontalAlignment?.mixed ?? false;
  const horizontalValue =
    selectedHorizontalAlignment && !selectedHorizontalAlignment.mixed ? selectedHorizontalAlignment.value : undefined;

  // Text formatting via adapter
  const textFormatting = useMemo<TextFormatting>(
    () => (font ? xlsxTextAdapter.toGeneric(font) : {}),
    [font],
  );

  const handleTextFormattingChange = useCallback(
    (update: Partial<TextFormatting>) => {
      if (!targetRange || !font) {
        return;
      }
      const updatedFont = xlsxTextAdapter.applyUpdate(font, update);
      dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: updatedFont } });
    },
    [targetRange, font, dispatch],
  );

  const handleAlignmentChange = (value: AlignmentValue | undefined) => {
    if (!targetRange) {
      return;
    }
    if (value === undefined) {
      dispatch({
        type: "SET_SELECTION_FORMAT",
        range: targetRange,
        format: { alignment: clearHorizontalAlignment(baseAlignment) },
      });
      return;
    }
    dispatch({
      type: "SET_SELECTION_FORMAT",
      range: targetRange,
      format: { alignment: setHorizontalAlignment(baseAlignment, value) },
    });
  };

  return (
    <div style={barStyle}>
      <UndoRedoGroup
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
      />

      <ToolbarPopoverButton
        icon={<TypeIcon size={POPOVER_ICON_SIZE} strokeWidth={POPOVER_STROKE_WIDTH} />}
        label="Text formatting"
        disabled={!toolbarCanFormat}
        panelWidth={280}
      >
        <TextFormattingEditor
          value={textFormatting}
          onChange={handleTextFormattingChange}
          disabled={!toolbarCanFormat}
        />
      </ToolbarPopoverButton>

      <AlignmentGroup
        value={horizontalValue as AlignmentValue | undefined}
        onChange={handleAlignmentChange}
        mixed={horizontalMixed}
        disabled={!targetRange || disableInputs}
      />

      <Input value={activeCellText} placeholder="A1" readOnly onChange={() => undefined} style={addressInputStyle} />

      <StylePicker
        styles={workbook.styles}
        currentStyleId={styleDetails?.styleId}
        disabled={!targetRange || disableInputs}
        onNamedStyleSelect={(cellStyleIndex) => {
          if (!targetRange) {
            return;
          }
          dispatch({ type: "APPLY_NAMED_STYLE", range: targetRange, cellStyleIndex });
        }}
      />

      <Button
        size="sm"
        disabled={!targetRange || disableInputs}
        onClick={() => {
          if (!targetRange) {
            return;
          }
          dispatch({ type: "MERGE_CELLS", range: targetRange });
        }}
        title="Merge cells"
      >
        <MergeCellsIcon size={14} />
      </Button>
      <Button
        size="sm"
        disabled={!targetRange || disableInputs}
        onClick={() => {
          if (!targetRange) {
            return;
          }
          dispatch({ type: "UNMERGE_CELLS", range: targetRange });
        }}
        title="Unmerge cells"
      >
        <UnmergeCellsIcon size={14} />
      </Button>

      <div style={{ display: "flex", alignItems: "center", gap: spacingTokens.xs }}>
        <ZoomControls zoom={zoom} onZoomChange={onZoomChange} />
      </div>

      {vbaProgram && (
        <Button
          size="sm"
          onClick={onMacroClick}
          title="Macros"
        >
          Macros
        </Button>
      )}

      <XlsxFormulaBar sheet={sheet} style={formulaInputStyle} />
    </div>
  );
}
