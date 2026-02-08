# @aurochs/fig

Figma ファイル (.fig) のパーサー・ビルダー

## 概要

このパッケージは Figma の `.fig` ファイル形式の読み書きを提供する。

- **パーサー**: `.fig` ファイルをパースしてノードツリーを取得
- **ビルダー**: プログラムから `.fig` ファイルを生成
- **ラウンドトリップ**: 既存ファイルの読み込み・修正・保存

## ZIPパッケージ構造

`.fig` ファイルは **ZIPアーカイブ** であり、以下のファイルを含む：

| ファイル        | 必須 | 説明                                                    |
| --------------- | ---- | ------------------------------------------------------- |
| `canvas.fig`    | ✓    | メインデータ（fig-kiwi形式）                            |
| `meta.json`     | ✓    | メタデータ（ファイル名、背景色等）                      |
| `thumbnail.png` | ✓    | サムネイル画像（必須。ないとFigmaインポートが失敗する） |
| `images/*`      | -    | 埋め込み画像                                            |

### meta.json 構造

```json
{
  "client_meta": {
    "background_color": { "r": 0.96, "g": 0.96, "b": 0.96, "a": 1 },
    "thumbnail_size": { "width": 400, "height": 300 },
    "render_coordinates": { "x": 0, "y": 0, "width": 800, "height": 600 }
  },
  "file_name": "My Design",
  "developer_related_links": [],
  "exported_at": "2026-02-03T10:00:00.000Z"
}
```

## canvas.fig フォーマット

### ヘッダー構造 (16バイト)

| オフセット | サイズ  | 内容                         |
| ---------- | ------- | ---------------------------- |
| 0-7        | 8 bytes | マジック `fig-kiwi` (ASCII)  |
| 8          | 1 byte  | バージョン文字 (例: `0`)     |
| 9-11       | 3 bytes | 予約領域 (常に `00 00 00`)   |
| 12-15      | 4 bytes | ペイロードサイズ (uint32 LE) |

### ペイロード

- **圧縮形式**: Raw Deflate (`inflateRaw` で解凍)
- zlib ヘッダーなし、生の deflate ストリーム

### 解凍後のデータ構造

解凍後のデータは **Kiwi スキーマ** 形式でエンコードされている。

#### Kiwi スキーマ構造

```
[定義数: VarUint]
[定義1]
[定義2]
...
```

#### 定義の構造

```
[名前: Null終端文字列]
[種類: 1 byte] (0=ENUM, 1=STRUCT, 2=MESSAGE)
[フィールド数: VarUint]
[フィールド1]
[フィールド2]
...
```

#### フィールドの構造

```
[名前: Null終端文字列]
[型ID: VarInt] (負数=プリミティブ、0以上=定義への参照)
[配列フラグ: 1 byte] (0=単一値, 1=配列)
[値: VarUint] (ENUMの場合は値、それ以外はフィールド番号)
```

#### プリミティブ型ID

| ID  | 型             |
| --- | -------------- |
| -1  | bool           |
| -2  | byte           |
| -3  | int (VarInt)   |
| -4  | uint (VarUint) |
| -5  | float          |
| -6  | string         |
| -7  | int64          |
| -8  | uint64         |

### 文字列エンコーディング

**重要**: fig-kiwi 形式では文字列は **ヌル終端** である。
標準の Kiwi 形式（長さプレフィックス）とは異なる。

### Floatエンコーディング

Kiwi 形式の float は **ビット回転** を使用してエンコードされる:

1. 値が 0 の場合は単一の `0x00` バイト
2. 非ゼロの場合:
   - IEEE 754 float32 のビットを取得
   - 下位9ビットを上位に、上位23ビットを下位に回転: `(bits >> 23) | (bits << 9)`
   - 4バイトの little-endian で格納

デコード時は逆操作: `(bits << 23) | (bits >> 9)`

例: 1.0 (`0x3f800000`) → 回転後 `0x0000007f` → 格納 `7f 00 00 00`

### データチャンク構造

ファイルは2つの圧縮チャンクで構成:

1. **スキーマチャンク** (サイズはヘッダーの payloadSize)
2. **データチャンク** (4バイト LE サイズプレフィックス + 圧縮データ)

```
[Header 16 bytes]
[Schema chunk: payloadSize bytes, deflate compressed]
[Data chunk size: 4 bytes LE]
[Data chunk: deflate compressed message data]
```

## example.canvas.fig の解析結果

| 項目                | 値           |
| ------------------- | ------------ |
| ファイルサイズ      | 17,925 bytes |
| マジック            | `fig-kiwi`   |
| バージョン          | `0`          |
| ペイロード (圧縮)   | 17,909 bytes |
| ペイロード (解凍後) | 37,018 bytes |
| 圧縮率              | 48.4%        |

### スキーマ定義

| 種類     | 数      |
| -------- | ------- |
| ENUM     | 115     |
| STRUCT   | 18      |
| MESSAGE  | 174     |
| **合計** | **307** |

### 主要な型定義

#### NodeType (ENUM)

ノードの種類を表す。値は `figma-schema.json` の NodeType enum が正（`node-types.ts` はこれに合わせる）。

| 値  | 名前              | 値  | 名前            |
| --- | ----------------- | --- | --------------- |
| 0   | NONE              | 14  | SLICE           |
| 1   | DOCUMENT          | 15  | SYMBOL          |
| 2   | CANVAS            | 16  | INSTANCE        |
| 3   | GROUP             | 17  | STICKY          |
| 4   | FRAME             | 18  | SHAPE_WITH_TEXT |
| 5   | BOOLEAN_OPERATION | 19  | CONNECTOR       |
| 6   | VECTOR            | 20  | CODE_BLOCK      |
| 7   | STAR              | 21  | WIDGET          |
| 8   | LINE              | 22  | STAMP           |
| 9   | ELLIPSE           | 23  | MEDIA           |
| 10  | RECTANGLE         | 24  | HIGHLIGHT       |
| 11  | REGULAR_POLYGON   | 25  | **SECTION**     |
| 12  | ROUNDED_RECTANGLE | 26  | SECTION_OVERLAY |
| 13  | TEXT              | 29  | TABLE           |

> **注意**: `node-types.ts` の値は `figma-schema.json` の NodeType enum に完全一致させること。
> 過去にずれがあり（SECTION が 29 ではなく 25 等）、Figmaインポートが失敗する原因となった。

#### Color (STRUCT)

```
r: float, g: float, b: float, a: float
```

#### Vector (STRUCT)

```
x: float, y: float
```

#### Rect (STRUCT)

```
x: float, y: float, w: float, h: float
```

#### Matrix (STRUCT)

2x3 アフィン変換行列。`m02` / `m12` が平行移動（位置）を表す。

```
m00: float, m01: float, m02: float (translation x)
m10: float, m11: float, m12: float (translation y)
```

**座標系**: 子ノードの transform は**親に対する相対座標**。
Canvas 直下のノードはキャンバス上の絶対座標だが、
Section / Frame / Group 内のノードは親の左上を原点とした相対座標になる。

```
例: Section(600, 50) の中にフレームを (30, 40) の位置に配置する場合
  → position(30, 40)  ✓
  → position(630, 90)  ✗ （絶対座標を指定するとセクション外にはみ出す）
```

#### Paint (MESSAGE)

塗りの定義。type, color, opacity, blendMode, stops (グラデーション用), image など22フィールド。

#### Effect (MESSAGE)

エフェクト定義。type (INNER_SHADOW, DROP_SHADOW, FOREGROUND_BLUR, BACKGROUND_BLUR), color, offset, radius など。

### ドキュメントデータ

`example.canvas.fig` にはスキーマ定義に加え、実際のドキュメントデータが含まれている。
パース結果は `example.canvas.example.canvas.json` を参照。

#### ドキュメント構造

```
Document (DOCUMENT)
├── Internal Only Canvas (CANVAS) [hidden]
└── Page 1 (CANVAS)
    ├── Vector (VECTOR)
    ├── Ellipse (ELLIPSE)
    └── esbuild (TEXT)
```

#### ノードの共通プロパティ

- `guid`: ノード識別子 (sessionID, localID)
- `phase`: CREATED / REMOVED
- `type`: ノード種別 (NodeType)
- `name`: ノード名
- `visible`: 表示/非表示
- `opacity`: 不透明度
- `blendMode`: ブレンドモード
- `transform`: 変換行列 (Matrix)

#### 図形ノードのプロパティ

- `size`: サイズ (Vector)
- `strokeWeight`: 線の太さ（**必須**、デフォルト `0`）
- `strokeAlign`: 線の位置（**必須**、デフォルト `CENTER`）
- `strokeJoin`: 線の結合（**必須**、デフォルト `MITER`）
- `fillPaints`: 塗りのリスト (Paint[])
- `strokePaints`: 線のリスト (Paint[])
- `fillGeometry` / `strokeGeometry`: ジオメトリデータ

> **注意**: `strokeWeight`, `strokeAlign`, `strokeJoin` は値が 0/デフォルトでも明示的に設定が必要。
> 未設定の場合、Figmaインポート時に "Internal error during import" エラーになる。

## 圧縮形式

fig-kiwiでは2種類の圧縮形式が使用される：

| 形式            | 用途                         | 検出方法              |
| --------------- | ---------------------------- | --------------------- |
| **Deflate Raw** | スキーマチャンク             | マジックバイトなし    |
| **Zstd**        | メッセージチャンク（新形式） | `0x28 0xb5 0x2f 0xfd` |

ビルダーは互換性のため両形式をサポートする必要がある。

## Blob（ジオメトリデータ）

### 概要

図形のパスデータは `blobs` 配列にバイナリ形式で格納され、ノードの `fillGeometry` / `strokeGeometry` から参照される。

### fillGeometry 構造

```typescript
{
  windingRule: { value: 0, name: "NONZERO" },  // 0=NONZERO, 1=EVENODD
  commandsBlob: 0,  // blobs配列へのインデックス
  styleID: 0
}
```

### Blob バイナリフォーマット

パスコマンドの連続。各コマンドは1バイトのタイプ + 座標データ。

| コマンド | 値     | 座標                                      |
| -------- | ------ | ----------------------------------------- |
| MOVE_TO  | `0x01` | x, y (float32 LE × 2)                     |
| LINE_TO  | `0x02` | x, y (float32 LE × 2)                     |
| CUBIC_TO | `0x04` | c1x, c1y, c2x, c2y, x, y (float32 LE × 6) |
| CLOSE    | `0x06` | なし                                      |

**注意**: Figmaは `CLOSE` コマンドを使わず、始点への `LINE_TO` で閉じる。

### 矩形 (140×140) の例

```
01 00 00 00 00 00 00 00 00   # MOVE_TO (0, 0)
02 00 00 0c 43 00 00 00 00   # LINE_TO (140, 0)
02 00 00 0c 43 00 00 0c 43   # LINE_TO (140, 140)
02 00 00 00 00 00 00 0c 43   # LINE_TO (0, 140)
02 00 00 00 00 00 00 00 00   # LINE_TO (0, 0) - 閉じる
00                           # 終端
```

## SessionID パターン

ノードの `guid` は `{ sessionID, localID }` で構成される。

| sessionID | 用途           | 例                                               |
| --------- | -------------- | ------------------------------------------------ |
| `0`       | システムノード | DOCUMENT, CANVAS（ページ）, Internal Only Canvas |
| `1`       | ユーザーノード | FRAME, RECTANGLE, TEXT など                      |

### 例

```
DOCUMENT         guid=0:0
├── Page 1       guid=0:1  (CANVAS)
├── Internal     guid=0:2  (CANVAS, internalOnly=true)
└── Frame        guid=1:2  (FRAME, user-created)
    └── Rect     guid=1:3  (RECTANGLE)
```

## Internal Only Canvas

Figmaファイルには **Internal Only Canvas** が必須。これは非表示の内部用キャンバス。

```typescript
{
  guid: { sessionID: 0, localID: 2 },
  phase: { value: 0, name: "CREATED" },
  parentIndex: {
    guid: { sessionID: 0, localID: 0 },  // DOCUMENTを指す
    position: "~"  // 常に最後に配置
  },
  type: { value: 2, name: "CANVAS" },
  name: "Internal Only Canvas",
  visible: false,
  internalOnly: true,
  // ... 他のフィールド
}
```

## ビルダーの使用

### 基本的な使用例

```typescript
import { FigFileBuilder, createRectBlob, createFillGeometry } from "@aurochs/fig";

const builder = new FigFileBuilder();

// Blob（ジオメトリ）を追加
const blobIndex = builder.addBlob(createRectBlob(100, 80));

// ドキュメント構造を作成
const docID = builder.addDocument("My Design");
const canvasID = builder.addCanvas(docID, "Page 1");
builder.addInternalCanvas(docID); // 必須

// フレームを追加
builder.addFrame({
  localID: builder.getNextID(),
  parentID: canvasID,
  name: "Frame",
  size: { x: 100, y: 80 },
  transform: { m00: 1, m01: 0, m02: 50, m10: 0, m11: 1, m12: 50 },
  fillPaints: [
    {
      type: { value: 0, name: "SOLID" },
      color: { r: 1, g: 1, b: 1, a: 1 },
      opacity: 1,
      visible: true,
      blendMode: { value: 1, name: "PASS_THROUGH" },
    },
  ],
  fillGeometry: [createFillGeometry(blobIndex)],
});

// ファイル生成
const data = await builder.buildAsync({ fileName: "my-design" });
```

### 有効なファイルの要件

1. **DOCUMENT** ノード（ルート）
2. **CANVAS** ノード（ページ、1つ以上）
3. **Internal Only Canvas**（`internalOnly: true`, `position: "~"`）
4. **meta.json**（ファイル名、背景色等）
5. **thumbnail.png**（必須。1x1 ピクセルのプレースホルダーでも可）
6. **strokeWeight / strokeAlign / strokeJoin** が全図形ノードに必須（未設定だとインポートエラー）

## ラウンドトリップ

既存ファイルの読み込み・修正・保存：

```typescript
import { loadFigFile, saveFigFile } from "@aurochs/fig";

// 読み込み
const loaded = await loadFigFile(fileData);

// ノードを変更
loaded.nodeChanges[0].name = "Updated Name";

// 保存（元のスキーマを維持）
const saved = await saveFigFile(loaded);

// スキーマも再エンコード（検証用）
const saved = await saveFigFile(loaded, { reencodeSchema: true });
```

## 参考資料

- [fig-kiwi (npm)](https://www.npmjs.com/package/fig-kiwi)
- [evanw/kiwi (GitHub)](https://github.com/evanw/kiwi)
- [Figma .fig file parser online](https://madebyevan.com/figma/fig-file-parser/)
