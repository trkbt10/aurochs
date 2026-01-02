# PPTX Editor 実装ガイド

## 概要

ReactベースのPPTXエディター実装。ドメインの依存関係の末端から順に構築し、最終的にプレゼンテーション全体を編集可能にする。

## 設計原則

1. **コンテキスト非依存**: エディターはマウント位置を知らない（inline, popup, sidebar, context menu等どこでも使える）
2. **デザイン分離**: エディター自体はロジックのみ、スタイルは消費側が決める
3. **シンプル**: 最小限の機能から段階的に拡張
4. **状態管理**: React useReducer ベース
5. **Vercel風ミニマルデザイン**: 装飾を抑えたダークテーマ

---

## コンポーネントレイヤー

### Layer 1: `ui/primitives/` - 純粋UI要素
**責任**: 原子的、ステートレスなUI要素
**含む**: Input, Button, Select, Slider, Toggle, Popover, Tabs
**規則**:
- ドメイン知識なし（Color, Fill, Gradientを知らない）
- 自己完結した視覚スタイル（自身のborder, bg, focusを処理）

### Layer 2: `ui/layout/` - 構成ヘルパー
**責任**: ドメインロジックなしのレイアウトパターン
**含む**: FieldGroup, FieldRow, Accordion, Section
**規則**:
- 必要に応じて視覚的境界を提供（Sectionは背景+border付き）
- gap基準のスペーシング（marginTopは子で使わない）

### Layer 3: `editors/` - ドメインロジック
**責任**: ドメイン固有データ構造の編集
**規則**:
- **純粋コンテンツ - コンテナスタイルなし**（bg, borderなし）
- `EditorProps<T>`パターンに従う
- 消費側が`Section`などでラップ

### コンテナガイドライン

```tsx
// ❌ BAD: エディター内にコンテナスタイル
function MyEditor({ value, onChange }) {
  return (
    <div style={{ backgroundColor: "...", border: "..." }}>
      <FieldGroup label="Something">...</FieldGroup>
    </div>
  );
}

// ✅ GOOD: エディターは純粋コンテンツ、親がSectionでラップ
function MyEditor({ value, onChange }) {
  return (
    <>
      <FieldGroup label="Something">...</FieldGroup>
    </>
  );
}

// 使用側
<Section>
  <MyEditor value={v} onChange={handleChange} />
</Section>
```

---

## スペーシング規約

| 用途 | 値 | 使用場面 |
|------|-----|---------|
| xs | 4px | インライン要素（アイコン＋テキスト） |
| sm | 6px | ラベル→入力（FieldGroup） |
| md | 8px | 関連入力間（FieldRow） |
| lg | 12px | フィールドグループ間 |
| xl | 16px | セクション間 |

**重要**: `marginTop`は使わない。`gap`基準で統一。

```tsx
// ❌ BAD: marginTopで間隔調整
<FieldGroup label="First">...</FieldGroup>
<div style={{ marginTop: "8px" }}>
  <FieldGroup label="Second">...</FieldGroup>
</div>

// ✅ GOOD: 親のgapで自動間隔
<Section>  {/* gap: 12px */}
  <FieldGroup label="First">...</FieldGroup>
  <FieldGroup label="Second">...</FieldGroup>
</Section>
```

---

## 全体フェーズ

### Phase 1: ドメイン単位エディター ← **現在**
ドメインの依存関係の末端から順にエディターを作成。

### Phase 2: スライドエディター
Phase 1のエディターを統合し、スライド単位での編集を可能に。

### Phase 3: プレゼンテーションエディター
スライドエディターを使ってプレゼンテーション全体を編集。

---

## Phase 1: ドメイン単位エディター

### ドメイン依存グラフ

```
Level 0 (リーフ - 依存なし)
└── types.ts: Pixels, Degrees, Percent, Points, Transform

Level 1 (types.tsのみに依存)
└── color.ts: Color, ColorSpec, ColorTransform, Fill, Line

Level 2 (types.ts + color.tsに依存)
├── text.ts: TextBody, Paragraph, TextRun, RunProperties, ParagraphProperties
└── resolution.ts: ColorScheme, ColorMap, FontScheme

Level 3 (上記すべてに依存)
├── shape.ts: SpShape, PicShape, GrpShape, ShapeProperties, Geometry
├── table.ts: Table, TableRow, TableCell
├── chart.ts: Chart, ChartSeries, Axis, DataLabels
└── diagram.ts: DiagramDataModel

Level 4 (トップレベル)
├── slide.ts: Slide, SlideLayout, SlideMaster, Background
└── animation.ts: Timing, TimeNode
```

### 実装状況

#### ✅ 完了

**基盤**
- [x] ディレクトリ構造
- [x] types.ts (EditorProps, EditorState, EditorAction)
- [x] EditorConfigContext
- [x] useEditorReducer hook

**UI Primitives**
- [x] Input (suffix統合、幅制御)
- [x] Button (primary/secondary/ghost)
- [x] Select
- [x] Slider
- [x] Toggle

**Layout**
- [x] FieldGroup
- [x] FieldRow
- [x] Accordion
- [x] Section

**Level 0 Editors**
- [x] PixelsEditor
- [x] DegreesEditor
- [x] PercentEditor
- [x] PointsEditor
- [x] TransformEditor

**Level 1 Editors**
- [x] ColorSpecEditor
- [x] ColorTransformEditor
- [x] ColorEditor
- [x] FillEditor
- [x] LineEditor

**テスト**
- [x] EditorTestPage (pages/app/components/)
- [x] EditorTestPage分割 (editor-tests/: Primitives, Colors, Text)

**Level 2 Editors - Text系**
- [x] RunPropertiesEditor (フォント、サイズ、色、太字、斜体、下線など)
- [x] LineSpacingEditor (行間隔: percent/points)
- [x] BulletStyleEditor (箇条書きスタイル)
- [x] ParagraphPropertiesEditor (揃え、行間、インデント、箇条書き)
- [x] TextBodyEditor (TextBody全体)

**Level 3 Editors - Shape系**
- [x] GeometryEditor (PresetGeometry / CustomGeometry)
- [x] ShapePropertiesEditor (transform + fill + line + effects)
- [x] NonVisualPropertiesEditor (name, description, hidden)
- [x] EffectsEditor (shadow, glow, reflection, softEdge)

**Level 3 Editors - Table系**
- [x] CellBordersEditor (セル罫線: left, right, top, bottom, insideH, insideV, tlToBr, blToTr)
- [x] Cell3dEditor (3D効果: preset material, bevel, lightRig)
- [x] TableCellPropertiesEditor (セルプロパティ: margins, anchor, anchorCenter, horzOverflow, verticalType, fill, borders, cell3d, headers, rowSpan, colSpan, horizontalMerge, verticalMerge)
- [x] TableCellEditor (セル: id, properties, textBody)
- [x] TablePropertiesEditor (テーブルプロパティ: rtl, firstRow/Col, lastRow/Col, bandRow/Col, fill, effects, tableStyleId)
- [x] TableEditor (テーブル全体: properties, grid, rows)

**Level 3 Editors - Chart系**
- [x] AxisEditor (CategoryAxis, ValueAxis, DateAxis, SeriesAxis)
- [x] DataLabelsEditor (表示フラグ、位置、セパレータ)
- [x] LegendEditor (位置、オーバーレイ)
- [x] ChartSeriesEditor (チャートタイプ固有設定)
- [x] ChartEditor (トップレベルチャートエディター)

**追加UI**
- [x] ColorSwatch (カラープレビュー)
- [x] GradientStopEditor (単一ストップ編集 - position + color + remove)
- [x] GradientStopsEditor (グラデーション編集) - インタラクティブプレビュー付き
- [x] Popover (ポップオーバー)
- [x] Tabs (タブ切り替え)

---

## Phase 2: スライドエディター

### 目標
スライド内のすべてのシェイプを選択・編集できるエディターを作成。

### コンポーネント構成

```
SlideEditor/
├── SlideCanvas.tsx        # スライドのレンダリングとシェイプ選択
├── ShapeSelector.tsx      # シェイプ選択UI（バウンディングボックス、ハンドル）
├── PropertyPanel.tsx      # 選択シェイプのプロパティパネル
├── ShapeToolbar.tsx       # シェイプ操作ツールバー
└── hooks/
    ├── useSlideState.ts   # スライド編集状態管理
    └── useSelection.ts    # 選択状態管理
```

### 実装項目
- [ ] スライドキャンバス（SVGベースのインタラクティブ表示）
- [ ] シェイプ選択（クリック、マルチ選択）
- [ ] ドラッグによる移動・リサイズ
- [ ] プロパティパネル（Phase 1のエディターを統合）
- [ ] Undo/Redo機能
- [ ] コピー/ペースト

---

## Phase 3: プレゼンテーションエディター

### 目標
複数スライドを管理し、プレゼンテーション全体を編集。

### コンポーネント構成

```
PresentationEditor/
├── PresentationEditor.tsx   # メインエディター
├── SlideList.tsx            # スライド一覧（サムネイル）
├── SlidePane.tsx            # スライド編集ペイン
├── OutlinePane.tsx          # アウトライン表示
├── MasterEditor.tsx         # マスタースライド編集
└── hooks/
    ├── usePresentationState.ts
    └── useSlideNavigation.ts
```

### 実装項目
- [ ] スライド一覧表示（サムネイル）
- [ ] スライドの追加・削除・並び替え
- [ ] スライドの複製
- [ ] マスタースライド編集
- [ ] テーマ編集（ColorScheme, FontScheme）
- [ ] PPTXエクスポート

---

## ファイル構成（最終形）

```
src/pptx-editor/
├── index.ts
├── types.ts
├── IMPLEMENTATION_GUIDE.md
│
├── context/
│   ├── index.ts
│   ├── EditorConfigContext.tsx
│   └── SelectionContext.tsx        # Phase 2
│
├── hooks/
│   ├── index.ts
│   ├── useEditorReducer.ts
│   ├── useUndoRedo.ts              # Phase 2
│   ├── useSelection.ts             # Phase 2
│   └── usePresentationState.ts     # Phase 3
│
├── ui/
│   ├── primitives/
│   │   ├── Input.tsx
│   │   ├── Button.tsx
│   │   ├── Select.tsx
│   │   ├── Slider.tsx
│   │   ├── Toggle.tsx
│   │   ├── Popover.tsx             # 追加
│   │   ├── Tabs.tsx                # 追加
│   │   └── index.ts
│   │
│   ├── layout/
│   │   ├── FieldGroup.tsx
│   │   ├── FieldRow.tsx
│   │   ├── Accordion.tsx
│   │   ├── Section.tsx             # コンテナ用
│   │   └── index.ts
│   │
│   └── color/
│       ├── ColorSwatch.tsx
│       └── index.ts
│
├── editors/
│   ├── primitives/                 # Level 0 ✅
│   ├── color/                      # Level 1 ✅
│   ├── text/                       # Level 2 ✅
│   ├── shape/                      # Level 3 ✅
│   ├── table/                      # Level 3 ✅
│   ├── chart/                      # Level 3
│   └── index.ts
│
├── slide/                          # Phase 2
│   ├── SlideEditor.tsx
│   ├── SlideCanvas.tsx
│   ├── ShapeSelector.tsx
│   ├── PropertyPanel.tsx
│   └── index.ts
│
└── presentation/                   # Phase 3
    ├── PresentationEditor.tsx
    ├── SlideList.tsx
    ├── SlidePane.tsx
    └── index.ts
```

---

## 参照ファイル

### ドメイン型定義
- `src/pptx/domain/types.ts` - Pixels, Degrees, Percent, Points, Transform
- `src/pptx/domain/color.ts` - Color, ColorSpec, Fill, Line
- `src/pptx/domain/text.ts` - TextBody, Paragraph, TextRun
- `src/pptx/domain/shape.ts` - Shape types, ShapeProperties
- `src/pptx/domain/table.ts` - Table, TableRow, TableCell
- `src/pptx/domain/chart.ts` - Chart, ChartSeries, Axis
- `src/pptx/domain/slide.ts` - Slide, Background
- `src/pptx/domain/resolution.ts` - ColorScheme, FontScheme

### スタイル参照
- `pages/app/styles/globals.css` - CSS変数定義

### テストページ
- `pages/app/components/EditorTestPage.tsx`
- `pages/app/components/editor-tests/` - 用途別テストコンポーネント

---

## 次のステップ

1. **Level 3: Table/Chart系エディター**
   - TableCellEditor, TableEditor を実装
   - ChartSeriesEditor, ChartEditor を実装

2. **Phase 2: スライドエディター**
   - SlideCanvas, ShapeSelector を実装
   - PropertyPanel を実装
