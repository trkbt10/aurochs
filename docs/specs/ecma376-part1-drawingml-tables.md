# ECMA-376 Part 1: DrawingML - Tables

## Overview

This document describes DrawingML Table elements as specified in ECMA-376 Part 1, Chapter 21.1.3, covering table structure, cells, borders, and styling.

Checklist source: `docs/specs/ecma376-drawingml-tables.checklist.md`

**Sources:** See `docs/specs/ecma376-part1-drawingml-main.md` (shared DrawingML references).

---

## Namespace

See `docs/specs/ecma376-part1-drawingml-main.md` (shared DrawingML namespace).

---

## Code Locations

| Feature          | File                              | Function                 |
| ---------------- | --------------------------------- | ------------------------ |
| Table parsing    | `src/pptx/parser/table-parser.ts` | `parseTable()`           |
| Table properties | `src/pptx/parser/table-parser.ts` | `parseTableProperties()` |
| Table grid       | `src/pptx/parser/table-parser.ts` | `parseTableGrid()`       |
| Table row        | `src/pptx/parser/table-parser.ts` | `parseTableRow()`        |
| Table cell       | `src/pptx/parser/table-parser.ts` | `parseTableCell()`       |
| Cell properties  | `src/pptx/parser/table-parser.ts` | `parseCellProperties()`  |
| Cell borders     | `src/pptx/parser/table-parser.ts` | `parseCellBorders()`     |

---

## References

1. ECMA-376 Part 1, Chapter 21.1.3: DrawingML - Tables
2. [MS-ODRAWXML]: See `docs/specs/ecma376-part1-drawingml-main.md`
