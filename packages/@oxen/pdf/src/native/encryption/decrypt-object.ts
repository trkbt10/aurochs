/**
 * @file src/pdf/native/encryption/decrypt-object.ts
 */

import type { PdfArray, PdfDict, PdfObject, PdfStream, PdfString } from "../core/types";
import { decodePdfStringBytes } from "../core/encoding";
import type { PdfDecrypter } from "./standard";

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

function decryptString(value: PdfString, objNum: number, gen: number, decrypter: PdfDecrypter): PdfString {
  const bytes = decrypter.decryptBytes(objNum, gen, value.bytes, { kind: "string" });
  return {
    type: "string",
    bytes,
    text: decodePdfStringBytes(bytes),
  };
}

function decryptArray(value: PdfArray, objNum: number, gen: number, decrypter: PdfDecrypter): PdfArray {
  const items = value.items.map((item) => decryptPdfObject(item, objNum, gen, decrypter));
  return { type: "array", items };
}

function decryptDict(value: PdfDict, objNum: number, gen: number, decrypter: PdfDecrypter): PdfDict {
  const out = new Map<string, PdfObject>();
  for (const [k, v] of value.map.entries()) {
    out.set(k, decryptPdfObject(v, objNum, gen, decrypter));
  }
  return { type: "dict", map: out };
}

function decryptStream(value: PdfStream, objNum: number, gen: number, decrypter: PdfDecrypter): PdfStream {
  const dict = decryptDict(value.dict, objNum, gen, decrypter);
  const streamType = value.dict.map.get("Type");
  const isEmbeddedFile = streamType?.type === "name"
    ? streamType.value === "EmbeddedFile"
    : streamType?.type === "string"
      ? streamType.text === "EmbeddedFile"
      : false;
  const data = streamHasCryptIdentity(value.dict)
    ? value.data
    : decrypter.decryptBytes(
      objNum,
      gen,
      value.data,
      { kind: isEmbeddedFile ? "embeddedFile" : "stream", cryptFilterName: getCryptFilterName(value.dict) ?? undefined },
    );
  return { type: "stream", dict, data };
}











/** Decrypt a PDF object (including stream bytes) using the provided decrypter. */
export function decryptPdfObject(value: PdfObject, objNum: number, gen: number, decrypter: PdfDecrypter): PdfObject {
  switch (value.type) {
    case "string":
      return decryptString(value, objNum, gen, decrypter);
    case "array":
      return decryptArray(value, objNum, gen, decrypter);
    case "dict":
      return decryptDict(value, objNum, gen, decrypter);
    case "stream":
      return decryptStream(value, objNum, gen, decrypter);
    default:
      return value;
  }
}
