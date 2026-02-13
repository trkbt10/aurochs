# Macro Enabled Formats Plan (`docm` / `xlsm` / `pptm` / `ppsm`)

## 目的

`docm` / `xlsm` / `pptm` / `ppsm` のマクロ対応を、以下の4層で分割して実装できるようにする。

1. マクロ関連パーツの保存・受け渡し（OOXML パッケージ層）
2. 共通構文解析（`vbaProject.bin` / OVBA）
3. 共通ランタイム（言語処理コア）
4. ホスト固有ランタイム（Excel / Word / PowerPoint）

本ディレクトリは「実装タスク前の計画と仕様整理」をまとめる。

方針メモ:

- Phase 1 では `ppsm` を正式スコープに含める
- `pptm` と `ppsm` は同一実装経路を共有し、main content type の違いのみを分岐点とする

## 参照仕様（取得日: 2026-02-12）

- MS-OFFMACRO2 Workbook  
  https://learn.microsoft.com/en-us/openspecs/office_standards/ms-offmacro2/fa1f6007-088f-4f54-ba65-83b5a9d635a6
- MS-OFFMACRO2 VBA Project  
  https://learn.microsoft.com/en-us/openspecs/office_standards/ms-offmacro2/1527aa6b-c091-435f-86b3-1413abe8f8f4
- MS-OFFMACRO2 Macro Sheet  
  https://learn.microsoft.com/en-us/openspecs/office_standards/ms-offmacro2/1de8055f-535b-4ebc-ba18-8d25e2986c89
- MS-OVBA  
  https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-ovba/575462ba-bf67-4190-9fac-c275523c75fc

## ドキュメント構成

- `docs/plans/macro-runtime/01-spec-extract.md`  
  仕様抽出（MS-OFFMACRO2 / MS-OVBA）と実装観点への対応付け
- `docs/plans/macro-runtime/02-layered-architecture.md`  
  4層分割の境界、依存方向、最小 API 契約
- `docs/plans/macro-runtime/03-phase-plan.md`  
  実装フェーズ、完了条件、非目標
- `docs/plans/macro-runtime/04-test-cases.md`  
  既存 fixture からのテストケース選定（`docm/xlsm/pptm/ppsm`）
