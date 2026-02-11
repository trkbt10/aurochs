# w:r (Run Properties)

ECMA-376-1:2016 Section 17.3.2 - Run Properties

Run (`w:r`) is an inline content region with uniform formatting.

## Checklist

### Font Styling

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Bold | `w:b` | ✅ | bold.spec.ts |
| Italic | `w:i` | ✅ | italic.spec.ts |
| Underline | `w:u` | ⬚ | |
| Strike | `w:strike` | ⬚ | |
| Double Strike | `w:dstrike` | ⬚ | |
| Small Caps | `w:smallCaps` | ⬚ | |
| All Caps | `w:caps` | ⬚ | |
| Emboss | `w:emboss` | ⬚ | |
| Imprint | `w:imprint` | ⬚ | |
| Outline | `w:outline` | ⬚ | |
| Shadow | `w:shadow` | ⬚ | |

### Font Selection (w:rFonts) - Section 17.3.2.26

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| ASCII font | `@ascii` | ⬚ | |
| High ANSI font | `@hAnsi` | ⬚ | |
| East Asian font | `@eastAsia` | ⬚ | |
| Complex Script font | `@cs` | ⬚ | |
| Theme font | `@asciiTheme` | ⬚ | |

### Font Metrics

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Font Size | `w:sz` | ⬚ | |
| Complex Script Size | `w:szCs` | ⬚ | |
| Character Spacing | `w:spacing` | ⬚ | |
| Kerning | `w:kern` | ⬚ | |
| Position (raise/lower) | `w:position` | ⬚ | |
| Subscript/Superscript | `w:vertAlign` | ⬚ | |

### Color & Shading

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Color | `w:color` | ⬚ | |
| Highlight | `w:highlight` | ⬚ | |
| Shading | `w:shd` | ⬚ | |

### Complex Script / RTL (Section 17.3.2)

| Property | Element | Status | File |
|----------|---------|:------:|------|
| RTL run | `w:rtl` | ⬚ | |
| Complex Script Bold | `w:bCs` | ⬚ | |
| Complex Script Italic | `w:iCs` | ⬚ | |

### Script-Specific Test Cases

| Script | Direction | Status | File |
|--------|-----------|:------:|------|
| Latin (English) | LTR | ✅ | bold.spec.ts |
| Japanese (日本語) | LTR | ⬚ | |
| Arabic (العربية) | RTL | ⬚ | |
| Hebrew (עברית) | RTL | ⬚ | |
| Mixed LTR+RTL | Bidi | ⬚ | |

## Fixture Format

```json
{
  "content": [
    {
      "type": "paragraph",
      "runs": [
        { "text": "normal " },
        { "text": "styled", "bold": true }
      ]
    }
  ]
}
```

## Legend

- ✅ Tested
- ⬚ Not implemented
