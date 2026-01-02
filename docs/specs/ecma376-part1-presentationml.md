# ECMA-376 Part 1: PresentationML

## Overview

This document describes PresentationML elements as specified in ECMA-376 Part 1, Chapter 19, and their implementation status in this codebase.

Checklist source: `docs/specs/ecma376-presentationml.checklist.md`

**Sources:**

- [ECMA-376 Part 1 Specification](https://ecma-international.org/publications-and-standards/standards/ecma-376/)
- [MS-OE376: Office Implementation Information](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/)
- [MS-ODRAWXML: Office Drawing Extensions to Office Open XML Structure](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-odrawxml/)

---

## Namespace

```
http://schemas.openxmlformats.org/presentationml/2006/main
```

Prefix: `p:`

---

## Code Locations

| Feature            | File                                     | Function             |
| ------------------ | ---------------------------------------- | -------------------- |
| Slide parsing      | `src/pptx/parser/slide-parser.ts`        | `parseSlide()`       |
| Layout parsing     | `src/pptx/parser/slide-parser.ts`        | `parseSlideLayout()` |
| Master parsing     | `src/pptx/parser/slide-parser.ts`        | `parseSlideMaster()` |
| Shape tree parsing | `src/pptx/parser/shape-parser/index.ts`  | `parseShapeTree()`   |
| Shape parsing      | `src/pptx/parser/shape-parser/*.ts`      | Various              |
| Timing parsing     | `src/pptx/parser/timing-parser/index.ts` | `parseTiming()`      |

---

## References

1. ECMA-376 Part 1, Chapter 19: PresentationML
2. [MS-PPTX]: PowerPoint (.pptx) Extensions to the Office Open XML File Format
3. [MS-ODRAWXML]: Office Drawing Extensions to Office Open XML Structure
