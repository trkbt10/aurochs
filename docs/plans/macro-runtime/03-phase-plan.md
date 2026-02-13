# 03. 実装フェーズ計画

## Phase 0: 基準固定（仕様と観測）

成果物:

- 仕様抽出: `docs/plans/macro-runtime/01-spec-extract.md`
- テストケース選定: `docs/plans/macro-runtime/04-test-cases.md`
- 現状ギャップの明文化（macro loss の再現条件）

完了条件:

- `docm/xlsm/pptm/ppsm` の保持要件がチェックリスト化されている

## Phase 1 事前ブロッカー（2026-02-12 時点）

1. High: 現行保存経路が再構築ベースで macro を保持しない  
   `packages/@aurochs-builder/xlsx/src/exporter.ts:295`  
   `packages/@aurochs-office/docx/src/exporter.ts:266`  
   `packages/@aurochs-office/docx/src/exporter.ts:61`  
   `packages/@aurochs-office/docx/src/constants.ts:176`
2. High: `xlMacrosheet` only ケースで worksheet 前提の patcher が失敗する  
   `packages/@aurochs-office/xlsx/src/workbook-patcher.ts:140`
3. Medium: UI の保存既定が macroEnabled 維持と衝突しやすい  
   `packages/@aurochs-ui/xlsx-editor/src/dev/XlsxWorkbookPage.tsx:802`  
   `packages/@aurochs-ui/pptx-editor/src/presentation/hooks/use-export-presentation.ts:133`
4. Medium: 仕様抽出で `docm/pptm/ppsm` main content type の明示粒度が不足していた  
   `docs/plans/macro-runtime/01-spec-extract.md:16`

警告:

- 上記 1 と 2 を解消しない限り、Phase 1 の「保持・非破壊」完了条件は成立しない

## Phase 1 開始条件（ゲート）

1. macroEnabled 入力で「再構築 exporter を通す経路」と「pass-through 経路」を明示分離する
2. `xlMacrosheet` の root 要素を許容できるパッチ経路を先に定義する
3. UI の保存拡張子と MIME 候補を macroEnabled 入力に整合させる
4. format 別 main content type（`xlsm/docm/pptm/ppsm`）を仕様表に固定する

## Phase 1: 保存・受け渡し（非実行）

対象:

- `docm/xlsm/pptm/ppsm` の macro package 保持
- `pptm` と `ppsm` は同一の package 処理経路を共有し、差分は main content type のみとして扱う

必須要件:

1. main content type を macroEnabled のまま保持
2. `vbaProject.bin` をバイト同一で保持
3. `vbaProject` relationship を保持
4. `xlsm` の `xlMacrosheet` を保持
5. 未知 part を落とさない
6. `pptm/ppsm` で main content type を相互に取り違えない

完了条件:

- 指定 fixture で「保存後も macro 関連 part/rels/content type が不変」

## Phase 2: OVBA read-only 解析

対象:

- `vbaProject.bin` から module / procedure を抽出

必須要件:

1. parser は read-only
2. parse error を構造化して返す
3. host 非依存 IR を出力

完了条件:

- `SimpleMacro` 系 fixture で entrypoint 列挙ができる

## Phase 3: 共通ランタイム（最小 subset）

対象:

- 制御構文・式評価・手続き呼び出しのコア

必須要件:

1. host API は interface 注入
2. 引数不足は `throw`（暗黙補完しない）
3. 未対応機能は明示エラー

完了条件:

- host 非依存ユニットテストで deterministic 実行

## Phase 4: ホスト固有ランタイム

対象順序:

1. Excel adapter
2. Word adapter
3. PowerPoint adapter

必須要件:

1. host ごとに object model を分離
2. 共有ロジックは core runtime へ寄せる
3. host 依存実装の循環参照を作らない

完了条件:

- 同一 runtime core で host adapter を差し替え可能

## リスク管理

1. 仕様の読み違いによる part/rels 欠落
2. runtime core への host 依存混入
3. `xlsm` 特有（`xlMacrosheet`）の見落とし
4. fixture 側の異常ファイル混入（拡張子と実体の不一致）
