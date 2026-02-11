# w:r (Run Properties)

ECMA-376-1:2016 Section 17.3.2 - Run Properties

Run (`w:r`) is an inline content region with uniform formatting.

## Checklist

### Font Styling

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Bold | `w:b` | ✅ | bold.spec.ts |
| Italic | `w:i` | ✅ | italic.spec.ts |
| Underline | `w:u` | ✅ | underline.spec.ts |
| Strike | `w:strike` | ✅ | strike.spec.ts |
| Double Strike | `w:dstrike` | ✅ | dstrike.spec.ts |
| Small Caps | `w:smallCaps` | ✅ | caps.spec.ts |
| All Caps | `w:caps` | ✅ | caps.spec.ts |
| Emboss | `w:emboss` | ✅ | text-effects.spec.ts |
| Imprint | `w:imprint` | ✅ | text-effects.spec.ts |
| Outline | `w:outline` | ✅ | text-effects.spec.ts |
| Shadow | `w:shadow` | ✅ | text-effects.spec.ts |

### Font Selection (w:rFonts) - Section 17.3.2.26

| Property | Attribute | Status | File |
|----------|-----------|:------:|------|
| ASCII font | `@ascii` | ✅ | font-family.spec.ts |
| High ANSI font | `@hAnsi` | ✅ | font-family.spec.ts |
| East Asian font | `@eastAsia` | ✅ | font-east-asian.spec.ts |
| Complex Script font | `@cs` | ✅ | font-complex-script.spec.ts |
| Theme font | `@asciiTheme` | ⬚ | |

### Font Metrics

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Font Size | `w:sz` | ✅ | font-size.spec.ts |
| Complex Script Size | `w:szCs` | ⬚ | |
| Character Spacing | `w:spacing` | ✅ | letter-spacing.spec.ts |
| Kerning | `w:kern` | ✅ | kerning.spec.ts |
| Position (raise/lower) | `w:position` | ✅ | position.spec.ts |
| Subscript/Superscript | `w:vertAlign` | ✅ | vertical-align.spec.ts |

### Color & Shading

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Color | `w:color` | ✅ | color.spec.ts |
| Highlight | `w:highlight` | ✅ | highlight.spec.ts |
| Shading | `w:shd` | ⬚ | |

### Complex Script / RTL (Section 17.3.2)

| Property | Element | Status | File |
|----------|---------|:------:|------|
| RTL run | `w:rtl` | ✅ | rtl.spec.ts |
| Complex Script Bold | `w:bCs` | ✅ | arabic.spec.ts |
| Complex Script Italic | `w:iCs` | ✅ | hebrew.spec.ts |

### Script-Specific Test Cases

| Script | Direction | Status | File |
|--------|-----------|:------:|------|
| Latin (English) | LTR | ✅ | bold.spec.ts |
| Japanese (日本語) | LTR | ✅ | japanese.spec.ts |
| Arabic (العربية) | RTL | ✅ | arabic.spec.ts |
| Hebrew (עברית) | RTL | ✅ | hebrew.spec.ts |
| Mixed LTR+RTL | Bidi | ✅ | mixed-bidi.spec.ts |

## Legend

- ✅ Tested
- ⬚ Not implemented
