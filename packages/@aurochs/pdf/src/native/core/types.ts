/**
 * @file src/pdf/native/types.ts
 */

export type PdfRef = Readonly<{ type: "ref"; obj: number; gen: number }>;

export type PdfNull = Readonly<{ type: "null" }>;
export type PdfBool = Readonly<{ type: "bool"; value: boolean }>;
export type PdfNumber = Readonly<{ type: "number"; value: number }>;
export type PdfName = Readonly<{ type: "name"; value: string }>;

export type PdfString = Readonly<{
  type: "string";
  /** Raw bytes, after unescaping/hex-decoding. */
  bytes: Uint8Array;
  /** Best-effort latin1 decode of bytes. */
  text: string;
}>;

export type PdfArray = Readonly<{ type: "array"; items: readonly PdfObject[] }>;

export type PdfDict = Readonly<{
  type: "dict";
  /** Keys are name values without the leading "/". */
  map: ReadonlyMap<string, PdfObject>;
}>;

export type PdfStream = Readonly<{
  type: "stream";
  dict: PdfDict;
  /** Encoded stream bytes (before Filter decoding). */
  data: Uint8Array;
}>;

export type PdfObject =
  | PdfRef
  | PdfNull
  | PdfBool
  | PdfNumber
  | PdfName
  | PdfString
  | PdfArray
  | PdfDict
  | PdfStream;

export type PdfIndirectObject = Readonly<{
  obj: number;
  gen: number;
  value: PdfObject;
}>;

