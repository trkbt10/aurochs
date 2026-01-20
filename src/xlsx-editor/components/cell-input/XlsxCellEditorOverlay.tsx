/**
 * @file XlsxCellEditorOverlay
 *
 * Inline cell editor overlay (MVP): edit a single cell value or store a formula.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CellAddress } from "../../../xlsx/domain/cell/address";
import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { colorTokens } from "../../../office-editor-components";
import { parseCellUserInput } from "./parse-cell-user-input";
import type { ParseCellUserInputResult } from "./parse-cell-user-input";
import { formatCellEditText } from "./format-cell-edit-text";

export type CellRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type XlsxCellEditorOverlayProps = {
  readonly sheet: XlsxWorksheet;
  readonly address: CellAddress;
  readonly rect: CellRect;
  readonly onCommitValue: (value: ParseCellUserInputResult) => void;
  readonly onCancel: () => void;
};

const inputStyleBase: CSSProperties = {
  position: "absolute",
  boxSizing: "border-box",
  border: `2px solid var(--accent, ${colorTokens.accent.primary})`,
  outline: "none",
  padding: "0 6px",
  fontSize: 12,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
};

export function XlsxCellEditorOverlay({
  sheet,
  address,
  rect,
  onCommitValue,
  onCancel,
}: XlsxCellEditorOverlayProps) {
  const initialText = useMemo(() => formatCellEditText(sheet, address), [sheet, address]);
  const [value, setValue] = useState<string>(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialText);
  }, [initialText]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    el.select();
  }, []);

  const commit = useCallback(() => {
    onCommitValue(parseCellUserInput(value));
  }, [onCommitValue, value]);

  return (
    <input
      ref={inputRef}
      data-testid="xlsx-cell-editor"
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      style={{
        ...inputStyleBase,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
