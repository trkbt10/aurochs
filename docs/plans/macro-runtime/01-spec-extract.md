# 01. 仕様抽出（MS-OFFMACRO2 / MS-OVBA）

## 1. 仕様ソースと適用先

| Source | 主対象 | 実装レイヤ |
| --- | --- | --- |
| MS-OFFMACRO2 Workbook | `xlsm` の workbook part と関連 relationship | 保存・受け渡し |
| MS-OFFMACRO2 VBA Project | `vbaProject.bin` part の content type / relationship / target | 保存・受け渡し |
| MS-OFFMACRO2 Macro Sheet | `xl/macrosheets/sheetN.xml` と `xlMacrosheet` relationship | 保存・受け渡し |
| MS-OVBA | `vbaProject.bin` 内の VBA project 構造 | 共通構文解析 / 共通ランタイム |

## 2. 抽出結果（実装に効く点のみ）

## 2.1 Main Part Content Type（macroEnabled）

| Format | Main part | Main content type |
| --- | --- | --- |
| `xlsm` | `xl/workbook.xml` | `application/vnd.ms-excel.sheet.macroEnabled.main+xml` |
| `docm` | `word/document.xml` | `application/vnd.ms-word.document.macroEnabled.main+xml` |
| `pptm` | `ppt/presentation.xml` | `application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml` |
| `ppsm` | `ppt/presentation.xml` | `application/vnd.ms-powerpoint.slideshow.macroEnabled.main+xml` |

補足:

- `xlsm` の Workbook 要件（`vbaProject` / `xlMacrosheet`）は MS-OFFMACRO2 2.2.1.3 を基準にする
- `docm/pptm/ppsm` の main content type 文字列は現行 fixture の `[Content_Types].xml` でも確認済み

実装含意:

- format ごとに main content type を固定で維持し、通常 (`docx/xlsx/pptx`) へ落とさないこと
- `xlsm` では `xl/_rels/workbook.xml.rels` の `vbaProject` / `xlMacrosheet` を維持すること

## 2.2 VBA Project（MS-OFFMACRO2 2.2.1.4）

- VBA Project part content type は `application/vnd.ms-office.vbaProject`
- relationship type は `http://schemas.microsoft.com/office/2006/relationships/vbaProject`
- Source part は `word/document.xml` / `ppt/presentation.xml` / `xl/workbook.xml` のいずれか
- Target は通常 `vbaProject.bin`
- 各 Source part からは最大1件

実装含意:

- `docm/xlsm/pptm/ppsm` で同じ relationship type を共通処理できる
- host ごとの「main part path」は分岐が必要

## 2.3 Macro Sheet（MS-OFFMACRO2 2.2.1.5）

- Macro Sheet part content type は `application/vnd.ms-excel.macrosheet+xml`
- relationship type は `http://schemas.microsoft.com/office/2006/relationships/xlMacrosheet`
- Source は workbook part、Target は `macrosheets/sheetN.xml`
- `sheetN` は正の整数

実装含意:

- `xlsm` は `vbaProject.bin` が無くても macro 関連構造を持ちうる
- `xl/macrosheets/*` と relationship のセット保持が必須

## 2.4 OVBA（MS-OVBA）

- `vbaProject.bin` の内部構造（modules / streams / compression など）は OVBA 側で規定
- OOXML 側で維持できても、解析・実行を行うには OVBA パーサ層が必要

実装含意:

- 「パッケージ維持」と「VBA 解析」は分離する
- まず read-only 解析（module 名、procedures 取得）を完了条件にする

## 3. 共通化できる点 / できない点

共通化できる点:

- `vbaProject` relationship type
- `application/vnd.ms-office.vbaProject`
- `vbaProject.bin` の OVBA 解析

共通化できない点:

- Host object model（Excel/Word/PowerPoint）
- イベントモデルと UI 連携
- Excel 固有の `xlMacrosheet` 系

## 4. 仕様チェックリスト（実装前レビュー用）

1. 保存時に format 別の main content type が macroEnabled のままか
2. `vbaProject` relationship の type/source/target を保持しているか
3. `vbaProject.bin` をバイト同一で保持しているか
4. `xlMacrosheet` 関連 part/rels を欠落させていないか
5. `docm/xlsm/pptm/ppsm` で main part path の分岐を明示しているか
