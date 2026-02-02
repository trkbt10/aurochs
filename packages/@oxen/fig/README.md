# @oxen/fig

Figma ファイル (.fig) のパーサー・ビルダー

## ファイルフォーマット解析

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

ノードの種類を表す。DOCUMENT, CANVAS, GROUP, FRAME, VECTOR, RECTANGLE, TEXT, INSTANCE など37種類。

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

2x3 アフィン変換行列。

```
m00: float, m01: float, m02: float
m10: float, m11: float, m12: float
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
- `strokeWeight`: 線の太さ
- `strokeAlign`: 線の位置 (CENTER/INSIDE/OUTSIDE)
- `fillPaints`: 塗りのリスト (Paint[])
- `strokePaints`: 線のリスト (Paint[])
- `fillGeometry` / `strokeGeometry`: ジオメトリデータ

## 参考資料

- [fig-kiwi (npm)](https://www.npmjs.com/package/fig-kiwi)
- [evanw/kiwi (GitHub)](https://github.com/evanw/kiwi)
- [Figma .fig file parser online](https://madebyevan.com/figma/fig-file-parser/)
