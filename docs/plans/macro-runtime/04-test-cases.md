# 04. テストケース選定（準備）

## 1. 対象 fixture（repo 内）

走査対象:

- `fixtures/poi-test-data/test-data/spreadsheet/*.xlsm`
- `fixtures/poi-test-data/test-data/document/*.docm`
- `fixtures/poi-test-data/test-data/slideshow/*.{pptm,ppsm}`

## 2. 優先テストセット（最小）

| File | 目的 | 期待観測 |
| --- | --- | --- |
| `fixtures/poi-test-data/test-data/spreadsheet/SimpleMacro.xlsm` | 最小 VBA 付き `xlsm` | `xl/vbaProject.bin` と `vbaProject` rel が保持される |
| `fixtures/poi-test-data/test-data/spreadsheet/xlmmacro.xlsm` | `xlMacrosheet` only ケース | `xl/macrosheets/sheet1.xml` と `xlMacrosheet` rel が保持される |
| `fixtures/poi-test-data/test-data/spreadsheet/ExcelWithAttachments.xlsm` | macro + 埋め込み | `xl/embeddings/*` を落とさない |
| `fixtures/poi-test-data/test-data/spreadsheet/62629_target.xlsm` | `ctrlProps` 付き | `xl/ctrlProps/*` を落とさない |
| `fixtures/poi-test-data/test-data/spreadsheet/60512.xlsm` | macroEnabled だが `vbaProject.bin` なし | macroEnabled content type を維持し、通常 `xlsx` 化しない |
| `fixtures/poi-test-data/test-data/document/SimpleMacro.docm` | 最小 VBA 付き `docm` | `word/vbaProject.bin` と `vbaProject` rel が保持される |
| `fixtures/poi-test-data/test-data/slideshow/SimpleMacro.pptm` | 最小 VBA 付き `pptm` | `ppt/vbaProject.bin` と `vbaProject` rel が保持される |
| `fixtures/poi-test-data/test-data/slideshow/PPTWithAttachments.pptm` | macro + 埋め込み | `ppt/embeddings/*` を落とさない |
| `fixtures/poi-test-data/test-data/slideshow/testPPT.ppsm` | macroEnabled だが `vbaProject.bin` なし | slideshow macroEnabled content type を維持 |

## 3. 追加テストセット（拡張）

| File | 目的 |
| --- | --- |
| `fixtures/poi-test-data/test-data/spreadsheet/mv-calculator-final-2-20-2013.xlsm` | `ctrlProps` 大量ケース（163件） |
| `fixtures/poi-test-data/test-data/spreadsheet/64420.xlsm` | `xlMacrosheet` 変種 |
| `fixtures/poi-test-data/test-data/spreadsheet/47026.xlsm` | macroEnabled だが VBA なし |
| `fixtures/poi-test-data/test-data/spreadsheet/47089.xlsm` | macroEnabled だが VBA なし |
| `fixtures/poi-test-data/test-data/slideshow/testPPT.pptm` | macroEnabled だが VBA なし |

## 4. 除外・注意

`fixtures/poi-test-data/test-data/document/cpansearch.perl.org_src_tobyink_acme-rundoc-0.001_word-lib_hello_world.docm` は ZIP-OOXML ではなく CFB 実体だった。  
拡張子は `.docm` だが package 種別が異なるため、OOXML macro pass-through の基準 fixture からは除外する。

## 5. 検証観点

1. `[Content_Types].xml` の macroEnabled main type が不変
2. `vbaProject` relationship type/source/target が不変
3. `vbaProject.bin` のバイト列 hash が不変
4. `macrosheets` / `embeddings` / `ctrlProps` の件数が不変
5. 保存後拡張子が `.xlsx` へ変換されない（macroEnabled 入力時）

## 6. テスト構成方針

- ユニットは対象実装の近傍に `*.spec.ts` を配置
- 複数モジュール横断（parse->export roundtrip）は `spec/` に配置
- 最初は「保持・非破壊」の自動検証を優先し、実行ランタイム検証は後段フェーズで追加

## 7. Phase 1 ブロッカー再現テスト（先行）

1. `SimpleMacro.xlsm` roundtrip で `vbaProject.bin` と main content type が不変か
2. `SimpleMacro.docm` roundtrip で `word/vbaProject.bin` と main content type が不変か
3. `xlmmacro.xlsm` を patch 経路に通したとき例外を投げないか
4. `.xlsm` 入力時の保存名が `.xlsx` へ強制変換されないか
5. macroEnabled 入力時に export UI の MIME/拡張子候補が通常形式固定でないか
