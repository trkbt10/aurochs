# Integration Layer Elimination Design

## 目的

`src/pptx/integration/`を完全に排除し、`parser → domain → render`の一貫したフローを確立する。

## 現状分析

### integration層の構成

```
integration/
├── content-enricher.ts  # Chart/Diagram/OLEのパースとリソース解決
├── context-adapter.ts   # PPTXSlideRenderContext → RenderContext変換
├── slide-render.ts      # Parse→Enrich→Renderの調整
└── index.ts
```

### 問題点

1. **責務の混在**: parserの責務（Chart/Diagramパース）がintegration層にある
2. **型の二重定義**: `PPTXSlideRenderContext`, `ParseContext`, `RenderContext`が別々に存在
3. **変換レイヤー**: context-adapter.tsで無駄な変換が発生
4. **リソース解決の分散**: 複数箇所でリソース解決ロジックが実装されている

## 目標アーキテクチャ

```
reader/
  └── slide/factory.ts
        ↓ SlideData + ZipFile
core/context/
  └── PPTXSlideRenderContext (唯一の共通コンテキスト)
        ↓
parser/
  └── slide-parser.ts
        - XML → Slide (完全なドメインオブジェクト)
        - Chart/Diagram/OLEも含めて一括パース
        ↓ Slide
render/
  └── html/slide.ts, svg/renderer.ts
        - PPTXSlideRenderContextから直接ResourceResolverを取得
        - 背景継承もここで解決
        ↓ HTML/SVG
```

## 変更内容

### Phase 1: 型の統一

#### 1.1 ParseContextの簡素化

```typescript
// parser/context.ts
// ParseContextをPPTXSlideRenderContextから派生可能にする
export function createParseContextFromSlideContext(ctx: PPTXSlideRenderContext): ParseContext {
  // 内部的な変換のみ（外部APIは変更なし）
}
```

#### 1.2 RenderContextの簡素化

```typescript
// render/core/types.ts
// CoreRenderContextをPPTXSlideRenderContextから派生可能にする
export function createRenderContextFromSlideContext(
  ctx: PPTXSlideRenderContext,
  slideSize: SlideSize,
): CoreRenderContext {
  // 内部的な変換のみ
}
```

### Phase 2: Parserの拡張

#### 2.1 slide-parser.tsの拡張

現在:

```typescript
export function parseSlide(doc: XmlDocument, ctx: ParseContext): Slide;
```

変更後:

```typescript
export function parseSlide(
  doc: XmlDocument,
  ctx: ParseContext,
  options?: {
    fileReader?: FileReader; // Chart/Diagram/OLEのパース用
  },
): Slide;
```

#### 2.2 GraphicFrameのパース拡張

現在: `ChartReference`, `DiagramReference`のみ（参照だけ保持）
変更後: `Chart`, `DiagramContent`も同時にパース

```typescript
// parser/shape/graphic-frame.ts
function parseChartContent(chartRef: ChartReference, fileReader: FileReader): Chart | undefined {
  // content-enricher.tsのロジックを移動
}
```

### Phase 3: Renderの拡張

#### 3.1 背景継承解決

現在: `integration/slide-render.ts`の`getBackgroundFillData`呼び出し
変更後: `render`内で直接処理

```typescript
// render/html/slide.ts
export function renderSlide(
  slide: Slide,
  ctx: CoreRenderContext,
  slideCtx: PPTXSlideRenderContext, // 背景継承解決用
): RenderResult;
```

#### 3.2 DiagramリソースIDの解決

問題: Diagram内のblipFillはダイアグラムのリレーションシップで解決が必要

解決策:

1. `DiagramContent`にリレーションシップへの参照を保持
2. render時にダイアグラム専用のResourceResolverを使用

```typescript
// domain/diagram.ts
export type DiagramContent = {
  readonly shapes: readonly Shape[];
  readonly resourceResolver?: ResourceResolver; // 追加
};
```

### Phase 4: Integration層の削除

#### 4.1 factory.tsの更新

```typescript
// reader/slide/factory.ts
import { parseSlide } from "../../parser/slide/slide-parser";
import { renderSlide } from "../../render/html/slide";

const renderHTML = (): string => {
  const parseCtx = createParseContextFromSlideContext(slideRenderCtx);
  const slide = parseSlide(data.content, parseCtx, { fileReader });

  const renderCtx = createRenderContextFromSlideContext(slideRenderCtx, slideSize);
  const result = renderSlide(slide, renderCtx, slideRenderCtx);

  return `<style>${result.styles}</style>${result.html}`;
};
```

#### 4.2 ファイル削除

```bash
rm -rf src/pptx/integration/
```

## 移行戦略

1. **Phase 1**: context変換関数をcore層に移動（互換性維持）
2. **Phase 2**: slide-parserがFileReaderを受け取れるように拡張
3. **Phase 3**: Chart/Diagramパースをslide-parserに統合
4. **Phase 4**: renderが背景継承を直接解決
5. **Phase 5**: factory.tsをparser/renderを直接呼び出すように変更
6. **Phase 6**: integration/を削除

## リスク

1. **Diagram リソース解決**: ダイアグラム内の画像リソースは別のリレーションシップファイルで管理されている
2. **OLE VML解決**: VML内の画像参照は複雑な解決ロジックが必要
3. **テストの破壊**: 多くのテストがintegration層に依存している可能性

## 検証方法

1. 既存のvisual regressionテストが通ること
2. 型チェックが通ること
3. 全ての.specファイルのテストが通ること
