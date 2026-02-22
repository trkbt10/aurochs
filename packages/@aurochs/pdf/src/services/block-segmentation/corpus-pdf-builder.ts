/**
 * @file PDF corpus builder for block segmentation scenarios.
 */

import PDFDocument from "pdfkit";

export type SegmentationCorpusCaseId =
  | "horizontal-long-single"
  | "horizontal-long-two-column"
  | "paper-cover-abstract-two-column"
  | "table-with-rules"
  | "jp-public-doc-merged-cells"
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

type CorpusDrawContext = {
  readonly doc: PDFKit.PDFDocument;
  readonly fontPath: string;
};

type CorpusDrawFn = (context: CorpusDrawContext) => void;

type SegmentationCorpusCaseDefinition = SegmentationCorpusCase & {
  readonly draw: CorpusDrawFn;
};

const LONG_JP_TEXT =
  "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所で、にゃあと泣いていた事だけは記憶している。";

function createPdfBytes(draw: CorpusDrawFn, fontPath: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 36 });

    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
    doc.on("error", reject);

    draw({ doc, fontPath });
    doc.end();
  });
}

function drawHorizontalLongSingle(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);
  doc.fontSize(13);
  doc.text("【単段横書き】", 56, 52, { width: 480 });
  doc.moveDown(0.8);
  doc.text(`${LONG_JP_TEXT}${LONG_JP_TEXT}${LONG_JP_TEXT}`, {
    width: 500,
    align: "justify",
    lineGap: 4,
  });
}

function drawHorizontalLongTwoColumn(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);
  doc.fontSize(12);

  doc.text("【左段】", 56, 52, { width: 220 });
  doc.text(`左段本文。${LONG_JP_TEXT}${LONG_JP_TEXT}`, 56, 78, {
    width: 220,
    align: "justify",
    lineGap: 4,
  });

  doc.text("【右段】", 320, 52, { width: 220 });
  doc.text(`右段本文。${LONG_JP_TEXT}${LONG_JP_TEXT}`, 320, 78, {
    width: 220,
    align: "justify",
    lineGap: 4,
  });
}

function drawPaperCoverAbstractTwoColumn(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);

  doc.fontSize(26);
  doc.text("SEGMENTATION STUDY", 56, 52, { width: 500, align: "center" });

  doc.fontSize(14);
  doc.text("著者: 解析 太郎", 56, 100, { width: 500, align: "center" });

  doc.fontSize(12);
  doc.text("ABSTRACT", 56, 150, { width: 500, align: "left" });
  doc.text(`要約。${LONG_JP_TEXT}${LONG_JP_TEXT}`, 56, 172, {
    width: 500,
    align: "justify",
    lineGap: 3,
  });

  doc.text("【本文左段】", 56, 330, { width: 230 });
  doc.text(`${LONG_JP_TEXT}${LONG_JP_TEXT}`, 56, 354, {
    width: 230,
    align: "justify",
    lineGap: 3,
  });

  doc.text("【本文右段】", 326, 330, { width: 230 });
  doc.text(`${LONG_JP_TEXT}${LONG_JP_TEXT}`, 326, 354, {
    width: 230,
    align: "justify",
    lineGap: 3,
  });
}

function drawTableGrid(args: {
  readonly doc: PDFKit.PDFDocument;
  readonly x: number;
  readonly y: number;
  readonly colWidths: readonly number[];
  readonly rowHeights: readonly number[];
}): void {
  const { doc, x, y, colWidths, rowHeights } = args;
  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  doc.rect(x, y, totalWidth, totalHeight).stroke();

  // eslint-disable-next-line no-restricted-syntax -- incremental x-position for drawing vertical borders
  let cx = x;
  for (const w of colWidths.slice(0, -1)) {
    cx += w;
    doc.moveTo(cx, y).lineTo(cx, y + totalHeight).stroke();
  }

  // eslint-disable-next-line no-restricted-syntax -- incremental y-position for drawing horizontal borders
  let cy = y;
  for (const h of rowHeights.slice(0, -1)) {
    cy += h;
    doc.moveTo(x, cy).lineTo(x + totalWidth, cy).stroke();
  }
}

function drawTableWithRules(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);
  doc.fontSize(12);

  doc.text("【罫線付き本文】", 56, 52, { width: 500 });
  doc.text(`表の前段落。${LONG_JP_TEXT}`, 56, 78, {
    width: 500,
    align: "justify",
    lineGap: 3,
  });

  const x = 56;
  const y = 220;
  const colWidths = [120, 180, 200] as const;
  const rowHeights = [34, 30, 30, 30] as const;
  drawTableGrid({ doc, x, y, colWidths, rowHeights });

  doc.text("品目", x + 8, y + 10, { width: 100 });
  doc.text("仕様", x + 128, y + 10, { width: 160 });
  doc.text("備考", x + 310, y + 10, { width: 170 });

  doc.text("A-01", x + 8, y + 42, { width: 100 });
  doc.text("長文テキストの分割確認", x + 128, y + 42, { width: 160 });
  doc.text("横書きケース", x + 310, y + 42, { width: 170 });

  doc.text("B-07", x + 8, y + 72, { width: 100 });
  doc.text("二段組の段境界確認", x + 128, y + 72, { width: 160 });
  doc.text("段分離", x + 310, y + 72, { width: 170 });

  doc.text("C-99", x + 8, y + 102, { width: 100 });
  doc.text("表セル内文字列", x + 128, y + 102, { width: 160 });
  doc.text("セル分割", x + 310, y + 102, { width: 170 });

  doc.text(`表の後段落。${LONG_JP_TEXT}`, 56, 370, {
    width: 500,
    align: "justify",
    lineGap: 3,
  });
}

function drawMergedCellTable(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);
  doc.fontSize(12);

  doc.text("様式第1号 申請情報一覧", 56, 52, { width: 500 });

  const x = 56;
  const y = 100;
  const widths = [90, 130, 130, 150] as const;
  const heights = [36, 30, 30, 30] as const;
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);
  const totalHeight = heights.reduce((sum, h) => sum + h, 0);

  doc.rect(x, y, totalWidth, totalHeight).stroke();

  // eslint-disable-next-line no-restricted-syntax -- incremental y-position for drawing table rows
  let cy = y;
  for (const h of heights.slice(0, -1)) {
    cy += h;
    doc.moveTo(x, cy).lineTo(x + totalWidth, cy).stroke();
  }

  const x1 = x + widths[0];
  const x2 = x1 + widths[1];
  const x3 = x2 + widths[2];

  // merged header row: [0-1], [2-3]
  doc.moveTo(x2, y).lineTo(x2, y + totalHeight).stroke();
  doc.moveTo(x1, y + heights[0]).lineTo(x1, y + totalHeight).stroke();
  doc.moveTo(x3, y + heights[0]).lineTo(x3, y + totalHeight).stroke();

  doc.text("申請者情報", x + 8, y + 10, { width: widths[0] + widths[1] - 16, align: "center" });
  doc.text("連絡先", x2 + 8, y + 10, { width: widths[2] + widths[3] - 16, align: "center" });

  doc.text("番号", x + 8, y + 44, { width: widths[0] - 16 });
  doc.text("氏名", x1 + 8, y + 44, { width: widths[1] - 16 });
  doc.text("電話", x2 + 8, y + 44, { width: widths[2] - 16 });
  doc.text("所在地", x3 + 8, y + 44, { width: widths[3] - 16 });

  doc.text("001", x + 8, y + 74, { width: widths[0] - 16 });
  doc.text("山田 太郎", x1 + 8, y + 74, { width: widths[1] - 16 });
  doc.text("03-1234-5678", x2 + 8, y + 74, { width: widths[2] - 16 });
  doc.text("東京都千代田区", x3 + 8, y + 74, { width: widths[3] - 16 });

  doc.text("002", x + 8, y + 104, { width: widths[0] - 16 });
  doc.text("佐藤 花子", x1 + 8, y + 104, { width: widths[1] - 16 });
  doc.text("06-2222-3333", x2 + 8, y + 104, { width: widths[2] - 16 });
  doc.text("大阪府大阪市", x3 + 8, y + 104, { width: widths[3] - 16 });

  doc.text(`備考: ${LONG_JP_TEXT}`, 56, 270, {
    width: 500,
    align: "justify",
    lineGap: 3,
  });
}

function drawVerticalColumn(args: {
  readonly doc: PDFKit.PDFDocument;
  readonly text: string;
  readonly x: number;
  readonly topY: number;
  readonly step: number;
}): void {
  const { doc, text, x, topY, step } = args;
  // eslint-disable-next-line no-restricted-syntax -- incremental y-position for vertical glyph placement
  let y = topY;
  for (const char of Array.from(text)) {
    doc.save();
    doc.rotate(90, { origin: [x, y] });
    doc.text(char, x, y, { lineBreak: false });
    doc.restore();
    y -= step;
  }
}

function drawVerticalLongSingle(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);
  doc.fontSize(16);
  drawVerticalColumn({
    doc,
    text: "【縦一段】縦書き本文です。縦書き本文です。縦書き本文です。",
    x: 420,
    topY: 760,
    step: 24,
  });
}

function drawVerticalTwoColumns(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);
  doc.fontSize(16);

  drawVerticalColumn({
    doc,
    text: "【右段】縦書き本文です。縦書き本文です。",
    x: 470,
    topY: 760,
    step: 24,
  });
  drawVerticalColumn({
    doc,
    text: "【左段】縦書き本文です。縦書き本文です。",
    x: 350,
    topY: 760,
    step: 24,
  });
}

function drawVerticalThreeColumns(context: CorpusDrawContext): void {
  const { doc, fontPath } = context;
  doc.font(fontPath);
  doc.fontSize(16);

  drawVerticalColumn({
    doc,
    text: "【右列】縦書き本文。",
    x: 500,
    topY: 760,
    step: 24,
  });
  drawVerticalColumn({
    doc,
    text: "【中列】縦書き本文。",
    x: 410,
    topY: 760,
    step: 24,
  });
  drawVerticalColumn({
    doc,
    text: "【左列】縦書き本文。",
    x: 320,
    topY: 760,
    step: 24,
  });
}

const CASE_DEFINITIONS: readonly SegmentationCorpusCaseDefinition[] = [
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
    draw: drawHorizontalLongSingle,
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
    draw: drawHorizontalLongTwoColumn,
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
    draw: drawPaperCoverAbstractTwoColumn,
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
    draw: drawTableWithRules,
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
    draw: drawMergedCellTable,
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
    draw: drawVerticalLongSingle,
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
    draw: drawVerticalTwoColumns,
  },
  {
    id: "vertical-three-columns",
    title: "縦書き三段",
    description: "縦書きの上中下三段組（右中左列）を確認する。",
    expectation: {
      writingMode: "vertical",
      minGroups: 3,
      maxGroups: 3,
      requiredTokens: ["【右列】", "【中列】", "【左列】"],
    },
    draw: drawVerticalThreeColumns,
  },
] as const;

export const SEGMENTATION_CORPUS_CASES: readonly SegmentationCorpusCase[] = CASE_DEFINITIONS.map((d) => ({
  id: d.id,
  title: d.title,
  description: d.description,
  expectation: d.expectation,
}));

export type BuildSegmentationCorpusPdfArgs = {
  readonly caseId: SegmentationCorpusCaseId;
  readonly fontPath: string;
};

/** Build one segmentation corpus PDF by case ID. */
export async function buildSegmentationCorpusPdf(args: BuildSegmentationCorpusPdfArgs): Promise<Uint8Array> {
  if (!args) {
    throw new Error("buildSegmentationCorpusPdf: args is required");
  }
  if (args.fontPath.length === 0) {
    throw new Error("buildSegmentationCorpusPdf: fontPath is required");
  }

  const definition = CASE_DEFINITIONS.find((d) => d.id === args.caseId);
  if (!definition) {
    throw new Error(`buildSegmentationCorpusPdf: unknown caseId: ${args.caseId}`);
  }

  return createPdfBytes(definition.draw, args.fontPath);
}

/** Get metadata for one segmentation corpus case. */
export function getSegmentationCorpusCase(id: SegmentationCorpusCaseId): SegmentationCorpusCase {
  const definition = CASE_DEFINITIONS.find((d) => d.id === id);
  if (!definition) {
    throw new Error(`getSegmentationCorpusCase: unknown caseId: ${id}`);
  }
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    expectation: definition.expectation,
  };
}
