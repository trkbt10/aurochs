# PPTX Reference

## Command details

### info / list / show

```bash
npx aurochs pptx info deck.pptx           # Slide count, size (px/EMU)
npx aurochs pptx list deck.pptx           # Title and shape count for each slide
npx aurochs pptx show deck.pptx 1         # Shape list (ID, name, placeholder, text)
npx aurochs pptx show deck.pptx 1 -o json # Structured data (bounds, paragraphs, runs included)
```

### extract

```bash
npx aurochs pptx extract deck.pptx              # Text from all slides
npx aurochs pptx extract deck.pptx --slides 1,3-5  # Specific slides only
npx aurochs pptx extract deck.pptx -o json       # JSON format
```

### theme

```bash
npx aurochs pptx theme deck.pptx
# → Font Scheme (Major/Minor), Color Scheme (dk1,lt1,accent1-6,...), Format Scheme
```

### preview

```bash
npx aurochs pptx preview deck.pptx              # All slides
npx aurochs pptx preview deck.pptx 1 --border   # Specific slide with border
npx aurochs pptx preview deck.pptx --width 120   # Specify width
```

### verify

```bash
npx aurochs pptx verify test-case.json   # Single test
npx aurochs pptx verify tests/           # All tests in directory
npx aurochs pptx verify tests/ --tag smoke  # Filter by tag
```

---

## Build spec

### JSON Spec top level

```jsonc
{
  "template": "./template.pptx",   // Required: base PPTX
  "output": "./output.pptx",       // Required: output path
  "theme": { ... },                // Theme editing
  "addSlides": [ ... ],            // Add slides
  "duplicateSlides": [ ... ],      // Duplicate slides
  "reorderSlides": [ ... ],        // Reorder
  "removeSlides": [ ... ],         // Remove
  "slides": [ ... ]                // Per-slide editing
}
```

### Slide editing (elements of the slides array)

```jsonc
{
  "slideNumber": 1,            // Target slide number (1-based)
  "background": { ... },
  "addShapes": [ ... ],
  "addImages": [ ... ],
  "addConnectors": [ ... ],
  "addGroups": [ ... ],
  "addTables": [ ... ],
  "addCharts": [ ... ],
  "updateCharts": [ ... ],
  "updateTables": [ ... ],
  "addAnimations": [ ... ],
  "addComments": [ ... ],
  "speakerNotes": "Notes string",
  "transition": { ... }
}
```

---

### addShapes

```jsonc
{
  "type": "rectangle",          // Shape type (see below)
  "x": 100, "y": 100,           // Position (px)
  "width": 400, "height": 200,  // Size (px)
  "rotation": 0,
  "flipH": false, "flipV": false,
  "fill": "#4472C4",            // Fill (see below)
  "line": { "color": "#000", "width": 1 },
  "text": "Text",               // Plain text or rich text (see below)
  "textBody": { "anchor": "ctr", "wrapping": "square" },
  "placeholder": { "type": "title", "idx": 0 },
  "effects": { ... },
  "shape3d": { ... }
}
```

#### Shape types

| Category              | Types                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Basic shapes          | rectangle, ellipse, roundRect, triangle, diamond, pentagon, hexagon, octagon                                   |
| Arrows                | rightArrow, leftArrow, upArrow, downArrow, chevron, bentArrow, uturnArrow, curvedRightArrow                    |
| Stars                 | star4, star5, star6, star8, star10, star12, star16, star24, star32                                             |
| Callouts              | wedgeRectCallout, wedgeEllipseCallout, cloudCallout, borderCallout1-3                                          |
| Flowchart             | flowChartProcess, flowChartDecision, flowChartTerminator, flowChartDocument, flowChartData, flowChartConnector |
| Decorative            | ribbon, ribbon2, wave, doubleWave, heart, cloud, frame, teardrop, funnel                                       |
| Rounded rect variants | round1Rect, round2SameRect, snip1Rect, snip2SameRect, snipRoundRect                                            |

#### Fill

```jsonc
// Direct HEX
"fill": "#4472C4"

// Solid
"fill": { "type": "solid", "color": "#FF0000" }

// Theme color
"fill": { "type": "theme", "theme": "accent1", "lumMod": 75, "lumOff": 25, "tint": 50, "shade": 50 }

// Gradient
"fill": {
  "type": "gradient", "gradientType": "linear", "angle": 90,
  "stops": [
    { "position": 0, "color": "#FF0000" },
    { "position": 100, "color": "#0000FF" }
  ]
}

// Pattern
"fill": { "type": "pattern", "preset": "dkDnDiag", "fgColor": "#000", "bgColor": "#FFF" }
```

Theme color names: `dk1`, `dk2`, `lt1`, `lt2`, `accent1` through `accent6`, `hlink`, `folHlink`

#### Text

```jsonc
// Plain text
"text": "Hello"

// Rich text (array of paragraphs)
"text": [
  {
    "runs": [
      { "text": "Bold", "bold": true, "fontSize": 24, "color": "#FF0000" },
      { "text": " Normal", "fontFamily": "Arial" }
    ],
    "alignment": "center",
    "bullet": { "type": "char", "char": "•" },
    "lineSpacing": { "type": "percent", "value": 150 },
    "spaceBefore": 6, "spaceAfter": 6,
    "level": 0
  }
]
```

**Run properties**: `text`, `bold`, `italic`, `underline`(single/double/heavy/dotted/dashed/wavy), `strikethrough`(single/double), `fontSize`, `fontFamily`, `color`(HEX), `caps`(all/small), `letterSpacing`, `verticalPosition`(normal/superscript/subscript), `hyperlink`({url, tooltip})

**Paragraph properties**: `alignment`(left/center/right/justify), `level`, `bullet`, `lineSpacing`, `spaceBefore`, `spaceAfter`, `indent`, `marginLeft`

**textBody**: `anchor`(t/ctr/b), `verticalType`, `wrapping`(square/none), `anchorCenter`, `insetLeft/Top/Right/Bottom`

---

### addImages

```jsonc
{
  "path": "./images/logo.png",   // Image path (relative to spec)
  "x": 100, "y": 100,
  "width": 200, "height": 150,
  "rotation": 0,
  "effects": { ... }             // Blip effects (optional)
}
```

Supported formats: PNG, JPG/JPEG, GIF, SVG

### addConnectors

```jsonc
{
  "preset": "straightConnector1",
  "x": 100,
  "y": 100,
  "width": 300,
  "height": 0,
  "startShapeId": "2",
  "startSiteIndex": 1,
  "endShapeId": "3",
  "endSiteIndex": 3,
  "line": { "color": "#000", "width": 2 },
}
```

---

## Typical workflow

```bash
# Inspect
npx aurochs pptx info deck.pptx
npx aurochs pptx list deck.pptx
npx aurochs pptx show deck.pptx 1 -o json
npx aurochs pptx theme deck.pptx
npx aurochs pptx preview deck.pptx --border

# Build
npx aurochs pptx build spec.json
npx aurochs pptx preview output.pptx --border
npx aurochs pptx extract output.pptx
```
