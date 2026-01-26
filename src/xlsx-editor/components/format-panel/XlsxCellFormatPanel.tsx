/**
 * @file XlsxCellFormatPanel
 *
 * Sidebar panel for editing SpreadsheetML (styles.xml) formatting for the current selection.
 */

import { useEffect, useMemo, useState } from "react";
import { Button, Panel, spacingTokens, type SelectOption } from "../../../office-editor-components";
import type { CellAddress, CellRange } from "../../../xlsx/domain/cell/address";
import type { XlsxFont } from "../../../xlsx/domain/style/font";
import type { XlsxFill } from "../../../xlsx/domain/style/fill";
import type { XlsxBorder } from "../../../xlsx/domain/style/border";
import type { XlsxAlignment } from "../../../xlsx/domain/style/types";
import { getCell } from "../../cell/query";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { resolveCellStyleDetails } from "../../selectors/cell-style-details";
import { resolveSelectionFormatFlags } from "../../selectors/selection-format-flags";
import { makeXlsxRgbColor, normalizeRgbHexInput, rgbHexFromXlsxColor } from "./color-utils";
import { buildDecimalFormat, buildScientificFormat } from "./number-format";
import { AlignmentSection } from "./sections/AlignmentSection";
import { BorderSection } from "./sections/BorderSection";
import { FillSection } from "./sections/FillSection";
import { FontSection } from "./sections/FontSection";
import { NumberSection } from "./sections/NumberSection";
import { StyleSection } from "./sections/StyleSection";

export type XlsxCellFormatPanelProps = {
  readonly sheetIndex: number;
  readonly onClose?: () => void;
};

function getTargetRange(params: { readonly activeCell: CellAddress | undefined; readonly selectedRange: CellRange | undefined }): CellRange | undefined {
  if (params.selectedRange) {
    return params.selectedRange;
  }
  if (!params.activeCell) {
    return undefined;
  }
  return { start: params.activeCell, end: params.activeCell };
}

function setSolidFill(hex: string): XlsxFill {
  const color = makeXlsxRgbColor(hex);
  return {
    type: "pattern",
    pattern: {
      patternType: "solid",
      fgColor: color,
    },
  };
}

function resolveSolidFillColor(fill: XlsxFill): string {
  if (fill.type !== "pattern") {
    return "";
  }
  if (fill.pattern.patternType !== "solid") {
    return "";
  }
  return rgbHexFromXlsxColor(fill.pattern.fgColor) ?? "";
}

function toggleBold(font: XlsxFont, pressed: boolean): XlsxFont {
  return { ...font, bold: pressed ? true : undefined };
}

function toggleItalic(font: XlsxFont, pressed: boolean): XlsxFont {
  return { ...font, italic: pressed ? true : undefined };
}

function toggleStrikethrough(font: XlsxFont, pressed: boolean): XlsxFont {
  return { ...font, strikethrough: pressed ? true : undefined };
}

function toggleUnderline(font: XlsxFont, pressed: boolean): XlsxFont {
  return { ...font, underline: pressed ? "single" : undefined };
}

/**
 * Formatting side panel for the current selection.
 *
 * This component edits workbook style records (fonts/fills/borders/numFmts/xf) and applies the
 * resulting styleId to the selected cell range.
 */
export function XlsxCellFormatPanel({ sheetIndex, onClose }: XlsxCellFormatPanelProps) {
  const { workbook, selection, state, dispatch } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet not found: index=${sheetIndex}`);
  }

  const targetRange = useMemo(
    () => getTargetRange({ activeCell: selection.activeCell, selectedRange: selection.selectedRange }),
    [selection.activeCell, selection.selectedRange],
  );
  const disabled = state.editingCell !== undefined || !targetRange;

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

  const [fontSizeDraft, setFontSizeDraft] = useState<number>(11);
  const [fontColorDraft, setFontColorDraft] = useState<string>("");
  const [fillColorDraft, setFillColorDraft] = useState<string>("");
  const [borderColorDraft, setBorderColorDraft] = useState<string>("");
  const [customFormatDraft, setCustomFormatDraft] = useState<string>("General");
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  const [useThousands, setUseThousands] = useState<boolean>(false);
  const [scientificDigits, setScientificDigits] = useState<number>(3);

  useEffect(() => {
    if (!details) {
      return;
    }
    setFontSizeDraft(details.font.size);
    setFontColorDraft(rgbHexFromXlsxColor(details.font.color) ?? "");
    setFillColorDraft(resolveSolidFillColor(details.fill));
    setBorderColorDraft(rgbHexFromXlsxColor(details.border.left?.color) ?? "");
    setCustomFormatDraft(details.formatCode);
    setScientificDigits(3);
  }, [details?.styleId]);

  if (!details || !targetRange) {
    return (
      <Panel title="Format" width={320} style={{ height: "100%" }}>
        <div style={{ padding: spacingTokens.md, color: "var(--text-tertiary)" }}>Select a cell to edit formatting.</div>
      </Panel>
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
    <Panel title="Format" width={320} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {onClose && (
        <div style={{ padding: spacingTokens.sm, borderBottom: "1px solid var(--border-subtle)" }}>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

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
        mixed={{
          bold: selectionFormatFlags?.bold.mixed ?? false,
          italic: selectionFormatFlags?.italic.mixed ?? false,
          underline: selectionFormatFlags?.underline.mixed ?? false,
          strikethrough: selectionFormatFlags?.strikethrough.mixed ?? false,
        }}
        fontSizeDraft={fontSizeDraft}
        onFontSizeDraftChange={setFontSizeDraft}
        onApplyFontSize={() => applyFont({ ...currentFont, size: fontSizeDraft })}
        fontColorDraft={fontColorDraft}
        onFontColorDraftChange={setFontColorDraft}
        onApplyFontColor={() => {
          const hex = normalizeRgbHexInput(fontColorDraft);
          if (!hex) {
            window.alert("Font color must be a 6-digit hex value like #RRGGBB");
            return;
          }
          applyFont({ ...currentFont, color: makeXlsxRgbColor(hex) });
        }}
        onClearFontColor={() => {
          const { color: removed, ...without } = currentFont;
          void removed;
          applyFont(without);
        }}
        onFontNameChange={(name) => applyFont({ ...currentFont, name })}
        onToggleBold={(pressed) => applyFont(toggleBold(currentFont, pressed))}
        onToggleItalic={(pressed) => applyFont(toggleItalic(currentFont, pressed))}
        onToggleUnderline={(pressed) => applyFont(toggleUnderline(currentFont, pressed))}
        onToggleStrikethrough={(pressed) => applyFont(toggleStrikethrough(currentFont, pressed))}
      />

      <FillSection
        disabled={disabled}
        fillColorDraft={fillColorDraft}
        onFillColorDraftChange={setFillColorDraft}
        onApplyFillColor={() => {
          const hex = normalizeRgbHexInput(fillColorDraft);
          if (!hex) {
            window.alert("Fill color must be a 6-digit hex value like #RRGGBB");
            return;
          }
          applyFill(setSolidFill(hex));
        }}
        onClearFill={() => applyFill({ type: "none" })}
      />

      <AlignmentSection
        disabled={disabled}
        alignment={currentAlignment}
        wrapText={{
          pressed: currentAlignment?.wrapText === true,
          mixed: selectionFormatFlags?.wrapText.mixed ?? false,
        }}
        onAlignmentChange={(alignment) => applyAlignment(alignment)}
        onClearAlignment={() => dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { alignment: null } })}
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
        borderColorDraft={borderColorDraft}
        onBorderColorDraftChange={setBorderColorDraft}
        onBorderChange={(border) => applyBorder(border)}
        onApplyBorderColor={() => {
          const hex = normalizeRgbHexInput(borderColorDraft);
          if (!hex) {
            window.alert("Border color must be a 6-digit hex value like #RRGGBB");
            return;
          }
          const color = makeXlsxRgbColor(hex);
          applyBorder({
            ...currentBorder,
            left: currentBorder.left ? { ...currentBorder.left, color } : undefined,
            right: currentBorder.right ? { ...currentBorder.right, color } : undefined,
            top: currentBorder.top ? { ...currentBorder.top, color } : undefined,
            bottom: currentBorder.bottom ? { ...currentBorder.bottom, color } : undefined,
          });
        }}
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
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { numberFormat: { type: "custom", formatCode } } });
        }}
        scientificDigits={scientificDigits}
        onScientificDigitsChange={setScientificDigits}
        onApplyScientificFormat={() => {
          const formatCode = buildScientificFormat({ significantDigits: scientificDigits });
          setCustomFormatDraft(formatCode);
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { numberFormat: { type: "custom", formatCode } } });
        }}
        customFormatDraft={customFormatDraft}
        onCustomFormatDraftChange={setCustomFormatDraft}
        onApplyCustomFormat={() => {
          const trimmed = customFormatDraft.trim();
          if (trimmed.length === 0) {
            window.alert("Format code must not be empty");
            return;
          }
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { numberFormat: { type: "custom", formatCode: trimmed } } });
        }}
        onBuiltinFormatChange={(numFmtId) =>
          dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { numberFormat: { type: "builtin", numFmtId } } })
        }
      />
    </Panel>
  );
}
