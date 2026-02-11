# Drawing (Images)

ECMA-376-1:2016 Part 4 - DrawingML

Images and shapes embedded in DOCX documents.

## Checklist

### Inline Images (wp:inline) - Section 20.4.2.8

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Extent (size) | `wp:extent` | ⬚ | |
| Effect Extent | `wp:effectExtent` | ⬚ | |
| Doc Properties | `wp:docPr` | ⬚ | |

### Anchor Images (wp:anchor) - Section 20.4.2.3

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Simple Position | `wp:simplePos` | ⬚ | |
| Horizontal Position | `wp:positionH` | ⬚ | |
| Vertical Position | `wp:positionV` | ⬚ | |
| Extent | `wp:extent` | ⬚ | |
| Behind Document | `@behindDoc` | ⬚ | |
| Lock Anchor | `@locked` | ⬚ | |

### Text Wrapping

| Type | Element | Status | File |
|------|---------|:------:|------|
| None | `wp:wrapNone` | ⬚ | |
| Square | `wp:wrapSquare` | ⬚ | |
| Tight | `wp:wrapTight` | ⬚ | |
| Through | `wp:wrapThrough` | ⬚ | |
| Top and Bottom | `wp:wrapTopAndBottom` | ⬚ | |

### Image Content

| Property | Element | Status | File |
|----------|---------|:------:|------|
| Blip (image ref) | `a:blip` | ⬚ | |
| Stretch Fill | `a:stretch` | ⬚ | |
| Crop | `a:srcRect` | ⬚ | |

## Legend

- ✅ Tested
- ⬚ Not implemented
