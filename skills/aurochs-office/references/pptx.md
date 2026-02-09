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

### diff

```bash
npx aurochs pptx diff fileA.pptx fileB.pptx   # Compare text content between two PPTX files
```

Output: identical slides, different slides, added/removed slides.

### images

```bash
npx aurochs pptx images deck.pptx               # List all images
npx aurochs pptx images deck.pptx --slides 1,3-5 # Specific slides
```

Output: resourceId, dimensions, mediaType per image.

### tables

```bash
npx aurochs pptx tables deck.pptx               # List all tables
npx aurochs pptx tables deck.pptx --slides 1,3-5 # Specific slides
```

Output: row/col counts, styleId, first cell preview per table.

### inventory

```bash
npx aurochs pptx inventory deck.pptx   # Media inventory summary
```

Output: counts of slides, images, tables, charts, diagrams, textOnlySlides.

### build

```bash
npx aurochs pptx build spec.json   # Build from JSON spec
```

### patch

```bash
npx aurochs pptx patch patch-spec.json   # Patch existing PPTX with JSON spec
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

### Slide operations

```jsonc
// Add slide from layout
{ "layoutPath": "ppt/slideLayouts/slideLayout1.xml", "insertAt": 0 }

// Remove slide
{ "slideNumber": 1 }

// Duplicate slide
{ "sourceSlideNumber": 1, "insertAt": 0 }

// Reorder slide
{ "from": 0, "to": 2 }
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
  "speakerNotes": { "text": "Notes string" },
  "transition": { ... },
  "updateSmartArt": [ ... ]
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
  "fill": "#4472C4",            // Fill (see below), "none" for no fill
  "lineColor": "#000000", "lineWidth": 1,  // Line properties (see below)
  "text": "Text",               // Plain text or rich text (see below)
  "textBody": { "anchor": "center", "wrapping": "square" },
  "placeholder": { "type": "title", "idx": 0 },
  "customGeometry": { ... },    // Custom geometry paths (see below)
  "effects": { ... },
  "shape3d": { ... }
}
```

#### Shape types

| Category              | Types                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Basic shapes          | rectangle, ellipse, triangle, rtTriangle, diamond, pentagon, hexagon, heptagon, octagon, decagon, dodecagon, parallelogram, trapezoid, teardrop, halfFrame, corner, diagStripe, chord, funnel, gear6, gear9, pie, pieWedge, blockArc |
| Rounded rect variants | roundRect, round1Rect, round2SameRect, round2DiagRect, snip1Rect, snip2SameRect, snip2DiagRect, snipRoundRect |
| Arrows                | rightArrow, leftArrow, upArrow, downArrow, leftRightArrow, upDownArrow, bentArrow, uturnArrow, chevron, notchedRightArrow, stripedRightArrow, quadArrow, quadArrowCallout, leftRightUpArrow, leftUpArrow, bentUpArrow, curvedLeftArrow, curvedRightArrow, curvedUpArrow, curvedDownArrow, circularArrow, swooshArrow, leftCircularArrow, leftRightCircularArrow |
| Arrow callouts        | leftArrowCallout, rightArrowCallout, upArrowCallout, downArrowCallout, leftRightArrowCallout, upDownArrowCallout |
| Stars & banners       | star4, star5, star6, star7, star8, star10, star12, star16, star24, star32, ribbon, ribbon2, ellipseRibbon, ellipseRibbon2, verticalScroll, horizontalScroll, wave, doubleWave, irregularSeal1, irregularSeal2 |
| Callouts              | wedgeRectCallout, wedgeRoundRectCallout, wedgeEllipseCallout, cloudCallout, borderCallout1-3, accentCallout1-3, accentBorderCallout1-3, callout1-3 |
| Flowchart             | flowChartProcess, flowChartDecision, flowChartTerminator, flowChartDocument, flowChartData, flowChartConnector, flowChartAlternateProcess, flowChartSort, flowChartExtract, flowChartMerge, flowChartOnlineStorage, etc. |
| Decorative            | heart, cloud, frame                                                                                            |

#### Placeholder types

`title`, `body`, `ctrTitle`, `subTitle`, `dt`, `sldNum`, `ftr`, `hdr`, `obj`, `chart`, `tbl`, `clipArt`, `dgm`, `media`, `sldImg`

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

Gradient types: `linear`, `radial`, `path`

Theme color names: `dk1`, `dk2`, `lt1`, `lt2`, `accent1` through `accent6`, `hlink`, `folHlink`

#### Line properties

```jsonc
"lineColor": "#000000",           // Hex color (with or without #)
"lineWidth": 2,                   // Width in points
"lineDash": "dashDot",            // solid/dash/dashDot/dot/lgDash/lgDashDot/lgDashDotDot/sysDash/sysDashDot/sysDashDotDot/sysDot
"lineCap": "round",               // flat/round/square
"lineJoin": "round",              // round/bevel/miter
"lineCompound": "sng",            // sng/dbl/thickThin/thinThick/tri
"lineHeadEnd": { "type": "triangle", "width": "med", "length": "med" },
"lineTailEnd": { "type": "arrow", "width": "lg", "length": "lg" }
```

Line end types: `none`, `triangle`, `stealth`, `diamond`, `oval`, `arrow`
Line end sizes: `sm`, `med`, `lg`

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

**Run properties**: `text`, `bold`, `italic`, `underline`(none/single/double/heavy/dotted/dashed/wavy), `strikethrough`(noStrike/single/double), `fontSize`, `fontFamily`, `color`(HEX), `caps`(none/all/small), `letterSpacing`, `verticalPosition`(normal/superscript/subscript), `hyperlink`({url, tooltip}), `outline`, `effects`

**Paragraph properties**: `alignment`(left/center/right/justify/distributed), `level`(0-8), `bullet`, `lineSpacing`, `spaceBefore`, `spaceAfter`, `indent`, `marginLeft`

**textBody**: `anchor`(top/center/bottom), `verticalType`(horz/vert/vert270/wordArtVert/eaVert/mongolianVert/wordArtVertRtl), `wrapping`(square/none), `anchorCenter`, `insetLeft/Top/Right/Bottom`

#### Custom geometry

```jsonc
{
  "paths": [{
    "width": 100, "height": 100,
    "fill": "norm",               // none/norm/lighten/lightenLess/darken/darkenLess
    "stroke": true,
    "extrusionOk": false,
    "commands": [
      { "type": "moveTo", "x": 0, "y": 0 },
      { "type": "lineTo", "x": 100, "y": 0 },
      { "type": "arcTo", "widthRadius": 50, "heightRadius": 50, "startAngle": 0, "swingAngle": 90 },
      { "type": "quadBezierTo", "control": { "x": 50, "y": 50 }, "end": { "x": 100, "y": 100 } },
      { "type": "cubicBezierTo", "control1": { "x": 25, "y": 25 }, "control2": { "x": 75, "y": 75 }, "end": { "x": 100, "y": 100 } },
      { "type": "close" }
    ]
  }]
}
```

#### Effects

```jsonc
{
  "shadow": { "color": "#000000", "blur": 4, "distance": 3, "direction": 45 },
  "glow": { "color": "#FFFF00", "radius": 10 },
  "softEdge": { "radius": 5 },
  "reflection": {
    "blurRadius": 0, "startOpacity": 50, "endOpacity": 0,
    "distance": 0, "direction": 90, "fadeDirection": 90,
    "scaleX": 100, "scaleY": -100
  }
}
```

#### 3D properties

```jsonc
{
  "bevelTop": { "preset": "circle", "width": 6, "height": 6 },
  "bevelBottom": { "preset": "angle", "width": 4, "height": 4 },
  "material": "plastic",
  "extrusionHeight": 10
}
```

Bevel presets: `angle`, `artDeco`, `circle`, `convex`, `coolSlant`, `cross`, `divot`, `hardEdge`, `relaxedInset`, `riblet`, `slope`, `softRound`

Materials: `legacyMatte`, `legacyPlastic`, `legacyMetal`, `legacyWireframe`, `matte`, `plastic`, `metal`, `warmMatte`, `translucentPowder`, `powder`, `dkEdge`, `softEdge`, `clear`, `flat`, `softmetal`

---

### addImages

```jsonc
{
  "type": "image",
  "path": "./images/logo.png",   // Image path (relative to spec)
  "x": 100, "y": 100,
  "width": 200, "height": 150,
  "rotation": 0,
  "flipH": false, "flipV": false,
  "effects": { ... },             // Blip effects (optional)
  "media": {                      // Embedded video/audio (optional)
    "type": "video",
    "path": "./video.mp4",
    "mimeType": "video/mp4"
  }
}
```

Supported image formats: PNG, JPG/JPEG, GIF, SVG

#### Blip effects

```jsonc
{
  "grayscale": true,
  "duotone": { "colors": ["#000000", "#FFFFFF"] },
  "tint": { "hue": 180, "amount": 50 },
  "luminance": { "brightness": 20, "contrast": 10 },
  "hsl": { "hue": 0, "saturation": 50, "luminance": 0 },
  "blur": { "radius": 5 },
  "alphaBiLevel": { "threshold": 50 },
  "alphaModFix": 80,
  "alphaRepl": { "alpha": 50 },
  "biLevel": { "threshold": 50 },
  "colorChange": { "from": "#FF0000", "to": "#0000FF", "useAlpha": false },
  "colorReplace": { "color": "#00FF00" },
  "alphaCeiling": true,
  "alphaFloor": true,
  "alphaInv": true,
  "alphaMod": true
}
```

### addConnectors

```jsonc
{
  "type": "connector",
  "preset": "straightConnector1",   // straightConnector1/bentConnector3/curvedConnector3
  "x": 100, "y": 100,
  "width": 300, "height": 0,
  "rotation": 0,
  "flipH": false, "flipV": false,
  "startShapeId": "2",
  "startSiteIndex": 1,
  "endShapeId": "3",
  "endSiteIndex": 3,
  "lineColor": "#000", "lineWidth": 2
}
```

### addGroups

```jsonc
{
  "type": "group",
  "x": 100, "y": 100,
  "width": 400, "height": 300,
  "rotation": 0,
  "flipH": false, "flipV": false,
  "fill": "#FFFFFF",
  "children": [
    { "type": "rectangle", "x": 0, "y": 0, "width": 200, "height": 150, "fill": "#FF0000" },
    { "type": "ellipse", "x": 200, "y": 0, "width": 200, "height": 150, "fill": "#0000FF" }
  ]
}
```

Children can be `ShapeSpec` or nested `GroupSpec`.

### addTables

```jsonc
{
  "type": "table",
  "x": 50, "y": 50,
  "width": 600, "height": 300,
  "rows": [
    [
      { "text": "Header 1", "fill": "#4472C4", "borderColor": "#000", "borderWidth": 1 },
      { "text": "Header 2", "fill": "#4472C4", "gridSpan": 2 }
    ],
    [
      {
        "text": "Cell A2",
        "verticalAlignment": "middle",
        "marginLeft": 91440, "marginRight": 91440,
        "marginTop": 45720, "marginBottom": 45720,
        "rowSpan": 2
      },
      {
        "content": {
          "paragraphs": [
            {
              "runs": [
                { "text": "Bold", "bold": true, "italic": true, "fontSize": 12, "fontFamily": "Arial", "color": "#FF0000" },
                { "text": " Normal" }
              ],
              "alignment": "center"
            }
          ]
        }
      }
    ]
  ]
}
```

### updateTables

```jsonc
{
  "shapeId": "5",
  "updateCells": [
    { "row": 0, "col": 0, "content": "Updated text" }
  ],
  "addRows": [
    { "height": 40, "cells": ["New A", "New B"], "position": 2 }
  ],
  "removeRows": [3],
  "addColumns": [{ "width": 100, "position": 1 }],
  "removeColumns": [2],
  "styleId": "tblStyle123"
}
```

### addCharts

```jsonc
{
  "chartType": "barChart",       // See chart types below
  "x": 100, "y": 100,
  "width": 500, "height": 350,
  "title": "Sales Report",
  "data": {
    "categories": ["Q1", "Q2", "Q3", "Q4"],
    "series": [
      { "name": "2024", "values": [100, 150, 120, 180] },
      { "name": "2025", "values": [110, 160, 130, 200] }
    ]
  },
  "styleId": 2,
  "options": {
    "barDirection": "col",
    "barGrouping": "clustered",
    "grouping": "standard",
    "scatterStyle": "lineMarker",
    "radarStyle": "standard",
    "holeSize": 50,
    "ofPieType": "pie",
    "bubbleScale": 100,
    "sizeRepresents": "area",
    "wireframe": false
  }
}
```

**Chart types**: `barChart`, `bar3DChart`, `lineChart`, `line3DChart`, `pieChart`, `pie3DChart`, `doughnutChart`, `areaChart`, `area3DChart`, `scatterChart`, `bubbleChart`, `radarChart`, `surfaceChart`, `surface3DChart`, `stockChart`, `ofPieChart`

**Chart options**:
- `barDirection`: `col` | `bar`
- `barGrouping`: `standard` | `stacked` | `percentStacked` | `clustered`
- `grouping`: `standard` | `stacked` | `percentStacked`
- `scatterStyle`: `lineMarker` | `line` | `marker` | `smooth` | `smoothMarker`
- `radarStyle`: `standard` | `marker` | `filled`
- `holeSize`: 0-90 (doughnut)
- `ofPieType`: `pie` | `bar`
- `bubbleScale`: number
- `sizeRepresents`: `area` | `w`
- `wireframe`: boolean

### updateCharts

```jsonc
{
  "resourceId": "rId2",
  "title": "Updated Title",
  "data": {
    "categories": ["Q1", "Q2"],
    "series": [{ "name": "New", "values": [200, 300] }]
  },
  "styleId": 3,
  "transform": { "x": 50, "y": 50, "width": 600, "height": 400 }
}
```

### addAnimations

```jsonc
{
  "shapeId": "2",
  "class": "entrance",           // entrance/exit/emphasis/motion
  "effect": "fade",              // e.g., fade, fly, wipe, zoom, pulse, spin
  "trigger": "onClick",          // onClick/withPrevious/afterPrevious
  "duration": 1000,              // milliseconds
  "delay": 500,                  // milliseconds
  "direction": "fromLeft",
  "repeat": 3,                   // number or "indefinite"
  "autoReverse": false
}
```

### addComments

```jsonc
{
  "authorName": "John",
  "authorInitials": "J",
  "text": "Review this slide",
  "x": 100,
  "y": 200
}
```

### Background

```jsonc
// Hex color
"background": "#FF0000"

// Solid
"background": { "type": "solid", "color": "#FF0000" }

// Gradient
"background": {
  "type": "gradient",
  "stops": [{ "position": 0, "color": "#FF0000" }, { "position": 100, "color": "#0000FF" }],
  "angle": 90
}

// Image
"background": {
  "type": "image",
  "path": "./bg.png",
  "mode": "stretch"              // stretch/tile/cover
}
```

### Transition

```jsonc
{
  "type": "fade",                // See transition types below
  "duration": 1000,              // milliseconds
  "advanceOnClick": true,
  "advanceAfter": 5000,          // milliseconds
  "direction": "l",              // l/r/u/d/ld/lu/rd/ru
  "orientation": "horz",         // horz/vert
  "spokes": 4,                   // 1/2/3/4/8 (wheel)
  "inOutDirection": "in"         // in/out
}
```

**Transition types**: `blinds`, `checker`, `circle`, `comb`, `cover`, `cut`, `diamond`, `dissolve`, `fade`, `newsflash`, `plus`, `pull`, `push`, `random`, `randomBar`, `split`, `strips`, `wedge`, `wheel`, `wipe`, `zoom`, `none`

### Theme editing

```jsonc
{
  "path": "ppt/theme/theme1.xml",
  "colorScheme": {
    "dk1": "#000000", "lt1": "#FFFFFF",
    "accent1": "#4472C4", "accent2": "#ED7D31"
    // dk1, lt1, dk2, lt2, accent1-6, hlink, folHlink
  },
  "fontScheme": {
    "majorFont": { "latin": "Calibri Light", "eastAsian": "Yu Gothic", "complexScript": "Arial" },
    "minorFont": { "latin": "Calibri", "eastAsian": "Yu Gothic", "complexScript": "Arial" }
  }
}
```

### updateSmartArt

```jsonc
{
  "resourceId": "rId3",
  "changes": [
    { "type": "nodeText", "nodeId": "node1", "text": "Updated label" },
    { "type": "addNode", "parentId": "root", "nodeId": "newNode", "text": "New item" },
    { "type": "removeNode", "nodeId": "node2" },
    { "type": "setConnection", "srcId": "node1", "destId": "newNode", "connectionType": "parOf" }
  ]
}
```

### Build result

The build command returns:

```jsonc
{
  "outputPath": "./output.pptx",
  "slideCount": 3,
  "shapesAdded": 12
}
```

---

## Patch spec

### Top-level structure

```jsonc
{
  "source": "./template.pptx",   // Required: existing PPTX to patch
  "output": "./output.pptx",     // Required: output path
  "patches": [                   // Array of patch operations
    { "type": "text.replace", ... },
    { "type": "slide.modify", ... },
    { "type": "theme.update", ... },
    { "type": "slide.add", ... },
    { "type": "slide.remove", ... },
    { "type": "slide.duplicate", ... },
    { "type": "slide.reorder", ... }
  ]
}
```

### text.replace

Replace text in `<a:t>` elements across slides.

```jsonc
{
  "type": "text.replace",
  "search": "{{NAME}}",          // Text to find
  "replace": "Alice",            // Replacement text
  "replaceAll": true,            // Replace all occurrences (default: true)
  "slides": [1, 3]              // Limit to specific slides (omit for all)
}
```

### slide.modify

Modify slide content. Uses the same fields as the build spec's `slides[]` entries.

```jsonc
{
  "type": "slide.modify",
  "slideNumber": 1,
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
  "speakerNotes": { "text": "..." },
  "background": "...",
  "transition": { ... },
  "updateSmartArt": [ ... ]
}
```

### theme.update

```jsonc
{
  "type": "theme.update",
  "colorScheme": { "accent1": "#FF0000", "dk1": "#111111" },
  "fontScheme": {
    "majorFont": { "latin": "Arial" },
    "minorFont": { "latin": "Calibri" }
  }
}
```

### slide.add / slide.remove / slide.duplicate / slide.reorder

```jsonc
// Add slide
{ "type": "slide.add", "layoutPath": "ppt/slideLayouts/slideLayout1.xml", "insertAt": 0 }

// Remove slide
{ "type": "slide.remove", "slideNumber": 2 }

// Duplicate slide
{ "type": "slide.duplicate", "sourceSlideNumber": 1, "insertAt": 3 }

// Reorder slide
{ "type": "slide.reorder", "from": 0, "to": 2 }
```

### Patch result

The patch command returns:

```jsonc
{
  "sourcePath": "./template.pptx",
  "outputPath": "./output.pptx",
  "patchCount": 3,
  "slidesModified": 1,
  "textReplacements": 2
}
```

---

## Verify spec

Test case JSON for automated verification:

```jsonc
{
  "name": "test-name",
  "description": "Description",
  "tags": ["tag1", "tag2"],
  "input": { ... },                    // Required: the build operation (BuildSpec)
  "expected": {
    "slideCount": 2,
    "slides": [{
      "slideNumber": 1,
      "shapeCount": 5,
      "shapes": [{
        "index": -1,                   // -1 = last added shape
        "type": "sp",                  // sp/pic/grpSp/cxnSp/graphicFrame
        "bounds": { "x": 100, "y": 100, "width": 400, "height": 200 },
        "rotation": 0,
        "flipH": false,
        "flipV": false,
        "geometry": { "kind": "preset", "preset": "rect" },
        "fill": { "type": "solid", "color": "#FF0000" },
        "line": { "color": "#000", "width": 2, "dashStyle": "solid", "compound": "sng" },
        "effects": {
          "shadow": { "type": "outerShdw" },
          "glow": { "radius": 10 },
          "softEdge": { "radius": 5 }
        },
        "shape3d": {
          "bevelTop": { "preset": "circle" },
          "bevelBottom": { "preset": "angle" },
          "material": "plastic",
          "extrusionHeight": 10
        },
        "text": "Expected text",
        "content": {                   // For graphicFrame (table)
          "type": "table",
          "table": {
            "rows": 2,
            "cols": 3,
            "cells": [
              [{ "text": "A1" }, { "text": "B1" }, { "text": "C1" }],
              [{ "text": "A2" }, { "text": "B2" }, { "text": "C2" }]
            ]
          }
        }
      }]
    }]
  }
}
```

### Assertion result

Each assertion in the verify result:

```jsonc
{
  "path": "slides[0].shapeCount",
  "expected": 5,
  "actual": 5,
  "passed": true
}
```

---

## Patch examples

### Text replacement

```json
{
  "source": "./template.pptx",
  "output": "./output.pptx",
  "patches": [
    { "type": "text.replace", "search": "{{NAME}}", "replace": "Alice" },
    { "type": "text.replace", "search": "{{DATE}}", "replace": "2025-01-01", "slides": [1] }
  ]
}
```

### Add shapes to a slide

```json
{
  "source": "./template.pptx",
  "output": "./output.pptx",
  "patches": [
    {
      "type": "slide.modify",
      "slideNumber": 1,
      "addShapes": [
        {
          "type": "rectangle",
          "x": 100, "y": 100,
          "width": 400, "height": 200,
          "fill": "#4472C4",
          "text": "New shape"
        }
      ]
    }
  ]
}
```

### Theme update

```json
{
  "source": "./template.pptx",
  "output": "./output.pptx",
  "patches": [
    {
      "type": "theme.update",
      "colorScheme": { "accent1": "#FF6600", "accent2": "#00CC99" },
      "fontScheme": {
        "majorFont": { "latin": "Georgia" },
        "minorFont": { "latin": "Verdana" }
      }
    }
  ]
}
```

### Slide operations

```json
{
  "source": "./template.pptx",
  "output": "./output.pptx",
  "patches": [
    { "type": "slide.duplicate", "sourceSlideNumber": 1, "insertAt": 2 },
    { "type": "slide.remove", "slideNumber": 3 },
    { "type": "slide.reorder", "from": 1, "to": 0 }
  ]
}
```

### Combined patches

```json
{
  "source": "./template.pptx",
  "output": "./output.pptx",
  "patches": [
    { "type": "theme.update", "colorScheme": { "accent1": "#FF0000" } },
    { "type": "text.replace", "search": "{{TITLE}}", "replace": "Q4 Report" },
    {
      "type": "slide.modify",
      "slideNumber": 1,
      "addShapes": [
        { "type": "ellipse", "x": 50, "y": 50, "width": 100, "height": 100, "fill": "#00FF00" }
      ]
    }
  ]
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
npx aurochs pptx inventory deck.pptx
npx aurochs pptx images deck.pptx
npx aurochs pptx tables deck.pptx

# Compare
npx aurochs pptx diff old.pptx new.pptx

# Build
npx aurochs pptx build spec.json
npx aurochs pptx preview output.pptx --border
npx aurochs pptx extract output.pptx

# Patch (edit existing PPTX)
npx aurochs pptx patch patch-spec.json

# Verify
npx aurochs pptx verify test-case.json
npx aurochs pptx verify tests/ --tag smoke
```
