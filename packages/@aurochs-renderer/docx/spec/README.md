# DOCX Renderer Test Suite

ECMA-376 WordprocessingML rendering tests.

## Structure

```
spec/
├── run/           # w:r (Run) - Section 17.3.2
├── paragraph/     # w:p (Paragraph) - Section 17.3.1
├── table/         # w:tbl (Table) - Section 17.4
├── section/       # w:sectPr (Section) - Section 17.6
├── numbering/     # w:numPr (Numbering) - Section 17.9
└── scripts/       # Test utilities
```

Each folder has its own `README.md` with domain-specific checklist.

## Test Methodology

1. **Fixture**: `.json` spec → `.docx` file (via `@aurochs-builder/docx`)
2. **Pipeline**: DOCX → parse → layout → SVG → assertions
3. **Baseline**: LibreOffice rendering for visual regression (future)

## Adding Tests

```bash
# 1. Create fixture JSON
vim spec/run/fixtures/underline.json

# 2. Generate DOCX
bun run spec/scripts/generate-fixtures.ts

# 3. Write spec
vim spec/run/underline.spec.ts
```

## Test Helper

```typescript
import { loadAndRender, fixture } from "../scripts/test-helper";

const { svg, svgs, pages } = await loadAndRender(
  fixture("underline"),
  import.meta.url
);
```

## References

- ECMA-376-1:2016 Part 1 - WordprocessingML
- ISO/IEC 29500-1:2016
