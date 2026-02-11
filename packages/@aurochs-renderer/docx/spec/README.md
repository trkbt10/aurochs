# DOCX Renderer Test Suite

ECMA-376 WordprocessingML rendering tests with LibreOffice visual regression.

## Structure

```
spec/
├── run/           # w:r (Run) - Section 17.3.2
├── paragraph/     # w:p (Paragraph) - Section 17.3.1
├── section/       # w:sectPr (Section) - Section 17.6
├── table/         # w:tbl (Table) - Section 17.4
├── numbering/     # w:numPr (Numbering) - Section 17.9
├── drawing/       # DrawingML - Part 4
└── scripts/       # Test utilities
```

Each folder has its own `README.md` with domain-specific checklist.

## Test Methodology

1. **Fixture**: `.json` spec → `.docx` file (via `@aurochs-builder/docx`)
2. **Baseline**: `.docx` → LibreOffice → PDF → PNG (96 DPI)
3. **Pipeline**: DOCX → parse → layout → SVG → compare to baseline

## Adding Tests

```bash
# 1. Create fixture JSON
vim spec/run/fixtures/my-feature.json

# 2. Generate DOCX from JSON
bun run spec/scripts/generate-fixtures.ts

# 3. Generate baseline PNG from DOCX
spec/scripts/generate-baselines.sh

# 4. Write spec
vim spec/run/my-feature.spec.ts
```

## Test Helper

```typescript
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
} from "../scripts/test-helper";

const { svg } = await loadAndRender(fixture("my-feature"), import.meta.url);
const result = compareToBaseline(svg, baselinePath(fixture("my-feature"), import.meta.url));
expect(result.match).toBe(true);
```

## References

- ECMA-376-1:2016 Part 1 - WordprocessingML
- ISO/IEC 29500-1:2016
