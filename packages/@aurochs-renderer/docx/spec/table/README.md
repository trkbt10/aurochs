# w:tbl (Table)

ECMA-376-1:2016 Section 17.4 - Tables

Tables consist of rows and cells with properties for borders, shading, and sizing.

## Checklist

### Table Properties (w:tblPr) - Section 17.4.60

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Width | `w:tblW` | ✅ | table-width.spec.ts |
| Alignment | `w:jc` | ✅ | table-alignment.spec.ts |
| Indent | `w:tblInd` | ✅ | table-indent.spec.ts |
| Borders | `w:tblBorders` | ✅ | table-borders.spec.ts |
| Shading | `w:shd` | ✅ | table-shading.spec.ts |
| Cell Margins | `w:tblCellMar` | ✅ | table-cell-margins.spec.ts |
| Layout | `w:tblLayout` | ✅ | table-layout.spec.ts |

### Row Properties (w:trPr) - Section 17.4.82

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Height | `w:trHeight` | ✅ | table-row-height.spec.ts |
| Header Row | `w:tblHeader` | ✅ | table-header-row.spec.ts |
| Can't Split | `w:cantSplit` | ✅ | table-row-cant-split.spec.ts |

### Cell Properties (w:tcPr) - Section 17.4.66

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Width | `w:tcW` | ✅ | basic-table.spec.ts |
| Borders | `w:tcBorders` | ✅ | table-cell-borders.spec.ts |
| Shading | `w:shd` | ✅ | table-cell-shading.spec.ts |
| Vertical Align | `w:vAlign` | ✅ | table-cell-valign.spec.ts |
| Text Direction | `w:textDirection` | ✅ | table-cell-text-direction.spec.ts |
| No Wrap | `w:noWrap` | ✅ | table-cell-no-wrap.spec.ts |

### Cell Merging

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Horizontal Span | `w:gridSpan` | ✅ | table-cell-merge.spec.ts |
| Vertical Merge | `w:vMerge` | ✅ | table-cell-merge.spec.ts |

### RTL Tables

| Scenario | Status | File |
|----------|:------:|------|
| RTL Table Direction | ✅ | table-bidi.spec.ts |
| Mixed LTR/RTL Cells | ✅ | table-mixed-bidi.spec.ts |

## Known Issues

- Table-level borders (`w:tblBorders`) are parsed but not fully rendered as SVG lines
- Cells following `w:vMerge` continue may have incorrect column positioning

## Legend

- ✅ Tested
- ⬚ Not implemented
