# w:p (Paragraph Properties)

ECMA-376-1:2016 Section 17.3.1 - Paragraph Properties

Paragraph (`w:p`) is a block-level element containing runs and other inline content.

## Checklist

### Alignment (w:jc) - Section 17.3.1.13

| Value | Description | Status | File |
|-------|-------------|:------:|------|
| left | Left align (LTR default) | ✅ | alignment-left.spec.ts |
| center | Center align | ✅ | alignment.spec.ts |
| right | Right align | ✅ | alignment-right.spec.ts |
| both | Justify | ✅ | alignment-justify.spec.ts |
| distribute | Distribute (East Asian) | ✅ | alignment-distribute.spec.ts |
| start | Start edge (bidi-aware) | ✅ | alignment-start.spec.ts |
| end | End edge (bidi-aware) | ✅ | alignment-end.spec.ts |

### Spacing (w:spacing) - Section 17.3.1.33

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Before | `@before` | ✅ | spacing.spec.ts |
| After | `@after` | ✅ | spacing.spec.ts |
| Line | `@line` | ✅ | line-spacing.spec.ts |
| Line Rule | `@lineRule` | ✅ | line-spacing.spec.ts |
| Before Auto | `@beforeAutospacing` | ✅ | spacing-auto.spec.ts |
| After Auto | `@afterAutospacing` | ✅ | spacing-auto.spec.ts |

### Indentation (w:ind) - Section 17.3.1.12

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Left | `@left` | ✅ | indent.spec.ts |
| Right | `@right` | ✅ | indent-right.spec.ts |
| First Line | `@firstLine` | ✅ | indent.spec.ts |
| Hanging | `@hanging` | ✅ | indent.spec.ts |
| Start (bidi) | `@start` | ✅ | indent-bidi.spec.ts |
| End (bidi) | `@end` | ✅ | indent-bidi.spec.ts |

### Borders (w:pBdr) - Section 17.3.1.24

| Edge | Status | File |
|------|:------:|------|
| Top | ✅ | borders.spec.ts |
| Bottom | ✅ | borders.spec.ts |
| Left | ✅ | borders.spec.ts |
| Right | ✅ | borders.spec.ts |
| Between | ✅ | borders.spec.ts |

### Bidirectional / RTL - Section 17.3.1.6

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Bidi paragraph | `w:bidi` | ✅ | bidi.spec.ts |
| Text direction | `w:textDirection` | ✅ | text-direction.spec.ts |

### Script-Specific Test Cases

| Script | Direction | Status | File |
|--------|-----------|:------:|------|
| Latin (English) | LTR | ✅ | alignment.spec.ts |
| Japanese (日本語) | LTR | ✅ | japanese-para.spec.ts |
| Arabic paragraph (العربية) | RTL | ✅ | arabic-para.spec.ts |
| Hebrew paragraph (עברית) | RTL | ✅ | hebrew-para.spec.ts |
| Mixed paragraph | Bidi | ✅ | mixed-bidi-para.spec.ts |
| RTL + left align | RTL | ✅ | rtl-alignment.spec.ts |
| RTL + right align | RTL | ✅ | rtl-alignment.spec.ts |

### Other Properties

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Shading | `w:shd` | ✅ | shading.spec.ts |
| Tab Stops | `w:tabs` | ✅ | tab-stops.spec.ts |
| Keep Next | `w:keepNext` | ✅ | keep-properties.spec.ts |
| Keep Lines | `w:keepLines` | ✅ | keep-properties.spec.ts |
| Page Break Before | `w:pageBreakBefore` | ✅ | keep-properties.spec.ts |
| Widow/Orphan | `w:widowControl` | ✅ | widow-control.spec.ts |
| Outline Level | `w:outlineLvl` | ✅ | outline-level.spec.ts |

## Legend

- ✅ Tested
- ⬚ Not implemented
