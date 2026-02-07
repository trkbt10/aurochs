/**
 * @file Extracts DocDocument domain model from parsed .doc streams
 */

import type { DocDocument, DocParagraph } from "./domain/types";
import type { DocParseContext } from "./parse-context";
import { warnOrThrow } from "./parse-context";
import type { Fib } from "./stream/fib";
import type { PieceDescriptor } from "./stream/piece-table";
import { extractText, splitIntoParagraphs } from "./stream/text-extractor";

export type ExtractDocOptions = {
  readonly wordDocStream: Uint8Array;
  readonly fib: Fib;
  readonly pieces: readonly PieceDescriptor[];
  readonly ctx: DocParseContext;
};

/** Extract the intermediate DocDocument from parsed stream data. */
export function extractDocDocument(options: ExtractDocOptions): DocDocument {
  const { wordDocStream, fib, pieces, ctx } = options;

  const rawText = tryExtractText({ wordDocStream, fib, pieces, ctx });
  if (rawText === undefined) {
    return { paragraphs: [] };
  }

  const textParagraphs = splitIntoParagraphs(rawText);

  const paragraphs: DocParagraph[] = textParagraphs.map((text) => ({
    runs: [{ text }],
  }));

  return { paragraphs };
}

function tryExtractText(options: {
  wordDocStream: Uint8Array;
  fib: Fib;
  pieces: readonly PieceDescriptor[];
  ctx: DocParseContext;
}): string | undefined {
  const { wordDocStream, fib, pieces, ctx } = options;
  try {
    return extractText(wordDocStream, pieces, fib.ccpText);
  } catch (e: unknown) {
    warnOrThrow(
      ctx,
      {
        code: "DOC_TEXT_DECODE_FAILED",
        message: e instanceof Error ? e.message : String(e),
        where: "extractDocDocument",
      },
      e instanceof Error ? e : new Error(String(e)),
    );
    return undefined;
  }
}
