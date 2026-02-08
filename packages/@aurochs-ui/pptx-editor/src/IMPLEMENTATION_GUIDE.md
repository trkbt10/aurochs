# PPTX Editor 実装ガイド

## 概要

ReactベースのPPTXエディター実装。

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
</Section>;
```

---

## スペーシング規約

| 用途 | 値   | 使用場面                             |
| ---- | ---- | ------------------------------------ |
| xs   | 4px  | インライン要素（アイコン＋テキスト） |
| sm   | 6px  | ラベル→入力（FieldGroup）            |
| md   | 8px  | 関連入力間（FieldRow）               |
| lg   | 12px | フィールドグループ間                 |
| xl   | 16px | セクション間                         |

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
