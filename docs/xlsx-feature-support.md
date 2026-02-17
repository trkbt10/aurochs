# XLSX Editor Feature Support

XLSX エディターの機能対応状況チェックリスト。

## Legend

- [x] = Supported
- [ ] = Not supported
- [~] = Partial support

---

## Cell Data

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Cell Values | [x] | [x] | [x] | String, number, boolean, error |
| Formulas | [x] | [x] | [~] | Formula evaluation via xlsx-eval |
| Shared Strings | [x] | [x] | [x] | |
| Rich Text | [x] | [ ] | [ ] | Parsed with `includeRichText` option |

---

## Formatting

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Font | [x] | [x] | [x] | Bold, italic, underline, color, size |
| Fill | [x] | [x] | [x] | Solid colors, patterns |
| Border | [x] | [x] | [x] | All edge types |
| Alignment | [x] | [x] | [x] | Horizontal, vertical, wrap |
| Number Format | [x] | [x] | [x] | Decimal, percentage, custom codes |
| Named Styles | [x] | [x] | [x] | Apply, create, delete |

---

## Layout

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Row Height | [x] | [x] | [x] | `XlsxRow.height` |
| Column Width | [x] | [x] | [x] | `XlsxColumnDef.width` |
| Merge Cells | [x] | [x] | [x] | |
| Hidden Rows | [x] | [x] | [~] | `XlsxRow.hidden` |
| Hidden Columns | [x] | [x] | [~] | `XlsxColumnDef.hidden` |
| Freeze Panes | [x] | [x] | [x] | `XlsxPane.state = "frozen"` - スクロール固定表示対応、Visual regression test (LibreOffice baseline) |
| Split View | [x] | [~] | [ ] | `XlsxPane.state = "split"` |
| Outline Grouping | [x] | [x] | [ ] | `outlineLevel`, `collapsed` |

---

## Print / Page Setup

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Page Setup | [x] | [x] | [ ] | Orientation, scale, paper size |
| Page Margins | [x] | [x] | [ ] | Top, bottom, left, right, header, footer |
| Header/Footer | [x] | [x] | [ ] | Domain types complete, format codes supported |
| Print Options | [x] | [x] | [ ] | Grid lines, headings |
| Page Breaks | [x] | [x] | [ ] | Row breaks, column breaks |

---

## Data Features

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Conditional Formatting | [x] | [x] | [ ] | Selectors exist in codebase |
| Data Validation | [x] | [x] | [ ] | `XlsxDataValidation` |
| Auto Filter | [x] | [x] | [ ] | `XlsxAutoFilter` |
| Sorting | [ ] | [ ] | [ ] | |

---

## Objects

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Charts | [x] | [ ] | [~] | Parsed via `@aurochs-office/chart` |
| Images | [x] | [ ] | [ ] | `XlsxDrawing` |
| Sparklines | [x] | [ ] | [ ] | `XlsxSparklineGroup` |

---

## Advanced

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Tables (ListObject) | [x] | [x] | [ ] | `XlsxTable` |
| Pivot Tables | [x] | [ ] | [ ] | `XlsxPivotTable` |
| Pivot Caches | [x] | [ ] | [ ] | `XlsxPivotCacheDefinition` |
| Defined Names | [x] | [x] | [ ] | `XlsxDefinedName` |
| Comments | [x] | [x] | [ ] | `XlsxComment` |
| Hyperlinks | [x] | [x] | [~] | `XlsxHyperlink` |
| Workbook Protection | [x] | [x] | N/A | `XlsxWorkbookProtection` |
| Sheet Protection | [x] | [x] | N/A | `XlsxSheetProtection` |
| Theme | [x] | [ ] | [x] | `XlsxTheme` - color/font resolution |

---

## VBA / Macros

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| VBA Project | [x] | [x] | N/A | Load from XLSM, edit in VBA editor |
| Macro Execution | [x] | [x] | N/A | Execute macros, apply mutations |

---

## Implementation Priority (依存の末端から)

依存関係分析に基づく実装順序：

### Priority 1: 末端（他から依存されない）
- [x] Print / Page Setup (Header/Footer, Margins, Page Setup, Print Options, Page Breaks)
- [x] Comments
- [x] Hyperlinks
- [x] Protection (Workbook/Sheet)

### Priority 2: 低依存
- [x] Auto Filter
- [x] Data Validation

### Priority 3: 中依存
- [x] Conditional Formatting
- [x] Freeze Panes / Split View
- [x] Tables (ListObject)
- [x] Defined Names

### Priority 4: 高依存（他機能のベース）
- [x] Row Height / Column Width
- [x] Hidden Rows/Cols
- [x] Outline Grouping

---

## References

- Domain types: `packages/@aurochs-office/xlsx/src/domain/workbook.ts`
- Page setup types: `packages/@aurochs-office/xlsx/src/domain/page-setup.ts`
- Editor UI: `packages/@aurochs-ui/xlsx-editor/src/components/`
- Builder: `packages/@aurochs-builder/xlsx/src/`
