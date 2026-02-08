/**
 * @file src/pdf/native/encryption/decrypt-object.ts
 */

import type { PdfArray, PdfDict, PdfObject, PdfStream, PdfString } from "../core/types";
import { decodePdfStringBytes } from "../core/encoding";
import type { PdfDecrypter } from "./standard";

type DecryptCtx = {
  readonly objNum: number;
  readonly gen: number;
  readonly decrypter: PdfDecrypter;
};

function isEmbeddedFileStreamType(streamType: PdfObject | undefined): boolean {
  if (streamType?.type === "name") {
    return streamType.value === "EmbeddedFile";
  }
  if (streamType?.type === "string") {
    return streamType.text === "EmbeddedFile";
  }
  return false;
}

function getCryptFilterName(dict: PdfDict): string | null {
  const filter = dict.map.get("Filter");
  if (!filter) {return null;}

  const filters: string[] = [];
  if (filter.type === "name") {
    filters.push(filter.value);
  } else if (filter.type === "array") {
    for (const item of filter.items) {
      if (item.type === "name") {filters.push(item.value);}
    }
  }

  const cryptIndices: number[] = [];
  for (let i = 0; i < filters.length; i += 1) {
    if ((filters[i] ?? "") === "Crypt") {cryptIndices.push(i);}
  }
  if (cryptIndices.length === 0) {return null;}

  const decodeParms = dict.map.get("DecodeParms");
  for (const idx of cryptIndices) {
    const parms = (() => {
      if (!decodeParms) {return null;}
      if (decodeParms.type === "dict") {return decodeParms;}
      if (decodeParms.type === "array") {
        const v = decodeParms.items[idx];
        if (!v) {return null;}
        if (v.type === "dict") {return v;}
        return null;
      }
      return null;
    })();

    if (!parms) {continue;}
    const name = parms.map.get("Name");
    if (name?.type === "name") {return name.value;}
    if (name?.type === "string") {return name.text;}
  }

  return null;
}

function streamHasCryptIdentity(dict: PdfDict): boolean {
  const filter = dict.map.get("Filter");
  if (!filter) {return false;}

  const filters: string[] = [];
  if (filter.type === "name") {
    filters.push(filter.value);
  } else if (filter.type === "array") {
    for (const item of filter.items) {
      if (item.type === "name") {filters.push(item.value);}
    }
  }

  const cryptIndices: number[] = [];
  for (let i = 0; i < filters.length; i += 1) {
    if ((filters[i] ?? "") === "Crypt") {cryptIndices.push(i);}
  }
  if (cryptIndices.length === 0) {return false;}

  const decodeParms = dict.map.get("DecodeParms");
  for (const idx of cryptIndices) {
    const parms = (() => {
      if (!decodeParms) {return null;}
      if (decodeParms.type === "dict") {return decodeParms;}
      if (decodeParms.type === "array") {
        const v = decodeParms.items[idx];
        if (!v) {return null;}
        if (v.type === "dict") {return v;}
        return null;
      }
      return null;
    })();

    if (!parms) {continue;}
    const name = parms.map.get("Name");
    if (name?.type === "name" && name.value === "Identity") {
      return true;
    }
    if (name?.type === "string" && name.text === "Identity") {
      return true;
    }
  }

  return false;
}

function decryptString(args: { readonly value: PdfString; readonly ctx: DecryptCtx }): PdfString {
  const { value, ctx } = args;
  const bytes = ctx.decrypter.decryptBytes({ objNum: ctx.objNum, gen: ctx.gen, bytes: value.bytes, options: { kind: "string" } });
  return {
    type: "string",
    bytes,
    text: decodePdfStringBytes(bytes),
  };
}

function decryptArray(args: { readonly value: PdfArray; readonly ctx: DecryptCtx }): PdfArray {
  const { value, ctx } = args;
  const items = value.items.map((item) => decryptPdfObject({ value: item, ctx }));
  return { type: "array", items };
}

function decryptDict(args: { readonly value: PdfDict; readonly ctx: DecryptCtx }): PdfDict {
  const { value, ctx } = args;
  const out = new Map<string, PdfObject>();
  for (const [k, v] of value.map.entries()) {
    out.set(k, decryptPdfObject({ value: v, ctx }));
  }
  return { type: "dict", map: out };
}

function decryptStream(args: { readonly value: PdfStream; readonly ctx: DecryptCtx }): PdfStream {
  const { value, ctx } = args;
  const dict = decryptDict({ value: value.dict, ctx });

  const data = (() => {
    if (streamHasCryptIdentity(value.dict)) {
      return value.data;
    }

    const streamType = value.dict.map.get("Type");
    const isEmbeddedFile = isEmbeddedFileStreamType(streamType);
    const kind = isEmbeddedFile ? "embeddedFile" : "stream";
    const cryptFilterName = getCryptFilterName(value.dict) ?? undefined;
    return ctx.decrypter.decryptBytes({ objNum: ctx.objNum, gen: ctx.gen, bytes: value.data, options: { kind, cryptFilterName } });
  })();

  return { type: "stream", dict, data };
}











/** Decrypt a PDF object (including stream bytes) using the provided decrypter. */
export type DecryptPdfObjectArgs = {
  readonly value: PdfObject;
  readonly ctx: DecryptCtx;
};

/** Decrypt a PDF object (including stream bytes) using the provided decrypter. */
export function decryptPdfObject({ value, ctx }: DecryptPdfObjectArgs): PdfObject {
  switch (value.type) {
    case "string":
      return decryptString({ value, ctx });
    case "array":
      return decryptArray({ value, ctx });
    case "dict":
      return decryptDict({ value, ctx });
    case "stream":
      return decryptStream({ value, ctx });
    default:
      return value;
  }
}
