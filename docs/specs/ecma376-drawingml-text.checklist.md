# ECMA-376 Part 1: DrawingML - Text チェックリスト（章／節ベース）

このチェックリストは ECMA-376 の公式 PDF（章／節の見出し）から抽出したものです。
各項目は章番号・節名・参照ページ（判読できたもの）を保持し、網羅度測定のベースラインとして利用できます。

参照PDF: `reference/ecma376/ecma-376-1/Ecma Office Open XML Part 1 - Fundamentals And Markup Language Reference.pdf`

## Checklist

### 21.1.2.1 — p.3186

| Item                     | Status | Implementation                                                                      | Notes                            |
| ------------------------ | ------ | ----------------------------------------------------------------------------------- | -------------------------------- |
| 21.1.2.1 Body Formatting | [x]    | src/pptx/parser/text-parser.ts, src/pptx/domain/text.ts, src/pptx/core/text-rect.ts | Spec: ECMA-376-1 21.1.2.1 p.3186 |

### 21.1.2.1.1

| Item                                | Status | Implementation                                              | Notes |
| ----------------------------------- | ------ | ----------------------------------------------------------- | ----- |
| 21.1.2.1.1 bodyPr (Body Properties) | [x]    | src/pptx/core/text-rect.spec.ts, src/pptx/core/text-rect.ts |       |

### 21.1.2.1.2

| Item                              | Status | Implementation                                                  | Notes |
| --------------------------------- | ------ | --------------------------------------------------------------- | ----- |
| 21.1.2.1.2 noAutofit (No AutoFit) | [x]    | src/pptx/domain/text.ts, src/pptx/parser/diagram-parser.spec.ts |       |

### 21.1.2.1.3

| Item                                    | Status | Implementation                                          | Notes |
| --------------------------------------- | ------ | ------------------------------------------------------- | ----- |
| 21.1.2.1.3 normAutofit (Normal AutoFit) | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.ts |       |

### 21.1.2.1.4

| Item                                 | Status | Implementation                                                | Notes |
| ------------------------------------ | ------ | ------------------------------------------------------------- | ----- |
| 21.1.2.1.4 spAutoFit (Shape AutoFit) | [x]    | src/pptx/domain/text.ts, src/pptx/render/text-layout/types.ts |       |

### 21.1.2.2 — p.3198

| Item                          | Status | Implementation                                                                                          | Notes                            |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 21.1.2.2 Paragraph Formatting | [x]    | src/pptx/parser/text-parser.ts, src/pptx/domain/text.ts, src/pptx/parser/text-style-resolver/spacing.ts | Spec: ECMA-376-1 21.1.2.2 p.3198 |

### 21.1.2.2.1

| Item                            | Status | Implementation                               | Notes |
| ------------------------------- | ------ | -------------------------------------------- | ----- |
| 21.1.2.2.1 br (Text Line Break) | [x]    | src/html/element.ts, src/pptx/domain/text.ts |       |

### 21.1.2.2.2

| Item                                        | Status | Implementation                         | Notes |
| ------------------------------------------- | ------ | -------------------------------------- | ----- |
| 21.1.2.2.2 defPPr (Default Paragraph Style) | [x]    | src/pptx/parser/diagram-parser.spec.ts |       |

### 21.1.2.2.3

| Item                                                 | Status | Implementation                                                      | Notes |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------- | ----- |
| 21.1.2.2.3 endParaRPr (End Paragraph Run Properties) | [x]    | src/pptx/parser/text-parser.spec.ts, src/pptx/parser/text-parser.ts |       |

### 21.1.2.2.4

| Item                        | Status | Implementation          | Notes |
| --------------------------- | ------ | ----------------------- | ----- |
| 21.1.2.2.4 fld (Text Field) | [x]    | src/pptx/domain/text.ts |       |

### 21.1.2.2.5

| Item                            | Status | Implementation                                                          | Notes |
| ------------------------------- | ------ | ----------------------------------------------------------------------- | ----- |
| 21.1.2.2.5 lnSpc (Line Spacing) | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-style-resolver/spacing.ts |       |

### 21.1.2.2.6

| Item                           | Status | Implementation                                         | Notes |
| ------------------------------ | ------ | ------------------------------------------------------ | ----- |
| 21.1.2.2.6 p (Text Paragraphs) | [x]    | src/pptx/animation/effects.ts, src/pptx/domain/text.ts |       |

### 21.1.2.2.7

| Item                                       | Status | Implementation                                    | Notes |
| ------------------------------------------ | ------ | ------------------------------------------------- | ----- |
| 21.1.2.2.7 pPr (Text Paragraph Properties) | [x]    | src/pptx/core/context.ts, src/pptx/domain/text.ts |       |

### 21.1.2.2.8

| Item                                                                         | Status | Implementation                             | Notes          |
| ---------------------------------------------------------------------------- | ------ | ------------------------------------------ | -------------- |
| 21.1.2.2.8 rtl (Right to Left Run)                                           | [x]    | src/css/types.ts, src/pptx/domain/slide.ts |                |
| 21.1.2.2.8  This element should not be used with strong LTR characters. The | [x]    | -                                          | Spec note only |

### 21.1.2.2.9

| Item                            | Status | Implementation                                 | Notes |
| ------------------------------- | ------ | ---------------------------------------------- | ----- |
| 21.1.2.2.9 spcAft (Space After) | [x]    | src/pptx/parser/text-style-resolver/spacing.ts |       |

### 21.1.2.2.10 — p.3226

| Item                              | Status | Implementation                                 | Notes |
| --------------------------------- | ------ | ---------------------------------------------- | ----- |
| 21.1.2.2.10 spcBef (Space Before) | [x]    | src/pptx/parser/text-style-resolver/spacing.ts |       |

### 21.1.2.2.11 — p.3227

| Item                                 | Status | Implementation                                                          | Notes |
| ------------------------------------ | ------ | ----------------------------------------------------------------------- | ----- |
| 21.1.2.2.11 spcPct (Spacing Percent) | [x]    | src/pptx/core/render-options.ts, src/pptx/parser/diagram-parser.spec.ts |       |

### 21.1.2.2.12 — p.3228

| Item                                | Status | Implementation                                                         | Notes |
| ----------------------------------- | ------ | ---------------------------------------------------------------------- | ----- |
| 21.1.2.2.12 spcPts (Spacing Points) | [x]    | src/pptx/parser/diagram-parser.spec.ts, src/pptx/parser/text-parser.ts |       |

### 21.1.2.2.13 — p.3229

| Item                       | Status | Implementation                                       | Notes |
| -------------------------- | ------ | ---------------------------------------------------- | ----- |
| 21.1.2.2.13 tab (Tab Stop) | [x]    | src/pptx/domain/text.ts, src/pptx/ooxml/drawingml.ts |       |

### 21.1.2.2.14 — p.3230

| Item                          | Status | Implementation                 | Notes |
| ----------------------------- | ------ | ------------------------------ | ----- |
| 21.1.2.2.14 tabLst (Tab List) | [x]    | src/pptx/parser/text-parser.ts |       |

### 21.1.2.3 — p.3230

| Item                    | Status | Implementation                                                                                              | Notes                            |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 21.1.2.3 Run Formatting | [x]    | src/pptx/parser/text-parser.ts, src/pptx/domain/text.ts, src/pptx/parser/text-style-resolver/font-family.ts | Spec: ECMA-376-1 21.1.2.3 p.3230 |

### 21.1.2.3.1

| Item                                | Status | Implementation                                                            | Notes |
| ----------------------------------- | ------ | ------------------------------------------------------------------------- | ----- |
| 21.1.2.3.1 cs (Complex Script Font) | [x]    | src/pptx/core/context-factory.ts, src/pptx/integration/context-adapter.ts |       |

### 21.1.2.3.2

| Item                                            | Status | Implementation                                           | Notes |
| ----------------------------------------------- | ------ | -------------------------------------------------------- | ----- |
| 21.1.2.3.2 defRPr (Default Text Run Properties) | [x]    | src/pptx/core/context.ts, src/pptx/parser/text-parser.ts |       |

### 21.1.2.3.3

| Item                            | Status | Implementation                                             | Notes |
| ------------------------------- | ------ | ---------------------------------------------------------- | ----- |
| 21.1.2.3.3 ea (East Asian Font) | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts |       |

### 21.1.2.3.4

| Item                                   | Status | Implementation                                                  | Notes |
| -------------------------------------- | ------ | --------------------------------------------------------------- | ----- |
| 21.1.2.3.4 highlight (Highlight Color) | [x]    | src/pptx/ooxml/ecma376.ts, src/pptx/parser/color-parser.spec.ts |       |

### 21.1.2.3.5

| Item                                    | Status | Implementation                                                             | Notes |
| --------------------------------------- | ------ | -------------------------------------------------------------------------- | ----- |
| 21.1.2.3.5 hlinkClick (Click Hyperlink) | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/parser/text-parser.ts |       |

### 21.1.2.3.6

| Item                                             | Status | Implementation                                                              | Notes |
| ------------------------------------------------ | ------ | --------------------------------------------------------------------------- | ----- |
| 21.1.2.3.6 hlinkMouseOver (Mouse-Over Hyperlink) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/render/text-layout/adapter.spec.ts |       |

### 21.1.2.3.7

| Item                          | Status | Implementation                                                 | Notes |
| ----------------------------- | ------ | -------------------------------------------------------------- | ----- |
| 21.1.2.3.7 latin (Latin Font) | [x]    | src/pptx/core/color-types.ts, src/pptx/core/context-factory.ts |       |

### 21.1.2.3.8

| Item                    | Status | Implementation                                    | Notes |
| ----------------------- | ------ | ------------------------------------------------- | ----- |
| 21.1.2.3.8 r (Text Run) | [x]    | src/color/convert.ts, src/color/transform.spec.ts |       |

### 21.1.2.3.9

| Item                                 | Status | Implementation                                     | Notes |
| ------------------------------------ | ------ | -------------------------------------------------- | ----- |
| 21.1.2.3.9 rPr (Text Run Properties) | [x]    | src/pptx/domain/text.ts, src/pptx/ooxml/ecma376.ts |       |

### 21.1.2.3.10 — p.3252

| Item                          | Status | Implementation                                                                     | Notes |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------- | ----- |
| 21.1.2.3.10 sym (Symbol Font) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver/font-family.ts |       |

### 21.1.2.3.11 — p.3254

| Item                        | Status | Implementation                                                    | Notes |
| --------------------------- | ------ | ----------------------------------------------------------------- | ----- |
| 21.1.2.3.11 t (Text String) | [x]    | src/pptx/animation/effects-visual.spec.ts, src/pptx/color/fill.ts |       |

### 21.1.2.3.12 — p.3255

| Item                               | Status | Implementation                 | Notes |
| ---------------------------------- | ------ | ------------------------------ | ----- |
| 21.1.2.3.12 uFill (Underline Fill) | [x]    | src/pptx/parser/text-parser.ts |       |

### 21.1.2.3.13 — p.3255

| Item                                                        | Status | Implementation                                          | Notes                               |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------- | ----------------------------------- |
| 21.1.2.3.13 uFillTx (Underline Fill Properties Follow Text) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/domain/text.ts | Spec: ECMA-376-1 21.1.2.3.13 p.3255 |

### 21.1.2.3.14 — p.3256

| Item                               | Status | Implementation                                                              | Notes |
| ---------------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| 21.1.2.3.14 uLn (Underline Stroke) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/render/text-layout/adapter.spec.ts |       |

### 21.1.2.3.15 — p.3257

| Item                                       | Status | Implementation                                          | Notes                               |
| ------------------------------------------ | ------ | ------------------------------------------------------- | ----------------------------------- |
| 21.1.2.3.15 uLnTx (Underline Follows Text) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/domain/text.ts | Spec: ECMA-376-1 21.1.2.3.15 p.3257 |

### 21.1.2.4 — p.3258

| Item                           | Status | Implementation                                                                                                      | Notes                            |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 21.1.2.4 Bullets and Numbering | [x]    | src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-levels.ts, src/pptx/parser/text-style-resolver/bullet.ts | Spec: ECMA-376-1 21.1.2.4 p.3258 |

### 21.1.2.4.1

| Item                                        | Status | Implementation                                     | Notes |
| ------------------------------------------- | ------ | -------------------------------------------------- | ----- |
| 21.1.2.4.1 buAutoNum (Auto-Numbered Bullet) | [x]    | src/pptx/domain/text.ts, src/pptx/ooxml/ecma376.ts |       |

### 21.1.2.4.2

| Item                               | Status | Implementation                                          | Notes |
| ---------------------------------- | ------ | ------------------------------------------------------- | ----- |
| 21.1.2.4.2 buBlip (Picture Bullet) | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.ts |       |

### 21.1.2.4.3

| Item                                 | Status | Implementation                                     | Notes |
| ------------------------------------ | ------ | -------------------------------------------------- | ----- |
| 21.1.2.4.3 buChar (Character Bullet) | [x]    | src/pptx/domain/text.ts, src/pptx/ooxml/ecma376.ts |       |

### 21.1.2.4.4

| Item                               | Status | Implementation                                                              | Notes |
| ---------------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| 21.1.2.4.4 buClr (Color Specified) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.5

| Item                             | Status | Implementation                                                                             | Notes |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------ | ----- |
| 21.1.2.4.5 buClrTx (Follow Text) | [x]    | src/pptx/parser/text-style-resolver.spec.ts, src/pptx/parser/text-style-resolver/bullet.ts |       |

### 21.1.2.4.6

| Item                          | Status | Implementation                                                              | Notes |
| ----------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| 21.1.2.4.6 buFont (Specified) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.7

| Item                              | Status | Implementation                                                                             | Notes |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------ | ----- |
| 21.1.2.4.7 buFontTx (Follow text) | [x]    | src/pptx/parser/text-style-resolver.spec.ts, src/pptx/parser/text-style-resolver/bullet.ts |       |

### 21.1.2.4.8

| Item                          | Status | Implementation                                                                      | Notes |
| ----------------------------- | ------ | ----------------------------------------------------------------------------------- | ----- |
| 21.1.2.4.8 buNone (No Bullet) | [x]    | src/pptx/parser/diagram-parser.spec.ts, src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.9

| Item                                        | Status | Implementation                                                              | Notes |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| 21.1.2.4.9 buSzPct (Bullet Size Percentage) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.10 — p.3268

| Item                                     | Status | Implementation                                                              | Notes |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| 21.1.2.4.10 buSzPts (Bullet Size Points) | [x]    | src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.11 — p.3269

| Item                                          | Status | Implementation                                                                             | Notes |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ | ----- |
| 21.1.2.4.11 buSzTx (Bullet Size Follows Text) | [x]    | src/pptx/parser/text-style-resolver.spec.ts, src/pptx/parser/text-style-resolver/bullet.ts |       |

### 21.1.2.4.12 — p.3269

| Item                                    | Status | Implementation                                      | Notes |
| --------------------------------------- | ------ | --------------------------------------------------- | ----- |
| 21.1.2.4.12 lstStyle (Text List Styles) | [x]    | src/pptx/core/context.ts, src/pptx/core/fallback.ts |       |

### 21.1.2.4.13 — p.3269

| Item                                          | Status | Implementation                                                                      | Notes |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------------- | ----- |
| 21.1.2.4.13 lvl1pPr (List Level 1 Text Style) | [x]    | src/pptx/parser/diagram-parser.spec.ts, src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.14 — p.3277

| Item                                          | Status | Implementation                              | Notes |
| --------------------------------------------- | ------ | ------------------------------------------- | ----- |
| 21.1.2.4.14 lvl2pPr (List Level 2 Text Style) | [x]    | src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.15 — p.3285

| Item                                          | Status | Implementation                              | Notes |
| --------------------------------------------- | ------ | ------------------------------------------- | ----- |
| 21.1.2.4.15 lvl3pPr (List Level 3 Text Style) | [x]    | src/pptx/parser/text-style-resolver.spec.ts |       |

### 21.1.2.4.16 — p.3293

| Item                                          | Status | Implementation                       | Notes |
| --------------------------------------------- | ------ | ------------------------------------ | ----- |
| 21.1.2.4.16 lvl4pPr (List Level 4 Text Style) | [x]    | src/pptx/parser/text-style-levels.ts |       |

### 21.1.2.4.17 — p.3301

| Item                                          | Status | Implementation                       | Notes |
| --------------------------------------------- | ------ | ------------------------------------ | ----- |
| 21.1.2.4.17 lvl5pPr (List Level 5 Text Style) | [x]    | src/pptx/parser/text-style-levels.ts |       |

### 21.1.2.4.18 — p.3309

| Item                                          | Status | Implementation                       | Notes |
| --------------------------------------------- | ------ | ------------------------------------ | ----- |
| 21.1.2.4.18 lvl6pPr (List Level 6 Text Style) | [x]    | src/pptx/parser/text-style-levels.ts |       |

### 21.1.2.4.19 — p.3317

| Item                                          | Status | Implementation                       | Notes |
| --------------------------------------------- | ------ | ------------------------------------ | ----- |
| 21.1.2.4.19 lvl7pPr (List Level 7 Text Style) | [x]    | src/pptx/parser/text-style-levels.ts |       |

### 21.1.2.4.20 — p.3325

| Item                                          | Status | Implementation                       | Notes |
| --------------------------------------------- | ------ | ------------------------------------ | ----- |
| 21.1.2.4.20 lvl8pPr (List Level 8 Text Style) | [x]    | src/pptx/parser/text-style-levels.ts |       |

### 21.1.2.4.21 — p.3333

| Item                                          | Status | Implementation                         | Notes |
| --------------------------------------------- | ------ | -------------------------------------- | ----- |
| 21.1.2.4.21 lvl9pPr (List Level 9 Text Style) | [x]    | src/pptx/parser/diagram-parser.spec.ts |       |

### 21.1.2.5 — p.3341

| Item                       | Status | Implementation                                                            | Notes                                                                                        |
| -------------------------- | ------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 21.1.2.5 Font Substitution | [x]    | src/pptx/render/svg/slide-text.ts, src/pptx/render/svg/slide-text.spec.ts | Spec: ECMA-376-1 21.1.2.5 p.3341 (font substitution guidance; fallback via font-family list) |
