/**
 * @file PDF Object Serializer
 *
 * Serializes PdfObject types to PDF binary format.
 * @see ISO 32000-1:2008 Section 7.3 (Objects)
 */

import type { PdfObject } from "../native/core/types";

const encoder = new TextEncoder();

/**
 * Encode ASCII string to Uint8Array.
 */
function encodeAscii(text: string): Uint8Array {
  return encoder.encode(text);
}

/**
 * Concatenate multiple Uint8Arrays.
 */
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
 * Serialize PDF null object.
 * @see ISO 32000-1:2008 Section 7.3.9
 */
export function serializePdfNull(): Uint8Array {
  return encodeAscii("null");
}

/**
 * Serialize PDF boolean object.
 * @see ISO 32000-1:2008 Section 7.3.2
 */
export function serializePdfBool(value: boolean): Uint8Array {
  return encodeAscii(value ? "true" : "false");
}

/**
 * Format number for PDF output.
 * - Integers: no decimal point
 * - Floats: up to 6 decimal places, no trailing zeros
 */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  // Use fixed precision and strip trailing zeros
  const fixed = value.toFixed(6);
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Serialize PDF number object.
 * @see ISO 32000-1:2008 Section 7.3.3
 */
export function serializePdfNumber(value: number): Uint8Array {
  return encodeAscii(formatNumber(value));
}

/**
 * Check if a character code requires escaping in a PDF name.
 * PDF names can contain any characters except null (0x00).
 * Characters outside 0x21-0x7E (printable ASCII excluding space) should be escaped.
 * The # character (0x23) must also be escaped.
 * @see ISO 32000-1:2008 Section 7.3.5
 */
function needsNameEscape(charCode: number): boolean {
  // Escape: null, non-printable, space, DEL, and #
  if (charCode === 0x00) return true; // null
  if (charCode < 0x21) return true; // control chars and space
  if (charCode > 0x7e) return true; // DEL and high bytes
  if (charCode === 0x23) return true; // # itself
  // PDF delimiters that should be escaped in names
  if (
    charCode === 0x28 || // (
    charCode === 0x29 || // )
    charCode === 0x3c || // <
    charCode === 0x3e || // >
    charCode === 0x5b || // [
    charCode === 0x5d || // ]
    charCode === 0x7b || // {
    charCode === 0x7d || // }
    charCode === 0x2f || // /
    charCode === 0x25 // %
  ) {
    return true;
  }
  return false;
}

/**
 * Serialize PDF name object.
 * Names are prefixed with / and special characters are escaped as #xx.
 * @see ISO 32000-1:2008 Section 7.3.5
 */
export function serializePdfName(name: string): Uint8Array {
  const parts: string[] = ["/"];

  for (let i = 0; i < name.length; i++) {
    const charCode = name.charCodeAt(i);
    if (needsNameEscape(charCode)) {
      // Escape as #xx (two hex digits)
      parts.push("#" + charCode.toString(16).padStart(2, "0").toUpperCase());
    } else {
      parts.push(name[i]);
    }
  }

  return encodeAscii(parts.join(""));
}

/**
 * Escape special characters in PDF string literal.
 * @see ISO 32000-1:2008 Section 7.3.4.2
 */
function escapeStringLiteral(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = text.charCodeAt(i);

    if (char === "\\") {
      result += "\\\\";
    } else if (char === "(") {
      result += "\\(";
    } else if (char === ")") {
      result += "\\)";
    } else if (code === 0x0a) {
      // LF
      result += "\\n";
    } else if (code === 0x0d) {
      // CR
      result += "\\r";
    } else if (code === 0x09) {
      // TAB
      result += "\\t";
    } else if (code === 0x08) {
      // BS
      result += "\\b";
    } else if (code === 0x0c) {
      // FF
      result += "\\f";
    } else if (code < 0x20 || code > 0x7e) {
      // Non-printable: use octal escape
      result += "\\" + code.toString(8).padStart(3, "0");
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Serialize PDF string object as literal string.
 * Uses parentheses notation: (Hello World)
 * @see ISO 32000-1:2008 Section 7.3.4.2
 */
export function serializePdfString(text: string): Uint8Array {
  return encodeAscii("(" + escapeStringLiteral(text) + ")");
}

/**
 * Serialize PDF string from raw bytes as hex string.
 * Uses angle bracket notation: <48656C6C6F>
 * @see ISO 32000-1:2008 Section 7.3.4.3
 */
export function serializePdfHexString(bytes: Uint8Array): Uint8Array {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return encodeAscii("<" + hex + ">");
}

/**
 * Serialize PDF indirect reference.
 * Format: obj gen R (e.g., "1 0 R")
 * @see ISO 32000-1:2008 Section 7.3.10
 */
export function serializePdfRef(obj: number, gen: number): Uint8Array {
  return encodeAscii(`${obj} ${gen} R`);
}

/**
 * Serialize PDF array object.
 * Format: [ item1 item2 ... ]
 * @see ISO 32000-1:2008 Section 7.3.6
 */
export function serializePdfArray(items: readonly PdfObject[]): Uint8Array {
  if (items.length === 0) {
    return encodeAscii("[ ]");
  }

  const parts: Uint8Array[] = [encodeAscii("[")];

  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      parts.push(encodeAscii(" "));
    }
    parts.push(serializePdfObject(items[i]));
  }

  parts.push(encodeAscii("]"));
  return concat(...parts);
}

/**
 * Serialize PDF dictionary object.
 * Format: << /Key1 value1 /Key2 value2 >>
 * @see ISO 32000-1:2008 Section 7.3.7
 */
export function serializePdfDict(
  dict: ReadonlyMap<string, PdfObject>
): Uint8Array {
  if (dict.size === 0) {
    return encodeAscii("<< >>");
  }

  const parts: Uint8Array[] = [encodeAscii("<<")];

  for (const [key, value] of dict) {
    parts.push(encodeAscii(" "));
    parts.push(serializePdfName(key));
    parts.push(encodeAscii(" "));
    parts.push(serializePdfObject(value));
  }

  parts.push(encodeAscii(" >>"));
  return concat(...parts);
}

/**
 * Serialize a PdfObject to PDF binary format.
 * Dispatches to the appropriate serializer based on object type.
 */
export function serializePdfObject(obj: PdfObject): Uint8Array {
  switch (obj.type) {
    case "null":
      return serializePdfNull();
    case "bool":
      return serializePdfBool(obj.value);
    case "number":
      return serializePdfNumber(obj.value);
    case "name":
      return serializePdfName(obj.value);
    case "string":
      // Use hex string for binary data, literal for text
      return serializePdfHexString(obj.bytes);
    case "ref":
      return serializePdfRef(obj.obj, obj.gen);
    case "array":
      return serializePdfArray(obj.items);
    case "dict":
      return serializePdfDict(obj.map);
    case "stream":
      // Streams are handled separately by stream-encoder
      throw new Error(
        "Use serializePdfStream from stream-encoder.ts for stream objects"
      );
    default: {
      const _exhaustive: never = obj;
      throw new Error(`Unknown PDF object type: ${(_exhaustive as PdfObject).type}`);
    }
  }
}

/**
 * Serialize an indirect object definition.
 * Format: objNum genNum obj\n...content...\nendobj
 * @see ISO 32000-1:2008 Section 7.3.10
 */
export function serializeIndirectObject(
  objNum: number,
  genNum: number,
  content: Uint8Array
): Uint8Array {
  const header = encodeAscii(`${objNum} ${genNum} obj\n`);
  const footer = encodeAscii("\nendobj\n");
  return concat(header, content, footer);
}
