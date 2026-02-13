# 02. レイヤ分割アーキテクチャ

## 1. 分割

1. 保存・受け渡し層（OOXML macro package layer）
2. 共通構文解析層（OVBA parser layer）
3. 共通ランタイム層（VBA core runtime layer）
4. ホスト固有ランタイム層（Excel/Word/PowerPoint adapters）

## 2. 依存方向

`Host Adapter (Excel/Word/PPT)` -> `VBA Core Runtime` -> `OVBA Parser` -> `OOXML Macro Package`

補足:

- `VBA Core Runtime` は host concrete 実装に依存しない
- host 固有実装は runtime が定義する interface を実装して注入する

## 3. 各層の責務

## 3.1 保存・受け渡し層

責務:

- macroEnabled content type の維持
- `vbaProject` / `xlMacrosheet` relationship の維持
- 未知 part のパススルー
- `vbaProject.bin` のバイト同一保持

入出力（最小契約）:

- Input: `bytes`, `format`, `mainPartPath`
- Output: `macroPackage`（macro parts / rels / content types を含む）

例外方針:

- 必須引数欠落時は `throw`
- 自動推測に依存しない

## 3.2 共通構文解析層

責務:

- `vbaProject.bin` を読み取り、modules / procedures / metadata を抽出
- 解析結果を host 非依存 IR へ変換

入出力（最小契約）:

- Input: `vbaProjectBytes`
- Output: `VbaProgramIr`

例外方針:

- 破損バイナリは parse error として返す
- 実行可否はこの層では判定しない

## 3.3 共通ランタイム層

責務:

- call stack / scope / value model
- procedure 呼び出し、制御構文、式評価
- host API 呼び出しの dispatch

入出力（最小契約）:

- Input: `programIr`, `entrypoint`, `hostApi`
- Output: `executionResult`（state / logs / warnings）

例外方針:

- 未実装言語機能は `not-supported` を明示返却
- host API 未登録は `throw`

## 3.4 ホスト固有ランタイム層

責務:

- Excel/Word/PowerPoint object model の提供
- host イベントと runtime の橋渡し
- host 特有の制約（保護モードなど）の適用

入出力（最小契約）:

- Input: host document state
- Output: `HostApi` 実装

## 4. 先行実装順序

1. 保存・受け渡し層（`docm/xlsm/pptm/ppsm` 共通）
2. OVBA read-only 解析
3. VBA core runtime の最小 subset
4. Excel adapter
5. Word/PowerPoint adapter

## 5. 非目標（初期）

- VBA の全機能フル互換
- 旧バイナリ形式（`.doc/.xls/.ppt`）の同一パイプライン化
- マクロの自動実行（明示的な実行指示なし）
