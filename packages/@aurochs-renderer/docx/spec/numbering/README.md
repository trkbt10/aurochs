# w:numPr (Numbering)

ECMA-376-1:2016 Section 17.9 - Numbering

Numbering defines bullet lists, numbered lists, and multi-level lists.

## Checklist

### Numbering Reference (w:numPr) - Section 17.3.1.19

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Numbering ID | `w:numId` | ✅ | bullet-list.spec.ts |
| Level | `w:ilvl` | ✅ | multilevel-list.spec.ts |

### List Types

| Type | Status | File |
|------|:------:|------|
| Bullet List | ✅ | bullet-list.spec.ts |
| Numbered List (decimal) | ✅ | numbered-list.spec.ts |
| Numbered List (roman) | ✅ | numbered-roman.spec.ts |
| Numbered List (letter) | ✅ | numbered-letter.spec.ts |
| Multi-level List | ✅ | multilevel-list.spec.ts |

### Level Properties (w:lvl) - Section 17.9.6

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Start Value | `w:start` | ✅ | numbered-list.spec.ts |
| Number Format | `w:numFmt` | ✅ | numbered-list.spec.ts |
| Level Text | `w:lvlText` | ✅ | numbered-list.spec.ts |
| Justification | `w:lvlJc` | ✅ | numbered-list.spec.ts |
| Indentation | `w:ind` | ✅ | multilevel-list.spec.ts |

### RTL Numbering

| Scenario | Status | File |
|----------|:------:|------|
| Arabic Numbering | ✅ | arabic-numbering.spec.ts |
| Hebrew Numbering | ✅ | hebrew-numbering.spec.ts |
| RTL List Direction | ✅ | arabic-numbering.spec.ts |

## Legend

- ✅ Tested
- ⬚ Not implemented
