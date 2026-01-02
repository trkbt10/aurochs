# ECMA-376 Part 1: PresentationML チェックリスト（章／節ベース）

このチェックリストは ECMA-376 の公式 PDF（章／節の見出し）から抽出したものです。
各項目は章番号・節名・参照ページ（判読できたもの）を保持し、網羅度測定のベースラインとして利用できます。

参照PDF: `reference/ecma376/ecma-376-1/Ecma Office Open XML Part 1 - Fundamentals And Markup Language Reference.pdf`

## Checklist

### 19.2 Presentation — p.2523

| Item              | Status | Implementation                                                   | Notes                        |
| ----------------- | ------ | ---------------------------------------------------------------- | ---------------------------- |
| 19.2 Presentation | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/presentation.ts | Spec: ECMA-376-1 19.2 p.2523 |

### 19.2.1 Presentation Properties — p.2523

| Item                                                        | Status | Implementation                                                                              | Notes                          |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- | ------------------------------ |
| 19.2.1 Presentation Properties                              | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-properties.ts          | Spec: ECMA-376-1 19.2.1 p.2523 |
| 19.2.1.1 bold (Bold Embedded Font)                          | [x]    | src/css/types.ts, src/pptx/domain/text.ts                                                   |                                |
| 19.2.1.2 boldItalic (Bold Italic Embedded Font)             | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.3 browse (Browse Slide Show Mode)                    | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.4 clrMru (Color MRU)                                 | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.5 custShow (Custom Show)                             | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.6 custShow (Custom Show)                             | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.7 custShowLst (List of Custom Shows)                 | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.8 defaultTextStyle (Presentation Default Text Style) | [x]    | src/pptx/core/context.ts, src/pptx/core/style-state.spec.ts                                 |                                |
| 19.2.1.9 embeddedFont (Embedded Font)                       | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.10 embeddedFontLst (Embedded Font List)              | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.11 ext (Extension)                                   | [x]    | src/pptx/integration/content-enricher.ts, src/pptx/integration/context-adapter.ts           |                                |
| 19.2.1.12 extLst (Extension List)                           | [x]    | src/pptx/parser/diagram-parser.spec.ts                                                      |                                |
| 19.2.1.13 font (Embedded Font Name)                         | [x]    | src/pptx/core/color-types.ts, src/pptx/core/context-factory.ts                              |                                |
| 19.2.1.14 handoutMasterId (Handout Master ID)               | [x]    | src/pptx/parser/presentation-parser.ts                                                      |                                |
| 19.2.1.15 handoutMasterIdLst (List of Handout Master IDs)   | [x]    | src/pptx/parser/presentation-parser.spec.ts                                                 |                                |
| 19.2.1.16 italic (Italic Embedded Font)                     | [x]    | src/css/types.ts, src/pptx/domain/text.ts                                                   |                                |
| 19.2.1.17 kinsoku (Kinsoku Settings)                        | [x]    | src/pptx/ooxml/presentationml.ts                                                            |                                |
| 19.2.1.18 kiosk (Kiosk Slide Show Mode)                     | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.19 modifyVerifier (Modification Verifier)            | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.20 notesMasterId (Notes Master ID)                   | [x]    | src/pptx/parser/presentation-parser.ts                                                      |                                |
| 19.2.1.21 notesMasterIdLst (List of Notes Master IDs)       | [x]    | src/pptx/parser/presentation-parser.spec.ts                                                 |                                |
| 19.2.1.22 notesSz (Notes Slide Size)                        | [x]    | src/pptx/parser/presentation-parser.spec.ts                                                 |                                |
| 19.2.1.23 penClr (Pen Color for Slide Show)                 | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.24 photoAlbum (Photo Album Information)              | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |
| 19.2.1.25 present (Presenter Slide Show Mode)               | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.26 presentation (Presentation)                       | [x]    | src/pptx-cli.ts, src/pptx/core/background.ts                                                |                                |
| 19.2.1.27 presentationPr (Presentation-wide Properties)     | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.28 prnPr (Printing Properties)                       | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.29 regular (Regular Embedded Font)                   | [x]    | src/pptx/parser/fill-parser.ts, src/pptx/parser/text-parser.ts                              |                                |
| 19.2.1.30 showPr (Presentation-wide Show Properties)        | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.31 sld (Presentation Slide)                          | [x]    | src/pptx/domain/slide.ts, src/pptx/ooxml/ecma376.ts                                         |                                |
| 19.2.1.32 sldAll (All Slides)                               | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.33 sldId (Slide ID)                                  | [x]    | src/pptx/parser/presentation-parser.ts                                                      |                                |
| 19.2.1.34 sldIdLst (List of Slide IDs)                      | [x]    | src/pptx/parser/presentation-parser.spec.ts                                                 |                                |
| 19.2.1.35 sldLst (List of Presentation Slides)              | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.36 sldMasterId (Slide Master ID)                     | [x]    | src/pptx/parser/presentation-parser.ts                                                      |                                |
| 19.2.1.37 sldMasterIdLst (List of Slide Master IDs)         | [x]    | src/pptx/parser/presentation-parser.spec.ts                                                 |                                |
| 19.2.1.38 sldRg (Slide Range)                               | [x]    | src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |                                |
| 19.2.1.39 sldSz (Presentation Slide Size)                   | [x]    | src/pptx/core/presentation-info.ts, src/pptx/domain/slide.ts                                |                                |
| 19.2.1.40 smartTags (Smart Tags)                            | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts         |                                |

### 19.2.2 View Properties — p.2552

| Item                                                          | Status | Implementation                                                              | Notes |
| ------------------------------------------------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| 19.2.2 View Properties                                        | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.1 cSldViewPr (Common Slide View Properties)            | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.2 cViewPr (Common View Properties)                     | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.3 gridSpacing (Grid Spacing)                           | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.4 guide (A Guide)                                      | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.5 guideLst (List of Guides)                            | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.6 normalViewPr (Normal View Properties)                | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.7 notesTextViewPr (Notes Text View Properties)         | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.8 notesViewPr (Notes View Properties)                  | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.9 origin (View Origin)                                 | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.10 outlineViewPr (Outline View Properties)             | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.11 restoredLeft (Normal View Restored Left Properties) | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.12 restoredTop (Normal View Restored Top Properties)   | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.13 scale (View Scale)                                  | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.14 sld (Presentation Slide)                            | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.15 sldLst (List of Presentation Slides)                | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.16 slideViewPr (Slide View Properties)                 | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.17 sorterViewPr (Slide Sorter View Properties)         | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
| 19.2.2.18 viewPr (Presentation-wide View Properties)          | [x]    | src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |

### 19.3 Slides — p.2560

| Item        | Status | Implementation                                            | Notes |
| ----------- | ------ | --------------------------------------------------------- | ----- |
| 19.3 Slides | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/domain/slide.ts |       |

### 19.3.1 Slides — p.2560

| Item                                                                     | Status | Implementation                                                                      | Notes |
| ------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------- | ----- |
| 19.3.1 Slides                                                            | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/domain/slide.ts                           |       |
| 19.3.1.1 bg (Slide Background)                                           | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                                 |       |
| 19.3.1.2 bgPr (Background Properties)                                    | [x]    | src/pptx/core/background.ts, src/pptx/core/context.ts                               |       |
| 19.3.1.3 bgRef (Background Style Reference)                              | [x]    | src/pptx/core/background.spec.ts, src/pptx/core/background.ts                       |       |
| 19.3.1.4 blipFill (Picture Fill)                                         | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                                 |       |
| 19.3.1.5 bodyStyle (Slide Master Body Text Style)                        | [x]    | src/pptx/core/context.ts, src/pptx/domain/slide.ts                                  |       |
| 19.3.1.6 clrMap (Color Scheme Map)                                       | [x]    | src/pptx/core/context-factory.ts, src/pptx/domain/slide.ts                          |       |
| 19.3.1.7 clrMapOvr (Color Scheme Map Override)                           | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.spec.ts                      |       |
| 19.3.1.8 cNvCxnSpPr (Non-Visual Connector Shape Drawing Properties)      | [x]    | src/pptx/parser/shape-parser/cxn.ts                                                 |       |
| 19.3.1.9 cNvGraphicFramePr (Non-Visual Graphic Frame Drawing Properties) | [x]    | src/pptx/parser/shape-parser/graphic-frame.ts, src/pptx/parser/shape-parser.spec.ts |       |
| 19.3.1.10 cNvGrpSpPr (Non-Visual Group Shape Drawing Properties)         | [x]    | src/pptx/parser/shape-parser/grp.ts, src/pptx/parser/shape-parser.spec.ts           |       |
| 19.3.1.11 cNvPicPr (Non-Visual Picture Drawing Properties)               | [x]    | src/pptx/parser/shape-parser/pic.ts                                                 |       |
| 19.3.1.12 cNvPr (Non-Visual Drawing Properties)                          | [x]    | src/pptx/core/node-indexer.ts, src/pptx/domain/shape.ts                             |       |
| 19.3.1.13 cNvSpPr (Non-Visual Drawing Properties for a Shape)            | [x]    | src/pptx/parser/shape-parser/sp.ts, src/pptx/parser/shape-parser.spec.ts            |       |
| 19.3.1.14 contentPart (Content Part)                                     | [x]    | src/pptx/parser/shape-parser/content-part.ts, src/pptx/parser/shape-parser.spec.ts  |       |
| 19.3.1.15 controls (List of controls)                                    | [x]    | src/pptx/render/components/table.ts, src/pptx/render/svg/geometry.spec.ts           |       |
| 19.3.1.16 cSld (Common Slide Data)                                       | [x]    | src/pptx/core/background.ts, src/pptx/core/node-indexer.ts                          |       |
| 19.3.1.17 custData (Customer Data)                                       | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/parser/slide-parser.spec.ts               |       |
| 19.3.1.18 custDataLst (Customer Data List)                               | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/parser/slide-parser.spec.ts               |       |
| 19.3.1.19 cxnSp (Connection Shape)                                       | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/diagram-parser.spec.ts                    |       |
| 19.3.1.20 extLst (Extension List with Modification Flag)                 | [x]    | src/pptx/parser/diagram-parser.spec.ts                                              |       |
| 19.3.1.21 graphicFrame (Graphic Frame)                                   | [x]    | src/pptx/core/render-options.ts, src/pptx/domain/shape.ts                           |       |
| 19.3.1.22 grpSp (Group Shape)                                            | [x]    | src/pptx/domain/shape.ts, src/pptx/integration/content-enricher.ts                  |       |
| 19.3.1.23 grpSpPr (Group Shape Properties)                               | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser.spec.ts                      |       |
| 19.3.1.24 handoutMaster (Handout Master)                                 | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/parser/slide-parser.spec.ts               |       |
| 19.3.1.25 hf (Header/Footer information for a slide master)              | [x]    | src/pptx/parser/geometry-parser.spec.ts                                             |       |
| 19.3.1.26 notes (Notes Slide)                                            | [x]    | src/pptx/ooxml/presentationml.ts, src/pptx/parser/presentation-parser.spec.ts       |       |
| 19.3.1.27 notesMaster (Notes Master)                                     | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/parser/slide-parser.spec.ts               |       |
| 19.3.1.28 notesStyle (Notes Text Style)                                  | [x]    | src/pptx/parser/text-style-levels.ts, src/pptx/parser/slide-parser.ts               |       |
| 19.3.1.29 nvCxnSpPr (Non-Visual Properties for a Connection Shape)       | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser/cxn.ts                 |       |
| 19.3.1.30 nvGraphicFramePr (Non-Visual Properties for a Graphic Frame)   | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser/graphic-frame.ts       |       |
| 19.3.1.31 nvGrpSpPr (Non-Visual Properties for a Group Shape)            | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser.spec.ts                |       |
| 19.3.1.32 nvPicPr (Non-Visual Properties for a Picture)                  | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/ooxml/guards.spec.ts                       |       |
| 19.3.1.33 nvPr (Non-Visual Properties)                                   | [x]    | src/pptx/core/node-indexer.ts, src/pptx/parser/placeholder-type-resolver.spec.ts    |       |
| 19.3.1.34 nvSpPr (Non-Visual Properties for a Shape)                     | [x]    | src/pptx/core/node-indexer.ts, src/pptx/ooxml/ecma376.spec.ts                       |       |
| 19.3.1.35 otherStyle (Slide Master Other Text Style)                     | [x]    | src/pptx/core/context.ts, src/pptx/domain/slide.ts                                  |       |
| 19.3.1.36 ph (Placeholder Shape)                                         | [x]    | src/pptx/core/node-indexer.ts, src/pptx/domain/shape.ts                             |       |
| 19.3.1.37 pic (Picture)                                                  | [x]    | src/pptx/core/context.ts, src/pptx/domain/shape.ts                                  |       |
| 19.3.1.38 sld (Presentation Slide)                                       | [x]    | src/pptx/domain/slide.ts, src/pptx/ooxml/ecma376.ts                                 |       |
| 19.3.1.39 sldLayout (Slide Layout)                                       | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.ts                           |       |
| 19.3.1.40 sldLayoutId (Slide Layout Id)                                  | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/parser/slide-parser.spec.ts               |       |
| 19.3.1.41 sldLayoutIdLst (List of Slide Layouts)                         | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/parser/slide-parser.spec.ts               |       |
| 19.3.1.42 sldMaster (Slide Master)                                       | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.ts                           |       |
| 19.3.1.43 sp (Shape)                                                     | [x]    | src/pptx/animation/integration.spec.ts, src/pptx/domain/shape.ts                    |       |
| 19.3.1.44 spPr (Shape Properties)                                        | [x]    | src/pptx/color/fill.ts, src/pptx/domain/chart.ts                                    |       |
| 19.3.1.45 spTree (Shape Tree)                                            | [x]    | src/pptx/core/node-indexer.ts, src/pptx/ooxml/ecma376.ts                            |       |
| 19.3.1.46 style (Shape Style)                                            | [x]    | src/css/builder.ts, src/css/types.ts                                                |       |
| 19.3.1.47 tags (Customer Data Tags)                                      | [x]    | src/pptx/ooxml/presentationml.ts, src/pptx/reader/xml-reader.ts                     |       |
| 19.3.1.48 timing (Slide Timing Information for a Slide Layout)           | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts      |       |
| 19.3.1.49 titleStyle (Slide Master Title Text Style)                     | [x]    | src/pptx/core/context.ts, src/pptx/domain/slide.ts                                  |       |
| 19.3.1.50 transition (Slide Transition for a Slide Layout)               | [x]    | src/css/types.ts, src/pptx/animation/coverage.spec.ts                               |       |
| 19.3.1.51 txBody (Shape Text Body)                                       | [x]    | src/pptx/domain/text.ts, src/pptx/ooxml/ecma376.spec.ts                             |       |
| 19.3.1.52 txStyles (Slide Master Text Styles)                            | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/placeholder-styles.ts               |       |
| 19.3.1.53 xfrm (2D Transform for Graphic Frame)                          | [x]    | src/pptx/core/connection-site.ts, src/pptx/core/render-options.ts                   |       |

### 19.3.2 Embedded Objects — p.2594

| Item                                                               | Status | Implementation                                                         | Notes                          |
| ------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------- | ------------------------------ |
| 19.3.2 Embedded Objects                                            | [x]    | src/pptx/parser/slide-parser.ts, src/pptx/domain/shape.ts              | Spec: ECMA-376-1 19.3.2 p.2594 |
| 19.3.2.1 control (Embedded Control)                                | [x]    | src/pptx/animation/effects.ts, src/pptx/core/render-options.ts         |                                |
| 19.3.2.2 embed (Embedded Object or Control)                        | [x]    | src/html/element.ts, src/pptx/parser/emf-parser.ts                     |                                |
| 19.3.2.3 link (Linked Object or Control)                           | [x]    | src/html/element.ts, src/pptx/ooxml/drawingml.ts                       |                                |
| 19.3.2.4 oleObj (Global Element for Embedded objects and Controls) | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/mc-alternate-content.spec.ts |                                |

### 19.3.3 Programmable Tags — p.2597

| Item                                          | Status | Implementation                                                    | Notes |
| --------------------------------------------- | ------ | ----------------------------------------------------------------- | ----- |
| 19.3.3 Programmable Tags                      | [x]    | src/pptx/parser/tag-parser.ts                                     |       |
| 19.3.3.1 tag (Programmable Extensibility Tag) | [x]    | src/markup/escape.ts, src/pptx/domain/text.ts                     |       |
| 19.3.3.2 tagLst (Programmable Tab List)       | [x]    | src/pptx/parser/tag-parser.ts, src/pptx/parser/tag-parser.spec.ts |       |

### 19.4 Comments — p.2598

| Item          | Status | Implementation                    | Notes |
| ------------- | ------ | --------------------------------- | ----- |
| 19.4 Comments | [x]    | src/pptx/parser/comment-parser.ts |       |

### 19.4.1 cm (Comment) — p.2598

| Item                | Status | Implementation                | Notes |
| ------------------- | ------ | ----------------------------- | ----- |
| 19.4.1 cm (Comment) | [x]    | src/pptx/utils/auto-number.ts |       |

### 19.4.2 cmAuthor (Comment Author) — p.2599

| Item                             | Status | Implementation                                                            | Notes |
| -------------------------------- | ------ | ------------------------------------------------------------------------- | ----- |
| 19.4.2 cmAuthor (Comment Author) | [x]    | src/pptx/parser/comment-parser.ts, src/pptx/parser/comment-parser.spec.ts |       |

### 19.4.3 cmAuthorLst (List of Comment Authors) — p.2600

| Item                                         | Status | Implementation                                                            | Notes |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------- | ----- |
| 19.4.3 cmAuthorLst (List of Comment Authors) | [x]    | src/pptx/parser/comment-parser.ts, src/pptx/parser/comment-parser.spec.ts |       |

### 19.4.4 cmLst (Comment List) — p.2600

| Item                        | Status | Implementation                                                            | Notes |
| --------------------------- | ------ | ------------------------------------------------------------------------- | ----- |
| 19.4.4 cmLst (Comment List) | [x]    | src/pptx/parser/comment-parser.ts, src/pptx/parser/comment-parser.spec.ts |       |

### 19.4.5 pos (Comment Position) — p.2601

| Item                          | Status | Implementation                                      | Notes |
| ----------------------------- | ------ | --------------------------------------------------- | ----- |
| 19.4.5 pos (Comment Position) | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts |       |

### 19.4.6 text (Comment's Text Content) — p.2602

| Item                                 | Status | Implementation                           | Notes |
| ------------------------------------ | ------ | ---------------------------------------- | ----- |
| 19.4.6 text (Comment's Text Content) | [x]    | src/html/escape.ts, src/markup/escape.ts |       |

### 19.5 Animation — p.2602

| Item           | Status | Implementation                                                              | Notes                        |
| -------------- | ------ | --------------------------------------------------------------------------- | ---------------------------- |
| 19.5 Animation | [x]    | src/pptx/parser/timing-parser/index.ts, src/pptx/animation/coverage.spec.ts | Spec: ECMA-376-1 19.5 p.2602 |

### 19.5.1 anim (Animate) — p.2603

| Item                  | Status | Implementation                        | Notes |
| --------------------- | ------ | ------------------------------------- | ----- |
| 19.5.1 anim (Animate) | [x]    | src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.2 animClr (Animate Color Behavior) — p.2604

| Item                                    | Status | Implementation                                                                   | Notes |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------- | ----- |
| 19.5.2 animClr (Animate Color Behavior) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.3 animEffect (Animate Effect) — p.2605

| Item                               | Status | Implementation                                 | Notes |
| ---------------------------------- | ------ | ---------------------------------------------- | ----- |
| 19.5.3 animEffect (Animate Effect) | [x]    | src/pptx/animation/ms-oe376-compliance.spec.ts |       |

### 19.5.4 animMotion (Animate Motion) — p.2611

| Item                               | Status | Implementation                                                                   | Notes |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------- | ----- |
| 19.5.4 animMotion (Animate Motion) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.5 animRot (Animate Rotation) — p.2612

| Item                              | Status | Implementation                                                                   | Notes |
| --------------------------------- | ------ | -------------------------------------------------------------------------------- | ----- |
| 19.5.5 animRot (Animate Rotation) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.6 animScale (Animate Scale) — p.2613

| Item                             | Status | Implementation                                                                   | Notes |
| -------------------------------- | ------ | -------------------------------------------------------------------------------- | ----- |
| 19.5.6 animScale (Animate Scale) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.7 attrName (Attribute Name) — p.2614

| Item                             | Status | Implementation                                   | Notes |
| -------------------------------- | ------ | ------------------------------------------------ | ----- |
| 19.5.7 attrName (Attribute Name) | [x]    | src/markup/element.ts, src/pptx/ooxml/ecma376.ts |       |

### 19.5.8 attrNameLst (Attribute Name List) — p.2615

| Item                                     | Status | Implementation                          | Notes |
| ---------------------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.8 attrNameLst (Attribute Name List) | [x]    | src/pptx/parser/timing-parser/common.ts |       |

### 19.5.9 audio (Audio) — p.2616

| Item                 | Status | Implementation                                 | Notes |
| -------------------- | ------ | ---------------------------------------------- | ----- |
| 19.5.9 audio (Audio) | [x]    | src/buffer/data-url.ts, src/files/mime.spec.ts |       |

### 19.5.10 bg (Background)

| Item                    | Status | Implementation                                      | Notes |
| ----------------------- | ------ | --------------------------------------------------- | ----- |
| 19.5.10 bg (Background) | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts |       |

### 19.5.11 bldAsOne (Build As One)

| Item                            | Status | Implementation                                                                     | Notes |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.11 bldAsOne (Build As One) | [x]    | src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.12 bldDgm (Build Diagram)

| Item                           | Status | Implementation                                                                              | Notes |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------- | ----- |
| 19.5.12 bldDgm (Build Diagram) | [x]    | src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser/graphic-build.ts |       |

### 19.5.13 bldGraphic (Build Graphics)

| Item                                | Status | Implementation                                                                     | Notes |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.13 bldGraphic (Build Graphics) | [x]    | src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.14 bldLst (Build List)

| Item                        | Status | Implementation                                                                      | Notes |
| --------------------------- | ------ | ----------------------------------------------------------------------------------- | ----- |
| 19.5.14 bldLst (Build List) | [x]    | src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser/index.ts |       |

### 19.5.15 bldOleChart (Build Embedded Chart)

| Item                                       | Status | Implementation                                                                     | Notes |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.15 bldOleChart (Build Embedded Chart) | [x]    | src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.16 bldP (Build Paragraph)

| Item                           | Status | Implementation                              | Notes |
| ------------------------------ | ------ | ------------------------------------------- | ----- |
| 19.5.16 bldP (Build Paragraph) | [x]    | src/pptx/parser/timing-parser/build-list.ts |       |

### 19.5.17 bldSub (Build Sub Elements)

| Item                                | Status | Implementation                                                                     | Notes |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.17 bldSub (Build Sub Elements) | [x]    | src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.18 blinds (Blinds Slide Transition)

| Item                                     | Status | Implementation                                                                 | Notes |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------ | ----- |
| 19.5.18 blinds (Blinds Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |       |

### 19.5.19 boolVal (Boolean Variant)

| Item                              | Status | Implementation                            | Notes |
| --------------------------------- | ------ | ----------------------------------------- | ----- |
| 19.5.19 boolVal (Boolean Variant) | [x]    | src/pptx/parser/timing-parser/keyframe.ts |       |

### 19.5.20 by (By)

| Item            | Status | Implementation                            | Notes |
| --------------- | ------ | ----------------------------------------- | ----- |
| 19.5.20 by (By) | [x]    | src/color/transform.ts, src/files/mime.ts |       |

### 19.5.21 by (By)

| Item            | Status | Implementation                            | Notes |
| --------------- | ------ | ----------------------------------------- | ----- |
| 19.5.21 by (By) | [x]    | src/color/transform.ts, src/files/mime.ts |       |

### 19.5.22 cBhvr (Common Behavior)

| Item                            | Status | Implementation                                                                     | Notes |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.22 cBhvr (Common Behavior) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser/common.ts |       |

### 19.5.23 charRg (Character Range)

| Item                             | Status | Implementation                          | Notes |
| -------------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.23 charRg (Character Range) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.24 checker (Checker Slide Transition)

| Item                                       | Status | Implementation                                                 | Notes |
| ------------------------------------------ | ------ | -------------------------------------------------------------- | ----- |
| 19.5.24 checker (Checker Slide Transition) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.spec.ts |       |

### 19.5.25 childTnLst (Children Time Node List)

| Item                                         | Status | Implementation                             | Notes |
| -------------------------------------------- | ------ | ------------------------------------------ | ----- |
| 19.5.25 childTnLst (Children Time Node List) | [x]    | src/pptx/parser/timing-parser/time-node.ts |       |

### 19.5.26 circle (Circle Slide Transition)

| Item                                     | Status | Implementation                                                  | Notes |
| ---------------------------------------- | ------ | --------------------------------------------------------------- | ----- |
| 19.5.26 circle (Circle Slide Transition) | [x]    | src/color/gradient.spec.ts, src/pptx/animation/coverage.spec.ts |       |

### 19.5.27 clrVal (Color Value)

| Item                         | Status | Implementation                                                                    | Notes |
| ---------------------------- | ------ | --------------------------------------------------------------------------------- | ----- |
| 19.5.27 clrVal (Color Value) | [x]    | src/pptx/parser/timing-parser/color.ts, src/pptx/parser/timing-parser/keyframe.ts |       |

### 19.5.28 cmd (Command)

| Item                  | Status | Implementation                                                              | Notes |
| --------------------- | ------ | --------------------------------------------------------------------------- | ----- |
| 19.5.28 cmd (Command) | [x]    | src/pptx/parser/geometry-parser.spec.ts, src/pptx/parser/geometry-parser.ts |       |

### 19.5.29 cMediaNode (Common Media Node Properties)

| Item                                              | Status | Implementation                            | Notes |
| ------------------------------------------------- | ------ | ----------------------------------------- | ----- |
| 19.5.29 cMediaNode (Common Media Node Properties) | [x]    | src/pptx/parser/timing-parser/behavior.ts |       |

### 19.5.30 comb (Comb Slide Transition)

| Item                                 | Status | Implementation                                                 | Notes |
| ------------------------------------ | ------ | -------------------------------------------------------------- | ----- |
| 19.5.30 comb (Comb Slide Transition) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.spec.ts |       |

### 19.5.31 cond (Condition)

| Item                     | Status | Implementation                             | Notes |
| ------------------------ | ------ | ------------------------------------------ | ----- |
| 19.5.31 cond (Condition) | [x]    | src/pptx/parser/timing-parser/condition.ts |       |

### 19.5.32 cover (Cover Slide Transition)

| Item                                   | Status | Implementation                                | Notes |
| -------------------------------------- | ------ | --------------------------------------------- | ----- |
| 19.5.32 cover (Cover Slide Transition) | [x]    | src/css/types.ts, src/pptx/core/background.ts |       |

### 19.5.33 cTn (Common Time Node Properties)

| Item                                      | Status | Implementation                                                                     | Notes |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.33 cTn (Common Time Node Properties) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser/common.ts |       |

### 19.5.34 cut (Cut Slide Transition)

| Item                               | Status | Implementation                                                 | Notes |
| ---------------------------------- | ------ | -------------------------------------------------------------- | ----- |
| 19.5.34 cut (Cut Slide Transition) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.spec.ts |       |

### 19.5.35 diamond (Diamond Slide Transition)

| Item                                       | Status | Implementation                                                                 | Notes |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------ | ----- |
| 19.5.35 diamond (Diamond Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |       |

### 19.5.36 dissolve (Dissolve Slide Transition)

| Item                                         | Status | Implementation                                                          | Notes |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------- | ----- |
| 19.5.36 dissolve (Dissolve Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects.spec.ts |       |

### 19.5.37 endCondLst (End Conditions List)

| Item                                     | Status | Implementation                          | Notes |
| ---------------------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.37 endCondLst (End Conditions List) | [x]    | src/pptx/parser/timing-parser/common.ts |       |

### 19.5.38 endSnd (Stop Sound Action)

| Item                               | Status | Implementation                                              | Notes |
| ---------------------------------- | ------ | ----------------------------------------------------------- | ----- |
| 19.5.38 endSnd (Stop Sound Action) | [x]    | src/pptx/ooxml/drawingml.ts, src/pptx/parser/text-parser.ts |       |

### 19.5.39 endSync (EndSync)

| Item                      | Status | Implementation                                                                      | Notes |
| ------------------------- | ------ | ----------------------------------------------------------------------------------- | ----- |
| 19.5.39 endSync (EndSync) | [x]    | src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/condition.ts |       |

### 19.5.40 excl (Exclusive)

| Item                     | Status | Implementation                        | Notes |
| ------------------------ | ------ | ------------------------------------- | ----- |
| 19.5.40 excl (Exclusive) | [x]    | src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.41 fade (Fade Slide Transition)

| Item                                 | Status | Implementation                                                                 | Notes |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------ | ----- |
| 19.5.41 fade (Fade Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |       |

### 19.5.42 fltVal (Float Value) — p.2646

| Item                         | Status | Implementation                            | Notes |
| ---------------------------- | ------ | ----------------------------------------- | ----- |
| 19.5.42 fltVal (Float Value) | [x]    | src/pptx/parser/timing-parser/keyframe.ts |       |

### 19.5.43 from (From) — p.2646

| Item                | Status | Implementation                              | Notes |
| ------------------- | ------ | ------------------------------------------- | ----- |
| 19.5.43 from (From) | [x]    | src/buffer/data-url.ts, src/buffer/index.ts |       |

### 19.5.44 from (From) — p.2646

| Item                | Status | Implementation                              | Notes |
| ------------------- | ------ | ------------------------------------------- | ----- |
| 19.5.44 from (From) | [x]    | src/buffer/data-url.ts, src/buffer/index.ts |       |

### 19.5.45 graphicEl (Graphic Element) — p.2647

| Item                                | Status | Implementation                          | Notes |
| ----------------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.45 graphicEl (Graphic Element) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.46 hsl (HSL) — p.2648

| Item              | Status | Implementation                                     | Notes |
| ----------------- | ------ | -------------------------------------------------- | ----- |
| 19.5.46 hsl (HSL) | [x]    | src/color/convert.ts, src/pptx/color/solid-fill.ts |       |

### 19.5.47 inkTgt (Ink Target) — p.2649

| Item                        | Status | Implementation                          | Notes |
| --------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.47 inkTgt (Ink Target) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.48 intVal (Integer) — p.2649

| Item                     | Status | Implementation                            | Notes |
| ------------------------ | ------ | ----------------------------------------- | ----- |
| 19.5.48 intVal (Integer) | [x]    | src/pptx/parser/timing-parser/keyframe.ts |       |

### 19.5.49 iterate (Iterate) — p.2650

| Item                      | Status | Implementation                                                         | Notes |
| ------------------------- | ------ | ---------------------------------------------------------------------- | ----- |
| 19.5.49 iterate (Iterate) | [x]    | src/pptx/integration/context-adapter.ts, src/pptx/presentation.spec.ts |       |

### 19.5.50 newsflash (Newsflash Slide Transition) — p.2651

| Item                                           | Status | Implementation                                            | Notes |
| ---------------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 19.5.50 newsflash (Newsflash Slide Transition) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.ts |       |

### 19.5.51 nextCondLst (Next Conditions List) — p.2651

| Item                                       | Status | Implementation                             | Notes |
| ------------------------------------------ | ------ | ------------------------------------------ | ----- |
| 19.5.51 nextCondLst (Next Conditions List) | [x]    | src/pptx/parser/timing-parser/time-node.ts |       |

### 19.5.52 oleChartEl (Embedded Chart Element) — p.2652

| Item                                        | Status | Implementation                          | Notes |
| ------------------------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.52 oleChartEl (Embedded Chart Element) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.53 par (Parallel Time Node) — p.2652

| Item                             | Status | Implementation                             | Notes |
| -------------------------------- | ------ | ------------------------------------------ | ----- |
| 19.5.53 par (Parallel Time Node) | [x]    | src/pptx/parser/timing-parser/time-node.ts |       |

### 19.5.54 plus (Plus Slide Transition) — p.2653

| Item                                 | Status | Implementation                                                                 | Notes |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------ | ----- |
| 19.5.54 plus (Plus Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |       |

### 19.5.55 prevCondLst (Previous Conditions List) — p.2654

| Item                                           | Status | Implementation                             | Notes |
| ---------------------------------------------- | ------ | ------------------------------------------ | ----- |
| 19.5.55 prevCondLst (Previous Conditions List) | [x]    | src/pptx/parser/timing-parser/time-node.ts |       |

### 19.5.56 pRg (Paragraph Text Range) — p.2654

| Item                               | Status | Implementation                          | Notes |
| ---------------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.56 pRg (Paragraph Text Range) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.57 progress (Progress) — p.2655

| Item                        | Status | Implementation                                                          | Notes |
| --------------------------- | ------ | ----------------------------------------------------------------------- | ----- |
| 19.5.57 progress (Progress) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/behavior.ts |       |

### 19.5.58 pull (Pull Slide Transition) — p.2656

| Item                                 | Status | Implementation                                            | Notes |
| ------------------------------------ | ------ | --------------------------------------------------------- | ----- |
| 19.5.58 pull (Pull Slide Transition) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.ts |       |

### 19.5.59 push (Push Slide Transition) — p.2658

| Item                                 | Status | Implementation                           | Notes |
| ------------------------------------ | ------ | ---------------------------------------- | ----- |
| 19.5.59 push (Push Slide Transition) | [x]    | src/buffer/base64.ts, src/css/builder.ts |       |

### 19.5.60 random (Random Slide Transition) — p.2659

| Item                                     | Status | Implementation                                          | Notes |
| ---------------------------------------- | ------ | ------------------------------------------------------- | ----- |
| 19.5.60 random (Random Slide Transition) | [x]    | src/pptx/animation/effects.ts, src/pptx/domain/slide.ts |       |

### 19.5.61 randomBar (Random Bar Slide Transition) — p.2659

| Item                                            | Status | Implementation                                            | Notes |
| ----------------------------------------------- | ------ | --------------------------------------------------------- | ----- |
| 19.5.61 randomBar (Random Bar Slide Transition) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.ts |       |

### 19.5.62 rCtr (Rotation Center) — p.2660

| Item                           | Status | Implementation                                                          | Notes |
| ------------------------------ | ------ | ----------------------------------------------------------------------- | ----- |
| 19.5.62 rCtr (Rotation Center) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/behavior.ts |       |

### 19.5.63 rgb (RGB) — p.2661

| Item              | Status | Implementation                                     | Notes |
| ----------------- | ------ | -------------------------------------------------- | ----- |
| 19.5.63 rgb (RGB) | [x]    | src/color/convert.ts, src/pptx/color/solid-fill.ts |       |

### 19.5.64 rtn (Runtime Node Trigger Choice) — p.2662

| Item                                      | Status | Implementation                                                                       | Notes |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------ | ----- |
| 19.5.64 rtn (Runtime Node Trigger Choice) | [x]    | src/pptx/parser/timing-parser/condition.ts, src/pptx/parser/timing-parser/mapping.ts |       |

### 19.5.65 seq (Sequence Time Node) — p.2663

| Item                             | Status | Implementation                        | Notes |
| -------------------------------- | ------ | ------------------------------------- | ----- |
| 19.5.65 seq (Sequence Time Node) | [x]    | src/pptx/parser/timing-parser.spec.ts |       |

### 19.5.66 set (Set Time Node Behavior) — p.2664

| Item                                 | Status | Implementation                                       | Notes |
| ------------------------------------ | ------ | ---------------------------------------------------- | ----- |
| 19.5.66 set (Set Time Node Behavior) | [x]    | src/pptx-cli.ts, src/pptx/animation/coverage.spec.ts |       |

### 19.5.67 sldTgt (Slide Target) — p.2665

| Item                          | Status | Implementation                          | Notes |
| ----------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.67 sldTgt (Slide Target) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.68 snd (Sound) — p.2666

| Item                | Status | Implementation                                            | Notes |
| ------------------- | ------ | --------------------------------------------------------- | ----- |
| 19.5.68 snd (Sound) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/slide-parser.ts |       |

### 19.5.69 sndAc (Sound Action) — p.2666

| Item                         | Status | Implementation                  | Notes |
| ---------------------------- | ------ | ------------------------------- | ----- |
| 19.5.69 sndAc (Sound Action) | [x]    | src/pptx/parser/slide-parser.ts |       |

### 19.5.70 sndTgt (Sound Target) — p.2667

| Item                          | Status | Implementation                          | Notes |
| ----------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.70 sndTgt (Sound Target) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.71 split (Split Slide Transition) — p.2668

| Item                                   | Status | Implementation                                         | Notes |
| -------------------------------------- | ------ | ------------------------------------------------------ | ----- |
| 19.5.71 split (Split Slide Transition) | [x]    | src/files/path.ts, src/pptx/animation/coverage.spec.ts |       |

### 19.5.72 spTgt (Shape Target) — p.2669

| Item                         | Status | Implementation                          | Notes |
| ---------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.72 spTgt (Shape Target) | [x]    | src/pptx/parser/timing-parser/target.ts |       |

### 19.5.73 stCondLst (Start Conditions List) — p.2670

| Item                                      | Status | Implementation                          | Notes |
| ----------------------------------------- | ------ | --------------------------------------- | ----- |
| 19.5.73 stCondLst (Start Conditions List) | [x]    | src/pptx/parser/timing-parser/common.ts |       |

### 19.5.74 strips (Strips Slide Transition) — p.2670

| Item                                     | Status | Implementation                                                          | Notes |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- | ----- |
| 19.5.74 strips (Strips Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects.spec.ts |       |

### 19.5.75 strVal (String Value) — p.2672

| Item                          | Status | Implementation                            | Notes |
| ----------------------------- | ------ | ----------------------------------------- | ----- |
| 19.5.75 strVal (String Value) | [x]    | src/pptx/parser/timing-parser/keyframe.ts |       |

### 19.5.76 stSnd (Start Sound Action) — p.2672

| Item                               | Status | Implementation                  | Notes |
| ---------------------------------- | ------ | ------------------------------- | ----- |
| 19.5.76 stSnd (Start Sound Action) | [x]    | src/pptx/parser/slide-parser.ts |       |

### 19.5.77 subSp (Subshape) — p.2672

| Item                     | Status | Implementation                                                        | Notes |
| ------------------------ | ------ | --------------------------------------------------------------------- | ----- |
| 19.5.77 subSp (Subshape) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/target.ts |       |

### 19.5.78 subTnLst (Sub-TimeNodes List) — p.2673

| Item                                  | Status | Implementation                                                           | Notes |
| ------------------------------------- | ------ | ------------------------------------------------------------------------ | ----- |
| 19.5.78 subTnLst (Sub-TimeNodes List) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/time-node.ts |       |

### 19.5.79 tav (Time Animate Value) — p.2674

| Item                             | Status | Implementation                            | Notes |
| -------------------------------- | ------ | ----------------------------------------- | ----- |
| 19.5.79 tav (Time Animate Value) | [x]    | src/pptx/parser/timing-parser/keyframe.ts |       |

### 19.5.80 tavLst (Time Animated Value List) — p.2678

| Item                                      | Status | Implementation                                                                       | Notes |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------ | ----- |
| 19.5.80 tavLst (Time Animated Value List) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser/keyframe.ts |       |

### 19.5.81 tgtEl (Target Element) — p.2679

| Item                           | Status | Implementation                                                                     | Notes |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.81 tgtEl (Target Element) | [x]    | src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser/common.ts |       |

### 19.5.82 tmAbs (Time Absolute) — p.2679

| Item                          | Status | Implementation                                                        | Notes |
| ----------------------------- | ------ | --------------------------------------------------------------------- | ----- |
| 19.5.82 tmAbs (Time Absolute) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/common.ts |       |

### 19.5.83 tmPct (Time Percentage) — p.2680

| Item                            | Status | Implementation                                                        | Notes |
| ------------------------------- | ------ | --------------------------------------------------------------------- | ----- |
| 19.5.83 tmPct (Time Percentage) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/common.ts |       |

### 19.5.84 tmpl (Template Effects) — p.2681

| Item                            | Status | Implementation                                                            | Notes |
| ------------------------------- | ------ | ------------------------------------------------------------------------- | ----- |
| 19.5.84 tmpl (Template Effects) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/build-list.ts |       |

### 19.5.85 tmplLst (Template effects) — p.2681

| Item                               | Status | Implementation                              | Notes |
| ---------------------------------- | ------ | ------------------------------------------- | ----- |
| 19.5.85 tmplLst (Template effects) | [x]    | src/pptx/parser/timing-parser/build-list.ts |       |

### 19.5.86 tn (Time Node) — p.2682

| Item                   | Status | Implementation                             | Notes |
| ---------------------- | ------ | ------------------------------------------ | ----- |
| 19.5.86 tn (Time Node) | [x]    | src/pptx/parser/timing-parser/condition.ts |       |

### 19.5.87 tnLst (Time Node List) — p.2683

| Item                           | Status | Implementation                                                                     | Notes |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------- | ----- |
| 19.5.87 tnLst (Time Node List) | [x]    | src/pptx/parser/timing-parser/index.ts, src/pptx/parser/timing-parser/time-node.ts |       |

### 19.5.88 to (To) — p.2683

| Item            | Status | Implementation                               | Notes |
| --------------- | ------ | -------------------------------------------- | ----- |
| 19.5.88 to (To) | [x]    | src/buffer/base64.ts, src/buffer/data-url.ts |       |

### 19.5.89 to (To) — p.2684

| Item            | Status | Implementation                               | Notes |
| --------------- | ------ | -------------------------------------------- | ----- |
| 19.5.89 to (To) | [x]    | src/buffer/base64.ts, src/buffer/data-url.ts |       |

### 19.5.90 to (To) — p.2684

| Item            | Status | Implementation                               | Notes |
| --------------- | ------ | -------------------------------------------- | ----- |
| 19.5.90 to (To) | [x]    | src/buffer/base64.ts, src/buffer/data-url.ts |       |

### 19.5.91 txEl (Text Element) — p.2685

| Item                        | Status | Implementation                                                                      | Notes |
| --------------------------- | ------ | ----------------------------------------------------------------------------------- | ----- |
| 19.5.91 txEl (Text Element) | [x]    | src/pptx/parser/chart-parser/components.ts, src/pptx/parser/timing-parser/target.ts |       |

### 19.5.92 val (Value) — p.2685

| Item                | Status | Implementation                                            | Notes |
| ------------------- | ------ | --------------------------------------------------------- | ----- |
| 19.5.92 val (Value) | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/background.ts |       |

### 19.5.93 video (Video) — p.2686

| Item                  | Status | Implementation                                 | Notes |
| --------------------- | ------ | ---------------------------------------------- | ----- |
| 19.5.93 video (Video) | [x]    | src/buffer/data-url.ts, src/files/mime.spec.ts |       |

### 19.5.94 wedge (Wedge Slide Transition) — p.2687

| Item                                   | Status | Implementation                                                                 | Notes |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------ | ----- |
| 19.5.94 wedge (Wedge Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |       |

### 19.5.95 wheel (Wheel Slide Transition) — p.2687

| Item                                   | Status | Implementation                                                                 | Notes |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------ | ----- |
| 19.5.95 wheel (Wheel Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |       |

### 19.5.96 wipe (Wipe Slide Transition) — p.2689

| Item                                 | Status | Implementation                                                                 | Notes |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------ | ----- |
| 19.5.96 wipe (Wipe Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |       |

### 19.5.97 zoom (Zoom Slide Transition) — p.2690

| Item                                 | Status | Implementation                                                          | Notes |
| ------------------------------------ | ------ | ----------------------------------------------------------------------- | ----- |
| 19.5.97 zoom (Zoom Slide Transition) | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects.spec.ts |       |

### 19.6 Slide Synchronization Data — p.2691

| Item                            | Status | Implementation                                                                                            | Notes |
| ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- | ----- |
| 19.6 Slide Synchronization Data | [x]    | src/pptx/parser/slide-sync-parser.ts, src/pptx/parser/slide-sync-parser.spec.ts, src/pptx/domain/slide.ts |       |

### 19.6.1 sldSyncPr (Slide Synchronization Properties) — p.2691

| Item                                                | Status | Implementation                                                                                            | Notes |
| --------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- | ----- |
| 19.6.1 sldSyncPr (Slide Synchronization Properties) | [x]    | src/pptx/parser/slide-sync-parser.ts, src/pptx/parser/slide-sync-parser.spec.ts, src/pptx/domain/slide.ts |       |

### 19.7 Simple Types — p.2692

| Item              | Status | Implementation                   | Notes                       |
| ----------------- | ------ | -------------------------------- | --------------------------- |
| 19.7 Simple Types | [x]    | src/pptx/parser, src/pptx/domain | covered across sub-sections |

### 19.7.1 ST_BookmarkIdSeed (Bookmark ID Seed) — p.2692

| Item                                        | Status | Implementation                                                                                                         | Notes |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.1 ST_BookmarkIdSeed (Bookmark ID Seed) | [x]    | src/pptx/parser/presentation-parser.ts, src/pptx/core/ecma376-defaults.ts, src/pptx/parser/presentation-parser.spec.ts |       |

### 19.7.2 ST_Direction (Direction) — p.2693

| Item                            | Status | Implementation                                                                                        | Notes |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- | ----- |
| 19.7.2 ST_Direction (Direction) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |

### 19.7.3 ST_Index (Index) — p.2693

| Item                    | Status | Implementation                                                                                              | Notes |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.3 ST_Index (Index) | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/primitive.spec.ts, src/pptx/parser/shape-parser/non-visual.ts |       |

### 19.7.4 ST_IterateType (Iterate Type) — p.2693

| Item                                 | Status | Implementation                                                                                                                                         | Notes |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 19.7.4 ST_IterateType (Iterate Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.5 ST_Name (Name string) — p.2693

| Item                         | Status | Implementation                                                                                                                     | Notes |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.5 ST_Name (Name string) | [x]    | src/pptx/parser/comment-parser.ts, src/pptx/parser/presentation-parser.ts, src/pptx/parser/tag-parser.ts, src/pptx/domain/slide.ts |       |

### 19.7.6 ST_OleObjectFollowColorScheme (Embedded object to Follow Color — p.2694

| Item                                                                          | Status | Implementation                                                                                                        | Notes |
| ----------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.6 ST_OleObjectFollowColorScheme (Embedded object to Follow Color Scheme) | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser/graphic-frame.ts, src/pptx/parser/mc-alternate-content.spec.ts |       |
| 19.7.6 ST_OleObjectFollowColorScheme (Embedded object to Follow Color         | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser/graphic-frame.ts, src/pptx/parser/mc-alternate-content.spec.ts |       |

### 19.7.7 ST_PhotoAlbumFrameShape (Photo Album Shape for Photo Mask) — p.2694

| Item                                                              | Status | Implementation                                                                                                | Notes |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.7 ST_PhotoAlbumFrameShape (Photo Album Shape for Photo Mask) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts |       |

### 19.7.8 ST_PhotoAlbumLayout (Photo Album Layout Definition) — p.2695

| Item                                                       | Status | Implementation                                                                                                | Notes |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.8 ST_PhotoAlbumLayout (Photo Album Layout Definition) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/presentation-parser.ts, src/pptx/parser/presentation-parser.spec.ts |       |

### 19.7.9 ST_PlaceholderSize (Placeholder Size) — p.2697

| Item                                         | Status | Implementation                                                                                             | Notes |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.9 ST_PlaceholderSize (Placeholder Size) | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser/non-visual.ts, src/pptx/parser/shape-parser.spec.ts |       |

### 19.7.10 ST_PlaceholderType (Placeholder IDs)

| Item                                         | Status | Implementation                                          | Notes |
| -------------------------------------------- | ------ | ------------------------------------------------------- | ----- |
| 19.7.10 ST_PlaceholderType (Placeholder IDs) | [x]    | src/pptx/core/context.ts, src/pptx/core/node-indexer.ts |       |

### 19.7.11 ST_PrintColorMode (Print Color Mode)

| Item                                         | Status | Implementation                                                                                                        | Notes |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.11 ST_PrintColorMode (Print Color Mode) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |       |

### 19.7.12 ST_PrintWhat (Default print output)

| Item                                        | Status | Implementation                                                                                                        | Notes |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.12 ST_PrintWhat (Default print output) | [x]    | src/pptx/domain/slide.ts, src/pptx/parser/presentation-properties.ts, src/pptx/parser/presentation-properties.spec.ts |       |

### 19.7.13 ST_SlideId (Slide Identifier)

| Item                                  | Status | Implementation                                                                                          | Notes |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.13 ST_SlideId (Slide Identifier) | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/primitive.spec.ts, src/pptx/parser/presentation-parser.ts |       |

### 19.7.14 ST_SlideLayoutId (Slide Layout ID)

| Item                                       | Status | Implementation                                                                                                                         | Notes |
| ------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.14 ST_SlideLayoutId (Slide Layout ID) | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/primitive.spec.ts, src/pptx/parser/slide-parser.ts, src/pptx/parser/slide-parser.spec.ts |       |

### 19.7.15 ST_SlideLayoutType (Slide Layout Type)

| Item                                           | Status | Implementation           | Notes |
| ---------------------------------------------- | ------ | ------------------------ | ----- |
| 19.7.15 ST_SlideLayoutType (Slide Layout Type) | [x]    | src/pptx/domain/slide.ts |       |

### 19.7.16 ST_SlideMasterId (Slide Master ID)

| Item                                       | Status | Implementation                                                                                          | Notes |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.16 ST_SlideMasterId (Slide Master ID) | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/primitive.spec.ts, src/pptx/parser/presentation-parser.ts |       |

### 19.7.17 ST_SlideSizeCoordinate (Slide Size Coordinate)

| Item                                                   | Status | Implementation                                                                                          | Notes |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.17 ST_SlideSizeCoordinate (Slide Size Coordinate) | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/primitive.spec.ts, src/pptx/parser/presentation-parser.ts |       |

### 19.7.18 ST_SlideSizeType (Slide Size Type)

| Item                                       | Status | Implementation           | Notes |
| ------------------------------------------ | ------ | ------------------------ | ----- |
| 19.7.18 ST_SlideSizeType (Slide Size Type) | [x]    | src/pptx/domain/slide.ts |       |

### 19.7.19 ST_SplitterBarState (Splitter Bar State)

| Item                                             | Status | Implementation                                                                                                                  | Notes |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.19 ST_SplitterBarState (Splitter Bar State) | [x]    | src/pptx/domain/slide.ts, src/pptx/domain/index.ts, src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |

### 19.7.20 ST_TLAnimateBehaviorCalcMode (Time List Animate Behavior Calculate

| Item                                                                       | Status | Implementation                                                                                                                                           | Notes |
| -------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.20 ST_TLAnimateBehaviorCalcMode (Time List Animate Behavior Calculate | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.21 ST_TLAnimateBehaviorValueType (Time List Animate Behavior Value

| Item                                                                    | Status | Implementation                                                                                                                                           | Notes |
| ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.21 ST_TLAnimateBehaviorValueType (Time List Animate Behavior Value | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.22 ST_TLAnimateColorDirection (Time List Animate Color Direction)

| Item                                                                   | Status | Implementation                                                                                                                           | Notes |
| ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.22 ST_TLAnimateColorDirection (Time List Animate Color Direction) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.23 ST_TLAnimateColorSpace (Time List Animate Color Space)

| Item                                                           | Status | Implementation                                                                                    | Notes |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- | ----- |
| 19.7.23 ST_TLAnimateColorSpace (Time List Animate Color Space) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/behavior.ts |       |

### 19.7.24 ST_TLAnimateEffectTransition (Time List Animate Effect Transition)

| Item                                                                       | Status | Implementation                                 | Notes |
| -------------------------------------------------------------------------- | ------ | ---------------------------------------------- | ----- |
| 19.7.24 ST_TLAnimateEffectTransition (Time List Animate Effect Transition) | [x]    | src/pptx/animation/ms-oe376-compliance.spec.ts |       |

### 19.7.25 ST_TLAnimateMotionBehaviorOrigin (Time List Animate Motion Behavior

| Item                                                                        | Status | Implementation                                                                                                                           | Notes |
| --------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.25 ST_TLAnimateMotionBehaviorOrigin (Time List Animate Motion Behavior | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.26 ST_TLAnimateMotionPathEditMode (Time List Animate Motion Path Edit

| Item                                                                       | Status | Implementation                                                                                                                           | Notes |
| -------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.26 ST_TLAnimateMotionPathEditMode (Time List Animate Motion Path Edit | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.27 ST_TLBehaviorAccumulateType (Behavior Accumulate Type)

| Item                                                           | Status | Implementation                                                                                                                                                                                                              | Notes |
| -------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.27 ST_TLBehaviorAccumulateType (Behavior Accumulate Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.28 ST_TLBehaviorAdditiveType (Behavior Additive Type)

| Item                                                       | Status | Implementation                                                                                                                                           | Notes |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.28 ST_TLBehaviorAdditiveType (Behavior Additive Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.29 ST_TLBehaviorOverrideType (Behavior Override Type)

| Item                                                       | Status | Implementation                                                                                                                                                                                                              | Notes |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.29 ST_TLBehaviorOverrideType (Behavior Override Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.30 ST_TLBehaviorTransformType (Behavior Transform Type)

| Item                                                         | Status | Implementation                                                                                                                                                                                                              | Notes |
| ------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.30 ST_TLBehaviorTransformType (Behavior Transform Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.31 ST_TLChartSubelementType (Chart Subelement Type)

| Item                                                     | Status | Implementation                                                                                                                                                                   | Notes |
| -------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.31 ST_TLChartSubelementType (Chart Subelement Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/target.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.32 ST_TLCommandType (Command Type)

| Item                                    | Status | Implementation                                                                                                                                                                     | Notes |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.32 ST_TLCommandType (Command Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/behavior.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.33 ST_TLDiagramBuildType (Diagram Build Types)

| Item                                                | Status | Implementation                                                                                                                                                                                             | Notes |
| --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.33 ST_TLDiagramBuildType (Diagram Build Types) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/graphic-build.ts, src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.34 ST_TLNextActionType (Next Action Type)

| Item                                           | Status | Implementation                                                                                                                                                                      | Notes |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.34 ST_TLNextActionType (Next Action Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/time-node.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.35 ST_TLOleChartBuildType (Embedded Chart Build Type)

| Item                                                       | Status | Implementation                                                                                                                                             | Notes |
| ---------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.35 ST_TLOleChartBuildType (Embedded Chart Build Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.36 ST_TLParaBuildType (Paragraph Build Type)

| Item                                              | Status | Implementation                                                                                                                                                                       | Notes |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 19.7.36 ST_TLParaBuildType (Paragraph Build Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.37 ST_TLPreviousActionType (Previous Action Type) — p.2712

| Item                                                   | Status | Implementation                                                                                                                               | Notes |
| ------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.37 ST_TLPreviousActionType (Previous Action Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/time-node.ts |       |

### 19.7.38 ST_TLTime (Time) — p.2712

| Item                     | Status | Implementation                                                                                                                                                                       | Notes |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 19.7.38 ST_TLTime (Time) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.39 ST_TLTimeAnimateValueTime (Animation Time) — p.2712

| Item                                               | Status | Implementation                                                                                                                           | Notes |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.39 ST_TLTimeAnimateValueTime (Animation Time) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/keyframe.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.40 ST_TLTimeIndefinite (Indefinite Time Declaration) — p.2713

| Item                                                      | Status | Implementation               | Notes |
| --------------------------------------------------------- | ------ | ---------------------------- | ----- |
| 19.7.40 ST_TLTimeIndefinite (Indefinite Time Declaration) | [x]    | src/pptx/domain/animation.ts |       |

### 19.7.41 ST_TLTimeNodeFillType (Time Node Fill Type) — p.2713

| Item                                                | Status | Implementation                                                                                                                            | Notes |
| --------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.41 ST_TLTimeNodeFillType (Time Node Fill Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/mapping.ts |       |

### 19.7.42 ST_TLTimeNodeID (Time Node ID) — p.2713

| Item                                   | Status | Implementation                                         | Notes |
| -------------------------------------- | ------ | ------------------------------------------------------ | ----- |
| 19.7.42 ST_TLTimeNodeID (Time Node ID) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts |       |

### 19.7.43 ST_TLTimeNodeMasterRelation (Time Node Master Relation) — p.2713

| Item                                                            | Status | Implementation                                                                                                                                                                   | Notes |
| --------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.43 ST_TLTimeNodeMasterRelation (Time Node Master Relation) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.44 ST_TLTimeNodePresetClassType (Time Node Preset Class Type) — p.2714

| Item                                                               | Status | Implementation                                                                                                                            | Notes |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.44 ST_TLTimeNodePresetClassType (Time Node Preset Class Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/mapping.ts |       |

### 19.7.45 ST_TLTimeNodeRestartType (Time Node Restart Type) — p.2714

| Item                                                      | Status | Implementation                                                                                                                            | Notes |
| --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.45 ST_TLTimeNodeRestartType (Time Node Restart Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/mapping.ts |       |

### 19.7.46 ST_TLTimeNodeSyncType (Time Node Sync Type) — p.2715

| Item                                                | Status | Implementation                                                                                                                                                                                                     | Notes |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 19.7.46 ST_TLTimeNodeSyncType (Time Node Sync Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/ooxml/presentationml.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.47 ST_TLTimeNodeType (Time Node Type) — p.2715

| Item                                       | Status | Implementation                                                                                                                                         | Notes |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 19.7.47 ST_TLTimeNodeType (Time Node Type) | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/common.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser.spec.ts |       |

### 19.7.48 ST_TLTriggerEvent (Trigger Event) — p.2716

| Item                                      | Status | Implementation                                                                                                                               | Notes |
| ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.48 ST_TLTriggerEvent (Trigger Event) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/condition.ts, src/pptx/parser/timing-parser/mapping.ts |       |

### 19.7.49 ST_TLTriggerRuntimeNode (Trigger RunTime Node) — p.2716

| Item                                                   | Status | Implementation                                                                                                                               | Notes |
| ------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.49 ST_TLTriggerRuntimeNode (Trigger RunTime Node) | [x]    | src/pptx/domain/animation.ts, src/pptx/domain/index.ts, src/pptx/parser/timing-parser/condition.ts, src/pptx/parser/timing-parser/mapping.ts |       |

### 19.7.50 ST_TransitionCornerDirectionType (Transition Corner Direction Type) — p.2717

| Item                                                                        | Status | Implementation                                     | Notes |
| --------------------------------------------------------------------------- | ------ | -------------------------------------------------- | ----- |
| 19.7.50 ST_TransitionCornerDirectionType (Transition Corner Direction Type) | [x]    | src/pptx/domain/slide.ts, src/pptx/domain/index.ts |       |

### 19.7.51 ST_TransitionEightDirectionType (Transition Eight Direction) — p.2717

| Item                                                                 | Status | Implementation                                     | Notes |
| -------------------------------------------------------------------- | ------ | -------------------------------------------------- | ----- |
| 19.7.51 ST_TransitionEightDirectionType (Transition Eight Direction) | [x]    | src/pptx/domain/slide.ts, src/pptx/domain/index.ts |       |

### 19.7.52 ST_TransitionInOutDirectionType (Transition In/Out Direction Type) — p.2717

| Item                                                                       | Status | Implementation                                     | Notes |
| -------------------------------------------------------------------------- | ------ | -------------------------------------------------- | ----- |
| 19.7.52 ST_TransitionInOutDirectionType (Transition In/Out Direction Type) | [x]    | src/pptx/domain/slide.ts, src/pptx/domain/index.ts |       |

### 19.7.53 ST_TransitionSideDirectionType (Transition Side Direction Type) — p.2718

| Item                                                                    | Status | Implementation                                     | Notes |
| ----------------------------------------------------------------------- | ------ | -------------------------------------------------- | ----- |
| 19.7.53 ST_TransitionSideDirectionType (Transition Side Direction Type) | [x]    | src/pptx/domain/slide.ts, src/pptx/domain/index.ts |       |

### 19.7.54 ST_TransitionSpeed (Transition Speed) — p.2718

| Item                                          | Status | Implementation                                     | Notes |
| --------------------------------------------- | ------ | -------------------------------------------------- | ----- |
| 19.7.54 ST_TransitionSpeed (Transition Speed) | [x]    | src/pptx/domain/slide.ts, src/pptx/domain/index.ts |       |

### 19.7.55 ST_ViewType (List of View Types) — p.2718

| Item                                     | Status | Implementation                                                                                                                  | Notes |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 19.7.55 ST_ViewType (List of View Types) | [x]    | src/pptx/domain/slide.ts, src/pptx/domain/index.ts, src/pptx/parser/view-properties.ts, src/pptx/parser/view-properties.spec.ts |       |
