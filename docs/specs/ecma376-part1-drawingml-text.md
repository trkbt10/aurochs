# ECMA-376 Part 1: DrawingML - Text

## Overview

This document describes DrawingML text elements as specified in ECMA-376 Part 1, Chapter 21, covering text body, paragraphs, runs, and text formatting.

Checklist source: `docs/specs/ecma376-drawingml-text.checklist.md`

**Sources:** See `docs/specs/ecma376-part1-drawingml-main.md` (shared DrawingML references).

---

## Namespace

See `docs/specs/ecma376-part1-drawingml-main.md` (shared DrawingML namespace).

---

## Code Locations

| Feature           | File                                   | Function                |
| ----------------- | -------------------------------------- | ----------------------- |
| Text body parsing | `src/pptx/parser/text-parser.ts`       | `parseTextBody()`       |
| Body properties   | `src/pptx/parser/text-parser.ts`       | `parseBodyProperties()` |
| Paragraph parsing | `src/pptx/parser/text-parser.ts`       | `parseParagraph()`      |
| Run properties    | `src/pptx/parser/text-parser.ts`       | `parseRunProperties()`  |
| Style resolution  | `src/pptx/parser/text-style-resolver/` | Various                 |

---

## References

1. ECMA-376 Part 1, Chapter 21: DrawingML - Text
2. [MS-ODRAWXML]: See `docs/specs/ecma376-part1-drawingml-main.md`
