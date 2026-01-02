# ECMA-376 Part 1: DrawingML - Main チェックリスト（章／節ベース）

このチェックリストは ECMA-376 の公式 PDF（章／節の見出し）から抽出したものです。
各項目は章番号・節名・参照ページ（判読できたもの）を保持し、網羅度測定のベースラインとして利用できます。

参照PDF: `reference/ecma376/ecma-376-1/Ecma Office Open XML Part 1 - Fundamentals And Markup Language Reference.pdf`

## Checklist

### 20.1 DrawingML - Main — p.2720

| Item                  | Status | Implementation | Notes                       |
| --------------------- | ------ | -------------- | --------------------------- |
| 20.1 DrawingML - Main | [x]    | src/pptx       | covered across sub-sections |

### 20.1.2 Basics

| Item                                                                       | Status | Implementation                                                                             | Notes                                      |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 20.1.2 Basics                                                              | [x]    | src/pptx                                                                                   | covered across sub-sections                |
| 20.1.2.1 EMU Unit of Measurement                                           | [x]    | src/pptx/parser/primitive.ts                                                               |                                            |
| 20.1.2.2 Core Drawing Object Information                                   | [x]    | docs/specs/ecma376-drawingml-main.checklist.md                                             |                                            |
| 20.1.2.2.1 bldChart (Build Chart)                                          | [x]    | src/pptx/parser/timing-parser/graphic-build.ts                                             |                                            |
| 20.1.2.2.2 bldDgm (Build Diagram)                                          | [x]    | src/pptx/parser/timing-parser/graphic-build.ts                                             |                                            |
| 20.1.2.2.3 chart (Chart to Animate)                                        | [x]    | src/pptx/core/content-types.ts, src/pptx/core/context.ts                                   |                                            |
| 20.1.2.2.4 cNvCxnSpPr (Non-Visual Connector Shape Drawing Properties)      | [x]    | src/pptx/parser/shape-parser/cxn.ts                                                        |                                            |
| 20.1.2.2.5 cNvGraphicFramePr (Non-Visual Graphic Frame Drawing Properties) | [x]    | src/pptx/parser/shape-parser/graphic-frame.ts                                              |                                            |
| 20.1.2.2.6 cNvGrpSpPr (Non-Visual Group Shape Drawing Properties)          | [x]    | src/pptx/parser/wp-drawing.ts, src/pptx/parser/xdr-drawing.ts                              |                                            |
| 20.1.2.2.7 cNvPicPr (Non-Visual Picture Drawing Properties)                | [x]    | src/pptx/parser/shape-parser/pic.ts                                                        |                                            |
| 20.1.2.2.8 cNvPr (Non-Visual Drawing Properties)                           | [x]    | src/pptx/core/node-indexer.ts, src/pptx/domain/shape.ts                                    |                                            |
| 20.1.2.2.9 cNvSpPr (Non-Visual Shape Drawing Properties)                   | [x]    | src/pptx/parser/wp-drawing.ts, src/pptx/parser/xdr-drawing.ts                              |                                            |
| 20.1.2.2.10 cxnSp (Connection Shape)                                       | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/diagram-parser.spec.ts                           |                                            |
| 20.1.2.2.11 cxnSpLocks (Connection Shape Locks)                            | [x]    | src/pptx/parser/wp-drawing.ts, src/pptx/parser/xdr-drawing.ts                              |                                            |
| 20.1.2.2.12 dgm (Diagram to Animate)                                       | [x]    | src/pptx/core/context.ts, src/pptx/domain/shape.ts                                         |                                            |
| 20.1.2.2.13 endCxn (Connection End)                                        | [x]    | src/pptx/core/connection-site.ts, src/pptx/domain/shape.ts                                 |                                            |
| 20.1.2.2.14 ext (Extension)                                                | [x]    | src/pptx/integration/content-enricher.ts, src/pptx/integration/context-adapter.ts          |                                            |
| 20.1.2.2.15 extLst (Extension List)                                        | [x]    | src/pptx/parser/diagram-parser.spec.ts                                                     |                                            |
| 20.1.2.2.16 graphic (Graphic Object)                                       | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/ooxml/ecma376.ts                                  |                                            |
| 20.1.2.2.17 graphicData (Graphic Object Data)                              | [x]    | src/pptx/ooxml/ecma376.ts, src/pptx/parser/shape-parser/alternate-content.ts               |                                            |
| 20.1.2.2.18 graphicFrame (Graphic Frame)                                   | [x]    | src/pptx/core/render-options.ts, src/pptx/domain/shape.ts                                  |                                            |
| 20.1.2.2.19 graphicFrameLocks (Graphic Frame Locks)                        | [x]    | src/pptx/parser/shape-parser/graphic-frame.ts                                              |                                            |
| 20.1.2.2.20 grpSp (Group shape)                                            | [x]    | src/pptx/domain/shape.ts, src/pptx/integration/content-enricher.ts                         |                                            |
| 20.1.2.2.21 grpSpLocks (Group Shape Locks)                                 | [x]    | src/pptx/parser/wp-drawing.ts, src/pptx/parser/xdr-drawing.ts                              |                                            |
| 20.1.2.2.22 grpSpPr (Visual Group Shape Properties)                        | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser.spec.ts                             |                                            |
| 20.1.2.2.23 hlinkHover (Hyperlink for Hover)                               | [x]    | -                                                                                          | src/pptx/parser/shape-parser/non-visual.ts |
| 20.1.2.2.24 ln (Outline)                                                   | [x]    | src/pptx/domain/color.ts, src/pptx/ooxml/guards.spec.ts                                    |                                            |
| 20.1.2.2.25 nvCxnSpPr (Non-Visual Properties for a Connection Shape)       | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser/cxn.ts                        |                                            |
| 20.1.2.2.26 nvGraphicFramePr (Non-Visual Properties for a Graphic Frame)   | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser/graphic-frame.ts              |                                            |
| 20.1.2.2.27 nvGrpSpPr (Non-Visual Properties for a Group Shape)            | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser.spec.ts                       |                                            |
| 20.1.2.2.28 nvPicPr (Non-Visual Properties for a Picture)                  | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/ooxml/guards.spec.ts                              |                                            |
| 20.1.2.2.29 nvSpPr (Non-Visual Properties for a Shape)                     | [x]    | src/pptx/core/node-indexer.ts, src/pptx/ooxml/ecma376.spec.ts                              |                                            |
| 20.1.2.2.30 pic (Picture)                                                  | [x]    | src/pptx/core/context.ts, src/pptx/domain/shape.ts                                         |                                            |
| 20.1.2.2.31 picLocks (Picture Locks)                                       | [x]    | src/pptx/parser/shape-parser/pic.ts                                                        |                                            |
| 20.1.2.2.32 snd (Hyperlink Sound)                                          | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/parser/text-parser.ts                 |                                            |
| 20.1.2.2.33 sp (Shape)                                                     | [x]    | src/pptx/animation/integration.spec.ts, src/pptx/domain/shape.ts                           |                                            |
| 20.1.2.2.34 spLocks (Shape Locks)                                          | [x]    | src/pptx/parser/shape-parser/sp.ts                                                         |                                            |
| 20.1.2.2.35 spPr (Shape Properties)                                        | [x]    | src/pptx/color/fill.ts, src/pptx/domain/chart.ts                                           |                                            |
| 20.1.2.2.36 stCxn (Connection Start)                                       | [x]    | src/pptx/core/connection-site.ts, src/pptx/domain/shape.ts                                 |                                            |
| 20.1.2.2.37 style (Shape Style)                                            | [x]    | src/css/builder.ts, src/css/types.ts                                                       |                                            |
| 20.1.2.2.38 sx (Horizontal Ratio)                                          | [x]    | src/pptx/ooxml/color.ts, src/pptx/ooxml/presentationml.ts                                  |                                            |
| 20.1.2.2.39 sy (Vertical Ratio)                                            | [x]    | src/pptx/ooxml/color.ts, src/pptx/ooxml/presentationml.ts                                  |                                            |
| 20.1.2.2.40 txBody (Shape Text Body)                                       | [x]    | src/pptx/domain/text.ts, src/pptx/ooxml/ecma376.spec.ts                                    |                                            |
| 20.1.2.2.41 txSp (Text Shape)                                              | [x]    | src/pptx/parser/shape-parser/index.ts                                                      |                                            |
| 20.1.2.2.42 useSpRect (Use Shape Text Rectangle)                           | [x]    | src/pptx/parser/shape-parser/index.ts                                                      |                                            |
| 20.1.2.2.43 cpLocks (Content Part Locks)                                   | [x]    | src/pptx/parser/wp-drawing.ts                                                              |                                            |
| 20.1.2.3 Colors                                                            | [x]    | src/pptx/color, src/pptx/parser/color-parser.ts                                            | covered across sub-sections                |
| 20.1.2.3.1 alpha (Alpha)                                                   | [x]    | src/color/transform.spec.ts, src/pptx/color/solid-fill.ts                                  |                                            |
| 20.1.2.3.2 alphaMod (Alpha Modulation)                                     | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts                                  |                                            |
| 20.1.2.3.3 alphaOff (Alpha Offset)                                         | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts                                  |                                            |
| 20.1.2.3.4 blue (Blue)                                                     | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/style-state.spec.ts                            |                                            |
| 20.1.2.3.5 blueMod (Blue Modulation)                                       | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.6 blueOff (Blue Offset)                                           | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.7 comp (Complement)                                               | [x]    | src/pptx/core/color-resolver.ts, src/pptx/domain/color.ts                                  |                                            |
| 20.1.2.3.8 gamma (Gamma)                                                   | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.9 gray (Gray)                                                     | [x]    | src/color/transform.spec.ts, src/pptx/core/color-resolver.ts                               |                                            |
| 20.1.2.3.10 green (Green)                                                  | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.11 greenMod (Green Modulation)                                    | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.12 greenOff (Green Offset)                                        | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.13 hslClr (Hue, Saturation, Luminance Color Model)                | [x]    | src/pptx/color/solid-fill.ts, src/pptx/domain/color.ts                                     |                                            |
| 20.1.2.3.14 hue (Hue)                                                      | [x]    | src/color/convert.ts, src/color/transform.ts                                               |                                            |
| 20.1.2.3.15 hueMod (Hue Modulate)                                          | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-resolver.ts                              |                                            |
| 20.1.2.3.16 hueOff (Hue Offset)                                            | [x]    | src/pptx/core/color-resolver.ts, src/pptx/domain/color.ts                                  |                                            |
| 20.1.2.3.17 inv (Inverse)                                                  | [x]    | src/pptx/core/color-resolver.ts, src/pptx/domain/color.ts                                  |                                            |
| 20.1.2.3.18 invGamma (Inverse Gamma)                                       | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.19 lum (Luminance)                                                | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-resolver.ts                              |                                            |
| 20.1.2.3.20 lumMod (Luminance Modulation)                                  | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-resolver.ts                              |                                            |
| 20.1.2.3.21 lumOff (Luminance Offset)                                      | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-resolver.ts                              |                                            |
| 20.1.2.3.22 prstClr (Preset Color)                                         | [x]    | src/pptx/color/solid-fill.ts, src/pptx/domain/color.ts                                     |                                            |
| 20.1.2.3.23 red (Red)                                                      | [x]    | src/color/transform.spec.ts, src/pptx/color/solid-fill.ts                                  |                                            |
| 20.1.2.3.24 redMod (Red Modulation)                                        | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.25 redOff (Red Offset)                                            | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.ts, src/pptx/core/color-resolver.ts |                                            |
| 20.1.2.3.26 sat (Saturation)                                               | [x]    | src/color/convert.ts, src/pptx/color/solid-fill.ts                                         |                                            |
| 20.1.2.3.27 satMod (Saturation Modulation)                                 | [x]    | src/color/transform.spec.ts, src/pptx/color/solid-fill.ts                                  |                                            |
| 20.1.2.3.28 satOff (Saturation Offset)                                     | [x]    | src/pptx/core/color-resolver.ts, src/pptx/domain/color.ts                                  |                                            |
| 20.1.2.3.29 schemeClr (Scheme Color)                                       | [x]    | src/pptx/color/solid-fill.ts, src/pptx/domain/color.ts                                     |                                            |
| 20.1.2.3.30 scrgbClr (RGB Color Model - Percentage Variant)                | [x]    | src/pptx/color/solid-fill.ts                                                               |                                            |
| 20.1.2.3.31 shade (Shade)                                                  | [x]    | src/color/transform.spec.ts, src/color/transform.ts                                        |                                            |
| 20.1.2.3.32 srgbClr (RGB Color Model - Hex Variant)                        | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/context-factory.ts                             |                                            |
| 20.1.2.3.33 sysClr (System Color)                                          | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/context-factory.ts                             |                                            |
| 20.1.2.3.34 tint (Tint)                                                    | [x]    | src/color/transform.spec.ts, src/color/transform.ts                                        |                                            |

### 20.1.3 Audio and Video

| Item                                         | Status | Implementation                                                            | Notes |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------- | ----- |
| 20.1.3 Audio and Video                       | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/domain/shape.ts      |       |
| 20.1.3.1 audioCd (Audio from CD)             | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/domain/shape.ts      |       |
| 20.1.3.2 audioFile (Audio from File)         | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/domain/shape.ts      |       |
| 20.1.3.3 end (Audio End Time)                | [x]    | src/pptx/animation/effects.ts, src/pptx/core/connection-site.ts           |       |
| 20.1.3.4 quickTimeFile (QuickTime from File) | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/domain/shape.ts      |       |
| 20.1.3.5 st (Audio Start Time)               | [x]    | src/pptx/ooxml/presentationml.ts, src/pptx/parser/timing-parser/target.ts |       |
| 20.1.3.6 videoFile (Video from File)         | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/domain/shape.ts      |       |
| 20.1.3.7 wavAudioFile (Audio from WAV File)  | [x]    | src/pptx/parser/shape-parser/non-visual.ts, src/pptx/domain/shape.ts      |       |

### 20.1.4 Styles

| Item                                                   | Status | Implementation                                                        | Notes                       |
| ------------------------------------------------------ | ------ | --------------------------------------------------------------------- | --------------------------- |
| 20.1.4 Styles                                          | [x]    | src/pptx                                                              | covered across sub-sections |
| 20.1.4.1 Styles                                        | [x]    | src/pptx                                                              | covered across sub-sections |
| 20.1.4.1.1 accent1 (Accent 1)                          | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-types.ts            |                             |
| 20.1.4.1.2 accent2 (Accent 2)                          | [x]    | src/pptx/domain/slide.ts, src/pptx/integration/context-adapter.ts     |                             |
| 20.1.4.1.3 accent3 (Accent 3)                          | [x]    | src/pptx/domain/slide.ts, src/pptx/integration/context-adapter.ts     |                             |
| 20.1.4.1.4 accent4 (Accent 4)                          | [x]    | src/pptx/domain/slide.ts, src/pptx/integration/context-adapter.ts     |                             |
| 20.1.4.1.5 accent5 (Accent 5)                          | [x]    | src/pptx/domain/slide.ts, src/pptx/integration/context-adapter.ts     |                             |
| 20.1.4.1.6 accent6 (Accent 6)                          | [x]    | src/pptx/domain/slide.ts, src/pptx/integration/context-adapter.ts     |                             |
| 20.1.4.1.7 bgFillStyleLst (Background Fill Style List) | [x]    | src/pptx/core/background.spec.ts, src/pptx/core/background.ts         |                             |
| 20.1.4.1.8 custClr (Custom color)                      | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts            |                             |
| 20.1.4.1.9 dk1 (Dark 1)                                | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-types.ts            |                             |
| 20.1.4.1.10 dk2 (Dark 2)                               | [x]    | src/pptx/color/solid-fill.ts, src/pptx/integration/context-adapter.ts |                             |
| 20.1.4.1.11 effectStyle (Effect Style)                 | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/parser/shape-parser/sp.ts |                             |
| 20.1.4.1.12 effectStyleLst (Effect Style List)         | [x]    | src/pptx/core/context-factory.ts                                      |                             |
| 20.1.4.1.13 fillStyleLst (Fill Style List)             | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts            |                             |
| 20.1.4.1.14 fmtScheme (Format Scheme)                  | [x]    | src/pptx/core/context-factory.ts                                      |                             |
| 20.1.4.1.15 folHlink (Followed Hyperlink)              | [x]    | src/pptx/domain/slide.ts, src/pptx/integration/context-adapter.ts     |                             |
| 20.1.4.1.16 font (Font)                                | [x]    | src/pptx/core/color-types.ts, src/pptx/core/context-factory.ts        |                             |
| 20.1.4.1.17 fontRef (Font Reference)                   | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/context.ts                  |                             |
| 20.1.4.1.18 fontScheme (Font Scheme)                   | [x]    | src/pptx/core/color-types.ts, src/pptx/core/context-factory.ts        |                             |
| 20.1.4.1.19 hlink (Hyperlink)                          | [x]    | src/pptx/domain/slide.ts, src/pptx/integration/context-adapter.ts     |                             |
| 20.1.4.1.20 lnDef (Line Default)                       | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts            |                             |
| 20.1.4.1.21 lnStyleLst (Line Style List)               | [x]    | src/pptx/core/context-factory.ts                                      |                             |
| 20.1.4.1.22 lt1 (Light 1)                              | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-types.ts            |                             |
| 20.1.4.1.23 lt2 (Light 2)                              | [x]    | src/pptx/color/solid-fill.ts, src/pptx/integration/context-adapter.ts |                             |
| 20.1.4.1.24 majorFont (Major Font)                     | [x]    | src/pptx/core/color-types.ts, src/pptx/core/context-factory.ts        |                             |
| 20.1.4.1.25 minorFont (Minor fonts)                    | [x]    | src/pptx/core/color-types.ts, src/pptx/core/context-factory.ts        |                             |
| 20.1.4.1.26 scene3d (3D Scene Properties)              | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/diagram-parser.spec.ts      |                             |
| 20.1.4.1.27 spDef (Shape Default)                      | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts            |                             |
| 20.1.4.1.28 txDef (Text Default)                       | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts            |                             |
| 20.1.4.2 Table Styles                                  | [x]    | src/pptx                                                              | covered across sub-sections |
| 20.1.4.2.1 band1H (Band 1 Horizontal)                  | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.2 band1V (Band 1 Vertical)                    | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.3 band2H (Band 2 Horizontal)                  | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.4 band2V (Band 2 Vertical)                    | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.5 bevel (Bevel)                               | [x]    | src/pptx/domain/color.ts, src/pptx/domain/shape.ts                    |                             |
| 20.1.4.2.6 bottom (Bottom Border)                      | [x]    | src/css/types.ts, src/pptx/animation/effects.ts                       |                             |
| 20.1.4.2.7 effect (Effect)                             | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects.ts    |                             |
| 20.1.4.2.8 effectRef (Effect Reference)                | [x]    | src/pptx/domain/shape.ts                                              |                             |
| 20.1.4.2.9 fill (Fill)                                 | [x]    | src/color/gradient.ts, src/css/types.ts                               |                             |
| 20.1.4.2.10 fillRef (Fill Reference)                   | [x]    | src/pptx/color/fill.ts, src/pptx/domain/shape.ts                      |                             |
| 20.1.4.2.11 firstCol (First Column)                    | [x]    | src/pptx/domain/table.ts, src/pptx/ooxml/presentationml.ts            |                             |
| 20.1.4.2.12 firstRow (First Row)                       | [x]    | src/pptx/domain/table.ts, src/pptx/ooxml/presentationml.ts            |                             |
| 20.1.4.2.13 font (Font)                                | [x]    | src/pptx/core/color-types.ts, src/pptx/core/context-factory.ts        |                             |
| 20.1.4.2.14 insideH (Inside Horizontal Border)         | [x]    | src/pptx/parser/table-style-parser.ts, src/pptx/domain/table.ts       |                             |
| 20.1.4.2.15 insideV (Inside Vertical Border)           | [x]    | src/pptx/parser/table-style-parser.ts, src/pptx/domain/table.ts       |                             |
| 20.1.4.2.16 lastCol (Last Column)                      | [x]    | src/pptx/domain/table.ts, src/pptx/ooxml/presentationml.ts            |                             |
| 20.1.4.2.17 lastRow (Last Row)                         | [x]    | src/pptx/domain/table.ts, src/pptx/ooxml/presentationml.ts            |                             |
| 20.1.4.2.18 left (Left Border)                         | [x]    | src/css/types.ts, src/pptx/animation/coverage.spec.ts                 |                             |
| 20.1.4.2.19 lnRef (Line Reference)                     | [x]    | src/pptx/domain/shape.ts                                              |                             |
| 20.1.4.2.20 neCell (Northeast Cell)                    | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.21 nwCell (Northwest Cell)                    | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.22 right (Right Border)                       | [x]    | src/css/types.ts, src/pptx/animation/coverage.spec.ts                 |                             |
| 20.1.4.2.23 seCell (Southeast Cell)                    | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.24 swCell (Southwest Cell)                    | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.25 tblBg (Table Background)                   | [x]    | src/pptx/parser/table-style-parser.ts, src/pptx/domain/table.ts       |                             |
| 20.1.4.2.26 tblStyle (Table Style)                     | [x]    | src/pptx/domain/table.ts                                              |                             |
| 20.1.4.2.27 tblStyleLst (Table Style List)             | [x]    | src/pptx/parser/table-style-parser.ts                                 |                             |
| 20.1.4.2.28 tcBdr (Table Cell Borders)                 | [x]    | src/pptx/parser/table-style-parser.ts, src/pptx/domain/table.ts       |                             |
| 20.1.4.2.29 tcStyle (Table Cell Style)                 | [x]    | src/pptx/parser/table-style-parser.ts                                 |                             |
| 20.1.4.2.30 tcTxStyle (Table Cell Text Style)          | [x]    | src/pptx/parser/table-style-parser.ts                                 |                             |
| 20.1.4.2.31 tl2br (Top Left to Bottom Right Border)    | [x]    | src/pptx/parser/table-style-parser.ts, src/pptx/domain/table.ts       |                             |
| 20.1.4.2.32 top (Top Border)                           | [x]    | src/css/types.ts, src/pptx/animation/effects-visual.spec.ts           |                             |
| 20.1.4.2.33 tr2bl (Top Right to Bottom Left Border)    | [x]    | src/pptx/parser/table-style-parser.ts, src/pptx/domain/table.ts       |                             |
| 20.1.4.2.34 wholeTbl (Whole Table)                     | [x]    | src/pptx/domain/table.ts                                              |                             |

### 20.1.5 3D

| Item                                       | Status | Implementation                                                                 | Notes                       |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------ | --------------------------- |
| 20.1.5 3D                                  | [x]    | src/pptx                                                                       | covered across sub-sections |
| 20.1.5.1 anchor (Anchor Point)             | [x]    | src/pptx/domain/table.ts, src/pptx/domain/types.ts                             |                             |
| 20.1.5.2 backdrop (Backdrop Plane)         | [x]    | src/pptx/domain/shape.ts                                                       |                             |
| 20.1.5.3 bevelB (Bottom Bevel)             | [x]    | src/pptx/domain/shape.ts, src/pptx/render/svg/effects3d.ts                     |                             |
| 20.1.5.4 bevelT (Top Bevel)                | [x]    | src/pptx/domain/shape.ts, src/pptx/render/svg/effects3d.ts                     |                             |
| 20.1.5.5 camera (Camera)                   | [x]    | src/pptx/domain/shape.ts, src/pptx/ooxml/drawingml.ts                          |                             |
| 20.1.5.6 contourClr (Contour Color)        | [x]    | src/pptx/parser/shape-parser/three-d.ts, src/pptx/domain/shape.ts              |                             |
| 20.1.5.7 extrusionClr (Extrusion Color)    | [x]    | src/pptx/parser/shape-parser/three-d.ts, src/pptx/domain/shape.ts              |                             |
| 20.1.5.8 flatTx (No text in 3D scene)      | [x]    | src/pptx/parser/shape-parser/three-d.ts, src/pptx/domain/shape.ts              |                             |
| 20.1.5.9 lightRig (Light Rig)              | [x]    | src/pptx/domain/shape.ts, src/pptx/domain/table.ts                             |                             |
| 20.1.5.10 norm (Normal)                    | [x]    | src/pptx/core/guide-engine.spec.ts, src/pptx/core/guide-engine.ts              |                             |
| 20.1.5.11 rot (Rotation)                   | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                            |                             |
| 20.1.5.12 sp3d (Apply 3D shape properties) | [x]    | src/pptx/domain/shape.ts, src/pptx/render/svg/effects3d.ts                     |                             |
| 20.1.5.13 up (Up Vector)                   | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects-visual.spec.ts |                             |

### 20.1.6 Shared Style Sheet

| Item                                                 | Status | Implementation                                                                                                                                                | Notes                       |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 20.1.6 Shared Style Sheet                            | [x]    | src/pptx                                                                                                                                                      | covered across sub-sections |
| 20.1.6.1 clrMap (Color Map)                          | [x]    | src/pptx/core/context-factory.ts, src/pptx/domain/slide.ts                                                                                                    |                             |
| 20.1.6.2 clrScheme (Color Scheme)                    | [x]    | src/pptx/core/context-factory.ts                                                                                                                              |                             |
| 20.1.6.3 custClrLst (Custom Color List)              | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts                                                                                                    |                             |
| 20.1.6.4 extraClrScheme (Extra Color Scheme)         | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts                                                                                                    |                             |
| 20.1.6.5 extraClrSchemeLst (Extra Color Scheme List) | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts                                                                                                    |                             |
| 20.1.6.6 masterClrMapping (Master Color Mapping)     | [x]    | src/pptx/parser/slide-parser.ts                                                                                                                               |                             |
| 20.1.6.7 objectDefaults (Object Defaults)            | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts                                                                                                    |                             |
| 20.1.6.8 overrideClrMapping (Override Color Mapping) | [x]    | src/pptx/parser/slide-parser.ts                                                                                                                               |                             |
| 20.1.6.9 theme (Theme)                               | [x]    | src/color/transform.spec.ts, src/pptx-cli.ts                                                                                                                  |                             |
| 20.1.6.10 themeElements (Theme Elements)             | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts                                                                                                    |                             |
| 20.1.6.11 themeManager (Theme Manager)               | [x]    | src/pptx/core/context-factory.ts, src/pptx/core/context.ts                                                                                                    |                             |
| 20.1.6.12 themeOverride (Theme Override)             | [x]    | src/pptx/reader/slide/loader.ts, src/pptx/reader/slide/factory.ts, src/pptx/core/context-factory.ts, src/pptx/core/context.ts, src/pptx/core/content-types.ts |                             |

### 20.1.7 Coordinate Systems and Transformations

| Item                                                | Status | Implementation                                                                    | Notes                       |
| --------------------------------------------------- | ------ | --------------------------------------------------------------------------------- | --------------------------- |
| 20.1.7 Coordinate Systems and Transformations       | [x]    | src/pptx                                                                          | covered across sub-sections |
| 20.1.7.1 chExt (Child Extents)                      | [x]    | src/pptx/domain/types.ts, src/pptx/parser/transform-parser.ts                     |                             |
| 20.1.7.2 chOff (Child Offset)                       | [x]    | src/pptx/domain/types.ts, src/pptx/parser/transform-parser.ts                     |                             |
| 20.1.7.3 ext (Extents)                              | [x]    | src/pptx/integration/content-enricher.ts, src/pptx/integration/context-adapter.ts |                             |
| 20.1.7.4 off (Offset)                               | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/ooxml/ecma376.ts                         |                             |
| 20.1.7.5 xfrm (2D Transform for Grouped Objects)    | [x]    | src/pptx/core/connection-site.ts, src/pptx/core/render-options.ts                 |                             |
| 20.1.7.6 xfrm (2D Transform for Individual Objects) | [x]    | src/pptx/core/connection-site.ts, src/pptx/core/render-options.ts                 |                             |

### 20.1.8 Shape Fills, Effects, and Line Properties

| Item                                               | Status | Implementation                                                                 | Notes                       |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------ | --------------------------- |
| 20.1.8 Shape Fills, Effects, and Line Properties   | [x]    | src/pptx                                                                       | covered across sub-sections |
| 20.1.8.1 alphaBiLevel (Alpha Bi-Level Effect)      | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.2 alphaCeiling (Alpha Ceiling Effect)       | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.3 alphaFloor (Alpha Floor Effect)           | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.4 alphaInv (Alpha Inverse Effect)           | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.5 alphaMod (Alpha Modulate Effect)          | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.6 alphaModFix (Alpha Modulate Fixed Effect) | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.7 alphaOutset (Alpha Inset/Outset Effect)   | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.8 alphaRepl (Alpha Replace Effect)          | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.9 bevel (Line Join Bevel)                   | [x]    | src/pptx/domain/color.ts, src/pptx/domain/shape.ts                             |                             |
| 20.1.8.10 bgClr (Background color)                 | [x]    | src/pptx/color/fill.ts, src/pptx/parser/fill-parser.ts                         |                             |
| 20.1.8.11 biLevel (Bi-Level (Black/White) Effect)  | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.12 blend (Blend Effect)                     | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.13 blip (Blip)                              | [x]    | src/pptx/color/fill.ts, src/pptx/domain/text.ts                                |                             |
| 20.1.8.14 blipFill (Picture Fill)                  | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                            |                             |
| 20.1.8.15 blur (Blur Effect)                       | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects.spec.ts        |                             |
| 20.1.8.16 clrChange (Color Change Effect)          | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.17 clrFrom (Change Color From)              | [x]    | src/pptx/parser/effects-parser.ts                                              |                             |
| 20.1.8.18 clrRepl (Solid Color Replacement)        | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.19 clrTo (Change Color To)                  | [x]    | src/pptx/parser/effects-parser.ts                                              |                             |
| 20.1.8.20 cont (Effect Container)                  | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.21 custDash (Custom Dash)                   | [x]    | src/pptx/domain/color.ts, src/pptx/parser/line-parser.ts                       |                             |
| 20.1.8.22 ds (Dash Stop)                           | [x]    | src/pptx/parser/line-parser.ts                                                 |                             |
| 20.1.8.23 duotone (Duotone Effect)                 | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.24 effect (Effect)                          | [x]    | src/pptx/animation/coverage.spec.ts, src/pptx/animation/effects.ts             |                             |
| 20.1.8.25 effectDag (Effect Container)             | [x]    | src/pptx/parser/effects-parser.spec.ts, src/pptx/parser/effects-parser.ts      |                             |
| 20.1.8.26 effectLst (Effect Container)             | [x]    | src/pptx/parser/diagram-parser.spec.ts, src/pptx/parser/effects-parser.spec.ts |                             |
| 20.1.8.27 fgClr (Foreground color)                 | [x]    | src/pptx/color/fill.ts, src/pptx/parser/fill-parser.ts                         |                             |
| 20.1.8.28 fill (Fill)                              | [x]    | src/color/gradient.ts, src/css/types.ts                                        |                             |
| 20.1.8.29 fillOverlay (Fill Overlay Effect)        | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.30 fillRect (Fill Rectangle)                | [x]    | src/pptx/domain/color.ts, src/pptx/parser/fill-parser.spec.ts                  |                             |
| 20.1.8.31 fillToRect (Fill To Rectangle)           | [x]    | src/pptx/color/fill.ts, src/pptx/color/types.ts                                |                             |
| 20.1.8.32 glow (Glow Effect)                       | [x]    | src/pptx/domain/chart.ts, src/pptx/domain/text.ts                              |                             |
| 20.1.8.33 gradFill (Gradient Fill)                 | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                            |                             |
| 20.1.8.34 grayscl (Gray Scale Effect)              | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.35 grpFill (Group Fill)                     | [x]    | src/pptx/color/fill.ts, src/pptx/domain/color.ts                               |                             |
| 20.1.8.36 gs (Gradient stops)                      | [x]    | src/pptx/domain/color.ts, src/pptx/parser/color-parser.spec.ts                 |                             |
| 20.1.8.37 gsLst (Gradient Stop List)               | [x]    | src/pptx/color/fill.ts, src/pptx/parser/fill-parser.spec.ts                    |                             |
| 20.1.8.38 headEnd (Line Head/End Style)            | [x]    | src/pptx/domain/color.ts, src/pptx/parser/line-parser.spec.ts                  |                             |
| 20.1.8.39 hsl (Hue Saturation Luminance Effect)    | [x]    | src/color/convert.ts, src/pptx/color/solid-fill.ts                             |                             |
| 20.1.8.40 innerShdw (Inner Shadow Effect)          | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/render/svg/effects.spec.ts         |                             |
| 20.1.8.41 lin (Linear Gradient Fill)               | [x]    | src/pptx/color/fill.ts, src/pptx/domain/color.ts                               |                             |
| 20.1.8.42 lum (Luminance Effect)                   | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/color-resolver.ts                  |                             |
| 20.1.8.43 miter (Miter Line Join)                  | [x]    | src/pptx/domain/color.ts, src/pptx/domain/types.ts                             |                             |
| 20.1.8.44 noFill (No Fill)                         | [x]    | src/pptx/domain/color.ts, src/pptx/domain/text.ts                              |                             |
| 20.1.8.45 outerShdw (Outer Shadow Effect)          | [x]    | src/pptx/domain/types.ts, src/pptx/parser/diagram-parser.spec.ts               |                             |
| 20.1.8.46 path (Path Gradient)                     | [x]    | src/files/index.ts, src/files/path.ts                                          |                             |
| 20.1.8.47 pattFill (Pattern Fill)                  | [x]    | src/pptx/color/fill.ts, src/pptx/domain/color.ts                               |                             |
| 20.1.8.48 prstDash (Preset Dash)                   | [x]    | src/pptx/parser/line-parser.spec.ts, src/pptx/parser/line-parser.ts            |                             |
| 20.1.8.49 prstShdw (Preset Shadow)                 | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.50 reflection (Reflection Effect)           | [x]    | src/pptx/domain/types.ts, src/pptx/parser/effects-parser.spec.ts               |                             |
| 20.1.8.51 relOff (Relative Offset Effect)          | [x]    | src/pptx/parser/effects-parser.ts, src/pptx/domain/types.ts                    |                             |
| 20.1.8.52 round (Round Line Join)                  | [x]    | src/color/convert.ts, src/color/transform.ts                                   |                             |
| 20.1.8.53 softEdge (Soft Edge Effect)              | [x]    | src/pptx/domain/chart.ts, src/pptx/domain/types.ts                             |                             |
| 20.1.8.54 solidFill (Solid Fill)                   | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/background.spec.ts                 |                             |
| 20.1.8.55 srcRect (Source Rectangle)               | [x]    | src/pptx/parser/diagram-parser.spec.ts, src/pptx/parser/fill-parser.ts         |                             |
| 20.1.8.56 stretch (Stretch)                        | [x]    | src/css/types.ts, src/pptx/core/background.spec.ts                             |                             |
| 20.1.8.57 tailEnd (Tail line end style)            | [x]    | src/pptx/domain/color.ts, src/pptx/parser/line-parser.spec.ts                  |                             |
| 20.1.8.58 tile (Tile)                              | [x]    | src/pptx/core/background.ts, src/pptx/core/types.ts                            |                             |
| 20.1.8.59 tileRect (Tile Rectangle)                | [x]    | src/pptx/domain/color.ts, src/pptx/parser/fill-parser.spec.ts                  |                             |
| 20.1.8.60 tint (Tint Effect)                       | [x]    | src/color/transform.spec.ts, src/color/transform.ts                            |                             |
| 20.1.8.61 xfrm (Transform Effect)                  | [x]    | src/pptx/core/connection-site.ts, src/pptx/core/render-options.ts              |                             |

### 20.1.9 Shape Definitions and Attributes

| Item                                                 | Status | Implementation                                                                  | Notes                       |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------- | --------------------------- |
| 20.1.9 Shape Definitions and Attributes              | [x]    | src/pptx                                                                        | covered across sub-sections |
| 20.1.9.1 ahLst (List of Shape Adjust Handles)        | [x]    | src/pptx/parser/geometry-parser.ts, src/pptx/domain/shape.ts                    |                             |
| 20.1.9.2 ahPolar (Polar Adjust Handle)               | [x]    | src/pptx/parser/geometry-parser.ts, src/pptx/domain/shape.ts                    |                             |
| 20.1.9.3 ahXY (XY Adjust Handle)                     | [x]    | src/pptx/parser/geometry-parser.ts, src/pptx/domain/shape.ts                    |                             |
| 20.1.9.4 arcTo (Draw Arc To)                         | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/diagram-parser.spec.ts                |                             |
| 20.1.9.5 avLst (List of Shape Adjust Values)         | [x]    | src/pptx/parser/geometry-parser.spec.ts, src/pptx/parser/geometry-parser.ts     |                             |
| 20.1.9.6 close (Close Shape Path)                    | [x]    | src/color/transform.spec.ts, src/pptx/domain/shape.ts                           |                             |
| 20.1.9.7 cubicBezTo (Draw Cubic Bezier Curve To)     | [x]    | src/pptx/parser/diagram-parser.spec.ts, src/pptx/parser/geometry-parser.spec.ts |                             |
| 20.1.9.8 custGeom (Custom Geometry)                  | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/diagram-parser.spec.ts                |                             |
| 20.1.9.9 cxn (Shape Connection Site)                 | [x]    | src/pptx/core/connection-site.spec.ts, src/pptx/core/connection-site.ts         |                             |
| 20.1.9.10 cxnLst (List of Shape Connection Sites)    | [x]    | src/pptx/core/connection-site.ts, src/pptx/parser/geometry-parser.ts            |                             |
| 20.1.9.11 gd (Shape Guide)                           | [x]    | src/pptx/core/guide-engine.spec.ts, src/pptx/core/guide-engine.ts               |                             |
| 20.1.9.12 gdLst (List of Shape Guides)               | [x]    | src/pptx/parser/geometry-parser.ts                                              |                             |
| 20.1.9.13 lnTo (Draw Line To)                        | [x]    | src/pptx/parser/geometry-parser.ts, src/pptx/domain/shape.ts                    |                             |
| 20.1.9.14 moveTo (Move Path To)                      | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/geometry-parser.spec.ts               |                             |
| 20.1.9.15 path (Shape Path)                          | [x]    | src/files/index.ts, src/files/path.ts                                           |                             |
| 20.1.9.16 pathLst (List of Shape Paths)              | [x]    | src/pptx/parser/geometry-parser.spec.ts, src/pptx/parser/geometry-parser.ts     |                             |
| 20.1.9.17 pos (Shape Position Coordinate)            | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                             |                             |
| 20.1.9.18 prstGeom (Preset geometry)                 | [x]    | src/pptx/core/connection-site.ts, src/pptx/core/text-rect.ts                    |                             |
| 20.1.9.19 prstTxWarp (Preset Text Warp)              | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.spec.ts                    |                             |
| 20.1.9.20 pt (Shape Path Point)                      | [x]    | src/css/builder.ts, src/pptx/core/ecma376-defaults.ts                           |                             |
| 20.1.9.21 quadBezTo (Draw Quadratic Bezier Curve To) | [x]    | src/pptx/parser/diagram-parser.spec.ts, src/pptx/parser/geometry-parser.spec.ts |                             |
| 20.1.9.22 rect (Shape Text Rectangle)                | [x]    | src/pptx/color/fill.ts, src/pptx/color/types.ts                                 |                             |

### 20.1.10 Simple Types — p.2913

| Item                                                                           | Status | Implementation                                                                                                                                                                              | Notes                       |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 20.1.10 Simple Types                                                           | [x]    | src/pptx                                                                                                                                                                                    | covered across sub-sections |
| 20.1.10.1 ST_AdjAngle (Adjustable Angle Methods)                               | [x]    | src/pptx/parser/geometry-parser.ts, src/pptx/domain/shape.ts                                                                                                                                |                             |
| 20.1.10.2 ST_AdjCoordinate (Adjustable Coordinate Methods)                     | [x]    | src/pptx/core/text-rect.ts                                                                                                                                                                  |                             |
| 20.1.10.3 ST_Angle (Angle)                                                     | [x]    | src/pptx/core/guide-engine.ts, src/pptx/parser/primitive.ts                                                                                                                                 |                             |
| 20.1.10.4 ST_AnimationBuildType (Animation Build Type)                         | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts, src/pptx/parser/timing-parser/build-list.ts                                                                         |                             |
| 20.1.10.5 ST_AnimationChartBuildType (Chart Animation Build Type)              | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts                                                                                                                      |                             |
| 20.1.10.6 ST_AnimationChartOnlyBuildType (Chart only Animation Types)          | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts                                                                                                                      |                             |
| 20.1.10.7 ST_AnimationDgmBuildType (Diagram Animation Build Type)              | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts                                                                                                                      |                             |
| 20.1.10.8 ST_AnimationDgmOnlyBuildType (Diagram only Animation Types)          | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts                                                                                                                      |                             |
| 20.1.10.9 ST_BevelPresetType (Bevel Presets)                                   | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser/three-d.ts                                                                                                                           |                             |
| 20.1.10.10 ST_BlackWhiteMode (Black and White Mode)                            | [x]    | src/pptx/domain/types.ts, src/pptx/parser/primitive.ts                                                                                                                                      |                             |
| 20.1.10.11 ST_BlendMode (Blend Mode)                                           | [x]    | src/pptx/domain/types.ts, src/pptx/parser/effects-parser.ts                                                                                                                                 |                             |
| 20.1.10.12 ST_BlipCompression (Blip Compression Type)                          | [x]    | src/pptx/domain/types.ts, src/pptx/parser/primitive.ts, src/pptx/parser/fill-parser.ts, src/pptx/parser/shape-parser/pic.ts                                                                 |                             |
| 20.1.10.13 ST_ChartBuildStep (Chart Animation Build Step)                      | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts                                                                                                                      |                             |
| 20.1.10.14 ST_ColorSchemeIndex (Theme Color Reference)                         | [x]    | src/pptx/domain/types.ts, src/pptx/parser/primitive.ts                                                                                                                                      |                             |
| 20.1.10.15 ST_CompoundLine (Compound Line Type)                                | [x]    | src/pptx/domain/types.ts, src/pptx/parser/line-parser.spec.ts                                                                                                                               |                             |
| 20.1.10.16 ST_Coordinate (Coordinate)                                          | [x]    | src/pptx/core/ecma376-defaults.ts, src/pptx/core/unit-conversion.ts                                                                                                                         |                             |
| 20.1.10.17 ST_Coordinate32 (Coordinate Point)                                  | [x]    | src/pptx/core/ecma376-defaults.ts, src/pptx/parser/primitive.ts                                                                                                                             |                             |
| 20.1.10.18 ST_Coordinate32Unqualified (Coordinate Point)                       | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.19 ST_CoordinateUnqualified (Coordinate)                               | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.20 ST_DgmBuildStep (Diagram Animation Build Steps)                     | [x]    | src/pptx/domain/animation.ts, src/pptx/parser/timing-parser/mapping.ts                                                                                                                      |                             |
| 20.1.10.21 ST_DrawingElementId (Drawing Element ID)                            | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.22 ST_EffectContainerType (Effect Container Type)                      | [x]    | src/pptx/domain/types.ts, src/pptx/parser/effects-parser.ts                                                                                                                                 |                             |
| 20.1.10.23 ST_FixedAngle (Fixed Angle)                                         | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.24 ST_FixedPercentage (Fixed Percentage)                               | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.25 ST_FontCollectionIndex (Font Collection Index)                      | [x]    | src/pptx/domain/types.ts, src/pptx/parser/primitive.ts, src/pptx/parser/shape-parser/style.ts                                                                                               |                             |
| 20.1.10.26 ST_FOVAngle (Field of View Angle)                                   | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.27 ST_GeomGuideFormula (Geometry Guide Formula Properties)             | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/geometry-parser.ts                                                                                                                                |                             |
| 20.1.10.28 ST_GeomGuideName (Geometry Guide Name Properties)                   | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/geometry-parser.ts                                                                                                                                |                             |
| 20.1.10.29 ST_LightRigDirection (Light Rig Direction)                          | [x]    | src/pptx/domain/types.ts, src/pptx/domain/shape.ts                                                                                                                                          |                             |
| 20.1.10.30 ST_LightRigType (Light Rig Type)                                    | [x]    | src/pptx/domain/types.ts, src/pptx/domain/shape.ts                                                                                                                                          |                             |
| 20.1.10.31 ST_LineCap (End Line Cap)                                           | [x]    | src/pptx/domain/types.ts, src/pptx/parser/line-parser.spec.ts                                                                                                                               |                             |
| 20.1.10.32 ST_LineEndLength (Line End Length)                                  | [x]    | src/pptx/parser/line-parser.spec.ts, src/pptx/parser/line-parser.ts                                                                                                                         |                             |
| 20.1.10.33 ST_LineEndType (Line End Type)                                      | [x]    | src/pptx/domain/types.ts, src/pptx/parser/line-parser.spec.ts                                                                                                                               |                             |
| 20.1.10.34 ST_LineEndWidth (Line End Width)                                    | [x]    | src/pptx/domain/types.ts, src/pptx/parser/line-parser.spec.ts                                                                                                                               |                             |
| 20.1.10.35 ST_LineWidth (Line Width)                                           | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/line-parser.ts                                                                                                                                |                             |
| 20.1.10.36 ST_OnOffStyleType (On/Off Style Type)                               | [x]    | src/pptx/domain/types.ts, src/pptx/parser/primitive.ts                                                                                                                                      |                             |
| 20.1.10.37 ST_PathFillMode (Path Fill Mode)                                    | [x]    | src/pptx/parser/geometry-parser.ts                                                                                                                                                          |                             |
| 20.1.10.38 ST_PathShadeType (Path Shade Type)                                  | [x]    | src/pptx/domain/color.ts, src/pptx/parser/fill-parser.ts                                                                                                                                    |                             |
| 20.1.10.39 ST_PenAlignment (Alignment Type)                                    | [x]    | src/pptx/parser/line-parser.spec.ts, src/pptx/parser/line-parser.ts                                                                                                                         |                             |
| 20.1.10.40 ST_Percentage (Percentage)                                          | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.41 ST_PitchFamily (Pitch Family)                                       | [x]    | src/pptx/parser/text-parser.ts, src/pptx/domain/text.ts                                                                                                                                     |                             |
| 20.1.10.42 ST_PositiveCoordinate (Positive Coordinate)                         | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.43 ST_PositiveCoordinate32 (Positive Coordinate Point)                 | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.44 ST_PositiveFixedAngle (Positive Fixed Angle)                        | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.45 ST_PositiveFixedPercentage (Positive Fixed Percentage)              | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.46 ST_PositivePercentage (Positive Percentage Value with Sign)         | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.47 ST_PresetCameraType (Preset Camera Type)                            | [x]    | src/pptx/domain/types.ts, src/pptx/domain/shape.ts                                                                                                                                          |                             |
| 20.1.10.48 ST_PresetColorVal (Preset Color Value)                              | [x]    | src/pptx/core/color-resolver.ts                                                                                                                                                             |                             |
| 20.1.10.49 ST_PresetLineDashVal (Preset Line Dash Value)                       | [x]    | src/pptx/domain/types.ts, src/pptx/render/components/chart/line-style.ts                                                                                                                    |                             |
| 20.1.10.50 ST_PresetMaterialType (Preset Material Type)                        | [x]    | src/pptx/domain/types.ts, src/pptx/domain/shape.ts, src/pptx/parser/shape-parser/three-d.ts                                                                                                 |                             |
| 20.1.10.51 ST_PresetPatternVal (Preset Pattern Value)                          | [x]    | src/pptx/domain/color.ts                                                                                                                                                                    |                             |
| 20.1.10.52 ST_PresetShadowVal (Preset Shadow Type)                             | [x]    | src/pptx/domain/types.ts, src/pptx/parser/effects-parser.ts                                                                                                                                 |                             |
| 20.1.10.53 ST_RectAlignment (Rectangle Alignments)                             | [x]    | src/pptx/domain/types.ts, src/pptx/domain/color.ts, src/pptx/parser/primitive.ts, src/pptx/parser/fill-parser.ts, src/pptx/parser/shape-parser/pic.ts                                       |                             |
| 20.1.10.54 ST_SchemeColorVal (Scheme Color)                                    | [x]    | src/pptx/domain/types.ts, src/pptx/domain/color.ts, src/pptx/parser/primitive.ts, src/pptx/parser/color-parser.ts                                                                           |                             |
| 20.1.10.55 ST_ShapeID (Shape ID)                                               | [x]    | src/pptx/domain/types.ts, src/pptx/parser/primitive.ts, src/pptx/parser/timing-parser/build-list.ts, src/pptx/parser/timing-parser/target.ts, src/pptx/parser/shape-parser/graphic-frame.ts |                             |
| 20.1.10.56 ST_ShapeType (Preset Shape Types)                                   | [x]    | src/pptx/domain/types.ts, src/pptx/render/svg/geometry.spec.ts                                                                                                                              |                             |
| 20.1.10.57 ST_StyleMatrixColumnIndex (Style Matrix Column Index)               | [x]    | src/pptx/domain/types.ts, src/pptx/parser/primitive.ts, src/pptx/parser/shape-parser/style.ts                                                                                               |                             |
| 20.1.10.58 ST_SystemColorVal (System Color Value)                              | [x]    | src/pptx/core/color-resolver.ts                                                                                                                                                             |                             |
| 20.1.10.59 ST_TextAlignType (Text Alignment Types)                             | [x]    | src/pptx/domain/types.ts, src/pptx/parser/text-parser.spec.ts                                                                                                                               |                             |
| 20.1.10.60 ST_TextAnchoringType (Text Anchoring Types)                         | [x]    | src/pptx/domain/table.ts, src/pptx/domain/text.ts                                                                                                                                           |                             |
| 20.1.10.61 ST_TextAutonumberScheme (Text Auto-number Schemes)                  | [x]    | src/pptx/render/text-layout/adapter.ts, src/pptx/utils/auto-number.spec.ts                                                                                                                  |                             |
| 20.1.10.62 ST_TextBulletSizePercent (Bullet Size Percentage)                   | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver/bullet.ts                                                                                 |                             |
| 20.1.10.63 ST_TextBulletStartAtNum (Start Bullet At Number)                    | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver/bullet.ts                                                                                 |                             |
| 20.1.10.64 ST_TextCapsType (Text Cap Types)                                    | [x]    | src/pptx/domain/types.ts, src/pptx/parser/text-parser.ts                                                                                                                                    |                             |
| 20.1.10.65 ST_TextColumnCount (Text Column Count)                              | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts                                                                                                                                |                             |
| 20.1.10.66 ST_TextFontAlignType (Font Alignment Types)                         | [x]    | src/pptx/parser/text-parser.spec.ts, src/pptx/parser/text-parser.ts                                                                                                                         |                             |
| 20.1.10.67 ST_TextFontScalePercentOrPercentString (Text Font Scale Percentage) | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts                                                                                                                                |                             |
| 20.1.10.68 ST_TextFontSize (Text Font Size)                                    | [x]    | src/pptx/core/ecma376-defaults.ts, src/pptx/parser/text-style-resolver/font-size.ts                                                                                                         |                             |
| 20.1.10.69 ST_TextHorzOverflowType (Text Horizontal Overflow Types)            | [x]    | src/pptx/domain/table.ts, src/pptx/parser/text-parser.ts                                                                                                                                    |                             |
| 20.1.10.70 ST_TextIndent (Text Indentation)                                    | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver/margin.ts                                                                                 |                             |
| 20.1.10.71 ST_TextIndentLevelType (Text Indent Level Type)                     | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts                                                                                                                                |                             |
| 20.1.10.72 ST_TextMargin (Text Margin)                                         | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver/margin.ts                                                                                 |                             |
| 20.1.10.73 ST_TextNonNegativePoint (Text Non-Negative Point)                   | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts                                                                                                                                |                             |
| 20.1.10.74 ST_TextPoint (Text Point)                                           | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts                                                                                                                                |                             |
| 20.1.10.75 ST_TextPointUnqualified (Text Point)                                | [x]    | src/pptx/parser/primitive.ts                                                                                                                                                                |                             |
| 20.1.10.76 ST_TextShapeType (Preset Text Shape Types)                          | [x]    | src/pptx/domain/types.ts, src/pptx/domain/text.ts, src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts                                                                             |                             |
| 20.1.10.77 ST_TextSpacingPercentOrPercentString (Text Spacing Percent)         | [x]    | src/pptx/color/solid-fill.ts, src/pptx/core/ecma376-defaults.ts                                                                                                                             |                             |
| 20.1.10.78 ST_TextSpacingPoint (Text Spacing Point)                            | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver/spacing.ts                                                                                |                             |
| 20.1.10.79 ST_TextStrikeType (Text Strike Type)                                | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.ts                                                                                                                                     |                             |
| 20.1.10.80 ST_TextTabAlignType (Text Tab Alignment Types)                      | [x]    | src/pptx/parser/text-parser.spec.ts, src/pptx/parser/text-parser.ts                                                                                                                         |                             |
| 20.1.10.81 ST_TextTypeface (Text Typeface)                                     | [x]    | src/pptx/domain/types.ts, src/pptx/domain/text.ts                                                                                                                                           |                             |
| 20.1.10.82 ST_TextUnderlineType (Text Underline Types)                         | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.ts                                                                                                                                     |                             |
| 20.1.10.83 ST_TextVerticalType (Vertical Text Types)                           | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.ts                                                                                                                                     |                             |
| 20.1.10.84 ST_TextVertOverflowType (Text Vertical Overflow)                    | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.ts                                                                                                                                     |                             |
| 20.1.10.85 ST_TextWrappingType (Text Wrapping Types)                           | [x]    | src/pptx/domain/text.ts, src/pptx/parser/text-parser.ts                                                                                                                                     |                             |
| 20.1.10.86 ST_TileFlipMode (Tile Flip Mode)                                    | [x]    | src/pptx/domain/color.ts                                                                                                                                                                    |                             |
| 20.1.10.87 ST_TextBulletSize (Bullet Size Percentage)                          | [x]    | src/pptx/parser/primitive.ts, src/pptx/parser/text-parser.ts, src/pptx/parser/text-style-resolver/bullet.ts                                                                                 |                             |

### 20.2 DrawingML - Picture — p.3090

| Item                     | Status | Implementation                                                | Notes |
| ------------------------ | ------ | ------------------------------------------------------------- | ----- |
| 20.2 DrawingML - Picture | [x]    | src/pptx/parser/shape-parser/pic.ts, src/pptx/domain/shape.ts |       |

### 20.2.2 Elements

| Item                                                      | Status | Implementation                                                | Notes |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------- | ----- |
| 20.2.2 Elements                                           | [x]    | src/pptx/parser/shape-parser/pic.ts, src/pptx/domain/shape.ts |       |
| 20.2.2.1 blipFill (Picture Fill)                          | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts           |       |
| 20.2.2.2 cNvPicPr (Non-Visual Picture Drawing Properties) | [x]    | src/pptx/parser/shape-parser/pic.ts                           |       |
| 20.2.2.3 cNvPr (Non-Visual Drawing Properties)            | [x]    | src/pptx/core/node-indexer.ts, src/pptx/domain/shape.ts       |       |
| 20.2.2.4 nvPicPr (Non-Visual Picture Properties)          | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/ooxml/guards.spec.ts |       |
| 20.2.2.5 pic (Picture)                                    | [x]    | src/pptx/core/context.ts, src/pptx/domain/shape.ts            |       |
| 20.2.2.6 spPr (Shape Properties)                          | [x]    | src/pptx/color/fill.ts, src/pptx/domain/chart.ts              |       |

### 20.3 DrawingML - Locked Canvas — p.3097

| Item                           | Status | Implementation                        | Notes |
| ------------------------------ | ------ | ------------------------------------- | ----- |
| 20.3 DrawingML - Locked Canvas | [x]    | src/pptx/parser/shape-parser/index.ts |       |

### 20.3.2 Basics

| Item                                            | Status | Implementation                        | Notes |
| ----------------------------------------------- | ------ | ------------------------------------- | ----- |
| 20.3.2 Basics                                   | [x]    | src/pptx/parser/shape-parser/index.ts |       |
| 20.3.2.1 lockedCanvas (Locked Canvas Container) | [x]    | src/pptx/parser/shape-parser/index.ts |       |

### 20.4 DrawingML - WordprocessingML Drawing — p.3098

| Item                                      | Status | Implementation | Notes                       |
| ----------------------------------------- | ------ | -------------- | --------------------------- |
| 20.4 DrawingML - WordprocessingML Drawing | [x]    | src/pptx       | covered across sub-sections |

### 20.4.2 Elements

| Item                                                                    | Status | Implementation                                                            | Notes                       |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- | --------------------------- |
| 20.4.2 Elements                                                         | [x]    | src/pptx                                                                  | covered across sub-sections |
| 20.4.2.1 align (Relative Horizontal Alignment)                          | [x]    | src/pptx/parser/wp-drawing.ts, src/pptx/parser/primitive.ts               |                             |
| 20.4.2.2 align (Relative Vertical Alignment)                            | [x]    | src/pptx/parser/wp-drawing.ts, src/pptx/parser/primitive.ts               |                             |
| 20.4.2.3 anchor (Anchor for Floating DrawingML Object)                  | [x]    | src/pptx/domain/table.ts, src/pptx/domain/types.ts                        |                             |
| 20.4.2.4 cNvGraphicFramePr (Common DrawingML Non-Visual Properties)     | [x]    | src/pptx/parser/shape-parser/graphic-frame.ts, src/pptx/domain/shape.ts   |                             |
| 20.4.2.5 docPr (Drawing Object Non-Visual Properties)                   | [x]    | src/pptx/parser/wp-drawing.ts, src/pptx/parser/shape-parser/non-visual.ts |                             |
| 20.4.2.6 effectExtent (Object Extents Including Effects)                | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.7 extent (Drawing Object Size)                                   | [x]    | src/pptx/core/types.ts, src/pptx/ooxml/drawingml.ts                       |                             |
| 20.4.2.8 inline (Inline DrawingML Object)                               | [x]    | src/css/types.ts, src/pptx/core/guide-engine.spec.ts                      |                             |
| 20.4.2.9 lineTo (Wrapping Polygon Line End Position)                    | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/geometry-parser.spec.ts         |                             |
| 20.4.2.10 positionH (Horizontal Positioning)                            | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.11 positionV (Vertical Positioning)                              | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.12 posOffset (Absolute Position Offset)                          | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.13 simplePos (Simple Positioning Coordinates)                    | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.14 start (Wrapping Polygon Start)                                | [x]    | src/pptx/animation/effects-visual.spec.ts, src/pptx/animation/effects.ts  |                             |
| 20.4.2.15 wrapNone (No Text Wrapping)                                   | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.16 wrapPolygon (Wrapping Polygon)                                | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.17 wrapSquare (Square Wrapping)                                  | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.18 wrapThrough (Through Wrapping)                                | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.19 wrapTight (Tight Wrapping)                                    | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.20 wrapTopAndBottom (Top and Bottom Wrapping)                    | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.21 bg (Background Formatting)                                    | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                       |                             |
| 20.4.2.22 bodyPr (Body Properties)                                      | [x]    | src/pptx/core/text-rect.spec.ts, src/pptx/core/text-rect.ts               |                             |
| 20.4.2.23 cNvCnPr (Non-Visual Connector Shape Drawing Properties)       | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.24 cNvContentPartPr (Non-Visual Content Part Drawing Properties) | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.25 cNvFrPr (Non-Visual Graphic Frame Drawing Properties)         | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.26 cNvGrpSpPr (Non-Visual Group Shape Drawing Properties)        | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.27 cNvPr (Non-Visual Drawing Properties)                         | [x]    | src/pptx/core/node-indexer.ts, src/pptx/domain/shape.ts                   |                             |
| 20.4.2.28 cNvSpPr (Non-Visual Drawing Properties for a Shape)           | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.29 contentPart (Content Part)                                    | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.30 extLst (Extension List)                                       | [x]    | src/pptx/parser/diagram-parser.spec.ts                                    |                             |
| 20.4.2.31 graphicFrame (Graphical object container)                     | [x]    | src/pptx/core/render-options.ts, src/pptx/domain/shape.ts                 |                             |
| 20.4.2.32 grpSp (Group Shape)                                           | [x]    | src/pptx/domain/shape.ts, src/pptx/integration/content-enricher.ts        |                             |
| 20.4.2.33 grpSpPr (Group Shape Properties)                              | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser.spec.ts            |                             |
| 20.4.2.34 linkedTxbx (Textual contents of shape)                        | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.35 spPr (Shape Properties)                                       | [x]    | src/pptx/color/fill.ts, src/pptx/domain/chart.ts                          |                             |
| 20.4.2.36 style (Shape Style)                                           | [x]    | src/css/builder.ts, src/css/types.ts                                      |                             |
| 20.4.2.37 txbx (Textual contents of shape)                              | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.38 txbxContent (Rich Text Box Content Container)                 | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.39 wgp (WordprocessingML Shape Group)                            | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.40 whole (Whole E2O Formatting)                                  | [x]    | src/pptx/render/text-layout/line-breaker.ts                               |                             |
| 20.4.2.41 wpc (WordprocessingML Drawing Canvas)                         | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.42 wsp (WordprocessingML Shape)                                  | [x]    | src/pptx/parser/wp-drawing.ts                                             |                             |
| 20.4.2.43 xfrm (2D Transform for Graphic Frames)                        | [x]    | src/pptx/core/connection-site.ts, src/pptx/core/render-options.ts         |                             |

### 20.4.3 Simple Types

| Item                                                         | Status | Implementation               | Notes                       |
| ------------------------------------------------------------ | ------ | ---------------------------- | --------------------------- |
| 20.4.3 Simple Types                                          | [x]    | src/pptx                     | covered across sub-sections |
| 20.4.3.1 ST_AlignH (Relative Horizontal Alignment Positions) | [x]    | src/pptx/parser/primitive.ts |                             |
| 20.4.3.2 ST_AlignV (Vertical Alignment Definition)           | [x]    | src/pptx/parser/primitive.ts |                             |
| 20.4.3.3 ST_PositionOffset (Absolute Position Offset Value)  | [x]    | src/pptx/parser/primitive.ts |                             |
| 20.4.3.4 ST_RelFromH (Horizontal Relative Positioning)       | [x]    | src/pptx/parser/primitive.ts |                             |
| 20.4.3.5 ST_RelFromV (Vertical Relative Positioning)         | [x]    | src/pptx/parser/primitive.ts |                             |
| 20.4.3.6 ST_WrapDistance (Distance from Text)                | [x]    | src/pptx/parser/primitive.ts |                             |
| 20.4.3.7 ST_WrapText (Text Wrapping Location)                | [x]    | src/pptx/parser/primitive.ts |                             |

### 20.5 DrawingML - SpreadsheetML Drawing — p.3155

| Item                                   | Status | Implementation | Notes                       |
| -------------------------------------- | ------ | -------------- | --------------------------- |
| 20.5 DrawingML - SpreadsheetML Drawing | [x]    | src/pptx       | covered across sub-sections |

### 20.5.2 Elements

| Item                                                                     | Status | Implementation                                                                    | Notes                       |
| ------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------- | --------------------------- |
| 20.5.2 Elements                                                          | [x]    | src/pptx                                                                          | covered across sub-sections |
| 20.5.2.1 absoluteAnchor (Absolute Anchor Shape Size)                     | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.2 blipFill (Picture Fill)                                         | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                               |                             |
| 20.5.2.3 clientData (Client Data)                                        | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.4 cNvCxnSpPr (Non-Visual Connector Shape Drawing Properties)      | [x]    | src/pptx/parser/shape-parser/cxn.ts                                               |                             |
| 20.5.2.5 cNvGraphicFramePr (Non-Visual Graphic Frame Drawing Properties) | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.6 cNvGrpSpPr (Non-Visual Group Shape Drawing Properties)          | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.7 cNvPicPr (Non-Visual Picture Drawing Properties)                | [x]    | src/pptx/parser/shape-parser/pic.ts                                               |                             |
| 20.5.2.8 cNvPr (Non-Visual Drawing Properties)                           | [x]    | src/pptx/core/node-indexer.ts, src/pptx/domain/shape.ts                           |                             |
| 20.5.2.9 cNvSpPr (Connection Non-Visual Shape Properties)                | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.10 col (Column))                                                  | [x]    | src/html/element.ts, src/pptx/domain/chart.ts                                     |                             |
| 20.5.2.11 colOff (Column Offset)                                         | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.12 contentPart (Content Part)                                     | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.13 cxnSp (Connection Shape)                                       | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/diagram-parser.spec.ts                  |                             |
| 20.5.2.14 ext (Shape Extent)                                             | [x]    | src/pptx/integration/content-enricher.ts, src/pptx/integration/context-adapter.ts |                             |
| 20.5.2.15 from (Starting Anchor Point)                                   | [x]    | src/buffer/data-url.ts, src/buffer/index.ts                                       |                             |
| 20.5.2.16 graphicFrame (Graphic Frame)                                   | [x]    | src/pptx/core/render-options.ts, src/pptx/domain/shape.ts                         |                             |
| 20.5.2.17 grpSp (Group Shape)                                            | [x]    | src/pptx/domain/shape.ts, src/pptx/integration/content-enricher.ts                |                             |
| 20.5.2.18 grpSpPr (Group Shape Properties)                               | [x]    | src/pptx/domain/shape.ts, src/pptx/parser/shape-parser.spec.ts                    |                             |
| 20.5.2.19 nvCxnSpPr (Non-Visual Properties for a Connection Shape)       | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser/cxn.ts               |                             |
| 20.5.2.20 nvGraphicFramePr (Non-Visual Properties for a Graphic Frame)   | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser/graphic-frame.ts     |                             |
| 20.5.2.21 nvGrpSpPr (Non-Visual Properties for a Group Shape)            | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/parser/shape-parser.spec.ts              |                             |
| 20.5.2.22 nvPicPr (Non-Visual Properties for a Picture)                  | [x]    | src/pptx/ooxml/ecma376.spec.ts, src/pptx/ooxml/guards.spec.ts                     |                             |
| 20.5.2.23 nvSpPr (Non-Visual Properties for a Shape)                     | [x]    | src/pptx/core/node-indexer.ts, src/pptx/ooxml/ecma376.spec.ts                     |                             |
| 20.5.2.24 oneCellAnchor (One Cell Anchor Shape Size)                     | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.25 pic (Picture)                                                  | [x]    | src/pptx/core/context.ts, src/pptx/domain/shape.ts                                |                             |
| 20.5.2.26 pos (Position)                                                 | [x]    | src/pptx/color/fill.ts, src/pptx/core/background.ts                               |                             |
| 20.5.2.27 row (Row)                                                      | [x]    | src/css/types.ts, src/pptx/core/render-options.ts                                 |                             |
| 20.5.2.28 rowOff (Row Offset)                                            | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.29 sp (Shape)                                                     | [x]    | src/pptx/animation/integration.spec.ts, src/pptx/domain/shape.ts                  |                             |
| 20.5.2.30 spPr (Shape Properties)                                        | [x]    | src/pptx/color/fill.ts, src/pptx/domain/chart.ts                                  |                             |
| 20.5.2.31 style (Shape Style)                                            | [x]    | src/css/builder.ts, src/css/types.ts                                              |                             |
| 20.5.2.32 to (Ending Anchor Point)                                       | [x]    | src/buffer/base64.ts, src/buffer/data-url.ts                                      |                             |
| 20.5.2.33 twoCellAnchor (Two Cell Anchor Shape Size)                     | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.34 txBody (Shape Text Body)                                       | [x]    | src/pptx/domain/text.ts, src/pptx/ooxml/ecma376.spec.ts                           |                             |
| 20.5.2.35 wsDr (Worksheet Drawing)                                       | [x]    | src/pptx/parser/xdr-drawing.ts                                                    |                             |
| 20.5.2.36 xfrm (2D Transform for Graphic Frames)                         | [x]    | src/pptx/core/connection-site.ts, src/pptx/core/render-options.ts                 |                             |

### 20.5.3 Simple Types

| Item                                    | Status | Implementation                 | Notes                       |
| --------------------------------------- | ------ | ------------------------------ | --------------------------- |
| 20.5.3 Simple Types                     | [x]    | src/pptx                       | covered across sub-sections |
| 20.5.3.1 ST_ColID (Column ID)           | [x]    | src/pptx/parser/xdr-drawing.ts |                             |
| 20.5.3.2 ST_EditAs (Resizing Behaviors) | [x]    | src/pptx/parser/primitive.ts   |                             |
| 20.5.3.3 ST_RowID (Row ID)              | [x]    | src/pptx/parser/xdr-drawing.ts |                             |
