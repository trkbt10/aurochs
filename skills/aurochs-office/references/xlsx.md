# XLSX Reference

## Command details

### info / list / show

```bash
npx aurochs xlsx info book.xlsx                       # Sheet count, sheet names, row count, style counts
npx aurochs xlsx list book.xlsx                       # Sheet list (row count summary)
npx aurochs xlsx show book.xlsx Sheet1                # Entire sheet
npx aurochs xlsx show book.xlsx Sheet1 --range A1:E10 # Cell range
npx aurochs xlsx show book.xlsx Sheet1 -o json        # Structured data
```

### extract

```bash
npx aurochs xlsx extract book.xlsx                         # First sheet as CSV
npx aurochs xlsx extract book.xlsx --sheet Sheet2           # Specific sheet
npx aurochs xlsx extract book.xlsx --format json            # JSON output
npx aurochs xlsx extract book.xlsx --sheet Sheet1 -o json   # Combined
```

### Data analysis

```bash
npx aurochs xlsx formulas book.xlsx              # Formula list
npx aurochs xlsx formulas book.xlsx --evaluate   # With evaluation
npx aurochs xlsx names book.xlsx                 # Named ranges (defined names)
npx aurochs xlsx strings book.xlsx               # Shared strings
npx aurochs xlsx strings book.xlsx --rich-text   # Including rich text formatting
```

### Structure & formatting

```bash
npx aurochs xlsx tables book.xlsx                # Table definitions (ListObjects)
npx aurochs xlsx comments book.xlsx              # Cell comments
npx aurochs xlsx hyperlinks book.xlsx            # Hyperlinks
npx aurochs xlsx autofilter book.xlsx            # AutoFilter settings
npx aurochs xlsx validation book.xlsx            # Data validation rules
npx aurochs xlsx conditional book.xlsx           # Conditional formatting rules
npx aurochs xlsx styles book.xlsx                # Fonts, fills, borders, number formats
npx aurochs xlsx styles book.xlsx --section fonts # Specific section
```

### preview

```bash
npx aurochs xlsx preview book.xlsx                          # All sheets
npx aurochs xlsx preview book.xlsx Sheet1                   # Specific sheet
npx aurochs xlsx preview book.xlsx Sheet1 --range A1:E10    # Specific range
npx aurochs xlsx preview book.xlsx --width 120              # Specify width
```

### build

```bash
npx aurochs xlsx build spec.json                 # Build from JSON spec (create or modify)
```

### verify

```bash
npx aurochs xlsx verify test-case.json           # Single test
npx aurochs xlsx verify tests/                   # All tests in directory
npx aurochs xlsx verify tests/ --tag smoke       # Filter by tag
```

---

## Build spec

Two modes: **create** (build from scratch) and **modify** (edit existing file).

### Create mode

```jsonc
{
  "mode": "create",
  "output": "./output.xlsx",
  "workbook": {
    "dateSystem": "1900",              // Optional: "1900" (default) | "1904"
    "sheets": [ ... ],                 // Required: sheet definitions
    "styles": { ... },                 // Optional: stylesheet
    "definedNames": [ ... ]            // Optional: named ranges
  }
}
```

### Modify mode

```jsonc
{
  "mode": "modify",
  "template": "./template.xlsx",       // Required: base XLSX
  "output": "./output.xlsx",           // Required: output path
  "modify": {                          // Comprehensive modification spec
    "sheets": [ ... ],                 // Per-sheet modifications
    "styles": { ... },                 // Append styles
    "definedNames": [ ... ],           // Add/modify named ranges
    "addSheets": [ ... ],              // Add new sheets (same format as create mode)
    "removeSheets": ["Sheet2"]         // Remove by name
  }
}
```

---

## Sheet spec (create mode)

```jsonc
{
  "name": "Sheet1",
  "state": "visible",                  // "visible" | "hidden" | "veryHidden"
  "rows": [ ... ],                     // Required
  "columns": [ ... ],                  // Optional
  "mergeCells": ["A1:B2", "C1:D1"],    // Optional
  "sheetFormatPr": {                   // Optional
    "defaultRowHeight": 15,
    "defaultColWidth": 10
  }
}
```

---

## Sheet modification spec (modify mode)

```jsonc
{
  "name": "Sheet1",                    // Identify sheet by current name
  "rename": "NewName",                 // Rename
  "state": "hidden",                   // Change visibility
  "tabColor": "#FF0000",              // Tab color (hex, theme, or rgb)

  // Cell data
  "cells": [ ... ],                    // Merge into existing rows
  "rows": [ ... ],                     // Modify row properties
  "removeRows": [5, 6],               // Remove by row number

  // Columns
  "columns": [ ... ],                  // Merge/replace column definitions
  "removeColumns": [3],                // Remove by column index

  // Merge cells
  "addMergeCells": ["E1:F2"],
  "removeMergeCells": ["A1:B2"],

  // Features (replace entirely when specified)
  "conditionalFormattings": [ ... ],
  "dataValidations": [ ... ],
  "hyperlinks": [ ... ],

  // Scalar features (set or clear with null)
  "autoFilter": { "ref": "A1:D10" },  // or null to remove
  "sheetProtection": { ... },          // or null to remove
  "pageSetup": { ... },
  "pageMargins": { ... },
  "headerFooter": { ... },
  "printOptions": { ... },

  // Sheet properties (merge with existing)
  "sheetFormatPr": { ... },
  "sheetView": { ... },

  // Page breaks
  "rowBreaks": [ ... ],
  "colBreaks": [ ... ]
}
```

---

## Cell spec

```jsonc
// Cell values — shorthand or typed
{ "ref": "A1", "value": "Hello" }              // String shorthand
{ "ref": "A1", "value": 42 }                   // Number shorthand
{ "ref": "A1", "value": true }                 // Boolean shorthand
{ "ref": "A1", "value": { "type": "string", "value": "Hello" } }
{ "ref": "A1", "value": { "type": "number", "value": 42 } }
{ "ref": "A1", "value": { "type": "boolean", "value": true } }
{ "ref": "A1", "value": { "type": "date", "value": "2024-01-15" } }
{ "ref": "A1", "value": { "type": "error", "value": "#DIV/0!" } }
{ "ref": "A1", "value": { "type": "empty" } }

// Formula
{ "ref": "A1", "formula": { "expression": "SUM(B1:B10)" } }
{ "ref": "A1", "formula": { "expression": "A1+B1", "type": "normal" } }

// Style reference (index into cellXfs array)
{ "ref": "A1", "value": "Styled", "styleId": 1 }
```

## Row spec

```jsonc
{
  "row": 1,                            // 1-based row number
  "cells": [ ... ],                    // Cell specs
  "height": 24,                        // Row height in points
  "hidden": false,
  "customHeight": true,
  "styleId": 0                         // Default style for row
}
```

## Row modification spec (modify mode only)

```jsonc
{
  "row": 3,                            // Target row number
  "height": 30,                        // Set height
  "hidden": true,                      // Hide row
  "customHeight": true,
  "styleId": 0
}
```

## Column spec

```jsonc
{
  "min": 1, "max": 3,                 // Column range (1-based)
  "width": 15,                        // Width in characters
  "hidden": false,
  "bestFit": true,
  "styleId": 0
}
```

---

## Styles

### StyleSheet spec

```jsonc
{
  "styles": {
    "fonts": [ ... ],
    "fills": [ ... ],
    "borders": [ ... ],
    "numberFormats": [ ... ],
    "cellXfs": [ ... ]                 // Cell format combinations
  }
}
```

Default styles are always present: 1 font (Calibri 11), 2 fills (none, gray125), 1 border (none), 1 cellXf (default). Custom styles are appended after defaults. `styleId` in cells references the index into the combined `cellXfs` array.

### Font spec

```jsonc
{
  "name": "Arial",
  "size": 14,
  "bold": true,
  "italic": false,
  "underline": "single",              // "single" | "double" | "singleAccounting" | "doubleAccounting"
  "strikethrough": false,
  "color": "#FF0000",                 // Shorthand hex
  "family": 2,
  "scheme": "minor"                   // "major" | "minor" | "none"
}
```

### Color spec

```jsonc
"#FF0000"                              // Hex shorthand (6 digits, auto-prefixed with FF alpha)
"FFFF0000"                             // Full ARGB hex
{ "type": "rgb", "value": "FFFF0000" }
{ "type": "theme", "theme": 4, "tint": -0.25 }
```

### Fill spec

```jsonc
{ "type": "none" }
{ "type": "solid", "color": "#FF0000" }
{ "type": "pattern", "patternType": "gray125", "fgColor": "#000000", "bgColor": "#FFFFFF" }
{
  "type": "gradient",
  "gradientType": "linear",           // "linear" | "path"
  "degree": 90,
  "stops": [
    { "position": 0, "color": "#FFFFFF" },
    { "position": 1, "color": "#000000" }
  ]
}
```

### Border spec

```jsonc
{
  "left":   { "style": "thin", "color": "#000000" },
  "right":  { "style": "medium" },
  "top":    { "style": "thick", "color": { "type": "theme", "theme": 1 } },
  "bottom": { "style": "double" },
  "diagonal": { "style": "dashDot" },
  "diagonalUp": true,
  "diagonalDown": false
}
```

Border styles: `thin`, `medium`, `thick`, `double`, `hair`, `dotted`, `dashed`, `dashDot`, `dashDotDot`, `mediumDashed`, `mediumDashDot`, `mediumDashDotDot`, `slantDashDot`

### Number format spec

```jsonc
{ "id": 164, "formatCode": "#,##0.00" }
{ "id": 165, "formatCode": "yyyy-mm-dd" }
```

IDs 0-163 are built-in. Custom formats start at 164.

### CellXf spec (cell format combination)

```jsonc
{
  "numFmtId": 164,                    // Number format index
  "fontId": 1,                        // Font index
  "fillId": 2,                        // Fill index
  "borderId": 1,                      // Border index
  "alignment": {
    "horizontal": "center",           // "general"|"left"|"center"|"right"|"fill"|"justify"|"centerContinuous"|"distributed"
    "vertical": "center",             // "top"|"center"|"bottom"|"justify"|"distributed"
    "wrapText": true,
    "textRotation": 45,               // 0-180 degrees
    "indent": 2,
    "shrinkToFit": false,
    "readingOrder": 0
  },
  "protection": {
    "locked": true,
    "hidden": false
  }
}
```

---

## Features

### Hyperlinks

```jsonc
{
  "ref": "A1",
  "target": "https://example.com",     // External URL
  "display": "Click here",
  "tooltip": "Visit example"
}
// Internal link (no target)
{
  "ref": "B1",
  "location": "Sheet2!A1",             // Internal cell reference
  "display": "Go to Sheet2"
}
```

### Data validation

```jsonc
{
  "sqref": "A1:A100",
  "type": "list",                      // "whole"|"decimal"|"list"|"date"|"time"|"textLength"|"custom"
  "formula1": "\"Option1,Option2,Option3\"",
  "allowBlank": true,
  "showDropDown": false,               // Show dropdown arrow (list type)
  "showInputMessage": true,
  "promptTitle": "Select",
  "prompt": "Choose from the list",
  "showErrorMessage": true,
  "errorStyle": "stop",                // "stop"|"warning"|"information"
  "errorTitle": "Invalid",
  "error": "Please select from list"
}
// Numeric range validation
{
  "sqref": "B1:B100",
  "type": "whole",
  "operator": "between",              // "between"|"notBetween"|"equal"|"notEqual"|"lessThan"|"greaterThan"|etc.
  "formula1": "1",
  "formula2": "100"
}
```

### Conditional formatting

```jsonc
// Standard rule (cellIs, expression, etc.)
{
  "sqref": "A1:A100",
  "rules": [{
    "type": "cellIs",                  // "cellIs"|"expression"|"colorScale"|"dataBar"|"iconSet"|"top10"|"aboveAverage"|etc.
    "priority": 1,
    "operator": "greaterThan",
    "dxfId": 0,                        // Differential format index
    "stopIfTrue": false,
    "formulas": ["100"]
  }]
}
// Text / time period rules
{
  "sqref": "A1:A100",
  "rules": [{
    "type": "containsText",
    "text": "Error",
    "timePeriod": "lastMonth",         // For timePeriod type rules
    "dxfId": 1,
    "formulas": ["NOT(ISERROR(SEARCH(\"Error\",A1)))"]
  }]
}
// Top 10 / above average
{
  "sqref": "A1:A100",
  "rules": [{
    "type": "top10",
    "rank": 10,                        // Number of items
    "percent": false,                  // true = percent, false = count
    "bottom": false,                   // true = bottom N
    "dxfId": 2
  }]
}
// Above average
{
  "sqref": "A1:A100",
  "rules": [{
    "type": "aboveAverage",
    "aboveAverage": true,              // false = below average
    "equalAverage": false,             // Include equal
    "stdDev": 0,                       // Standard deviations (0 = plain average)
    "dxfId": 3
  }]
}
// Color scale
{
  "sqref": "B1:B100",
  "rules": [{
    "type": "colorScale",
    "cfvo": [
      { "type": "min" },
      { "type": "max" }
    ],
    "colors": ["#FF0000", "#00FF00"]
  }]
}
// Data bar
{
  "sqref": "C1:C100",
  "rules": [{
    "type": "dataBar",
    "cfvo": [
      { "type": "min" },
      { "type": "max" }
    ],
    "color": "#638EC6",
    "showValue": true,
    "minLength": 10,                   // Minimum bar length (%)
    "maxLength": 90,                   // Maximum bar length (%)
    "gradient": true                   // Gradient fill
  }]
}
// Icon set
{
  "sqref": "D1:D100",
  "rules": [{
    "type": "iconSet",
    "iconSet": "3TrafficLights1",
    "reverse": false,                  // Reverse icon order
    "iconOnly": false,                 // Show icons only (no values)
    "cfvo": [
      { "type": "percent", "val": "0", "gte": true },
      { "type": "percent", "val": "33", "gte": true },
      { "type": "percent", "val": "67", "gte": true }
    ]
  }]
}
```

**CfvoSpec**: `type` (min/max/num/percent/formula/percentile), `val` (string), `gte` (boolean, default true)

### Auto filter

```jsonc
{ "ref": "A1:D100" }
```

Set to `null` in modify mode to remove.

### Page setup

```jsonc
{
  "orientation": "landscape",          // "default"|"portrait"|"landscape"
  "paperSize": 9,                      // 1=Letter, 5=Legal, 9=A4, 8=A3
  "scale": 100,                        // Print scale percentage
  "fitToWidth": 1,
  "fitToHeight": 0,                    // 0 = auto
  "firstPageNumber": 1,
  "useFirstPageNumber": false,         // Use firstPageNumber setting
  "blackAndWhite": false,
  "draft": false,
  "cellComments": "none",             // "none"|"asDisplayed"|"atEnd"
  "pageOrder": "downThenOver",        // "downThenOver"|"overThenDown"
  "horizontalDpi": 600,
  "verticalDpi": 600,
  "copies": 1
}
```

### Page margins (inches)

```jsonc
{
  "left": 0.7, "right": 0.7,
  "top": 0.75, "bottom": 0.75,
  "header": 0.3, "footer": 0.3
}
```

### Header / footer

```jsonc
{
  "oddHeader": "&CReport Title",
  "oddFooter": "&LPage &P&RDate: &D",
  "evenHeader": "",                    // Even page header (if differentOddEven)
  "evenFooter": "",                    // Even page footer (if differentOddEven)
  "firstHeader": "",                   // First page header (if differentFirst)
  "firstFooter": "",                   // First page footer (if differentFirst)
  "differentOddEven": false,
  "differentFirst": false,
  "scaleWithDoc": true,
  "alignWithMargins": true
}
```

Format codes: `&L` left, `&C` center, `&R` right, `&P` page number, `&N` total pages, `&D` date, `&T` time, `&F` filename, `&A` sheet name, `&B` bold, `&I` italic, `&"font,style"` font

### Print options

```jsonc
{
  "gridLines": true,
  "gridLinesSet": true,
  "headings": true,
  "horizontalCentered": true,
  "verticalCentered": false
}
```

### Sheet protection

```jsonc
{
  "sheet": true,
  "objects": true,
  "scenarios": true,
  "formatCells": false,
  "formatColumns": false,
  "formatRows": false,
  "insertColumns": false,
  "insertRows": false,
  "insertHyperlinks": false,
  "deleteColumns": false,
  "deleteRows": false,
  "sort": false,
  "autoFilter": false,
  "pivotTables": false,
  "selectLockedCells": false,
  "selectUnlockedCells": false,
  "password": "hash-string",          // Password hash
  "algorithmName": "SHA-512",         // Hash algorithm
  "hashValue": "base64...",           // Hash value
  "saltValue": "base64...",           // Salt value
  "spinCount": 100000                 // Iteration count
}
```

Set to `null` in modify mode to remove protection.

### Sheet view

```jsonc
{
  "tabSelected": true,
  "showGridLines": true,
  "showRowColHeaders": true,
  "zoomScale": 100,
  "freeze": { "row": 1, "col": 1 }    // Freeze panes
}
```

### Page breaks

```jsonc
// Row breaks
"rowBreaks": [{ "id": 10, "min": 0, "max": 16383, "manual": true }]
// Column breaks
"colBreaks": [{ "id": 5, "min": 0, "max": 1048575, "manual": true }]
```

### Defined names

```jsonc
{ "name": "MyRange", "formula": "Sheet1!$A$1:$A$10" }
{ "name": "HiddenName", "formula": "42", "hidden": true }
{ "name": "LocalName", "formula": "Sheet1!$B$1", "localSheetId": 0 }
```

---

## Verify spec

Test case JSON for automated verification:

```jsonc
{
  "name": "test-name",
  "description": "Description",
  "tags": ["tag1", "tag2"],
  "setup": { ... },                    // Optional: build a template first (XlsxBuildSpec)
  "input": { ... },                    // Required: the build operation (XlsxBuildSpec)
  "expected": {                        // Assertions
    "sheetCount": 2,
    "sheetNames": ["Sheet1", "Sheet2"],
    "totalRows": 10,
    "totalCells": 50,
    "styles": {
      "fontCount": 2,
      "fillCount": 3,
      "borderCount": 1,
      "numberFormatCount": 1,
      "cellXfCount": 2                 // Cell format combination count
    },
    "definedNames": [
      { "name": "MyRange", "formula": "Sheet1!$A$1:$A$10" },
      { "name": "Local", "formula": "Sheet1!$B$1", "localSheetId": 0, "hidden": false }
    ],
    "sheets": [{
      "name": "Sheet1",
      "rowCount": 5,
      "cellCount": 20,
      "mergedCells": ["A1:B2"],
      "columns": [{ "min": 1, "max": 3, "width": 15, "hidden": false }],
      "cells": [
        { "ref": "A1", "type": "string", "value": "Hello", "styleId": 0 },
        { "ref": "B1", "type": "number", "value": 42 },
        { "ref": "C1", "formula": "SUM(A1:B1)" }
      ]
    }]
  }
}
```

---

## Supported features matrix

| Feature | Create | Modify | Serializer |
|---------|--------|--------|------------|
| Cell values (string, number, boolean, date, error, empty) | Yes | Yes | Yes |
| Formulas | Yes | Yes | Yes |
| Cell styles (font, fill, border, number format, alignment, protection) | Yes | Yes | Yes |
| Columns (width, hidden, bestFit) | Yes | Yes | Yes |
| Rows (height, hidden, customHeight) | Yes | Yes | Yes |
| Merge cells | Yes | Add/Remove | Yes |
| Defined names | Yes | Add/Modify | Yes |
| Sheet management (add, remove, rename, hide) | Add | All | Yes |
| Tab color | - | Yes | Yes |
| Sheet format (defaultRowHeight, defaultColWidth) | Yes | Merge | Yes |
| Sheet view (gridlines, zoom, freeze panes) | - | Yes | Yes |
| Conditional formatting | - | Replace | Yes |
| Data validation | - | Replace | Yes |
| Hyperlinks (external, internal) | - | Replace | Yes |
| Auto filter | - | Set/Clear | Yes |
| Page setup (orientation, paper, scale) | - | Set | Yes |
| Page margins | - | Set | Yes |
| Header / footer | - | Set | Yes |
| Print options | - | Set | Yes |
| Sheet protection | - | Set/Clear | Yes |
| Page breaks (row, column) | - | Set | Yes |
| Drawing (images, shapes, charts) | - | - | - |
| Sparklines | - | - | - |
| Comments (threaded) | - | - | - |

---

## Edit examples (modify mode)

### Change cell values

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "sheets": [{
      "name": "Sheet1",
      "cells": [
        { "ref": "A1", "value": "Updated text" },
        { "ref": "B2", "value": 999 },
        { "ref": "C3", "formula": { "expression": "SUM(A1:B2)" } }
      ]
    }]
  }
}
```

### Add styles and apply to cells

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "styles": {
      "fonts": [
        { "name": "Arial", "size": 14, "bold": true, "color": "#FF0000" }
      ],
      "fills": [
        { "type": "solid", "color": "#FFFF00" }
      ],
      "cellXfs": [
        { "fontId": 1, "fillId": 2 }
      ]
    },
    "sheets": [{
      "name": "Sheet1",
      "cells": [
        { "ref": "A1", "value": "Bold Red on Yellow", "styleId": 1 }
      ]
    }]
  }
}
```

### Add and remove merge cells

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "sheets": [{
      "name": "Sheet1",
      "addMergeCells": ["A1:C1", "D5:F8"],
      "removeMergeCells": ["B2:C3"]
    }]
  }
}
```

### Add a new sheet

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "addSheets": [{
      "name": "Summary",
      "rows": [
        { "row": 1, "cells": [{ "ref": "A1", "value": "Total" }, { "ref": "B1", "value": 100 }] }
      ]
    }]
  }
}
```

### Remove, rename, and hide sheets

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "removeSheets": ["TempSheet"],
    "sheets": [
      { "name": "Sheet1", "rename": "Data" },
      { "name": "Sheet2", "state": "hidden" }
    ]
  }
}
```

### Add data validation

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "sheets": [{
      "name": "Sheet1",
      "dataValidations": [{
        "sqref": "A2:A100",
        "type": "list",
        "formula1": "\"Yes,No,Maybe\"",
        "allowBlank": true,
        "showDropDown": false,
        "showErrorMessage": true,
        "errorStyle": "stop",
        "errorTitle": "Invalid",
        "error": "Select from the list"
      }]
    }]
  }
}
```

### Add hyperlinks

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "sheets": [{
      "name": "Sheet1",
      "hyperlinks": [
        { "ref": "A1", "target": "https://example.com", "display": "Example", "tooltip": "Visit" },
        { "ref": "A2", "location": "Sheet2!A1", "display": "Go to Sheet2" }
      ]
    }]
  }
}
```

### Set page setup for printing

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "sheets": [{
      "name": "Sheet1",
      "pageSetup": { "orientation": "landscape", "paperSize": 9, "fitToWidth": 1, "fitToHeight": 0 },
      "pageMargins": { "left": 0.5, "right": 0.5, "top": 0.75, "bottom": 0.75, "header": 0.3, "footer": 0.3 },
      "headerFooter": { "oddHeader": "&CMonthly Report", "oddFooter": "&LPage &P&R&D" }
    }]
  }
}
```

### Protect a sheet

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "sheets": [{
      "name": "Sheet1",
      "sheetProtection": {
        "sheet": true,
        "formatCells": false,
        "insertRows": false,
        "deleteRows": false,
        "sort": true,
        "autoFilter": true
      }
    }]
  }
}
```

### Freeze panes and set zoom

```json
{
  "mode": "modify",
  "template": "./input.xlsx",
  "output": "./output.xlsx",
  "modify": {
    "sheets": [{
      "name": "Sheet1",
      "sheetView": {
        "showGridLines": true,
        "zoomScale": 120,
        "freeze": { "row": 1, "col": 0 }
      }
    }]
  }
}
```

---

## Typical workflow

```bash
# Understand sheet structure
npx aurochs xlsx info book.xlsx
npx aurochs xlsx list book.xlsx

# View data
npx aurochs xlsx show book.xlsx Sheet1 --range A1:E10
npx aurochs xlsx preview book.xlsx Sheet1
npx aurochs xlsx extract book.xlsx --format json

# Inspect formulas & rules
npx aurochs xlsx formulas book.xlsx
npx aurochs xlsx validation book.xlsx
npx aurochs xlsx conditional book.xlsx

# Check styles
npx aurochs xlsx styles book.xlsx

# Build from scratch
npx aurochs xlsx build create-spec.json

# Modify existing file
npx aurochs xlsx build modify-spec.json

# Run verification tests
npx aurochs xlsx verify spec/verify-cases/cases/
npx aurochs xlsx verify spec/verify-cases/cases/ --tag modify
```
