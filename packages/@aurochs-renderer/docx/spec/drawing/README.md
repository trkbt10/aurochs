# Drawing (Images, Shapes, Charts)

ECMA-376-1:2016 Part 4 - DrawingML

Images, shapes, and charts embedded in DOCX documents.

## Implementation Status

### Components (Unit Tests)

| Component | File | Tests |
|-----------|------|:-----:|
| Picture | `src/react/drawing/Picture.tsx` | ✅ 5 tests |
| InlineDrawing | `src/react/drawing/InlineDrawing.tsx` | ✅ 10 tests |
| AnchorDrawing | `src/react/drawing/AnchorDrawing.tsx` | ✅ 10 tests |
| FloatingImageOverlay | `src/react/drawing/FloatingImageOverlay.tsx` | ✅ 11 tests |
| WordprocessingShape | `src/react/drawing/WordprocessingShape.tsx` | ✅ 14 tests |
| ChartPlaceholder | `src/react/drawing/ChartPlaceholder.tsx` | ✅ 9 tests |
| TextBox | `src/react/drawing/TextBox.tsx` | ✅ 11 tests |

### Inline Images (wp:inline) - Section 20.4.2.8

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Extent (size) | `wp:extent` | ✅ | InlineDrawing |
| Effect Extent | `wp:effectExtent` | ✅ | InlineDrawing (data-attr) |
| Doc Properties | `wp:docPr` | ✅ | InlineDrawing |
| Picture | `pic:pic` | ✅ | Picture |

### Anchor Images (wp:anchor) - Section 20.4.2.3

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Simple Position | `wp:simplePos` | ✅ | AnchorDrawing (data-attr) |
| Horizontal Position | `wp:positionH` | ✅ | docx-adapter |
| Vertical Position | `wp:positionV` | ✅ | docx-adapter |
| Extent | `wp:extent` | ✅ | AnchorDrawing |
| Behind Document | `@behindDoc` | ✅ | FloatingImageOverlay |
| Lock Anchor | `@locked` | ✅ | AnchorDrawing (data-attr) |
| Relative Height | `@relativeHeight` | ✅ | FloatingImageOverlay |
| Allow Overlap | `@allowOverlap` | ✅ | AnchorDrawing (data-attr) |

### Text Wrapping

| Type | Element | Status | File |
|------|---------|:------:|------|
| None | `wp:wrapNone` | ✅ | docx-adapter |
| Square | `wp:wrapSquare` | ✅ | docx-adapter |
| Tight | `wp:wrapTight` | ✅ | docx-adapter |
| Through | `wp:wrapThrough` | ✅ | docx-adapter |
| Top and Bottom | `wp:wrapTopAndBottom` | ✅ | docx-adapter |

### Image Content

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Blip (image ref) | `a:blip` | ✅ | Picture |
| Stretch Fill | `a:stretch` | ✅ | Picture |
| Crop | `a:srcRect` | ✅ | svg-renderer, Picture |

### Shapes (wps:wsp) - Section 20.4.2.19

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Preset Geometry | `a:prstGeom` | ✅ | WordprocessingShape |
| Solid Fill | `a:solidFill` | ✅ | WordprocessingShape |
| No Fill | `a:noFill` | ✅ | WordprocessingShape |
| Line | `a:ln` | ✅ | WordprocessingShape |
| Text Box | `wps:txbx` | ✅ | TextBox |
| Body Properties | `wps:bodyPr` | ✅ | TextBox (insets, anchor) |

### Charts (c:chart) - Section 21.2

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Chart Reference | `c:chart[@r:id]` | ✅ | ChartPlaceholder |
| Chart Rendering | - | ✅ | ChartPlaceholder + chart module |

## Chart Rendering

Chart rendering is supported when `chartData` and `renderContext` props are provided to `ChartPlaceholder`.
The chart module (`src/chart/`) provides:

- `createDocxChartRenderContext` - Adapts DOCX context for chart rendering
- `createDocxFillResolver` - Resolves fills for chart elements
- `renderChart` - Renders chart to SVG string

Integration requires parsing chart XML from DOCX package and providing the parsed `Chart` data.

## Visual Regression Tests

To add visual regression tests, create DOCX fixtures in `fixtures/` directory
with the appropriate drawing elements and add corresponding `.spec.ts` files.

## Legend

- ✅ Implemented with unit tests
- ⬚ Not yet implemented
