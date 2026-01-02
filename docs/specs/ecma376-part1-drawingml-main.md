# ECMA-376 Part 1: DrawingML - Main

## Overview

This document describes DrawingML elements as specified in ECMA-376 Part 1, Chapter 20, covering fill, line, effects, geometry, and text properties.

Checklist source: `docs/specs/ecma376-drawingml-main.checklist.md`

**Sources:**

- [ECMA-376 Part 1 Specification](https://ecma-international.org/publications-and-standards/standards/ecma-376/)
- [MS-ODRAWXML: Office Drawing Extensions](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-odrawxml/)

---

## Namespace

```
http://schemas.openxmlformats.org/drawingml/2006/main
```

Prefix: `a:`

---

## Code Locations

| Feature           | File                                  | Function           |
| ----------------- | ------------------------------------- | ------------------ |
| Fill parsing      | `src/pptx/parser/fill-parser.ts`      | `parseFill()`      |
| Line parsing      | `src/pptx/parser/line-parser.ts`      | `parseLine()`      |
| Effects parsing   | `src/pptx/parser/effects-parser.ts`   | `parseEffects()`   |
| Color parsing     | `src/pptx/parser/color-parser.ts`     | `parseColor()`     |
| Geometry parsing  | `src/pptx/parser/geometry-parser.ts`  | `parseGeometry()`  |
| Transform parsing | `src/pptx/parser/transform-parser.ts` | `parseTransform()` |

---

## References

1. ECMA-376 Part 1, Chapter 20: DrawingML - Framework
2. [MS-ODRAWXML]: Office Drawing Extensions to Office Open XML Structure
