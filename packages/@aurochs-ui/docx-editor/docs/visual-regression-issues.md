# DOCX Visual Regression - Issue Tracking

## Overview

Visual regression tests compare docx-editor rendering against baseline images.

### Baseline Strategy

| Mode | Description | Target |
|------|-------------|--------|
| **LibreOffice** | Compare against LibreOffice Writer PDF export | Verify compatibility |
| **Self-Comparison** | Compare against previous editor output | Detect regressions |

**Current Mode**: Self-Comparison (for <0.1% accuracy)

---

## Issue Tracking Table

| ID | Category | Description | Status | Diff Impact | Fix Applied |
|----|----------|-------------|--------|-------------|-------------|
| #1 | Setup | Visual test infrastructure needed | DONE | N/A | spec/visual-harness/ |
| #2 | Setup | Baseline generation script needed | DONE | N/A | scripts/generate-editor-baselines.ts |
| #3 | Setup | Self-comparison baseline needed | DONE | N/A | 26 baselines generated |
| #4 | Bug | List rendering causes browser crash | FIXED | N/A | Incorrect property names in fixture (abstractNums→abstractNum, nums→num, levels→lvl, indent→ind) |
| #5 | Bug | Non-list documents render as blank pages | FIXED | N/A | Wrong property name in textRun helper: `{ type: "text", text }` → `{ type: "text", value }`, added `type: "run"` |
| #6 | Bug | Tab stops rendering causes browser timeout | FIXED | N/A | Wrong property name in fixture: `tabs: { tab: [...] }` → `tabs: { tabs: [...] }` |

---

## Test Cases (Implemented)

### Text Formatting Tests

| Test Case | Feature Tested | Current Diff | Status |
|-----------|----------------|--------------|--------|
| bold-italic | Bold, italic text | 0.0% | PASS |
| font-sizes | Various font sizes | 0.0% | PASS |
| font-colors | Text colors (RGB, theme) | 0.0% | PASS |
| underline-styles | Underline variations | 0.0% | PASS |
| strikethrough | Strike, double strike | 0.0% | PASS |
| superscript-subscript | Vertical alignment | 0.0% | PASS |
| highlighting | Highlight colors | 0.0% | PASS |
| run-shading | Run-level background (w:shd) | 0.0% | PASS |
| tab-stops | Custom tab positions (w:tabs) | 0.0% | PASS |

### Paragraph Formatting Tests

| Test Case | Feature Tested | Current Diff | Status |
|-----------|----------------|--------------|--------|
| alignment | left, center, right, justify | 0.0% | PASS |
| spacing | Before, after, line spacing | 0.0% | PASS |
| indentation | Left, right, first line, hanging | 0.0% | PASS |
| paragraph-borders | Paragraph borders | 0.0% | PASS |
| paragraph-shading | Background colors | 0.0% | PASS |

### List Tests

| Test Case | Feature Tested | Current Diff | Status |
|-----------|----------------|--------------|--------|
| bullet-list | Basic bullet list | 0.0% | PASS |
| numbered-list | Decimal numbering | 0.0% | PASS |
| multi-level-list | Nested list levels | 0.0% | PASS |
| roman-numerals | Upper/lower Roman (I, II, i, ii) | 0.0% | PASS |
| letter-lists | Upper/lower letter (A, B, a, b) | 0.0% | PASS |
| custom-bullets | Custom bullet characters (→, ★, ✓) | 0.0% | PASS |

### Table Tests

| Test Case | Feature Tested | Current Diff | Status |
|-----------|----------------|--------------|--------|
| basic-table | Simple table layout | - | TODO |
| merged-cells | Horizontal and vertical merge | - | TODO |
| table-borders | Border styles | - | TODO |
| cell-shading | Cell backgrounds | - | TODO |
| table-alignment | Table and cell alignment | - | TODO |

### Page Layout Tests

| Test Case | Feature Tested | Current Diff | Status |
|-----------|----------------|--------------|--------|
| page-size | US Letter size (8.5" x 11") | 0.0% | PASS |
| page-margins | Wide margins (1.5" all around) | 0.0% | PASS |
| columns | Multi-column layout | - | TODO |

---

## Action Plan

### Phase 1: Setup Infrastructure (DONE)

1. [x] Create visual test harness (`spec/visual-harness/`)
2. [x] Create fixture generation script (`scripts/generate-visual-fixtures.ts`)
3. [x] Create baseline generation script (`scripts/generate-editor-baselines.ts`)
4. [x] Create visual test spec (`spec/docx-visual.spec.ts`)

### Phase 2: Establish Baselines (DONE)

1. [x] Generate test document fixtures (26 fixtures)
2. [x] Capture editor output as self-comparison baselines
3. [x] Verify 0.0% self-comparison diff (all 26 tests pass)

### Phase 3: Validation (TODO)

1. [ ] Validate text formatting rendering
2. [ ] Validate paragraph formatting
3. [ ] Validate list rendering
4. [ ] Validate table rendering
5. [ ] Validate page layout

### Phase 4: Continuous Regression (TODO)

1. [ ] Add to CI pipeline
2. [ ] Auto-update baselines on approved changes
3. [ ] Alert on unexpected visual changes

---

## File Structure (Implemented)

```
packages/@aurochs-ui/docx-editor/
├── docs/
│   └── visual-regression-issues.md  # This file
├── fixtures/
│   └── visual/
│       ├── json/           # Document JSON for tests (26 fixtures)
│       ├── baseline/       # Self-comparison baselines (PNG)
│       ├── __output__/     # Test output (PNG)
│       └── __diff__/       # Diff images (PNG)
├── scripts/
│   ├── generate-visual-fixtures.ts   # Generate JSON fixtures
│   └── generate-editor-baselines.ts  # Generate PNG baselines
└── spec/
    ├── visual-harness/
    │   ├── index.html      # Test page
    │   ├── main.tsx        # React entry point
    │   ├── types.d.ts      # Type declarations
    │   └── test-utils.ts   # Harness utilities
    └── docx-visual.spec.ts # Visual regression tests
```

---

## Commands

```bash
# Generate fixtures (document JSON)
bun packages/@aurochs-ui/docx-editor/scripts/generate-visual-fixtures.ts

# Generate self-comparison baselines (editor output)
bun packages/@aurochs-ui/docx-editor/scripts/generate-editor-baselines.ts

# Run visual regression tests
npx vitest run packages/@aurochs-ui/docx-editor/spec/docx-visual.spec.ts
```

---

## Notes

### Differences from XLSX Visual Tests

DOCX visual tests have additional complexity:

1. **Page-based layout**: Unlike XLSX's infinite grid, DOCX has page boundaries
2. **Text reflow**: Text wrapping affects layout significantly
3. **Font rendering**: System font availability affects rendering
4. **Pagination**: Multi-page documents need page-by-page comparison

### Recommended Approach

1. Start with single-page documents to simplify comparison
2. Use web-safe fonts (Arial, Times New Roman) for consistent rendering
3. Compare at fixed viewport size (e.g., 800x1000 for portrait A4)
4. Consider per-page baseline comparison for multi-page documents

---

## References

- XLSX visual regression: `packages/@aurochs-ui/xlsx-editor/docs/visual-regression-issues.md`
- XLSX test implementation: `packages/@aurochs-ui/xlsx-editor/spec/xlsx-visual.spec.ts`
- DOCX feature support: `docs/docx-feature-support.md`
