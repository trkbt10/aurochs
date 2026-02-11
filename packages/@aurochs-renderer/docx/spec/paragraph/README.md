# w:p (Paragraph Properties)

ECMA-376-1:2016 Section 17.3.1 - Paragraph Properties

Paragraph (`w:p`) is a block-level element containing runs and other inline content.

## Checklist

### Alignment (w:jc) - Section 17.3.1.13

| Value | Description | Status | File |
|-------|-------------|:------:|------|
| left | Left align (LTR default) | ⬚ | |
| center | Center align | ✅ | alignment.spec.ts |
| right | Right align | ⬚ | |
| both | Justify | ⬚ | |
| distribute | Distribute (East Asian) | ⬚ | |
| start | Start edge (bidi-aware) | ⬚ | |
| end | End edge (bidi-aware) | ⬚ | |

### Spacing (w:spacing) - Section 17.3.1.33

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Before | `@before` | ⬚ | |
| After | `@after` | ⬚ | |
| Line | `@line` | ⬚ | |
| Line Rule | `@lineRule` | ⬚ | |
| Before Auto | `@beforeAutospacing` | ⬚ | |
| After Auto | `@afterAutospacing` | ⬚ | |

### Indentation (w:ind) - Section 17.3.1.12

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| Left | `@left` | ⬚ | |
| Right | `@right` | ⬚ | |
| First Line | `@firstLine` | ⬚ | |
| Hanging | `@hanging` | ⬚ | |
| Start (bidi) | `@start` | ⬚ | |
| End (bidi) | `@end` | ⬚ | |

### Borders (w:pBdr) - Section 17.3.1.24

| Edge | Status | File |
|------|:------:|------|
| Top | ⬚ | |
| Bottom | ⬚ | |
| Left | ⬚ | |
| Right | ⬚ | |
| Between | ⬚ | |

### Bidirectional / RTL - Section 17.3.1.6

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Bidi paragraph | `w:bidi` | ⬚ | |
| Text direction | `w:textDirection` | ⬚ | |

### Script-Specific Test Cases

| Script | Direction | Status | File |
|--------|-----------|:------:|------|
| Latin (English) | LTR | ✅ | alignment.spec.ts |
| Japanese (日本語) | LTR | ⬚ | |
| Arabic paragraph (العربية) | RTL | ⬚ | |
| Hebrew paragraph (עברית) | RTL | ⬚ | |
| Mixed paragraph | Bidi | ⬚ | |
| RTL + left align | RTL | ⬚ | |
| RTL + right align | RTL | ⬚ | |

### Other Properties

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Shading | `w:shd` | ⬚ | |
| Tab Stops | `w:tabs` | ⬚ | |
| Keep Next | `w:keepNext` | ⬚ | |
| Keep Lines | `w:keepLines` | ⬚ | |
| Page Break Before | `w:pageBreakBefore` | ⬚ | |
| Widow/Orphan | `w:widowControl` | ⬚ | |
| Outline Level | `w:outlineLvl` | ⬚ | |

## Fixture Format

```json
{
  "content": [
    {
      "type": "paragraph",
      "alignment": "center",
      "runs": [{ "text": "Centered" }]
    }
  ]
}
```

### RTL Fixture Example

```json
{
  "content": [
    {
      "type": "paragraph",
      "bidi": true,
      "runs": [{ "text": "مرحبا بالعالم", "rtl": true }]
    }
  ]
}
```

## Legend

- ✅ Tested
- ⬚ Not implemented
