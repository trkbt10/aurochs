# PPTX Visual Regression Tests

This directory contains visual regression tests specific to PPTX rendering.

## Test Structure

- `slide.visual.spec.ts` - Full slide rendering visual tests
- `shape.visual.spec.ts` - Individual shape rendering visual tests
- `text.visual.spec.ts` - Text rendering visual tests

## Running Tests

```bash
# Run PPTX visual tests only
bun test packages/@aurochs-renderer/pptx/spec/visual

# Run all visual tests (slower)
bun test spec/visual-regression
```

## Baseline Generation

Baselines are generated from LibreOffice rendering:

```bash
./spec/visual-regression/scripts/generate-snapshots.sh <pptx-file>
```

## Adding New Tests

See the main visual regression tests at `spec/visual-regression/visual.spec.ts`
for the full test structure and comparison utilities.
