# ECMA-376 Part 1: DrawingML - Charts

## Overview

This document describes DrawingML Chart elements as specified in ECMA-376 Part 1, Chapter 21.2, covering chart types, axes, series, and data labels.

Checklist source: `docs/specs/ecma376-drawingml-charts.checklist.md`

**Sources:**

- [ECMA-376 Part 1 Specification](https://ecma-international.org/publications-and-standards/standards/ecma-376/)
- [MS-OI29500: Office Implementation Information](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/)

---

## Namespace

```
http://schemas.openxmlformats.org/drawingml/2006/chart
```

Prefix: `c:`

---

## Code Locations

| Feature        | File                                             | Function               |
| -------------- | ------------------------------------------------ | ---------------------- |
| Chart parsing  | `src/pptx/parser/chart-parser/index.ts`          | `parseChart()`         |
| Axis parsing   | `src/pptx/parser/chart-parser/axis.ts`           | `parseAxes()`          |
| Series parsing | `src/pptx/parser/chart-parser/series/*.ts`       | Various                |
| Data reference | `src/pptx/parser/chart-parser/data-reference.ts` | `parseDataReference()` |
| Components     | `src/pptx/parser/chart-parser/components.ts`     | Various                |
| Layout         | `src/pptx/parser/chart-parser/layout.ts`         | `parseLayout()`        |
| Title/Legend   | `src/pptx/parser/chart-parser/title-legend.ts`   | Various                |

---

## References

1. ECMA-376 Part 1, Chapter 21.2: DrawingML Charts
2. [MS-OI29500]: Office Implementation Information for ECMA-376 Standards Support
