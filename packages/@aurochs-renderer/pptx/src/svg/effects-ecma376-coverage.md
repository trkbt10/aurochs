# ECMA-376 Shape Effects Coverage Report

## Overview

This document tracks the implementation coverage of ECMA-376 Part 1, Section 20.1.8 for shape effects rendering.

**Coverage Summary:**
| Layer | Coverage |
|-------|----------|
| Parser (effects-parser.ts) | 100% (5/5) |
| Domain Types (types.ts) | 100% (4/4) |
| Renderer (svg/effects.ts) | 75% (3/4) |

---

## 20.1.8.49 outerShdw (Outer Shadow)

@see ECMA-376 Part 1, Section 20.1.8.49

| Attribute | Section | Parser | Renderer | Test | Notes |
|-----------|---------|--------|----------|------|-------|
| blurRad | 20.1.8.49 | ✅ | ✅ | ✅ | Blur radius (EMU) |
| dist | 20.1.8.49 | ✅ | ✅ | ✅ | Distance from shape (EMU) |
| dir | 20.1.8.49 | ✅ | ✅ | ✅ | Direction angle (60000ths degree) |
| algn | 20.1.8.49 | ✅ | ❌ | ❌ | Shadow alignment |
| rotWithShape | 20.1.8.49 | ❌ | ❌ | ❌ | Rotate with shape |
| sx/sy | 20.1.8.49 | ❌ | ❌ | ❌ | Scale factors |
| kx/ky | 20.1.8.49 | ❌ | ❌ | ❌ | Skew angles |

**SVG Implementation:**
- `feGaussianBlur` - Blur effect (stdDeviation = blurRad / 2)
- `feOffset` - Shadow position (dx, dy calculated from dist/dir)
- `feColorMatrix` - Shadow color application
- `feMerge` - Combine shadow behind source

---

## 20.1.8.40 innerShdw (Inner Shadow)

@see ECMA-376 Part 1, Section 20.1.8.40

| Attribute | Section | Parser | Renderer | Test | Notes |
|-----------|---------|--------|----------|------|-------|
| blurRad | 20.1.8.40 | ✅ | ✅ | ✅ | Blur radius (EMU) |
| dist | 20.1.8.40 | ✅ | ✅ | ✅ | Distance from edge (EMU) |
| dir | 20.1.8.40 | ✅ | ✅ | ✅ | Direction angle |

**SVG Implementation:**
- Same as outer shadow but with inverted offset
- `feComposite in="in"` - Clip shadow to shape interior

---

## 20.1.8.32 glow

@see ECMA-376 Part 1, Section 20.1.8.32

| Attribute | Section | Parser | Renderer | Test | Notes |
|-----------|---------|--------|----------|------|-------|
| rad | 20.1.8.32 | ✅ | ✅ | ✅ | Glow radius (EMU) |
| color | 20.1.8.32 | ✅ | ✅ | ✅ | Glow color |

**SVG Implementation:**
- `feGaussianBlur` - Glow spread (stdDeviation = rad / 2)
- `feColorMatrix` - Apply glow color
- `feMerge` - Render glow behind source

---

## 20.1.8.50 reflection

@see ECMA-376 Part 1, Section 20.1.8.50

| Attribute | Section | Parser | Renderer | Test | Notes |
|-----------|---------|--------|----------|------|-------|
| blurRad | 20.1.8.50 | ✅ | ❌ | ❌ | Reflection blur |
| stA/endA | 20.1.8.50 | ✅ | ❌ | ❌ | Start/end opacity |
| dist | 20.1.8.50 | ✅ | ❌ | ❌ | Distance from shape |
| dir | 20.1.8.50 | ✅ | ❌ | ❌ | Direction |
| fadeDir | 20.1.8.50 | ✅ | ❌ | ❌ | Fade direction |
| sx/sy | 20.1.8.50 | ✅ | ❌ | ❌ | Scale factors |

**Status:** Parser implemented, renderer NOT implemented (requires complex SVG transforms)

---

## 20.1.8.53 softEdge

@see ECMA-376 Part 1, Section 20.1.8.53

| Attribute | Section | Parser | Renderer | Test | Notes |
|-----------|---------|--------|----------|------|-------|
| rad | 20.1.8.53 | ✅ | ✅ | ✅ | Soft edge radius (EMU) |

**SVG Implementation:**
- `feGaussianBlur` - Create blurred alpha mask
- `feComposite in="in"` - Apply faded edges to shape

---

## Effect Priority

When multiple effects are present, they are applied in this priority order:

1. **shadow** (outer or inner) - Most common effect
2. **glow** - Secondary effect
3. **softEdge** - Edge treatment

Note: Complex effect combinations require compositing multiple filters, which is not currently implemented.

---

## SVG Filter Structure

### Outer Shadow Example
```svg
<filter id="effect-shape1" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
  <feOffset in="blur" dx="3" dy="3" result="offsetBlur"/>
  <feColorMatrix in="offsetBlur" type="matrix"
    values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"
    result="shadow"/>
  <feMerge>
    <feMergeNode in="shadow"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

### Usage
```svg
<g filter="url(#effect-shape1)">
  <path d="..."/>
</g>
```

---

## Test Coverage

| Test Category | Count | Status |
|--------------|-------|--------|
| Filter ID generation | 2 | ✅ |
| Outer shadow | 6 | ✅ |
| Inner shadow | 3 | ✅ |
| Glow effect | 4 | ✅ |
| Soft edge | 3 | ✅ |
| Effect priority | 2 | ✅ |
| getFilterAttribute | 5 | ✅ |
| SVG structure | 1 | ✅ |

**Total: 26 tests passing**

---

## Future Enhancements

1. **Reflection rendering** - Requires SVG transform + gradient mask
2. **Multiple effect compositing** - Apply shadow + glow together
3. **rotWithShape** - Apply rotation to shadow direction
4. **Scale/skew parameters** - Full shadow transformation support

---

*Generated: 2025-12-25*
*Based on: ECMA-376-1:2016*

---

## Recent Changes

### 2025-12-25
- Created effects.ts module for SVG filter generation
- Implemented outer shadow (20.1.8.49) with feGaussianBlur, feOffset, feColorMatrix
- Implemented inner shadow (20.1.8.40) with clipping composite
- Implemented glow effect (20.1.8.32)
- Implemented soft edge (20.1.8.53)
- Created effects.spec.ts with 26 unit tests
- ECMA-376 compliance for core shape effects
