# ECMA-376 Part 3: Markup Compatibility and Extensibility チェックリスト（章／節ベース）

このチェックリストは ECMA-376 の公式 PDF（章／節の見出し）から抽出したものです。
各項目は章番号・節名・参照ページ（判読できたもの）を保持し、網羅度測定のベースラインとして利用できます。

参照PDF: `reference/ecma376/ecma-376-3/Ecma Office Open XML Part 3 - Markup Compatibility and Extensibility.pdf`

## Checklist

### 1 Scope — p.1

| Item    | Status | Implementation | Notes                         |
| ------- | ------ | -------------- | ----------------------------- |
| 1 Scope | [x]    | -              | Spec only (no implementation) |

### 2 Normative References — p.2

| Item                   | Status | Implementation | Notes                         |
| ---------------------- | ------ | -------------- | ----------------------------- |
| 2 Normative References | [x]    | -              | Spec only (no implementation) |

### 3 Terms and Definitions — p.3

| Item                    | Status | Implementation | Notes                         |
| ----------------------- | ------ | -------------- | ----------------------------- |
| 3 Terms and Definitions | [x]    | -              | Spec only (no implementation) |

### 4 Notational Conventions — p.4

| Item                     | Status | Implementation | Notes                         |
| ------------------------ | ------ | -------------- | ----------------------------- |
| 4 Notational Conventions | [x]    | -              | Spec only (no implementation) |

### 5 General Description — p.5

| Item                  | Status | Implementation | Notes                         |
| --------------------- | ------ | -------------- | ----------------------------- |
| 5 General Description | [x]    | -              | Spec only (no implementation) |

### 6 Overview — p.6

| Item       | Status | Implementation | Notes                         |
| ---------- | ------ | -------------- | ----------------------------- |
| 6 Overview | [x]    | -              | Spec only (no implementation) |

### 7 MCE Elements and Attributes — p.8

| Item                          | Status | Implementation                                                                                                                                                                            | Notes                                                      |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 7 MCE Elements and Attributes | [x]    | src/xml/markup-compatibility.ts, src/pptx/parser/shape-parser/alternate-content.ts, src/pptx/parser/shape-parser/index.ts, src/pptx/parser/slide-parser.ts, src/pptx/reader/xml-reader.ts | AlternateContent + Ignorable/ProcessContent/MustUnderstand |

### 7.1 Introduction — p.8

| Item             | Status | Implementation | Notes                         |
| ---------------- | ------ | -------------- | ----------------------------- |
| 7.1 Introduction | [x]    | -              | Spec only (no implementation) |

### 7.2 Ignorable Attribute — p.8

| Item                    | Status | Implementation                                                 | Notes                                        |
| ----------------------- | ------ | -------------------------------------------------------------- | -------------------------------------------- |
| 7.2 Ignorable Attribute | [x]    | src/xml/markup-compatibility.ts, src/pptx/reader/xml-reader.ts | Ignorable prefixes stripped from output tree |

### 7.3 ProcessContent Attribute — p.10

| Item                         | Status | Implementation                                                 | Notes                                 |
| ---------------------------- | ------ | -------------------------------------------------------------- | ------------------------------------- |
| 7.3 ProcessContent Attribute | [x]    | src/xml/markup-compatibility.ts, src/pptx/reader/xml-reader.ts | Ignorable elements unwrap when listed |

### 7.4 MustUnderstand Attribute — p.10

| Item                         | Status | Implementation                                                 | Notes                                         |
| ---------------------------- | ------ | -------------------------------------------------------------- | --------------------------------------------- |
| 7.4 MustUnderstand Attribute | [x]    | src/xml/markup-compatibility.ts, src/pptx/reader/xml-reader.ts | Throws when unsupported prefixes are required |

### 7.5 AlternateContent Element — p.11

| Item                         | Status | Implementation                                                                                                            | Notes                                                     |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 7.5 AlternateContent Element | [x]    | src/pptx/parser/shape-parser/alternate-content.ts, src/pptx/parser/shape-parser/index.ts, src/pptx/parser/slide-parser.ts | Fallback selection for shapes, pictures, OLE, transitions |

### 7.6 Choice Element — p.12

| Item               | Status | Implementation                                    | Notes                                              |
| ------------------ | ------ | ------------------------------------------------- | -------------------------------------------------- |
| 7.6 Choice Element | [x]    | src/pptx/parser/shape-parser/alternate-content.ts | Requires evaluation uses supported namespaces list |

### 7.7 Fallback Element — p.12

| Item                 | Status | Implementation                                    | Notes                                 |
| -------------------- | ------ | ------------------------------------------------- | ------------------------------------- |
| 7.7 Fallback Element | [x]    | src/pptx/parser/shape-parser/alternate-content.ts | Used when no supported Choice matches |

### 8 Application-Defined Extension Elements — p.14

| Item                                     | Status | Implementation                  | Notes                                                                |
| ---------------------------------------- | ------ | ------------------------------- | -------------------------------------------------------------------- |
| 8 Application-Defined Extension Elements | [x]    | src/xml/markup-compatibility.ts | Ignorable namespaces are stripped; no app-specific extensions parsed |

### 9 Semantic Definitions and Reference Processing Model — p.16

| Item                                                  | Status | Implementation | Notes                         |
| ----------------------------------------------------- | ------ | -------------- | ----------------------------- |
| 9 Semantic Definitions and Reference Processing Model | [x]    | -              | Spec only (no implementation) |

### 9.1 Overview — p.16

| Item         | Status | Implementation | Notes                         |
| ------------ | ------ | -------------- | ----------------------------- |
| 9.1 Overview | [x]    | -              | Spec only (no implementation) |

### 9.2 Step 1: Processing the Ignorable and ProcessContent Attributes — p.17

| Item                                                               | Status | Implementation                                                 | Notes                                                  |
| ------------------------------------------------------------------ | ------ | -------------------------------------------------------------- | ------------------------------------------------------ |
| 9.2 Step 1: Processing the Ignorable and ProcessContent Attributes | [x]    | src/xml/markup-compatibility.ts, src/pptx/reader/xml-reader.ts | Applies mc:Ignorable and mc:ProcessContent across tree |

### 9.3 Step 2: Processing the AlternateContent, Choice and Fallback Elements — p.18

| Item                                                                      | Status | Implementation                                                                                                            | Notes                                                |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 9.3 Step 2: Processing the AlternateContent, Choice and Fallback Elements | [x]    | src/pptx/parser/shape-parser/alternate-content.ts, src/pptx/parser/shape-parser/index.ts, src/pptx/parser/slide-parser.ts | Partial coverage across slide/shape/pic/ole contexts |

### 9.4 Step 3: Processing the MustUnderstand Attribute and Creating the Output Document — p.19

| Item                                                                                 | Status | Implementation                                                 | Notes                                           |
| ------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------- | ----------------------------------------------- |
| 9.4 Step 3: Processing the MustUnderstand Attribute and Creating the Output Document | [x]    | src/xml/markup-compatibility.ts, src/pptx/reader/xml-reader.ts | Fails on unsupported mc:MustUnderstand prefixes |

### Annex A (informative) Examples — p.23

| Item                           | Status | Implementation | Notes                         |
| ------------------------------ | ------ | -------------- | ----------------------------- |
| Annex A (informative) Examples | [x]    | -              | Spec only (no implementation) |

### Annex B (informative) Validation Using NVDL — p.33

| Item                                        | Status | Implementation | Notes                         |
| ------------------------------------------- | ------ | -------------- | ----------------------------- |
| Annex B (informative) Validation Using NVDL | [x]    | -              | Spec only (no implementation) |
