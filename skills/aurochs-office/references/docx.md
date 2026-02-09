# DOCX Reference

## Command details

### info / list / show

```bash
npx aurochs docx info report.docx           # Paragraph count, table count, section count
npx aurochs docx list report.docx           # Section list (paragraph count summary)
npx aurochs docx show report.docx 1         # Section content
npx aurochs docx show report.docx 1 -o json # Structured data
```

### extract

```bash
npx aurochs docx extract report.docx                  # All text
npx aurochs docx extract report.docx --sections 1,3-5 # Specific sections
npx aurochs docx extract report.docx -o json           # JSON format
```

### styles

```bash
npx aurochs docx styles report.docx                    # All styles
npx aurochs docx styles report.docx --type paragraph   # Paragraph styles only
npx aurochs docx styles report.docx --type character   # Character styles only
npx aurochs docx styles report.docx --type table       # Table styles only
npx aurochs docx styles report.docx --all              # Including hidden styles
```

### Structure commands

```bash
npx aurochs docx numbering report.docx        # Numbering definitions (lists/bullets)
npx aurochs docx headers-footers report.docx   # Headers/footers
npx aurochs docx tables report.docx            # Table structure
npx aurochs docx comments report.docx          # Comments
npx aurochs docx images report.docx            # Embedded image info
npx aurochs docx toc report.docx               # Table of contents (outline level based)
```

### build / patch / verify

```bash
npx aurochs docx build spec.json              # Build DOCX from spec
npx aurochs docx patch spec.json              # Patch existing DOCX
npx aurochs docx verify test.json             # Run verification test
npx aurochs docx verify tests/ --tag basic    # Run tests with tag filter
```

### preview

```bash
npx aurochs docx preview report.docx             # All sections
npx aurochs docx preview report.docx 1            # Specific section
npx aurochs docx preview report.docx --width 120  # Specify width
```

---

## Build spec

Top-level `DocxBuildSpec` structure:

| Field | Type | Description |
|-------|------|-------------|
| `"output"` | `string` | Output file path |
| `"content"` | `BlockContentSpec[]` | Array of paragraphs and tables |
| `"numbering"` | `NumberingDefinitionSpec[]` | Optional numbering definitions |
| `"styles"` | `StyleSpec[]` | Optional custom styles |
| `"section"` | `SectionSpec` | Optional section properties (page size, margins) |

`"content"` contains `ParagraphSpec` (with `"type": "paragraph"`) or `TableSpec` (with `"type": "table"`).

---

## Run spec

A run is a contiguous piece of text with uniform formatting.

| Field | Type | Description |
|-------|------|-------------|
| `"text"` | `string` | Text content (required) |
| `"bold"` | `boolean` | Bold formatting |
| `"italic"` | `boolean` | Italic formatting |
| `"underline"` | `boolean \| string` | Underline (true for single, or style name) |
| `"strikethrough"` | `boolean` | Strikethrough |
| `"fontSize"` | `number` | Font size in half-points |
| `"fontFamily"` | `string` | Font family name |
| `"color"` | `string` | Text color (hex, e.g. `"FF0000"`) |
| `"highlight"` | `string` | Highlight color name |
| `"vertAlign"` | `"superscript" \| "subscript"` | Vertical alignment |
| `"smallCaps"` | `boolean` | Small capitals |
| `"allCaps"` | `boolean` | All capitals |

---

## Paragraph spec

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"paragraph"` | Discriminator (required) |
| `"style"` | `string` | Style ID reference |
| `"alignment"` | `"left" \| "center" \| "right" \| "both"` | Paragraph alignment |
| `"spacing"` | `object` | `"before"`, `"after"` (twips), `"line"`, `"lineRule"` |
| `"indent"` | `object` | `"left"`, `"right"`, `"firstLine"`, `"hanging"` (twips) |
| `"numbering"` | `object` | `"numId"` and `"ilvl"` for list numbering |
| `"keepNext"` | `boolean` | Keep with next paragraph |
| `"keepLines"` | `boolean` | Keep all lines on same page |
| `"pageBreakBefore"` | `boolean` | Start on new page |
| `"runs"` | `RunSpec[]` | Array of text runs (required) |

---

## Table spec

### TableSpec

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"table"` | Discriminator (required) |
| `"style"` | `string` | Table style ID |
| `"width"` | `object` | `"value"` + `"type"` (`"dxa"`, `"pct"`, `"auto"`) |
| `"alignment"` | `"left" \| "center" \| "right"` | Table alignment |
| `"borders"` | `object` | `"top"`, `"left"`, `"bottom"`, `"right"`, `"insideH"`, `"insideV"` |
| `"grid"` | `number[]` | Column widths in twips |
| `"rows"` | `TableRowSpec[]` | Array of rows (required) |

### Table row spec

| Field | Type | Description |
|-------|------|-------------|
| `"cells"` | `TableCellSpec[]` | Array of cells (required) |
| `"height"` | `object` | `"value"` (twips) + `"rule"` (`"auto"`, `"atLeast"`, `"exact"`) |
| `"header"` | `boolean` | Repeat as header row |

### Table cell spec

| Field | Type | Description |
|-------|------|-------------|
| `"content"` | `ParagraphSpec[]` | Cell content (required) |
| `"width"` | `object` | `"value"` + `"type"` (`"dxa"`, `"pct"`, `"auto"`) |
| `"gridSpan"` | `number` | Horizontal merge span |
| `"vMerge"` | `"restart" \| "continue"` | Vertical merge |
| `"shading"` | `string` | Background color (hex) |
| `"vAlign"` | `"top" \| "center" \| "bottom"` | Vertical alignment |
| `"borders"` | `object` | Cell border overrides |

### Border edge spec

| Field | Type | Description |
|-------|------|-------------|
| `"style"` | `string` | Border style (e.g. `"single"`, `"double"`, `"dashed"`) |
| `"size"` | `number` | Border width in eighth-points |
| `"color"` | `string` | Border color (hex) |

---

## Numbering spec

### Numbering definition spec

| Field | Type | Description |
|-------|------|-------------|
| `"abstractNumId"` | `number` | Abstract numbering definition ID (required) |
| `"numId"` | `number` | Numbering instance ID (required) |
| `"levels"` | `NumberingLevelSpec[]` | Level definitions (required) |

### Numbering level spec

| Field | Type | Description |
|-------|------|-------------|
| `"ilvl"` | `number` | Indentation level 0-8 (required) |
| `"numFmt"` | `string` | Number format: `"decimal"`, `"bullet"`, `"lowerLetter"`, etc. (required) |
| `"lvlText"` | `string` | Level text pattern, e.g. `"%1."` (required) |
| `"start"` | `number` | Starting number |
| `"lvlJc"` | `"left" \| "center" \| "right"` | Number justification |
| `"indent"` | `object` | `"left"` and `"hanging"` in twips |
| `"font"` | `string` | Font for bullet character |

---

## Style spec

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"paragraph" \| "character" \| "table"` | Style type (required) |
| `"styleId"` | `string` | Unique style identifier (required) |
| `"name"` | `string` | Display name (required) |
| `"basedOn"` | `string` | Parent style ID |
| `"next"` | `string` | Style for next paragraph |
| `"paragraph"` | `object` | Paragraph properties (same as ParagraphSpec without `"type"` and `"runs"`) |
| `"run"` | `object` | Run properties (same as RunSpec without `"text"`) |

---

## Section spec

| Field | Type | Description |
|-------|------|-------------|
| `"pageSize"` | `object` | `"w"`, `"h"` (twips), `"orient"` (`"portrait"` / `"landscape"`) |
| `"margins"` | `object` | `"top"`, `"right"`, `"bottom"`, `"left"`, `"header"`, `"footer"`, `"gutter"` (twips) |
| `"columns"` | `object` | `"num"`, `"space"` (twips), `"equalWidth"` |

---

## Patch spec

Top-level `DocxPatchSpec` for modifying existing documents:

| Field | Type | Description |
|-------|------|-------------|
| `"source"` | `string` | Source DOCX file path (required) |
| `"output"` | `string` | Output file path (required) |
| `"patches"` | `DocxPatch[]` | Array of patch operations (required) |

### content.append

Append content blocks to the end of the document.

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"content.append"` | Patch type |
| `"content"` | `BlockContentSpec[]` | Paragraphs/tables to append |

### content.insert

Insert content blocks at a specific position.

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"content.insert"` | Patch type |
| `"index"` | `number` | Insertion position (0-based) |
| `"content"` | `BlockContentSpec[]` | Paragraphs/tables to insert |

### content.delete

Delete content blocks.

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"content.delete"` | Patch type |
| `"index"` | `number` | Start position (0-based) |
| `"count"` | `number` | Number of blocks to delete (default: 1) |

### content.replace

Replace content blocks.

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"content.replace"` | Patch type |
| `"index"` | `number` | Start position (0-based) |
| `"count"` | `number` | Number of blocks to replace (default: 1) |
| `"content"` | `BlockContentSpec[]` | Replacement content |

### styles.append

Add custom styles to the document.

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"styles.append"` | Patch type |
| `"styles"` | `StyleSpec[]` | Styles to add |

### numbering.append

Add numbering definitions to the document.

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"numbering.append"` | Patch type |
| `"numbering"` | `NumberingDefinitionSpec[]` | Numbering definitions to add |

### section.update

Update section properties (page size, margins, columns).

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"section.update"` | Patch type |
| `"section"` | `SectionSpec` | Section properties to apply |

### text.replace

Find and replace text throughout the document.

| Field | Type | Description |
|-------|------|-------------|
| `"type"` | `"text.replace"` | Patch type |
| `"search"` | `string` | Text to find |
| `"replace"` | `string` | Replacement text |
| `"replaceAll"` | `boolean` | Replace all occurrences (default: false) |

---

## Verify spec

### TestCaseSpec

| Field | Type | Description |
|-------|------|-------------|
| `"name"` | `string` | Test case name (required) |
| `"description"` | `string` | Optional description |
| `"tags"` | `string[]` | Tags for filtering |
| `"input"` | `DocxBuildSpec` | Build spec to execute |
| `"expected"` | `ExpectedDocument` | Expected results |

### ExpectedDocument

| Field | Type | Description |
|-------|------|-------------|
| `"paragraphCount"` | `number` | Expected paragraph count |
| `"tableCount"` | `number` | Expected table count |
| `"sectionCount"` | `number` | Expected section count |
| `"hasStyles"` | `boolean` | Whether styles exist |
| `"hasNumbering"` | `boolean` | Whether numbering exists |

---

## Build examples

### Basic document with paragraphs

```json
{
  "output": "./output.docx",
  "content": [
    {
      "type": "paragraph",
      "runs": [{ "text": "Hello World", "bold": true, "fontSize": 28 }]
    },
    {
      "type": "paragraph",
      "alignment": "center",
      "runs": [
        { "text": "Normal text. " },
        { "text": "Italic text.", "italic": true }
      ]
    }
  ]
}
```

### Document with a table

```json
{
  "output": "./table-output.docx",
  "content": [
    {
      "type": "paragraph",
      "runs": [{ "text": "Sales Report" }]
    },
    {
      "type": "table",
      "width": { "value": 5000, "type": "pct" },
      "borders": {
        "top": { "style": "single", "size": 4, "color": "000000" },
        "left": { "style": "single", "size": 4, "color": "000000" },
        "bottom": { "style": "single", "size": 4, "color": "000000" },
        "right": { "style": "single", "size": 4, "color": "000000" },
        "insideH": { "style": "single", "size": 4, "color": "CCCCCC" },
        "insideV": { "style": "single", "size": 4, "color": "CCCCCC" }
      },
      "grid": [2500, 2500],
      "rows": [
        {
          "header": true,
          "cells": [
            {
              "content": [{ "type": "paragraph", "runs": [{ "text": "Item", "bold": true }] }],
              "shading": "EEEEEE",
              "vAlign": "center"
            },
            {
              "content": [{ "type": "paragraph", "runs": [{ "text": "Price", "bold": true }] }],
              "shading": "EEEEEE",
              "vAlign": "center"
            }
          ]
        },
        {
          "cells": [
            { "content": [{ "type": "paragraph", "runs": [{ "text": "Widget" }] }] },
            { "content": [{ "type": "paragraph", "alignment": "right", "runs": [{ "text": "$9.99" }] }] }
          ]
        }
      ]
    }
  ]
}
```

### Document with numbering

```json
{
  "output": "./numbered.docx",
  "numbering": [
    {
      "abstractNumId": 0,
      "numId": 1,
      "levels": [
        { "ilvl": 0, "numFmt": "decimal", "lvlText": "%1.", "start": 1, "lvlJc": "left", "indent": { "left": 720, "hanging": 360 } },
        { "ilvl": 1, "numFmt": "lowerLetter", "lvlText": "%2)", "start": 1, "indent": { "left": 1440, "hanging": 360 } }
      ]
    }
  ],
  "content": [
    { "type": "paragraph", "numbering": { "numId": 1, "ilvl": 0 }, "runs": [{ "text": "First item" }] },
    { "type": "paragraph", "numbering": { "numId": 1, "ilvl": 0 }, "runs": [{ "text": "Second item" }] },
    { "type": "paragraph", "numbering": { "numId": 1, "ilvl": 1 }, "runs": [{ "text": "Sub-item a" }] }
  ]
}
```

### Document with styles and section properties

```json
{
  "output": "./styled.docx",
  "styles": [
    {
      "type": "paragraph",
      "styleId": "Title",
      "name": "Title",
      "paragraph": { "alignment": "center", "spacing": { "after": 200 } },
      "run": { "bold": true, "fontSize": 48, "fontFamily": "Calibri" }
    },
    {
      "type": "character",
      "styleId": "Emphasis",
      "name": "Emphasis",
      "basedOn": "DefaultParagraphFont",
      "run": { "italic": true, "color": "0070C0" }
    }
  ],
  "section": {
    "pageSize": { "w": 12240, "h": 15840 },
    "margins": { "top": 1440, "right": 1440, "bottom": 1440, "left": 1440, "header": 720, "footer": 720, "gutter": 0 },
    "columns": { "num": 1 }
  },
  "content": [
    { "type": "paragraph", "style": "Title", "runs": [{ "text": "Document Title" }] },
    {
      "type": "paragraph",
      "spacing": { "before": 120, "after": 120, "line": 276, "lineRule": "auto" },
      "runs": [{ "text": "Body text with " }, { "text": "emphasis", "italic": true, "color": "0070C0" }]
    }
  ]
}
```

### Document with advanced paragraph formatting

```json
{
  "output": "./advanced.docx",
  "content": [
    {
      "type": "paragraph",
      "keepNext": true,
      "keepLines": true,
      "indent": { "left": 720, "right": 720, "firstLine": 360 },
      "runs": [
        { "text": "Superscript", "vertAlign": "superscript" },
        { "text": " and " },
        { "text": "SmallCaps", "smallCaps": true },
        { "text": " and " },
        { "text": "AllCaps", "allCaps": true }
      ]
    },
    {
      "type": "paragraph",
      "pageBreakBefore": true,
      "runs": [
        { "text": "Highlighted text", "highlight": "yellow" },
        { "text": " with " },
        { "text": "strikethrough", "strikethrough": true },
        { "text": " and " },
        { "text": "underline", "underline": "double" }
      ]
    }
  ]
}
```

### Table with merged cells

```json
{
  "output": "./merged-table.docx",
  "content": [
    {
      "type": "table",
      "style": "TableGrid",
      "alignment": "center",
      "rows": [
        {
          "height": { "value": 400, "rule": "atLeast" },
          "cells": [
            {
              "content": [{ "type": "paragraph", "runs": [{ "text": "Merged Header" }] }],
              "gridSpan": 2,
              "width": { "value": 5000, "type": "dxa" },
              "borders": { "bottom": { "style": "double", "size": 6, "color": "000000" } }
            }
          ]
        },
        {
          "cells": [
            {
              "content": [{ "type": "paragraph", "runs": [{ "text": "Top" }] }],
              "vMerge": "restart"
            },
            {
              "content": [{ "type": "paragraph", "runs": [{ "text": "Right 1" }] }]
            }
          ]
        },
        {
          "cells": [
            {
              "content": [{ "type": "paragraph", "runs": [{ "text": "" }] }],
              "vMerge": "continue"
            },
            {
              "content": [{ "type": "paragraph", "runs": [{ "text": "Right 2" }] }]
            }
          ]
        }
      ]
    }
  ]
}
```

### Document with numbering and bullet font

```json
{
  "output": "./bullets.docx",
  "numbering": [
    {
      "abstractNumId": 1,
      "numId": 2,
      "levels": [
        { "ilvl": 0, "numFmt": "bullet", "lvlText": "\u2022", "font": "Symbol", "indent": { "left": 720, "hanging": 360 } }
      ]
    }
  ],
  "content": [
    { "type": "paragraph", "numbering": { "numId": 2, "ilvl": 0 }, "runs": [{ "text": "Bullet one" }] },
    { "type": "paragraph", "numbering": { "numId": 2, "ilvl": 0 }, "runs": [{ "text": "Bullet two" }] }
  ]
}
```

### Style with next style and basedOn

```json
{
  "output": "./style-chain.docx",
  "styles": [
    {
      "type": "paragraph",
      "styleId": "Heading1",
      "name": "Heading 1",
      "next": "Normal",
      "paragraph": { "keepNext": true, "spacing": { "before": 240, "after": 120 } },
      "run": { "bold": true, "fontSize": 32 }
    },
    {
      "type": "table",
      "styleId": "CustomTable",
      "name": "Custom Table",
      "basedOn": "TableNormal"
    }
  ],
  "content": [
    { "type": "paragraph", "style": "Heading1", "runs": [{ "text": "Chapter 1" }] },
    { "type": "paragraph", "runs": [{ "text": "Body text." }] }
  ]
}
```

---

## Patch examples

### Text replacement

```json
{
  "source": "./template.docx",
  "output": "./result.docx",
  "patches": [
    { "type": "text.replace", "search": "{{name}}", "replace": "John Doe", "replaceAll": true },
    { "type": "text.replace", "search": "{{date}}", "replace": "2025-01-15" }
  ]
}
```

### Append content

```json
{
  "source": "./base.docx",
  "output": "./appended.docx",
  "patches": [
    {
      "type": "content.append",
      "content": [
        { "type": "paragraph", "runs": [{ "text": "Appendix A", "bold": true, "fontSize": 28 }] },
        { "type": "paragraph", "runs": [{ "text": "Additional content appended to the document." }] }
      ]
    }
  ]
}
```

### Insert at specific position

```json
{
  "source": "./report.docx",
  "output": "./with-insert.docx",
  "patches": [
    {
      "type": "content.insert",
      "index": 2,
      "content": [
        { "type": "paragraph", "alignment": "center", "runs": [{ "text": "--- Inserted Section ---", "italic": true }] }
      ]
    }
  ]
}
```

### Delete and replace content

```json
{
  "source": "./draft.docx",
  "output": "./edited.docx",
  "patches": [
    { "type": "content.delete", "index": 0, "count": 2 },
    {
      "type": "content.replace",
      "index": 0,
      "count": 1,
      "content": [
        { "type": "paragraph", "runs": [{ "text": "Replaced paragraph" }] }
      ]
    }
  ]
}
```

### Add styles and numbering

```json
{
  "source": "./plain.docx",
  "output": "./formatted.docx",
  "patches": [
    {
      "type": "styles.append",
      "styles": [
        {
          "type": "paragraph",
          "styleId": "CustomHeading",
          "name": "Custom Heading",
          "paragraph": { "spacing": { "before": 240, "after": 120 } },
          "run": { "bold": true, "fontSize": 28, "color": "1F4E79" }
        }
      ]
    },
    {
      "type": "numbering.append",
      "numbering": [
        {
          "abstractNumId": 10,
          "numId": 10,
          "levels": [
            { "ilvl": 0, "numFmt": "decimal", "lvlText": "%1.", "start": 1, "indent": { "left": 720, "hanging": 360 } }
          ]
        }
      ]
    }
  ]
}
```

### Update section properties

```json
{
  "source": "./document.docx",
  "output": "./landscape.docx",
  "patches": [
    {
      "type": "section.update",
      "section": {
        "pageSize": { "w": 15840, "h": 12240, "orient": "landscape" },
        "margins": { "top": 1440, "right": 1800, "bottom": 1440, "left": 1800 },
        "columns": { "num": 2, "space": 720, "equalWidth": true }
      }
    }
  ]
}
```

---

## Typical workflow

```bash
# Understand document structure
npx aurochs docx info report.docx
npx aurochs docx list report.docx
npx aurochs docx toc report.docx

# Inspect styles and formatting
npx aurochs docx styles report.docx --type paragraph
npx aurochs docx numbering report.docx

# View content
npx aurochs docx show report.docx 1 -o json
npx aurochs docx tables report.docx
npx aurochs docx preview report.docx

# Build new document
npx aurochs docx build spec.json

# Patch existing document
npx aurochs docx patch patch-spec.json

# Verify test cases
npx aurochs docx verify tests/
```
