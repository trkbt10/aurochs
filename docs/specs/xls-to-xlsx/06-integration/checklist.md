# Integration Implementation Checklist

## Components

| Component | Status | File | Tests |
|-----------|--------|------|-------|
| Public API | [x] | `src/xls/index.ts` | [x] |
| Parser Entry | [x] | `src/xls/parser.ts` | [x] |
| XLS → XlsxWorkbook | [x] | `src/xls/converter/index.ts` | [x] |
| Integration Tests | [x] | `spec/xls/xls-to-xlsx.spec.ts` | [x] |
| Fixture Integration Tests | [x] | `spec/xls/xls-fixtures.spec.ts` | [x] |

## Public API

```typescript
// src/xls/index.ts
export { parseXls, parseXlsWithReport, type ParseXlsOptions, type ParseXlsResult } from "./parser";
export { convertXlsToXlsx } from "./converter";
export { extractXlsWorkbook } from "./extractor";
export type { XlsWorkbook } from "./domain/types";
```

## Parser Entry Point

```typescript
// src/xls/parser.ts
import type { XlsxWorkbook } from "../xlsx/domain/workbook";
import type { XlsParseMode } from "./parse-context";
import type { XlsWarning, XlsWarningSink } from "./warnings";

export type ParseXlsOptions = {
  readonly mode?: XlsParseMode;
  readonly onWarning?: XlsWarningSink;
};

export type ParseXlsResult = {
  readonly workbook: XlsxWorkbook;
  readonly warnings: readonly XlsWarning[];
};

// Implementation note:
// - `parseXlsWithReport()` always collects warnings internally (createXlsWarningCollector()).
// - `{ mode, warn }` context is passed into openCfb() / parseWorkbookStream() / convertXlsToXlsx().
// - In strict mode, inconsistencies throw; in lenient mode, each fallback emits a warning.
export declare function parseXlsWithReport(bytes: Uint8Array, options?: Omit<ParseXlsOptions, "onWarning">): ParseXlsResult;

// NOTE: lenient mode requires `onWarning`; otherwise it throws on first fallback.
export declare function parseXls(bytes: Uint8Array, options?: ParseXlsOptions): XlsxWorkbook;
```

## End-to-End Flow

```
Input: .xls file (Uint8Array)
         │
         ▼
    CFB Parser
         │
         ▼
    Workbook Stream
         │
         ▼
    Workbook Stream Parser
         │
         ▼
    XLS Domain Extractor
         │
         ▼
    XlsWorkbook (intermediate)
         │
         ▼
    XLSX Domain Converter
         │
         ▼
    XlsxWorkbook (output)
         │
         ▼
    exportXlsx() [existing]
         │
         ▼
Output: .xlsx file (Uint8Array)
```

## Test Matrix

| Feature | Unit | Integration | Round-trip |
|---------|------|-------------|------------|
| Cell values | [x] | [x] | [x] |
| Shared strings | [x] | [x] | [x] |
| Number formats | [x] | [x] | [x] |
| Fonts | [x] | [x] | [x] |
| Fills | [x] | [x] | [x] |
| Borders | [x] | [x] | [x] |
| Alignment | [x] | [x] | [x] |
| Merged cells | [x] | [x] | [x] |
| Multiple sheets | [x] | [x] | [x] |
| Hidden sheets | [x] | [x] | [x] |
| Formulas | [x] | [x] | [x] |

## Verification Commands

```bash
# Type check
bun run typecheck:xls-to-xlsx

# Lint
bun run lint:xls-to-xlsx

# Unit tests
# NOTE: `src/xls` is a prefix of `src/xlsx`, so use the trailing slash to avoid running XLSX tests too.
bun run test -- src/xls/
bun run test -- src/cfb/

# Integration tests
bun run test -- spec/xls/

# POI test-data smoke read (XLS, lenient mode)
bun run test -- spec/xls/poi-test-data-spreadsheet-xls-read.spec.ts

# Visual verification
# Open output XLSX in Excel/LibreOffice and compare with original XLS
```

## Dependencies

- CFB Parser (`docs/specs/cfb/`)
- BIFF Records (`01-biff-structure/`, `02-workbook-records/`, etc.)
- Style Mapping (`05-style-mapping/`)
- Existing XLSX exporter (`src/xlsx/exporter.ts`)
