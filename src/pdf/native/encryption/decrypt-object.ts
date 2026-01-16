import type { PdfArray, PdfDict, PdfObject, PdfStream, PdfString } from "../types";
import { decodePdfStringBytes } from "../encoding";
import type { PdfDecrypter } from "./standard";

function decryptString(value: PdfString, objNum: number, gen: number, decrypter: PdfDecrypter): PdfString {
  const bytes = decrypter.decryptBytes(objNum, gen, value.bytes);
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
  const data = decrypter.decryptBytes(objNum, gen, value.data);
  return { type: "stream", dict, data };
}

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

