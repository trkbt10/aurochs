/**
 * @file PDF Stream Encoder
 *
 * Serializes PDF stream objects with optional compression.
 * @see ISO 32000-1:2008 Section 7.3.8 (Stream Objects)
 */

import type { PdfObject } from "../native/core/types";
import { serializePdfDict } from "./object-serializer";
import { encodeFlate } from "./encode-filters";

export type StreamEncoding = "FlateDecode" | "none";

const encoder = new TextEncoder();

function encodeAscii(text: string): Uint8Array {
  return encoder.encode(text);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Options for serializing a PDF stream.
 */
export type SerializeStreamOptions = {
  /**
   * Additional dictionary entries to include in the stream dictionary.
   * /Length and /Filter are added automatically.
   */
  readonly dict?: ReadonlyMap<string, PdfObject>;

  /**
   * The raw stream data (before encoding).
   */
  readonly data: Uint8Array;

  /**
   * Encoding to apply to the stream data.
   * @default "FlateDecode"
   */
  readonly encoding?: StreamEncoding;
};

/**
 * Serialize a PDF stream object.
 *
 * Format:
 * ```
 * << /Length N /Filter /FlateDecode ... >>
 * stream
 * {encoded data}
 * endstream
 * ```
 *
 * @see ISO 32000-1:2008 Section 7.3.8
 */
export function serializePdfStream(options: SerializeStreamOptions): Uint8Array {
  const { data, encoding = "FlateDecode", dict = new Map() } = options;

  // Encode the data
  const encodedData = encoding === "FlateDecode" ? encodeFlate(data) : data;

  // Build the stream dictionary
  const streamDict = new Map<string, PdfObject>(dict);

  // Set /Length (required)
  streamDict.set("Length", { type: "number", value: encodedData.length });

  // Set /Filter if using compression
  if (encoding === "FlateDecode") {
    streamDict.set("Filter", { type: "name", value: "FlateDecode" });
  }

  // Serialize the dictionary
  const dictBytes = serializePdfDict(streamDict);

  // Build the complete stream
  // Note: PDF spec requires a single newline after "stream" and before encoded data
  // The "endstream" must be preceded by an end-of-line marker
  return concat(
    dictBytes,
    encodeAscii("\nstream\n"),
    encodedData,
    encodeAscii("\nendstream")
  );
}

/**
 * Build a content stream from PDF operators.
 *
 * @param operators - String containing PDF content stream operators
 * @param encoding - Optional encoding (default: FlateDecode)
 */
export function serializeContentStream(
  operators: string,
  encoding: StreamEncoding = "FlateDecode"
): Uint8Array {
  const data = encoder.encode(operators);
  return serializePdfStream({ data, encoding });
}
