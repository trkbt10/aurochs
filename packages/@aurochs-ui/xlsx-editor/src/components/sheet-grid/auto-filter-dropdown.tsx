/**
 * @file AutoFilter dropdown panel
 *
 * Excel-style autoFilter dropdown with:
 * - Sort section: ascending/descending buttons (labels adapt to column data type)
 * - Filter section: inline operator+value condition rows with And/Or toggle
 * - Search box for filtering the value checklist
 * - Value checklist with (Select All) and (Blanks)
 * - Auto Apply toggle
 * - Apply Filter / Clear Filter footer
 *
 * SoT (Single Source of Truth):
 * - Column data type inference: `@aurochs-office/xlsx/domain/auto-filter-column-type`
 * - Sort labels / operator options: `@aurochs-office/xlsx/domain/auto-filter-menu-config`
 * - Filter condition construction: `buildCustomFilter()` from auto-filter-menu-config
 * - Filter evaluation: `@aurochs-office/xlsx/domain/auto-filter-evaluator`
 * - Sort execution: `@aurochs-office/xlsx/domain/sort`
 *
 * This UI component does NOT contain filter/sort logic. It delegates to the
 * domain layer modules listed above.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.2 (autoFilter)
 * @see ECMA-376 Part 4, Section 18.3.2.2 (customFilters)
 * @see ECMA-376 Part 4, Section 18.3.2.8 (filters)
 * @see ECMA-376 Part 4, Section 18.3.1.92 (sortState)
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Select,
  Input,
  ContextMenuSeparator,
  colorTokens,
  radiusTokens,
  spacingTokens,
  fontTokens,
} from "@aurochs-ui/ui-components";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import type { XlsxAutoFilter, XlsxFilterType, XlsxSortCondition } from "@aurochs-office/xlsx/domain/auto-filter";
import type { CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import { getCellValue } from "@aurochs-office/xlsx/domain/mutation/query";
import { indexToColumnLetter } from "@aurochs-office/xlsx/domain/cell/address";
import { inferColumnDataType } from "@aurochs-office/xlsx/domain/auto-filter-column-type";
import { getSortLabels, getOperatorOptions, buildCustomFilter } from "@aurochs-office/xlsx/domain/auto-filter-menu-config";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";

// =============================================================================
// Props
// =============================================================================

export type AutoFilterDropdownProps = {
  readonly col1: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly sheet: XlsxWorksheet;
  readonly autoFilter: XlsxAutoFilter;
  readonly sheetIndex: number;
  readonly dispatch: (action: XlsxEditorAction) => void;
  readonly onClose: () => void;
};

// =============================================================================
// Value collection
// =============================================================================

const BLANK_LABEL = "(空白セル)";

type FilterValueEntry = {
  readonly label: string;
  readonly isBlank: boolean;
};

function buildRowIndices(startRow: number, endRow: number): readonly number[] {
  return Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i);
}

function scanColumnValues(
  sheet: XlsxWorksheet,
  autoFilter: XlsxAutoFilter,
  col1: number,
): { readonly values: Map<string, FilterValueEntry>; readonly hasBlank: boolean } {
  const startRow = (autoFilter.ref.start.row as number) + 1;
  const endRow = autoFilter.ref.end.row as number;
  const values = new Map<string, FilterValueEntry>();
  const rows = buildRowIndices(startRow, endRow);

  const foundBlank = rows.some((row) => {
    const cellValue = getCellValue(sheet, {
      col: colIdx(col1),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    });
    return !cellValue || cellValue.type === "empty";
  });

  for (const row of rows) {
    const cellValue = getCellValue(sheet, {
      col: colIdx(col1),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    });

    if (!cellValue || cellValue.type === "empty") {
      continue;
    }

    const label = cellValueToLabel(cellValue);
    if (!values.has(label)) {
      values.set(label, { label, isBlank: false });
    }
  }

  return { values, hasBlank: foundBlank };
}

function collectUniqueValues(
  sheet: XlsxWorksheet,
  autoFilter: XlsxAutoFilter,
  col1: number,
): readonly FilterValueEntry[] {
  const { values, hasBlank } = scanColumnValues(sheet, autoFilter, col1);

  const sorted = [...values.values()].sort((a, b) => {
    const numA = Number(a.label);
    const numB = Number(b.label);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return numA - numB;
    }
    return a.label.localeCompare(b.label);
  });

  if (hasBlank) {
    sorted.push({ label: BLANK_LABEL, isBlank: true });
  }
  return sorted;
}

function cellValueToLabel(value: CellValue): string {
  switch (value.type) {
    case "string": return value.value;
    case "number": return String(value.value);
    case "boolean": return value.value ? "TRUE" : "FALSE";
    case "error": return value.value;
    case "date": return value.value.toLocaleDateString();
    case "empty": return "";
  }
}

const VIEWPORT_PADDING = 8;

function clampAxis(anchor: number, size: number, viewportSize: number): number {
  if (anchor + size + VIEWPORT_PADDING > viewportSize) {
    return Math.max(VIEWPORT_PADDING, viewportSize - size - VIEWPORT_PADDING);
  }
  return anchor;
}

function clampMenuPosition(
  menu: HTMLElement,
  anchorX: number,
  anchorY: number,
): { readonly x: number; readonly y: number } {
  const rect = menu.getBoundingClientRect();
  const x = clampAxis(anchorX, rect.width, window.innerWidth);
  const y = clampAxis(anchorY, rect.height, window.innerHeight);
  return { x, y };
}

// =============================================================================
// Styles
// =============================================================================

const backdropStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 999 };

const panelStyle: CSSProperties = {
  position: "fixed",
  zIndex: 1000,
  width: 300,
  maxHeight: 520,
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  borderRadius: radiusTokens.md,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  fontSize: fontTokens.size.md,
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
};

const sectionStyle: CSSProperties = {
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
  marginBottom: spacingTokens.xs,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const sortRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
};

const conditionRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.xs,
  alignItems: "center",
};

const andOrRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.md,
  alignItems: "center",
  padding: `${spacingTokens.xs} 0`,
  fontSize: fontTokens.size.sm,
};

const searchStyle: CSSProperties = {
  padding: `${spacingTokens.xs} ${spacingTokens.md}`,
};

const valueListStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: `${spacingTokens.xs} 0`,
  maxHeight: 180,
};

const checkboxRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: `2px ${spacingTokens.md}`,
  cursor: "pointer",
  fontSize: fontTokens.size.md,
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: spacingTokens.sm,
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  borderTop: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
};

// =============================================================================
// Component
// =============================================================================

const NONE_OPERATOR = "";

/**
 * Excel-style autoFilter dropdown panel with sort, condition filters, and value checklist.
 */
export function AutoFilterDropdown({
  col1,
  anchorX,
  anchorY,
  sheet,
  autoFilter,
  sheetIndex,
  dispatch,
  onClose,
}: AutoFilterDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const relativeColId = col1 - (autoFilter.ref.start.col as number);
  const currentFilterColumn = autoFilter.filterColumns?.find(
    (fc) => (fc.colId as number) === relativeColId,
  );
  const currentFilter = currentFilterColumn?.filter;

  // Column data type inference
  const columnDataType = useMemo(() => inferColumnDataType(sheet, autoFilter, col1), [sheet, autoFilter, col1]);
  const sortLabels = useMemo(() => getSortLabels(columnDataType), [columnDataType]);
  const operatorOptions = useMemo(() => getOperatorOptions(columnDataType), [columnDataType]);

  // Unique values
  const uniqueValues = useMemo(() => collectUniqueValues(sheet, autoFilter, col1), [sheet, autoFilter, col1]);

  // --- State ---

  // Condition rows
  const [operator1, setOperator1] = useState<string>(() => {
    if (currentFilter?.type === "customFilters" && currentFilter.conditions[0]) {
      return currentFilter.conditions[0].operator ?? "equal";
    }
    return NONE_OPERATOR;
  });
  const [value1, setValue1] = useState<string>(() => {
    if (currentFilter?.type === "customFilters" && currentFilter.conditions[0]) {
      return currentFilter.conditions[0].val ?? "";
    }
    return "";
  });
  const [andOr, setAndOr] = useState<"and" | "or">(() => {
    if (currentFilter?.type === "customFilters") {
      return currentFilter.and ? "and" : "or";
    }
    return "and";
  });
  const [operator2, setOperator2] = useState<string>(() => {
    if (currentFilter?.type === "customFilters" && currentFilter.conditions[1]) {
      return currentFilter.conditions[1].operator ?? "equal";
    }
    return NONE_OPERATOR;
  });
  const [value2, setValue2] = useState<string>(() => {
    if (currentFilter?.type === "customFilters" && currentFilter.conditions[1]) {
      return currentFilter.conditions[1].val ?? "";
    }
    return "";
  });

  // Value list checkboxes
  const [checkedValues, setCheckedValues] = useState<ReadonlySet<string>>(() => {
    if (!currentFilter || currentFilter.type !== "filters") {
      return new Set(uniqueValues.map((v) => v.label));
    }
    const checked = new Set<string>();
    if (currentFilter.values) {
      for (const v of currentFilter.values) {checked.add(v.val);}
    }
    if (currentFilter.blank) {checked.add(BLANK_LABEL);}
    return checked;
  });

  // Search
  const [searchText, setSearchText] = useState("");

  // Auto apply
  const [autoApply, setAutoApply] = useState(false);

  const allChecked = checkedValues.size === uniqueValues.length;
  const noneChecked = checkedValues.size === 0;

  // Filtered value list
  const filteredValues = useMemo(() => {
    if (!searchText) {return uniqueValues;}
    const lower = searchText.toLowerCase();
    return uniqueValues.filter((v) => v.label.toLowerCase().includes(lower));
  }, [uniqueValues, searchText]);

  // Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {onClose();}
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Viewport clamping
  const [menuPos, setMenuPos] = useState({ x: anchorX, y: anchorY });
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) {return;}
    const clamped = clampMenuPosition(menu, anchorX, anchorY);
    if (clamped.x !== anchorX || clamped.y !== anchorY) {
      setMenuPos(clamped);
    }
  }, [anchorX, anchorY]);

  // --- Handlers ---

  const handleSort = useCallback(
    (descending: boolean) => {
      const colLetter = indexToColumnLetter(colIdx(col1));
      const startRow = (autoFilter.ref.start.row as number) + 1;
      const endRow = autoFilter.ref.end.row as number;
      const sortCondition: XlsxSortCondition = {
        ref: `${colLetter}${startRow}:${colLetter}${endRow}`,
        descending: descending || undefined,
      };
      dispatch({ type: "APPLY_SORT", sheetIndex, sortCondition });
      onClose();
    },
    [autoFilter.ref, col1, dispatch, onClose, sheetIndex],
  );

  const applyConditionFilter = useCallback(() => {
    if (operator1 === NONE_OPERATOR) {return;}

    const filter = buildCustomFilter(operator1, value1);

    if (operator2 !== NONE_OPERATOR && value2) {
      // Two conditions: build manually
      const filter2 = buildCustomFilter(operator2, value2);
      const combined: XlsxFilterType = {
        type: "customFilters",
        and: andOr === "and" || undefined,
        conditions: [
          filter.conditions[0],
          filter2.conditions[0],
        ],
      };
      dispatch({ type: "SET_FILTER_COLUMN", sheetIndex, colId: relativeColId, filter: combined });
    } else {
      dispatch({ type: "SET_FILTER_COLUMN", sheetIndex, colId: relativeColId, filter });
    }
    onClose();
  }, [andOr, dispatch, onClose, operator1, operator2, relativeColId, sheetIndex, value1, value2]);

  const toggleValue = useCallback((label: string) => {
    setCheckedValues((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {next.delete(label);}
      else {next.add(label);}
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allChecked) {setCheckedValues(new Set());}
    else {setCheckedValues(new Set(uniqueValues.map((v) => v.label)));}
  }, [allChecked, uniqueValues]);

  // Auto-apply effect: when checkedValues change and autoApply is on
  const prevCheckedRef = useRef(checkedValues);
  useEffect(() => {
    if (!autoApply) {
      prevCheckedRef.current = checkedValues;
      return;
    }
    if (prevCheckedRef.current === checkedValues) {return;}
    prevCheckedRef.current = checkedValues;

    if (allChecked) {
      dispatch({ type: "SET_FILTER_COLUMN", sheetIndex, colId: relativeColId, filter: undefined });
    } else {
      const filterValues = uniqueValues
        .filter((v) => !v.isBlank && checkedValues.has(v.label))
        .map((v) => ({ val: v.label }));
      const blank = uniqueValues.some((v) => v.isBlank && checkedValues.has(v.label));
      const filter: XlsxFilterType = {
        type: "filters",
        values: filterValues.length > 0 ? filterValues : undefined,
        blank: blank || undefined,
      };
      dispatch({ type: "SET_FILTER_COLUMN", sheetIndex, colId: relativeColId, filter });
    }
  }, [autoApply, allChecked, checkedValues, dispatch, relativeColId, sheetIndex, uniqueValues]);

  const handleApplyFilter = useCallback(() => {
    // If condition row has an operator set, apply condition filter
    if (operator1 !== NONE_OPERATOR && value1) {
      applyConditionFilter();
      return;
    }
    // Otherwise apply value list filter
    if (allChecked) {
      dispatch({ type: "SET_FILTER_COLUMN", sheetIndex, colId: relativeColId, filter: undefined });
    } else {
      const filterValues = uniqueValues
        .filter((v) => !v.isBlank && checkedValues.has(v.label))
        .map((v) => ({ val: v.label }));
      const blank = uniqueValues.some((v) => v.isBlank && checkedValues.has(v.label));
      const filter: XlsxFilterType = {
        type: "filters",
        values: filterValues.length > 0 ? filterValues : undefined,
        blank: blank || undefined,
      };
      dispatch({ type: "SET_FILTER_COLUMN", sheetIndex, colId: relativeColId, filter });
    }
    onClose();
  }, [allChecked, applyConditionFilter, checkedValues, dispatch, onClose, operator1, relativeColId, sheetIndex, uniqueValues, value1]);

  const handleClearFilter = useCallback(() => {
    dispatch({ type: "SET_FILTER_COLUMN", sheetIndex, colId: relativeColId, filter: undefined });
    onClose();
  }, [dispatch, onClose, relativeColId, sheetIndex]);

  const selectOptions = useMemo(() => {
    return [
      { value: NONE_OPERATOR, label: "選択..." },
      ...operatorOptions.map((o) => ({ value: o.value, label: o.label })),
    ];
  }, [operatorOptions]);

  return createPortal(
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div ref={menuRef} style={{ ...panelStyle, left: menuPos.x, top: menuPos.y }}>
        {/* Sort section */}
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Sort</div>
          <div style={sortRowStyle}>
            <Button variant="outline" size="sm" onClick={() => handleSort(false)} style={{ flex: 1 }}>
              {sortLabels.ascending}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSort(true)} style={{ flex: 1 }}>
              {sortLabels.descending}
            </Button>
          </div>
        </div>

        <ContextMenuSeparator />

        {/* Filter condition section */}
        <div style={sectionStyle}>
          <div style={sectionLabelStyle}>Filter</div>
          {/* Condition 1 */}
          <div style={conditionRowStyle}>
            <Select
              value={operator1}
              onChange={setOperator1}
              options={selectOptions}
              style={{ flex: 1 }}
            />
            <Input
              value={value1}
              onChange={(v) => setValue1(String(v))}
              placeholder="値..."
              width={110}
              onKeyDown={(e) => { if (e.key === "Enter") {applyConditionFilter();} }}
            />
          </div>
          {/* And / Or */}
          <div style={andOrRowStyle}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <input type="radio" name="andOr" checked={andOr === "and"} onChange={() => setAndOr("and")} />
              And
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <input type="radio" name="andOr" checked={andOr === "or"} onChange={() => setAndOr("or")} />
              Or
            </label>
          </div>
          {/* Condition 2 */}
          <div style={conditionRowStyle}>
            <Select
              value={operator2}
              onChange={setOperator2}
              options={selectOptions}
              style={{ flex: 1 }}
            />
            <Input
              value={value2}
              onChange={(v) => setValue2(String(v))}
              placeholder="値..."
              width={110}
              onKeyDown={(e) => { if (e.key === "Enter") {applyConditionFilter();} }}
            />
          </div>
        </div>

        <ContextMenuSeparator />

        {/* Search box */}
        <div style={searchStyle}>
          <Input
            value={searchText}
            onChange={(v) => setSearchText(String(v))}
            placeholder="検索..."
            width="100%"
          />
        </div>

        {/* Value list */}
        <div style={valueListStyle}>
          <label style={{ ...checkboxRowStyle, fontWeight: fontTokens.weight.semibold }}>
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) {el.indeterminate = !allChecked && !noneChecked;} }}
              onChange={toggleAll}
            />
            (すべて選択)
          </label>
          {filteredValues.map((entry) => (
            <label key={entry.label} style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={checkedValues.has(entry.label)}
                onChange={() => toggleValue(entry.label)}
              />
              {entry.isBlank ? <em>{entry.label}</em> : entry.label}
            </label>
          ))}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: fontTokens.size.sm, cursor: "pointer" }}>
            <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />
            Auto Apply
          </label>
          <div style={{ display: "flex", gap: spacingTokens.sm }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyFilter}
              disabled={autoApply}
            >
              Apply Filter
            </Button>
            <Button variant="secondary" size="sm" onClick={handleClearFilter}>
              Clear Filter
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
