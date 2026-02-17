/**
 * @file XlsxCellFormatPanel
 *
 * Sidebar panel for editing SpreadsheetML (styles.xml) formatting for the current selection.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { spacingTokens, fontTokens, colorTokens, type SelectOption } from "@aurochs-ui/ui-components";
import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxFont } from "@aurochs-office/xlsx/domain/style/font";
import type { XlsxFill } from "@aurochs-office/xlsx/domain/style/fill";
import type { XlsxBorder } from "@aurochs-office/xlsx/domain/style/border";
import type { XlsxAlignment } from "@aurochs-office/xlsx/domain/style/types";
import { getCell } from "../../cell/query";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { resolveCellStyleDetails } from "../../selectors/cell-style-details";
import { resolveSelectionFormatFlags } from "../../selectors/selection-format-flags";
import { xlsxSelectionToMixedContext } from "../../adapters/editor-controls/xlsx-mixed-state";
import { buildDecimalFormat, buildScientificFormat } from "./number-format";
import { AlignmentSection } from "./sections/AlignmentSection";
import { BorderSection } from "./sections/BorderSection";
import { FillSection } from "./sections/FillSection";
import { FontSection } from "./sections/FontSection";
import { NumberSection } from "./sections/NumberSection";
import { StyleSection } from "./sections/StyleSection";
import { CommentSection } from "./sections/CommentSection";
import { HyperlinkSection } from "./sections/HyperlinkSection";

export type XlsxCellFormatPanelProps = {
  readonly sheetIndex: number;
};

const containerStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  flexShrink: 0,
};

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

const emptyStyle: CSSProperties = {
  padding: spacingTokens.md,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
};

function getTargetRange(params: {
  readonly activeCell: CellAddress | undefined;
  readonly selectedRange: CellRange | undefined;
}): CellRange | undefined {
  if (params.selectedRange) {
    return params.selectedRange;
  }
  if (!params.activeCell) {
    return undefined;
  }
  return { start: params.activeCell, end: params.activeCell };
}

/**
 * Formatting side panel for the current selection.
 *
 * This component edits workbook style records (fonts/fills/borders/numFmts/xf) and applies the
 * resulting styleId to the selected cell range.
 */
export function XlsxCellFormatPanel({ sheetIndex }: XlsxCellFormatPanelProps) {
  const { workbook, selection, state, dispatch } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet not found: index=${sheetIndex}`);
  }

  const targetRange = useMemo(
    () => getTargetRange({ activeCell: selection.activeCell, selectedRange: selection.selectedRange }),
    [selection.activeCell, selection.selectedRange],
  );
  const disabled = state.editing !== undefined || !targetRange;

  const anchorCell = selection.activeCell ?? targetRange?.start;
  const details = useMemo(() => {
    if (!anchorCell) {
      return undefined;
    }
    const cell = getCell(sheet, anchorCell);
    return resolveCellStyleDetails({ styles: workbook.styles, sheet, address: anchorCell, cell });
  }, [anchorCell, sheet, workbook.styles]);

  const selectionFormatFlags = useMemo(() => {
    if (!targetRange) {
      return undefined;
    }
    return resolveSelectionFormatFlags({ sheet, styles: workbook.styles, range: targetRange });
  }, [sheet, targetRange, workbook.styles]);

  // Find comment for the anchor cell
  const cellComment = useMemo(() => {
    if (!anchorCell) {
      return undefined;
    }
    return sheet.comments?.find(
      (c) => c.address.row === anchorCell.row && c.address.col === anchorCell.col,
    );
  }, [anchorCell, sheet.comments]);

  // Find hyperlink for the anchor cell
  const cellHyperlink = useMemo(() => {
    if (!anchorCell) {
      return undefined;
    }
    return sheet.hyperlinks?.find(
      (h) =>
        anchorCell.row >= h.ref.start.row &&
        anchorCell.row <= h.ref.end.row &&
        anchorCell.col >= h.ref.start.col &&
        anchorCell.col <= h.ref.end.col,
    );
  }, [anchorCell, sheet.hyperlinks]);

  const fontNameOptions = useMemo(() => {
    const names = new Set<string>();
    for (const font of workbook.styles.fonts) {
      names.add(font.name);
    }
    for (const extra of ["Calibri", "Arial", "Times New Roman", "Courier New"]) {
      names.add(extra);
    }
    return [...names].sort().map<SelectOption<string>>((name) => ({ value: name, label: name }));
  }, [workbook.styles.fonts]);

  // Number section draft state (XLSX-specific, not migratable to shared editors)
  const [customFormatDraft, setCustomFormatDraft] = useState<string>("General");
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  const [useThousands, setUseThousands] = useState<boolean>(false);
  const [scientificDigits, setScientificDigits] = useState<number>(3);

  useEffect(() => {
    if (!details) {
      return;
    }
    setCustomFormatDraft(details.formatCode);
    setScientificDigits(3);
  }, [details?.styleId]);

  if (!details || !targetRange) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Format</div>
        <div style={emptyStyle}>Select a cell to edit formatting.</div>
      </div>
    );
  }

  const currentFont = details.font;
  const currentAlignment = details.xf.alignment;
  const currentBorder = details.border;

  const applyFont = (font: XlsxFont) => {
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font } });
  };

  const applyFill = (fill: XlsxFill) => {
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { fill } });
  };

  const applyBorder = (border: XlsxBorder) => {
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { border } });
  };

  const applyAlignment = (alignment: XlsxAlignment) => {
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { alignment } });
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Format</div>
      <div style={contentStyle}>
        <StyleSection
        styles={workbook.styles}
        currentStyleId={details.styleId}
        disabled={disabled}
        onStyleSelect={(cellStyleIndex) => {
          dispatch({ type: "APPLY_NAMED_STYLE", range: targetRange, cellStyleIndex });
        }}
        onStyleCreate={(name) => {
          if (!anchorCell) {
            return;
          }
          dispatch({ type: "CREATE_NAMED_STYLE", name, baseCellAddress: anchorCell });
        }}
        onStyleDelete={(cellStyleIndex) => {
          dispatch({ type: "DELETE_NAMED_STYLE", cellStyleIndex });
        }}
      />

      <FontSection
        disabled={disabled}
        font={currentFont}
        fontNameOptions={fontNameOptions}
        selectionFormatFlags={xlsxSelectionToMixedContext(selectionFormatFlags)}
        onFontChange={applyFont}
      />

      <FillSection
        disabled={disabled}
        fill={details.fill}
        onFillChange={applyFill}
      />

      <AlignmentSection
        disabled={disabled}
        alignment={currentAlignment}
        wrapText={{
          pressed: currentAlignment?.wrapText === true,
          mixed: selectionFormatFlags?.wrapText.mixed ?? false,
        }}
        onAlignmentChange={(alignment) => applyAlignment(alignment)}
        onClearAlignment={() =>
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { alignment: null } })
        }
        onWrapTextChange={(wrapText) => {
          const base: XlsxAlignment = { ...(currentAlignment ?? {}) };
          if (wrapText) {
            applyAlignment({ ...base, wrapText: true });
            return;
          }
          const { wrapText: removed, ...rest } = base;
          void removed;
          if (Object.keys(rest).length === 0) {
            dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { alignment: null } });
            return;
          }
          applyAlignment(rest);
        }}
      />

      <BorderSection
        disabled={disabled}
        border={currentBorder}
        onBorderChange={applyBorder}
      />

      <NumberSection
        disabled={disabled}
        selectedNumFmtId={details.xf.numFmtId}
        decimalPlaces={decimalPlaces}
        onDecimalPlacesChange={setDecimalPlaces}
        useThousands={useThousands}
        onUseThousandsChange={setUseThousands}
        onApplyDecimalFormat={() => {
          const formatCode = buildDecimalFormat({ decimals: decimalPlaces, thousands: useThousands });
          setCustomFormatDraft(formatCode);
          dispatch({
            type: "SET_SELECTION_FORMAT",
            range: targetRange,
            format: { numberFormat: { type: "custom", formatCode } },
          });
        }}
        scientificDigits={scientificDigits}
        onScientificDigitsChange={setScientificDigits}
        onApplyScientificFormat={() => {
          const formatCode = buildScientificFormat({ significantDigits: scientificDigits });
          setCustomFormatDraft(formatCode);
          dispatch({
            type: "SET_SELECTION_FORMAT",
            range: targetRange,
            format: { numberFormat: { type: "custom", formatCode } },
          });
        }}
        customFormatDraft={customFormatDraft}
        onCustomFormatDraftChange={setCustomFormatDraft}
        onApplyCustomFormat={() => {
          const trimmed = customFormatDraft.trim();
          if (trimmed.length === 0) {
            window.alert("Format code must not be empty");
            return;
          }
          dispatch({
            type: "SET_SELECTION_FORMAT",
            range: targetRange,
            format: { numberFormat: { type: "custom", formatCode: trimmed } },
          });
        }}
        onBuiltinFormatChange={(numFmtId) =>
          dispatch({
            type: "SET_SELECTION_FORMAT",
            range: targetRange,
            format: { numberFormat: { type: "builtin", numFmtId } },
          })
        }
      />

      {anchorCell && (
        <CommentSection
          disabled={disabled}
          address={anchorCell}
          comment={cellComment}
          onCommentChange={(comment) =>
            dispatch({ type: "SET_COMMENT", sheetIndex, comment })
          }
          onCommentDelete={() =>
            dispatch({ type: "DELETE_COMMENT", sheetIndex, address: anchorCell })
          }
        />
      )}

      {anchorCell && (
        <HyperlinkSection
          disabled={disabled}
          address={anchorCell}
          hyperlink={cellHyperlink}
          onHyperlinkChange={(hyperlink) =>
            dispatch({ type: "SET_HYPERLINK", sheetIndex, hyperlink })
          }
          onHyperlinkDelete={() =>
            dispatch({ type: "DELETE_HYPERLINK", sheetIndex, address: anchorCell })
          }
        />
      )}
      </div>
    </div>
  );
}
