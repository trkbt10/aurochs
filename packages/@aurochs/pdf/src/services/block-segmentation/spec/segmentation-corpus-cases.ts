/**
 * @file Corpus case metadata for block segmentation fixture PDFs.
 */

export type SegmentationCorpusCaseId =
  | "courts-hanrei-87071"
  | "mlit-hakusho-r07-np101100"
  | "horizontal-long-single"
  | "horizontal-long-two-column"
  | "paper-cover-abstract-two-column"
  | "table-with-rules"
  | "jp-public-doc-merged-cells"
  | "rtl-arabic-pdfjs"
  | "vertical-long-single"
  | "vertical-two-columns"
  | "vertical-three-columns";

export type SegmentationCorpusExpectation = {
  readonly writingMode: "horizontal" | "vertical";
  readonly minGroups: number;
  readonly maxGroups: number;
  readonly requiredTokens: readonly string[];
};

export type SegmentationCorpusCase = {
  readonly id: SegmentationCorpusCaseId;
  readonly title: string;
  readonly description: string;
  readonly expectation: SegmentationCorpusExpectation;
};

export const SEGMENTATION_CORPUS_CASES: readonly SegmentationCorpusCase[] = [
  {
    id: "courts-hanrei-87071",
    title: "裁判例 87071（判決文）",
    description: "裁判所公開の判決文レイアウト（横書き長文）を確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 3,
      maxGroups: 8,
      requiredTokens: ["主 文", "第１ 請求", "第２ 事案の概要"],
    },
  },
  {
    id: "mlit-hakusho-r07-np101100",
    title: "国土交通白書 R07 np101100",
    description: "白書PDF（横書き、図表混在）のグルーピングを確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 12,
      maxGroups: 40,
      requiredTokens: ["担い手不足等によるサービスの供給制約", "国土交通分野における担い手不足等に", "第1章"],
    },
  },
  {
    id: "horizontal-long-single",
    title: "長文の横書き（単段）",
    description: "横書き長文が単一ブロックとしてまとまることを確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 1,
      maxGroups: 3,
      requiredTokens: ["【単段横書き】", "吾輩は猫である"],
    },
  },
  {
    id: "horizontal-long-two-column",
    title: "長文の横書き（二段）",
    description: "左右二段の本文が列境界で分離されることを確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 2,
      maxGroups: 8,
      requiredTokens: ["【左段】", "【右段】"],
    },
  },
  {
    id: "paper-cover-abstract-two-column",
    title: "論文表紙風（タイトル・アブストラクト・段組）",
    description: "タイトル/要約/本文段組の混在レイアウトを確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 4,
      maxGroups: 12,
      requiredTokens: ["SEGMENTATION STUDY", "ABSTRACT", "【本文左段】", "【本文右段】"],
    },
  },
  {
    id: "table-with-rules",
    title: "罫線・テーブルを含む文章",
    description: "段落と罫線表の混在時にセル境界が崩れないことを確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 4,
      maxGroups: 24,
      requiredTokens: ["【罫線付き本文】", "品目", "仕様", "備考"],
    },
  },
  {
    id: "jp-public-doc-merged-cells",
    title: "日本の公文書風（セル結合テーブル）",
    description: "結合セル付き表の境界推定を確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 5,
      maxGroups: 30,
      requiredTokens: ["様式第1号", "申請者情報", "連絡先", "所在地"],
    },
  },
  {
    id: "rtl-arabic-pdfjs",
    title: "RTL アラビア語（pdf.js sample）",
    description: "公開PDF fixture を使って RTL run order を確認する。",
    expectation: {
      writingMode: "horizontal",
      minGroups: 1,
      maxGroups: 2,
      requiredTokens: ["عاﻮﻧا", "ﺔﻴﺑﺮﻌﻟا"],
    },
  },
  {
    id: "vertical-long-single",
    title: "縦書き長文",
    description: "縦書き単段が単一ブロックとしてまとまることを確認する。",
    expectation: {
      writingMode: "vertical",
      minGroups: 1,
      maxGroups: 1,
      requiredTokens: ["【縦一段】", "縦書き本文です"],
    },
  },
  {
    id: "vertical-two-columns",
    title: "縦書き二段",
    description: "縦書きの二段構成が列単位で分離されることを確認する。",
    expectation: {
      writingMode: "vertical",
      minGroups: 2,
      maxGroups: 2,
      requiredTokens: ["【右段】", "【左段】"],
    },
  },
  {
    id: "vertical-three-columns",
    title: "縦書き上中下三段",
    description: "縦書きの上段・中段・下段の三段構成を確認する。",
    expectation: {
      writingMode: "vertical",
      minGroups: 1,
      maxGroups: 2,
      requiredTokens: ["【上段】", "【中段】", "【下段】"],
    },
  },
] as const;
