# ECMA-376 Part 1: DrawingML - Diagrams (SmartArt) チェックリスト（章／節ベース）

このチェックリストは ECMA-376 の公式 PDF（章／節の見出し）から抽出したものです。
各項目は章番号・節名・参照ページ（判読できたもの）を保持し、網羅度測定のベースラインとして利用できます。

参照PDF: `reference/ecma376/ecma-376-1/Ecma Office Open XML Part 1 - Fundamentals And Markup Language Reference.pdf`

## Checklist

### 21.4.2 Diagram Definition

| Item                                                       | Status | Implementation                                                                                                             | Notes |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| 21.4.2 Diagram Definition                                  | [x]    | -                                                                                                                          |       |
| 21.4.2.1 adj (Shape Adjust)                                | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.2 adjLst (Shape Adjust List)                        | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.3 alg (Algorithm)                                   | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.4 cat (Category)                                    | [x]    | src/pptx/parser/diagram-layout-parser.ts, src/pptx/parser/diagram-style-parser.ts, src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.2.5 catLst (Category List)                            | [x]    | src/pptx/parser/diagram-layout-parser.ts, src/pptx/parser/diagram-style-parser.ts, src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.2.6 choose (Choose Element)                           | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.7 clrData (Color Transform Sample Data)             | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.8 constr (Constraint)                               | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.9 constrLst (Constraint List)                       | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.10 dataModel (Data Model)                           | [x]    | src/pptx/parser/diagram-data-parser.ts                                                                                     |       |
| 21.4.2.11 desc (Description)                               | [x]    | src/pptx/parser/diagram-layout-parser.ts, src/pptx/parser/diagram-style-parser.ts, src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.2.12 else (Else)                                      | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.13 extLst (Extension List)                          | [x]    | src/pptx/parser/diagram-data-parser.ts                                                                                     |       |
| 21.4.2.14 forEach (For Each)                               | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.15 if (If)                                          | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.16 layoutDef (Layout Definition)                    | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.17 layoutDefHdr (Layout Definition Header)          | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.18 layoutDefHdrLst (Diagram Layout Header List)     | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.19 layoutNode (Layout Node)                         | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.20 param (Parameter)                                | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.21 presOf (Presentation Of)                         | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.22 relIds (Explicit Relationships to Diagram Parts) | [x]    | src/pptx/parser/shape-parser/graphic-frame.ts                                                                              |       |
| 21.4.2.23 resizeHandles (Shape Resize Style)               | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.24 rule (Rule)                                      | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.25 ruleLst (Rule List)                              | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.26 sampData (Sample Data)                           | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.27 shape (Shape)                                    | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.28 style (Shape Style)                              | [x]    | src/pptx/parser/diagram-style-parser.ts                                                                                    |       |
| 21.4.2.29 styleData (Style Data)                           | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |
| 21.4.2.30 title (Title)                                    | [x]    | src/pptx/parser/diagram-layout-parser.ts, src/pptx/parser/diagram-style-parser.ts, src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.2.31 varLst (Variable List)                           | [x]    | src/pptx/parser/diagram-layout-parser.ts                                                                                   |       |

### 21.4.3 Data

| Item                                  | Status | Implementation                         | Notes |
| ------------------------------------- | ------ | -------------------------------------- | ----- |
| 21.4.3 Data                           | [x]    | -                                      |       |
| 21.4.3.1 bg (Background Formatting)   | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.2 cxn (Connection)             | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.3 cxnLst (Connection List)     | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.4 prSet (Property Set)         | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.5 pt (Point)                   | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.6 ptLst (Point List)           | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.7 spPr (Shape Properties)      | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.8 t (Text Body)                | [x]    | src/pptx/parser/diagram-data-parser.ts |       |
| 21.4.3.9 whole (Whole E2O Formatting) | [x]    | src/pptx/parser/diagram-data-parser.ts |       |

### 21.4.4 Color Information

| Item                                                      | Status | Implementation                          | Notes |
| --------------------------------------------------------- | ------ | --------------------------------------- | ----- |
| 21.4.4 Color Information                                  | [x]    | -                                       |       |
| 21.4.4.1 cat (Color Transform Category)                   | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.2 catLst (Color Transform Category List)           | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.3 colorsDef (Color Transform Definitions)          | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.4 colorsDefHdr (Color Transform Definition Header) | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.5 colorsDefHdrLst (Color Transform Header List)    | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.6 desc (Description)                               | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.7 effectClrLst (Effect Color List)                 | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.8 fillClrLst (Fill Color List)                     | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.9 linClrLst (Line Color List)                      | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.10 styleLbl (Style Label)                          | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.11 title (Title)                                   | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.12 txEffectClrLst (Text Effect Color List)         | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.13 txFillClrLst (Text Fill Color List)             | [x]    | src/pptx/parser/diagram-color-parser.ts |       |
| 21.4.4.14 txLinClrLst (Text Line Color List)              | [x]    | src/pptx/parser/diagram-color-parser.ts |       |

### 21.4.5 Style Definitions

| Item                                                       | Status | Implementation                          | Notes |
| ---------------------------------------------------------- | ------ | --------------------------------------- | ----- |
| 21.4.5 Style Definitions                                   | [x]    | -                                       |       |
| 21.4.5.1 cat (Category)                                    | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.2 catLst (Category List)                            | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.3 desc (Style Label Description)                    | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.4 presLayoutVars (Presentation Layout Variables)    | [x]    | src/pptx/parser/diagram-data-parser.ts  |       |
| 21.4.5.5 scene3d (3-D Scene)                               | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.6 sp3d (3-D Shape Properties)                       | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.7 styleDef (Style Definition)                       | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.8 styleDefHdr (Style Definition Header)             | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.9 styleDefHdrLst (List of Style Definition Headers) | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.10 styleLbl (Style Label)                           | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.11 title (Title)                                    | [x]    | src/pptx/parser/diagram-style-parser.ts |       |
| 21.4.5.12 txPr (Text Properties)                           | [x]    | src/pptx/parser/diagram-style-parser.ts |       |

### 21.4.6 Layout Definition

| Item                                                       | Status | Implementation                           | Notes |
| ---------------------------------------------------------- | ------ | ---------------------------------------- | ----- |
| 21.4.6 Layout Definition                                   | [x]    | -                                        |       |
| 21.4.6.1 animLvl (Level Animation)                         | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.6.2 animOne (One by One Animation String)             | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.6.3 bulletEnabled (Show Insert Node)                  | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.6.4 chMax (Maximum Children)                          | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.6.5 chPref (Preferred Number of Children)             | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.6.6 dir (Diagram Direction)                           | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.6.7 hierBranch (Organization Chart Branch Style)      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.6.8 orgChart (Show Organization Chart User Interface) | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |

### 21.4.7 Simple Types

| Item                                                               | Status | Implementation                           | Notes |
| ------------------------------------------------------------------ | ------ | ---------------------------------------- | ----- |
| 21.4.7 Simple Types                                                | [x]    | -                                        |       |
| 21.4.7.1 ST_AlgorithmType (Algorithm Types)                        | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.2 ST_AnimLvlStr (Animation Level String Definition)         | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.3 ST_AnimOneStr (One by One Animation Value Definition)     | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.4 ST_ArrowheadStyle (Arrowhead Styles)                      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.5 ST_AutoTextRotation (Auto Text Rotation)                  | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.6 ST_AxisType (Axis Type)                                   | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.7 ST_AxisTypes (Axis Type List)                             | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.8 ST_BendPoint (Bend Point)                                 | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.9 ST_Booleans (Boolean List.)                               | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.10 ST_BoolOperator (Boolean Constraint)                     | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.11 ST_Breakpoint (Breakpoint)                               | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.12 ST_CenterShapeMapping (Center Shape Mapping)             | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.13 ST_ChildAlignment (Child Alignment)                      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.14 ST_ChildDirection (Child Direction)                      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.15 ST_ChildOrderType (Child Order)                          | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.16 ST_ClrAppMethod (Color Application Method Type)          | [x]    | src/pptx/parser/diagram-color-parser.ts  |       |
| 21.4.7.17 ST_ConnectorDimension (Connector Dimension)              | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.18 ST_ConnectorPoint (Connector Point)                      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.19 ST_ConnectorRouting (Connector Routing)                  | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.20 ST_ConstraintRelationship (Constraint Relationship)      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.21 ST_ConstraintType (Constraint Type)                      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.22 ST_ContinueDirection (Continue Direction)                | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.23 ST_CxnType (Connection Type)                             | [x]    | src/pptx/parser/diagram-data-parser.ts   |       |
| 21.4.7.24 ST_DiagramHorizontalAlignment (Horizontal Alignment)     | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.25 ST_DiagramTextAlignment (Text Alignment)                 | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.26 ST_Direction (Diagram Direction Definition)              | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.27 ST_ElementType (Data Point Type)                         | [x]    | src/pptx/parser/diagram-data-parser.ts   |       |
| 21.4.7.28 ST_ElementTypes (Diagream Layout Node Type List)         | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.29 ST_FallbackDimension (Fallback Dimension)                | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.30 ST_FlowDirection (Flow Direction)                        | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.31 ST_FunctionArgument (Function Argument)                  | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.32 ST_FunctionOperator (Function Operator)                  | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.33 ST_FunctionType (Function Type)                          | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.34 ST_FunctionValue (Function Value)                        | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.35 ST_GrowDirection (Grow Direction)                        | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.36 ST_HierarchyAlignment (Hierarchy Alignment)              | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.37 ST_HierBranchStyle (Hierarchy Branch Style Definition)   | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.38 ST_HueDir (Hue Direction)                                | [x]    | src/pptx/parser/diagram-color-parser.ts  |       |
| 21.4.7.39 ST_Index1 (1-Based Index)                                | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.40 ST_Ints (Integer List)                                   | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.41 ST_LayoutShapeType (Layout Shape Type)                   | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.42 ST_LinearDirection (Linear Direction)                    | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.43 ST_ModelId (Model Identifier)                            | [x]    | src/pptx/parser/diagram-data-parser.ts   |       |
| 21.4.7.44 ST_NodeCount (Number of Nodes Definition)                | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.45 ST_NodeHorizontalAlignment (Node Horizontal Alignment)   | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.46 ST_NodeVerticalAlignment (Node Vertical Alignment)       | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.47 ST_Offset (Offset)                                       | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.48 ST_OutputShapeType (Output Shape Type)                   | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.49 ST_ParameterId (Parameter Identifier)                    | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.50 ST_ParameterVal (Parameter Values)                       | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.51 ST_PtType (Point Type)                                   | [x]    | src/pptx/parser/diagram-data-parser.ts   |       |
| 21.4.7.52 ST_PyramidAccentPosition (Pyramid Accent Position)       | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.53 ST_PyramidAccentTextMargin (Pyramid Accent Text Margin)  | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.54 ST_ResizeHandlesStr (Resize Handle)                      | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.55 ST_RotationPath (Rotation Path)                          | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.56 ST_SecondaryChildAlignment (Secondary Child Alignment)   | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.57 ST_SecondaryLinearDirection (Secondary Linear Direction) | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.58 ST_StartingElement (Starting Element)                    | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.59 ST_TextAnchorHorizontal (Text Anchor Horizontal)         | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.60 ST_TextAnchorVertical (Text Anchor Vertical)             | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.61 ST_TextBlockDirection (Text Block Direction)             | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.62 ST_TextDirection (Text Direction)                        | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.63 ST_UnsignedInts (Unsigned Integer List)                  | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.64 ST_VariableType (Variable Type)                          | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.65 ST_VerticalAlignment (Vertical Alignment)                | [x]    | src/pptx/parser/diagram-layout-parser.ts |       |
| 21.4.7.66 ST_PrSetCustVal (Property Set Customized Value)          | [x]    | src/pptx/parser/diagram-data-parser.ts   |       |
