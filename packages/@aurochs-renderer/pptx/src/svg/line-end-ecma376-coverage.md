# ECMA-376 Line End (Arrow) Coverage Report

## Overview

This document tracks the implementation coverage of ECMA-376 Part 1, Section 20.1.8/20.1.10 for line end (arrow) rendering.

**Coverage Summary:**
| Layer | Coverage |
|-------|----------|
| OOXML Types (drawingml.ts) | 100% (3/3) |
| Parser (line-parser.ts) | 100% (6/6) |
| Domain Model (color.ts) | 100% (3/3) |
| Renderer (svg/) | 100% (12/12) |

---

## 20.1.8.37 headEnd / 20.1.8.57 tailEnd

@see ECMA-376 Part 1, Section 20.1.8.37, 20.1.8.57

### Attributes

| Attribute | Section | OOXML | Parser | Domain | Renderer | Test | Notes |
|-----------|---------|-------|--------|--------|----------|------|-------|
| type | 20.1.10.55 | ✅ | ✅ | ✅ | ✅ | ✅ | ST_LineEndType |
| w | 20.1.10.56 | ✅ | ✅ | ✅ | ✅ | ✅ | ST_LineEndWidth |
| len | 20.1.10.57 | ✅ | ✅ | ✅ | ✅ | ✅ | ST_LineEndLength |

---

## 20.1.10.55 ST_LineEndType (Line End Type)

@see ECMA-376 Part 1, Section 20.1.10.55

| Value | Parser | Renderer | Test | Description |
|-------|--------|----------|------|-------------|
| none | ✅ | ✅ | ✅ | No line end |
| triangle | ✅ | ✅ | ✅ | Filled triangle arrow |
| stealth | ✅ | ✅ | ✅ | Stealth arrow (sharp) |
| diamond | ✅ | ✅ | ✅ | Diamond shape |
| oval | ✅ | ✅ | ✅ | Oval/circle shape |
| arrow | ✅ | ✅ | ✅ | Open arrow (V-shape) |

---

## 20.1.10.56 ST_LineEndWidth (Line End Width)

@see ECMA-376 Part 1, Section 20.1.10.56

| Value | Parser | Renderer | Test | Size Ratio | Notes |
|-------|--------|----------|------|------------|-------|
| sm | ✅ | ✅ | ✅ | ~2x line width | Small |
| med | ✅ | ✅ | ✅ | ~3x line width | Medium (default) |
| lg | ✅ | ✅ | ✅ | ~5x line width | Large |

---

## 20.1.10.57 ST_LineEndLength (Line End Length)

@see ECMA-376 Part 1, Section 20.1.10.57

| Value | Parser | Renderer | Test | Size Ratio | Notes |
|-------|--------|----------|------|------------|-------|
| sm | ✅ | ✅ | ✅ | ~2x line width | Small |
| med | ✅ | ✅ | ✅ | ~3x line width | Medium (default) |
| lg | ✅ | ✅ | ✅ | ~5x line width | Large |

---

## Renderer Implementation Checklist

### SVG Marker Generation

| Task | Status | Notes |
|------|--------|-------|
| Create marker.ts module | ✅ | SVG marker generation |
| Generate unique marker IDs | ✅ | Pattern-based (type-width-length-color) |
| Implement triangle marker | ✅ | Filled triangle polygon |
| Implement stealth marker | ✅ | Notched triangle polygon |
| Implement diamond marker | ✅ | Diamond/rhombus polygon |
| Implement oval marker | ✅ | Ellipse element |
| Implement arrow marker | ✅ | Open V-shape polyline |
| Calculate marker size (width) | ✅ | sm=2x, med=3x, lg=5x |
| Calculate marker size (length) | ✅ | sm=2x, med=3x, lg=5x |
| Apply stroke color to marker | ✅ | Match line color |

### SVG Integration

| Task | Status | Notes |
|------|--------|-------|
| Add marker-start attribute | ✅ | For headEnd |
| Add marker-end attribute | ✅ | For tailEnd |

---

## Implementation Notes

### Marker Size Calculation

Per ECMA-376 and PowerPoint behavior, marker sizes are relative to line width:

```
Width (w attribute):
- sm: width = lineWidth * 2
- med: width = lineWidth * 3 (default)
- lg: width = lineWidth * 5

Length (len attribute):
- sm: length = lineWidth * 2
- med: length = lineWidth * 3 (default)
- lg: length = lineWidth * 5
```

### SVG Marker Structure

```svg
<defs>
  <marker id="arrow-triangle-med-med"
          markerWidth="10" markerHeight="10"
          refX="10" refY="5"
          orient="auto-start-reverse">
    <polygon points="0,0 10,5 0,10" fill="currentColor"/>
  </marker>
</defs>
<path d="..." marker-end="url(#arrow-triangle-med-med)"/>
```

### Marker Shapes

| Type | SVG Path/Shape |
|------|----------------|
| triangle | `<polygon points="0,0 L,H/2 0,H"/>` (filled triangle) |
| stealth | `<polygon points="0,H/4 L,H/2 0,3H/4 L/3,H/2"/>` (notched) |
| diamond | `<polygon points="L/2,0 L,H/2 L/2,H 0,H/2"/>` (rhombus) |
| oval | `<ellipse cx="L/2" cy="H/2" rx="L/2" ry="H/2"/>` (circle) |
| arrow | `<polyline points="0,0 L,H/2 0,H"/>` (open V-shape, no fill) |

---

## Priority Implementation Order

1. **triangle** - Most commonly used arrow type
2. **arrow** - Common open arrow
3. **stealth** - Used in technical diagrams
4. **diamond** - Used in flowcharts
5. **oval** - Less common

---

## Test Plan

### Unit Tests (marker.spec.ts)

1. Marker ID generation uniqueness
2. Marker size calculation for each width/length combination (3x3=9 cases)
3. Marker shape generation for each type (6 types)
4. Marker color application

### Integration Tests

1. Render line with headEnd only
2. Render line with tailEnd only
3. Render line with both headEnd and tailEnd
4. Render line with different arrow types at each end
5. Render line with different sizes (sm/med/lg combinations)

---

*Generated: 2025-12-25*
*Based on: ECMA-376-1:2016*

---

## Recent Changes

### 2025-12-25
- Created marker.ts module for SVG marker generation
- Implemented all 6 line end types (none, triangle, stealth, diamond, oval, arrow)
- Added size calculation based on width/length attributes (sm/med/lg)
- Added marker-start/marker-end attribute support in primitives.ts
- Added renderGeometryPathWithMarkers function in geometry.ts
- Created marker.spec.ts with 25 unit tests
- Full ECMA-376 compliance for line end rendering
