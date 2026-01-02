# ECMA-376 Part 1: DrawingML - Diagrams (SmartArt)

## Overview

This document describes DrawingML Diagram elements as specified in ECMA-376 Part 1, Chapter 21.4, covering SmartArt diagrams and their rendered shapes.

Checklist source: `docs/specs/ecma376-drawingml-diagrams.checklist.md`

**Sources:** See `docs/specs/ecma376-part1-drawingml-main.md` (shared DrawingML references).

---

## Namespaces

### Diagram Data

```
http://schemas.openxmlformats.org/drawingml/2006/diagram
```

Prefix: `dgm:`

### Diagram Drawing (Office Extensions)

```
http://schemas.microsoft.com/office/drawing/2008/diagram
```

Prefix: `dsp:`

---

## Implementation Approach

### Strategy

Instead of parsing and laying out diagrams from scratch, this implementation:

1. Parses the **pre-rendered drawing** file (`drawing#.xml`)
2. Maps diagram-specific elements (`dsp:*`, `dgm:*`) to standard elements (`p:*`)
3. Uses the standard shape parser for rendering

### Element Mapping

| Diagram Element | Mapped To  | Notes                 |
| --------------- | ---------- | --------------------- |
| `dsp:sp`        | `p:sp`     | Standard shape        |
| `dgm:sp`        | `p:sp`     | Standard shape        |
| `dsp:pic`       | `p:pic`    | Picture               |
| `dsp:grpSp`     | `p:grpSp`  | Group shape           |
| `dsp:cxnSp`     | `p:cxnSp`  | Connector             |
| `dsp:nvSpPr`    | `p:nvSpPr` | Non-visual properties |
| `dsp:spPr`      | `p:spPr`   | Shape properties      |
| `dsp:txBody`    | `p:txBody` | Text body             |
| `dsp:style`     | `p:style`  | Shape style           |

### Diagram-Specific Extensions

---

## Code Locations

| Feature                 | File                                   | Function                 |
| ----------------------- | -------------------------------------- | ------------------------ |
| Diagram drawing parsing | `src/pptx/parser/diagram-parser.ts`    | `parseDiagramDrawing()`  |
| Element mapping         | `src/pptx/parser/diagram-parser.ts`    | `mapDiagramElement()`    |
| Diagram attributes      | `src/pptx/parser/diagram-parser.ts`    | `addDiagramAttributes()` |
| Text transform          | `src/pptx/parser/diagram-parser.ts`    | `parseTextTransform()`   |
| Diagram loading         | `src/pptx/parser/diagram-parser.ts`    | `loadDiagram()`          |
| Diagram transform       | `src/pptx/parser/diagram-transform.ts` | Various                  |

---

## References

1. ECMA-376 Part 1, Chapter 21.4: DrawingML - Diagrams
2. [MS-ODRAWXML]: See `docs/specs/ecma376-part1-drawingml-main.md`
3. [MS-OE376]: Office Implementation Information for ECMA-376 Standards Support
