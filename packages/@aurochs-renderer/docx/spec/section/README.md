# w:sectPr (Section Properties)

ECMA-376-1:2016 Section 17.6 - Section Properties

Section properties define page layout, margins, headers/footers, and columns.

## Checklist

### Page Size (w:pgSz) - Section 17.6.13

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Width | `@w` | ✅ | page-size.spec.ts |
| Height | `@h` | ✅ | page-size.spec.ts |
| Orientation | `@orient` | ✅ | page-size.spec.ts |

### Page Margins (w:pgMar) - Section 17.6.11

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Top | `@top` | ✅ | page-margins.spec.ts |
| Bottom | `@bottom` | ✅ | page-margins.spec.ts |
| Left | `@left` | ✅ | page-margins.spec.ts |
| Right | `@right` | ✅ | page-margins.spec.ts |
| Header | `@header` | ✅ | header-footer-margins.spec.ts |
| Footer | `@footer` | ✅ | header-footer-margins.spec.ts |
| Gutter | `@gutter` | ✅ | gutter-margin.spec.ts |

### Headers and Footers - Section 17.10

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Default Header | `w:headerReference` | ✅ | header-default.spec.ts |
| First Page Header | `w:headerReference/@type=first` | ✅ | header-first.spec.ts |
| Odd/Even Header | `w:headerReference/@type=even` | ✅ | header-even.spec.ts |
| Default Footer | `w:footerReference` | ✅ | footer-default.spec.ts |
| First Page Footer | `w:footerReference/@type=first` | ✅ | footer-first.spec.ts |
| Odd/Even Footer | `w:footerReference/@type=even` | ✅ | footer-even.spec.ts |

### Columns (w:cols) - Section 17.6.4

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Number of Columns | `@num` | ✅ | columns.spec.ts |
| Equal Width | `@equalWidth` | ✅ | columns.spec.ts |
| Column Spacing | `@space` | ✅ | columns.spec.ts |

### Page Numbers (w:pgNumType) - Section 17.6.12

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Format | `@fmt` | ✅ | page-numbering.spec.ts |
| Start | `@start` | ✅ | page-numbering.spec.ts |

### Section Breaks (w:type) - Section 17.6.22

| Value | Status | File |
|-------|:------:|------|
| nextPage | ✅ | section-break.spec.ts |
| continuous | ✅ | section-break-continuous.spec.ts |
| evenPage | ✅ | section-break-evenpage.spec.ts |
| oddPage | ✅ | section-break-oddpage.spec.ts |

### Title Page (w:titlePg) - Section 17.6.19

| Property | Status | File |
|----------|:------:|------|
| Title Page | ✅ | title-page.spec.ts |

## Legend

- ✅ Tested
- ⬚ Not implemented
