# ECMA-376 Part 1: DrawingML - Tables チェックリスト（章／節ベース）

このチェックリストは ECMA-376 の公式 PDF（章／節の見出し）から抽出したものです。
各項目は章番号・節名・参照ページ（判読できたもの）を保持し、網羅度測定のベースラインとして利用できます。

参照PDF: `reference/ecma376/ecma-376-1/Ecma Office Open XML Part 1 - Fundamentals And Markup Language Reference.pdf`

## Checklist

### 21.1.3.1 — p.3342

| Item                       | Status | Implementation                                                                                           | Notes                            |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 21.1.3.1 cell3D (Cell 3-D) | [x]    | src/pptx/parser/cell3d-parser.ts, src/pptx/parser/table-parser.ts, src/pptx/parser/table-style-parser.ts | Spec: ECMA-376-1 21.1.3.1 p.3342 |

### 21.1.3.2 — p.3342

| Item                                 | Status | Implementation                                            | Notes |
| ------------------------------------ | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.2 gridCol (Table Grid Column) | [x]    | src/pptx/core/render-options.ts, src/pptx/domain/table.ts |       |

### 21.1.3.3 — p.3343

| Item                                    | Status | Implementation                                                        | Notes                            |
| --------------------------------------- | ------ | --------------------------------------------------------------------- | -------------------------------- |
| 21.1.3.3 header (Header Cell Reference) | [x]    | src/pptx/parser/table-parser.ts, src/pptx/parser/table-parser.spec.ts | Spec: ECMA-376-1 21.1.3.3 p.3343 |

### 21.1.3.4 — p.3344

| Item                                                       | Status | Implementation                                                        | Notes                            |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------------------- | -------------------------------- |
| 21.1.3.4 headers (Header Cells Associated With Table Cell) | [x]    | src/pptx/parser/table-parser.ts, src/pptx/parser/table-parser.spec.ts | Spec: ECMA-376-1 21.1.3.4 p.3344 |

### 21.1.3.5 — p.3346

| Item                                         | Status | Implementation                                            | Notes |
| -------------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.5 lnB (Bottom Border Line Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.6 — p.3347

| Item                                                                | Status | Implementation                                            | Notes |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.6 lnBlToTr (Bottom-Left to Top-Right Border Line Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.7 — p.3348

| Item                                       | Status | Implementation                                            | Notes |
| ------------------------------------------ | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.7 lnL (Left Border Line Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.8 — p.3349

| Item                                        | Status | Implementation                                            | Notes |
| ------------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.8 lnR (Right Border Line Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.9 — p.3350

| Item                                      | Status | Implementation                                            | Notes |
| ----------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.9 lnT (Top Border Line Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.10

| Item                                                                 | Status | Implementation                                            | Notes |
| -------------------------------------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.10 lnTlToBr (Top-Left to Bottom-Right Border Line Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.11

| Item                               | Status | Implementation                                                                    | Notes                             |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------- | --------------------------------- |
| 21.1.3.11 tableStyle (Table Style) | [x]    | src/pptx/parser/table-style-parser.ts, src/pptx/parser/table-style-parser.spec.ts | Spec: ECMA-376-1 21.1.3.11 p.3352 |

### 21.1.3.12

| Item                                    | Status | Implementation                                            | Notes |
| --------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.12 tableStyleId (Table Style ID) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.13 — p.3354

| Item                  | Status | Implementation                                     | Notes |
| --------------------- | ------ | -------------------------------------------------- | ----- |
| 21.1.3.13 tbl (Table) | [x]    | src/pptx/core/context.ts, src/pptx/domain/shape.ts |       |

### 21.1.3.14 — p.3355

| Item                           | Status | Implementation                                            | Notes |
| ------------------------------ | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.14 tblGrid (Table Grid) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.15 — p.3355

| Item                               | Status | Implementation                                            | Notes |
| ---------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.15 tblPr (Table Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.16 — p.3358

| Item                      | Status | Implementation                                          | Notes |
| ------------------------- | ------ | ------------------------------------------------------- | ----- |
| 21.1.3.16 tc (Table Cell) | [x]    | src/pptx/domain/table.ts, src/pptx/ooxml/guards.spec.ts |       |

### 21.1.3.17 — p.3361

| Item                                   | Status | Implementation                                            | Notes |
| -------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.17 tcPr (Table Cell Properties) | [x]    | src/pptx/domain/table.ts, src/pptx/parser/table-parser.ts |       |

### 21.1.3.18 — p.3364

| Item                     | Status | Implementation                                            | Notes |
| ------------------------ | ------ | --------------------------------------------------------- | ----- |
| 21.1.3.18 tr (Table Row) | [x]    | src/pptx/core/color-resolver.ts, src/pptx/domain/chart.ts |       |
