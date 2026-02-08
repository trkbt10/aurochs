# DrawingML Visual Regression Tests

This directory contains visual regression tests for DrawingML rendering components.

## Test Structure

- `color.visual.spec.ts` - Color resolution visual tests
- `effects.visual.spec.ts` - Effects (shadow, glow, soft edge) visual tests
- `gradient.visual.spec.ts` - Gradient rendering visual tests
- `pattern.visual.spec.ts` - Pattern fill visual tests

## Running Tests

```bash
# Run drawing-ml visual tests only
bun test packages/@aurochs-renderer/drawing-ml/spec/visual

# Run all visual tests (slower)
bun test spec/visual-regression
```

## Adding New Tests

Visual tests should:

1. Render a component to SVG
2. Compare against a baseline PNG/SVG
3. Allow configurable diff thresholds

See `../../spec/visual-regression/compare.ts` for the comparison utilities.
