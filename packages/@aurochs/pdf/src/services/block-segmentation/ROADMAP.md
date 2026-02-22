# Block Segmentation Roadmap

## Goal
`@aurochs/pdf/services/block-segmentation` を、横書き・縦書き・表組み混在レイアウトで再利用可能なセグメンテーション基盤にする。

## Corpus Cases
`corpus-pdf-builder.ts` で次の8ケースを生成する。

1. `horizontal-long-single`
2. `horizontal-long-two-column`
3. `paper-cover-abstract-two-column`
4. `table-with-rules`
5. `jp-public-doc-merged-cells`
6. `vertical-long-single`
7. `vertical-two-columns`
8. `vertical-three-columns`

## Implemented in this step

- ケースPDF生成器を追加（`corpus-pdf-builder.ts`）
- コーパス一括生成スクリプトを追加（`scripts/generate-block-segmentation-corpus.ts`）
- コーパス検証specを追加（`segmentation-corpus.spec.ts`）
- 空間グルーピングに writing mode 判定を追加
  - `writingMode: auto|horizontal|vertical`
  - `verticalColumnOrder: right-to-left|left-to-right`
- vertical 専用の column clustering / paragraph splitting を追加

## Next Optimization Plan

1. **Table-Aware Segmentation (Path+Text Fusion)**
- 罫線/塗り矩形からセル領域を推定して text grouping に反映
- merged-cell 推定を block segmentation 側で完結

2. **Title/Abstract/Body Structural Layers**
- フォントサイズ・位置・幅比率を使い、title/section/body の層を明示分類
- 二段本文への遷移点（single→multi-column）を判定

3. **Vertical Reading Flow Refinement**
- 右→左列の読み順に加え、句読点・約物の接続ルールを改善
- column間連結（同段落継続）をオプション化

4. **Deterministic Scoring and Debug Output**
- 「どの条件で split/merge したか」を構造化ログで出力
- 回帰時に diff 可能な JSON サマリを保存

## Acceptance Criteria

- 8ケースすべてで expected group range を満たす
- required tokens が group text に保持される
- 横書き既存回帰 (`spatial-grouping.spec.ts`) を壊さない
