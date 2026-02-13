# VBA Parser 検証依頼レポート

**作成日**: 2026-02-12
**対象**: Phase 2 OVBA Parser 実装
**ステータス**: 検証待ち

---

## 1. 概要

MS-OVBA (Office VBA File Format) 仕様に基づく vbaProject.bin パーサーを実装しました。
本レポートは実装したファイルの一覧と検証観点をまとめたものです。

### 1.1 実装スコープ

| 機能 | 説明 | 完了 |
|------|------|------|
| VBA 圧縮解凍 | MS-OVBA 2.4.1 LZ ベース圧縮 | ✅ |
| dir stream 解析 | モジュール情報・参照情報の抽出 | ✅ |
| PROJECT stream 解析 | プロジェクトメタデータの抽出 | ✅ |
| モジュール抽出 | ソースコードのデコード | ✅ |
| プロシージャ抽出 | Sub/Function/Property の列挙 | ✅ |
| 参照情報抽出 | 外部ライブラリ参照の列挙 | ✅ |

---

## 2. 新規作成ファイル一覧

### 2.1 パッケージ構成ファイル

| ファイル | 説明 |
|---------|------|
| `packages/@aurochs-office/vba/package.json` | パッケージ定義 |
| `packages/@aurochs-office/vba/tsconfig.json` | TypeScript 設定 |

### 2.2 型定義・エラー

| ファイル | 行数 | 説明 |
|---------|------|------|
| `src/types.ts` | ~160 | VbaProgramIr, VbaModule, VbaProcedure 等の型定義 |
| `src/errors.ts` | ~30 | VbaParseError, VbaNotImplementedError |
| `src/index.ts` | ~10 | Public API エクスポート |

### 2.3 パーサー実装

| ファイル | 行数 | 説明 | 検証優先度 |
|---------|------|------|-----------|
| `src/parser/compression.ts` | ~145 | VBA 圧縮解凍アルゴリズム | **高** |
| `src/parser/dir-stream.ts` | ~480 | dir stream パーサー | **高** |
| `src/parser/project-stream.ts` | ~80 | PROJECT stream パーサー | 中 |
| `src/parser/procedure-parser.ts` | ~160 | VBA ソースからプロシージャ抽出 | 中 |
| `src/parser/vba-project.ts` | ~250 | メインパーサーエントリポイント | **高** |
| `src/parser/index.ts` | ~5 | エクスポート |低 |

### 2.4 IR (中間表現) 型定義

| ファイル | 行数 | 説明 |
|---------|------|------|
| `src/ir/statement.ts` | ~100 | VBA 文の AST 型 (Phase 3 用スタブ) |
| `src/ir/expression.ts` | ~80 | VBA 式の AST 型 (Phase 3 用スタブ) |
| `src/ir/index.ts` | ~5 | エクスポート |

### 2.5 Host API (Phase 4 用スタブ)

| ファイル | 行数 | 説明 |
|---------|------|------|
| `src/host/api.ts` | ~40 | HostApi インターフェース定義 |
| `src/host/index.ts` | ~5 | エクスポート |

### 2.6 Runtime (Phase 3 用スタブ)

| ファイル | 行数 | 説明 |
|---------|------|------|
| `src/runtime/index.ts` | ~20 | executeVba() スタブ |

---

## 3. テストファイル一覧

### 3.1 VBA パッケージテスト

| ファイル | テスト数 | 説明 |
|---------|---------|------|
| `src/parser/compression.spec.ts` | 5 | 圧縮解凍の単体テスト |
| `src/parser/dir-stream.spec.ts` | 2 | dir stream 解析テスト |
| `src/parser/procedure-parser.spec.ts` | 14 | プロシージャ抽出テスト |
| `src/parser/vba-project.spec.ts` | 11 | 統合テスト (XLSM/DOCM/PPTM) |
| `src/parser/explore-vba-project.spec.ts` | 10 | 探索的テスト |

### 3.2 マクロ保持テスト

| ファイル | テスト数 | 説明 |
|---------|---------|------|
| `spec/macro-preservation/utils.ts` | - | テストユーティリティ |
| `spec/macro-preservation/xlsm-preservation.spec.ts` | 26 | XLSM roundtrip テスト |
| `spec/macro-preservation/docm-preservation.spec.ts` | 9 | DOCM roundtrip テスト |
| `spec/macro-preservation/pptm-preservation.spec.ts` | 11 | PPTM roundtrip テスト |
| `spec/macro-preservation/ppsm-preservation.spec.ts` | 6 | PPSM roundtrip テスト |

---

## 4. 検証観点

### 4.1 compression.ts

**目的**: MS-OVBA 2.4.1 仕様の VBA 圧縮コンテナを解凍

**検証ポイント**:
1. シグネチャバイト (0x01) の検証
2. チャンクヘッダーのパース (bits 0-11: サイズ, bits 12-14: シグネチャ, bit 15: 圧縮フラグ)
3. コピートークンのビット幅計算 (デコード位置に依存)
4. 複数チャンクの連続処理

**テストケース**:
- 無効なシグネチャでエラー
- 空入力の処理
- 実際の fixture (SimpleMacro.xlsm) での解凍

### 4.2 dir-stream.ts

**目的**: VBA/dir ストリームからモジュール・参照情報を抽出

**検証ポイント**:
1. PROJECTINFORMATION セクションの順次パース
2. PROJECTREFERENCES セクションの参照抽出
3. PROJECTMODULES セクションのモジュール抽出
4. MBCS + Unicode 複合レコード構造の正しい処理
5. textOffset (圧縮データ開始位置) の正確な取得

**テストケース**:
- プロジェクト名の抽出
- コードページの抽出
- モジュール数の一致
- 参照情報の抽出

### 4.3 vba-project.ts

**目的**: vbaProject.bin の統合パーサー

**検証ポイント**:
1. CFB コンテナのオープン
2. PROJECT stream の解析
3. VBA/dir stream の解凍・解析
4. 各モジュールストリームの解凍・ソースコード取得
5. プロシージャの抽出
6. 参照情報の変換

**テストケース**:
- XLSM: 5 モジュール、1 プロシージャ (TestMacro)、2 参照 (stdole, Office)
- DOCM: 2 モジュール、1 プロシージャ、3 参照
- PPTM: 1 モジュール、1 プロシージャ、2 参照

### 4.4 procedure-parser.ts

**目的**: VBA ソースコードからプロシージャ定義を抽出

**検証ポイント**:
1. Sub/Function/Property Get/Let/Set の識別
2. Public/Private の可視性判定
3. パラメータ (ByVal/ByRef, Optional, ParamArray) の解析
4. 戻り値型の解析
5. Attribute 行の無視

**テストケース**:
- 各プロシージャタイプの正しいパース
- パラメータ修飾子の正しい解析
- 複数プロシージャの抽出

---

## 5. テスト実行結果

```
$ bun test packages/@aurochs-office/vba/
42 pass, 0 fail

$ bun test spec/macro-preservation/
52 pass, 0 fail

$ bun run typecheck
✓ No errors
```

**合計**: 94 tests passing

---

## 6. 使用 Fixture

| ファイル | 用途 |
|---------|------|
| `fixtures/poi-test-data/test-data/spreadsheet/SimpleMacro.xlsm` | XLSM パース検証 |
| `fixtures/poi-test-data/test-data/spreadsheet/xlmmacro.xlsm` | XLM マクロ検証 |
| `fixtures/poi-test-data/test-data/document/SimpleMacro.docm` | DOCM パース検証 |
| `fixtures/poi-test-data/test-data/slideshow/SimpleMacro.pptm` | PPTM パース検証 |
| `fixtures/poi-test-data/test-data/slideshow/testPPT.ppsm` | PPSM 検証 |

---

## 7. 依存関係

```
@aurochs-office/vba
├── @aurochs-office/cfb  (vbaProject.bin は CFB 形式)
└── (devDependencies)
    └── vitest
```

---

## 8. 既知の制限事項

1. **コードページ変換**: 現在は UTF-8 互換 (ASCII) のみ対応。Windows-1252 等の完全なコードページ変換は未実装。

2. **REFERENCECONTROL**: ActiveX コントロール参照の完全な解析は部分的。libId は抽出されるが、一部フィールドはスキップ。

3. **プロシージャパーサー**: 正規表現ベースの簡易実装。ネストした括弧やコメント内の偽陽性に対する堅牢性は限定的。

4. **PROJECTVERSION 後の未知バイト**: 一部のファイルで PROJECTVERSION と PROJECTCONSTANTS の間に 2 バイトの未知データが存在。スキャンで対応済みだが根本原因は未特定。

---

## 9. 検証依頼事項

### 必須確認

- [ ] 各テストが実際に意図した検証を行っているか
- [ ] compression.ts のコピートークン処理が MS-OVBA 仕様と一致しているか
- [ ] dir-stream.ts のレコード構造パースが仕様と一致しているか
- [ ] エッジケース (空モジュール、長い名前、特殊文字) の処理

### 推奨確認

- [ ] 追加の fixture ファイルでのテスト
- [ ] メモリ効率 (大きな vbaProject.bin での挙動)
- [ ] エラーメッセージの明確さ

---

## 10. 次のステップ (Phase 3)

Phase 2 完了後は Phase 3 (共通ランタイム) に進む予定:

1. VBA AST パーサー (`src/ir/` の型を使用)
2. 基本的な式評価器
3. 制御構文の実行 (If, For, While, etc.)
4. 手続き呼び出し

---

**レポート作成者**: Claude Code
**レビュー待ち**: はい
