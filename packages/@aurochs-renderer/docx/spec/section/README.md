# w:sectPr (Section Properties)

ECMA-376-1:2016 Section 17.6 - Section Properties

Section properties define page layout, margins, headers/footers, and columns.

## Checklist

### Page Size (w:pgSz) - Section 17.6.13

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Width | `@w` | ⬚ | |
| Height | `@h` | ⬚ | |
| Orientation | `@orient` | ⬚ | |

### Page Margins (w:pgMar) - Section 17.6.11

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Top | `@top` | ⬚ | |
| Bottom | `@bottom` | ⬚ | |
| Left | `@left` | ⬚ | |
| Right | `@right` | ⬚ | |
| Header | `@header` | ⬚ | |
| Footer | `@footer` | ⬚ | |
| Gutter | `@gutter` | ⬚ | |

### Headers and Footers - Section 17.10

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Default Header | `w:headerReference` | ⬚ | |
| First Page Header | `w:headerReference/@type=first` | ⬚ | |
| Odd/Even Header | `w:headerReference/@type=even` | ⬚ | |
| Default Footer | `w:footerReference` | ⬚ | |
| First Page Footer | `w:footerReference/@type=first` | ⬚ | |
| Odd/Even Footer | `w:footerReference/@type=even` | ⬚ | |

### Columns (w:cols) - Section 17.6.4

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Number of Columns | `@num` | ⬚ | |
| Equal Width | `@equalWidth` | ⬚ | |
| Column Spacing | `@space` | ⬚ | |

### Page Numbers (w:pgNumType) - Section 17.6.12

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Format | `@fmt` | ⬚ | |
| Start | `@start` | ⬚ | |

### Section Breaks (w:type) - Section 17.6.22

| Value | Status | File |
|-------|:------:|------|
| nextPage | ⬚ | |
| continuous | ⬚ | |
| evenPage | ⬚ | |
| oddPage | ⬚ | |

## Legend

- ✅ Tested
- ⬚ Not implemented
