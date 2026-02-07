/**
 * @file Textbox extractor
 *
 * Reference: [MS-DOC] 2.8.33 – PlcfTxbxTxt
 *
 * PlcfTxbxTxt: CP array (n+1 × 4B) + FTXBXS array (n × 22B)
 * n = (lcb - 4) / 26
 */

import type { DocTextbox, DocParagraph } from "../domain/types";
import type { SubdocParagraphBuilder } from "./subdoc-extractor";
import { textRangeToParagraphs } from "./subdoc-extractor";

/** Parse PlcfTxbxTxt from the table stream. Returns CP boundary array. */
export function parsePlcfTxbxTxt(tableStream: Uint8Array, fc: number, lcb: number): readonly number[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  // PlcfTxbxTxt: (n+1) CPs (4B each) + n × FTXBXS (22B each)
  // size = (n+1)*4 + n*22 = 4 + 26*n → n = (lcb - 4) / 26
  const n = (lcb - 4) / 26;
  if (!Number.isInteger(n) || n <= 0) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cps: number[] = [];

  for (let i = 0; i <= n; i++) {
    cps.push(view.getInt32(fc + i * 4, true));
  }

  return cps;
}

/** Extract textboxes from CP boundaries. */
export function extractTextboxes(
  textCps: readonly number[],
  fullText: string,
  txbxTextStart: number,
  buildParagraphs?: SubdocParagraphBuilder,
): readonly DocTextbox[] {
  if (textCps.length < 2) return [];

  const builder = buildParagraphs ?? ((s: number, e: number) => textRangeToParagraphs(fullText, s, e));
  const textboxes: DocTextbox[] = [];
  const count = textCps.length - 1;

  for (let i = 0; i < count; i++) {
    const cpStart = textCps[i];
    const cpEnd = textCps[i + 1];
    if (cpStart >= cpEnd) continue;

    const content = builder(txbxTextStart + cpStart, txbxTextStart + cpEnd);
    if (content.length === 0) continue;

    textboxes.push({ index: i, content });
  }

  return textboxes;
}
