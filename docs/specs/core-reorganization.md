# Core層の再構成設計

## 現状の問題

### 1. core/dml/ の問題

```
core/dml/
├── domain/  # ColorContext, FontScheme等 - 本来はdomain/に
├── parser/  # 色・背景パース関数 - 本来はparser/に
└── render/  # 色解決・背景レンダリング - 本来はrender/に
```

これはトップレベルのparser→domain→renderアーキテクチャをcore内で複製している。

### 2. core/context/ の問題

```
core/context/
├── types.ts     # PPTXSlideRenderContext - 本来はreader/に
├── factory.ts   # コンテキスト生成 - 本来はreader/に
└── adapters.ts  # 変換関数 - 本来は不要
```

PPTXSlideRenderContextはスライド読み込み時に構築される読み込みコンテキストであり、coreではなくreaderに属する。

### 3. 型の重複

- `core/dml/domain/types.ts`: ColorContext, FontScheme, Theme, etc.
- `domain/color.ts`: Color, Fill, Line, etc.
- `parser/context.ts`: ParseContext
- `render/core/types.ts`: CoreRenderContext, ResourceResolver

これらは統一されるべき。

## 目標アーキテクチャ

### coreに残すべきもの（純粋なユーティリティ）

```
core/
├── units/       # 単位変換 (EMU→px, pt→px等)
├── geometry/    # 形状計算 (guide-engine, text-rect)
├── ecma376/     # ECMA-376定数・デフォルト値
├── opc/         # OPCユーティリティ (relationships, content-types)
└── types.ts     # IndexTables等の基本型
```

### 移動すべきもの

| 現在の場所               | 移動先          | 理由                                   |
| ------------------------ | --------------- | -------------------------------------- |
| core/context/            | reader/context/ | PPTXSlideRenderContextはreader層の責務 |
| core/dml/domain/types.ts | domain/         | ColorContext等はドメイン型             |
| core/dml/parser/\*       | parser/dml/     | パース関数はparser層の責務             |
| core/dml/render/\*       | render/dml/     | レンダリング関数はrender層の責務       |

### 廃止すべきもの

| ファイル                 | 理由                                     |
| ------------------------ | ---------------------------------------- |
| core/context/adapters.ts | 型が統一されれば不要                     |
| integration/ (全て)      | parser→domain→renderの直接呼び出しで代替 |

## 型の統一計画

### ColorContext

現在: `core/dml/domain/types.ts`

```typescript
export type ColorContext = {
  readonly colorScheme: ColorScheme;
  readonly colorMap: ColorMap;
};
```

移動先: `domain/context.ts` (新規)

- parserとrenderの両方で使用される解決用コンテキスト

### FontScheme

現在: `core/dml/domain/types.ts`
移動先: `domain/context.ts`

### ParseContext

現在: `parser/context.ts`
変更: ColorContext, FontSchemeをdomain/から参照

### CoreRenderContext

現在: `render/core/types.ts`
変更: ColorContext, FontSchemeをdomain/から参照

## 移行手順

### Phase 1: domain/context.ts の作成

1. `domain/context.ts`を新規作成
2. ColorContext, FontScheme, ColorScheme, ColorMap等を移動
3. `core/dml/domain/types.ts`を更新してre-export (互換性維持)

### Phase 2: parser/dml/ の作成

1. `parser/dml/`ディレクトリを作成
2. `core/dml/parser/*`の内容を移動
3. 依存を`domain/context.ts`に更新

### Phase 3: render/dml/ の作成

1. `render/dml/`ディレクトリを作成
2. `core/dml/render/*`の内容を移動
3. 依存を`domain/context.ts`に更新

### Phase 4: SlideRenderContext を reader/ へ移動

**問題**: `reader/context/`という命名も「頭痛が痛い」

- "context"ディレクトリは不要
- SlideRenderContextは実質「スライドアクセサ」

**対策**:

1. `reader/slide-accessor.ts`を新規作成
2. `core/context/types.ts`の内容を移動:
   - `SlideRenderContext` → `SlideAccessor`にリネーム検討
   - `ShapeContext`, `ParagraphContext`
   - スコープ付きContext型
3. `core/context/factory.ts`を`reader/slide/factory.ts`に統合
4. `core/context/adapters.ts`を削除（domain/resolutionで代替済み）

### Phase 5: 非推奨コードの削除

1. `core/context/`を削除
2. `core/dml/`を削除
3. `integration/`を削除

## 依存関係

移行後の依存関係:

```
reader/
  ├─uses─→ core/opc/
  ├─uses─→ core/ecma376/
  └─uses─→ domain/

parser/
  ├─uses─→ core/units/
  ├─uses─→ core/ecma376/
  └─uses─→ domain/

render/
  ├─uses─→ core/units/
  ├─uses─→ core/geometry/
  └─uses─→ domain/
```

core/は他の層から使用されるが、core自体は他の層に依存しない。

## リスク

1. **循環依存**: domain/とparser/render/間で循環しないよう注意
2. **テストの破損**: 移動により既存テストのインポートパスが変更
3. **互換性**: 外部からの参照がある場合、re-exportで維持

## 成功基準

1. `core/dml/`と`core/context/`が削除されている
2. `integration/`が削除されている
3. 全テストがパス
4. 型チェックがパス
5. visual regressionテストがパス
