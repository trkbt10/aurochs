import { decodeLatin1 } from "./encoding";
import { isDelimiter, isWhite } from "./scan";

export type PdfToken =
  | { type: "eof" }
  | { type: "keyword"; value: string }
  | { type: "number"; raw: string; value: number; isInt: boolean }
  | { type: "name"; value: string }
  | { type: "string"; bytes: Uint8Array }
  | { type: "hexstring"; bytes: Uint8Array }
  | { type: "punct"; value: "<<" | ">>" | "[" | "]" };

export type PdfLexer = Readonly<{
  readonly bytes: Uint8Array;
  readonly pos: number;
}>;

export function createLexer(bytes: Uint8Array, pos: number): PdfLexer {
  return { bytes, pos };
}

function skipWhitespaceAndComments(lex: PdfLexer): PdfLexer {
  const { bytes } = lex;
  let pos = lex.pos;
  while (pos < bytes.length) {
    const b = bytes[pos] ?? 0;
    if (isWhite(b)) {
      pos += 1;
      continue;
    }
    if (b === 0x25) {
      // comment '% ... \r?\n'
      pos += 1;
      while (pos < bytes.length) {
        const c = bytes[pos] ?? 0;
        pos += 1;
        if (c === 0x0a) break;
        if (c === 0x0d) {
          if ((bytes[pos] ?? 0) === 0x0a) pos += 1;
          break;
        }
      }
      continue;
    }
    break;
  }
  return { bytes, pos };
}

function readWhile(bytes: Uint8Array, pos: number, pred: (b: number) => boolean): { text: string; next: number } {
  const start = pos;
  while (pos < bytes.length) {
    const b = bytes[pos] ?? 0;
    if (!pred(b)) break;
    pos += 1;
  }
  return { text: decodeLatin1(bytes.slice(start, pos)), next: pos };
}

function isDigit(b: number): boolean {
  return b >= 0x30 && b <= 0x39;
}

function isHexDigit(b: number): boolean {
  return (
    (b >= 0x30 && b <= 0x39) ||
    (b >= 0x41 && b <= 0x46) ||
    (b >= 0x61 && b <= 0x66)
  );
}

function hexValue(b: number): number {
  if (b >= 0x30 && b <= 0x39) return b - 0x30;
  if (b >= 0x41 && b <= 0x46) return b - 0x41 + 10;
  if (b >= 0x61 && b <= 0x66) return b - 0x61 + 10;
  return 0;
}

function readName(lex: PdfLexer): { value: string; next: number } {
  const { bytes } = lex;
  let pos = lex.pos;
  if ((bytes[pos] ?? 0) !== 0x2f) throw new Error("readName: expected '/'");
  pos += 1;
  const out: number[] = [];
  while (pos < bytes.length) {
    const b = bytes[pos] ?? 0;
    if (isWhite(b) || isDelimiter(b)) break;
    if (b === 0x23) {
      // #xx hex escape
      const h1 = bytes[pos + 1] ?? 0;
      const h2 = bytes[pos + 2] ?? 0;
      if (isHexDigit(h1) && isHexDigit(h2)) {
        out.push((hexValue(h1) << 4) | hexValue(h2));
        pos += 3;
        continue;
      }
    }
    out.push(b);
    pos += 1;
  }
  return { value: decodeLatin1(new Uint8Array(out)), next: pos };
}

function readLiteralString(lex: PdfLexer): { bytes: Uint8Array; next: number } {
  const { bytes } = lex;
  let pos = lex.pos;
  if ((bytes[pos] ?? 0) !== 0x28) throw new Error("readLiteralString: expected '('");
  pos += 1;

  const out: number[] = [];
  let depth = 1;
  while (pos < bytes.length) {
    const b = bytes[pos] ?? 0;
    pos += 1;

    if (b === 0x28) {
      // (
      depth += 1;
      out.push(b);
      continue;
    }
    if (b === 0x29) {
      // )
      depth -= 1;
      if (depth === 0) break;
      out.push(b);
      continue;
    }
    if (b === 0x5c) {
      // backslash
      const next = bytes[pos] ?? 0;
      if (next === 0x0d) {
        // \r\n? line continuation
        pos += 1;
        if ((bytes[pos] ?? 0) === 0x0a) pos += 1;
        continue;
      }
      if (next === 0x0a) {
        pos += 1;
        continue;
      }

      // escaped
      pos += 1;
      switch (next) {
        case 0x6e: // n
          out.push(0x0a);
          continue;
        case 0x72: // r
          out.push(0x0d);
          continue;
        case 0x74: // t
          out.push(0x09);
          continue;
        case 0x62: // b
          out.push(0x08);
          continue;
        case 0x66: // f
          out.push(0x0c);
          continue;
        case 0x28: // (
        case 0x29: // )
        case 0x5c: // \
          out.push(next);
          continue;
        default:
          // octal? up to 3 digits
          if (next >= 0x30 && next <= 0x37) {
            let value = next - 0x30;
            for (let i = 0; i < 2; i += 1) {
              const d = bytes[pos] ?? 0;
              if (d < 0x30 || d > 0x37) break;
              value = value * 8 + (d - 0x30);
              pos += 1;
            }
            out.push(value & 0xff);
            continue;
          }
          out.push(next);
          continue;
      }
    }
    out.push(b);
  }

  return { bytes: new Uint8Array(out), next: pos };
}

function readHexString(lex: PdfLexer): { bytes: Uint8Array; next: number } {
  const { bytes } = lex;
  let pos = lex.pos;
  if ((bytes[pos] ?? 0) !== 0x3c) throw new Error("readHexString: expected '<'");
  // caller ensures not '<<'
  pos += 1;

  const nibbles: number[] = [];
  while (pos < bytes.length) {
    const b = bytes[pos] ?? 0;
    pos += 1;
    if (b === 0x3e) break; // >
    if (isWhite(b)) continue;
    if (!isHexDigit(b)) {
      throw new Error("readHexString: invalid hex digit");
    }
    nibbles.push(hexValue(b));
  }

  const out = new Uint8Array(Math.ceil(nibbles.length / 2));
  for (let i = 0; i < nibbles.length; i += 2) {
    const hi = nibbles[i] ?? 0;
    const lo = nibbles[i + 1] ?? 0;
    out[i / 2] = (hi << 4) | lo;
  }

  return { bytes: out, next: pos };
}

function readNumberOrKeyword(lex: PdfLexer): { token: PdfToken; next: number } {
  const { bytes } = lex;
  let pos = lex.pos;

  const { text, next } = readWhile(bytes, pos, (b) => !isWhite(b) && !isDelimiter(b));
  pos = next;

  // number?
  const maybe = Number(text);
  const isNum = Number.isFinite(maybe) && text.length > 0 && /[0-9]/.test(text);
  if (isNum) {
    const isInt = /^[-+]?\d+$/.test(text);
    return { token: { type: "number", raw: text, value: maybe, isInt }, next: pos };
  }

  return { token: { type: "keyword", value: text }, next: pos };
}

export function nextToken(lex: PdfLexer): { token: PdfToken; next: PdfLexer } {
  const trimmed = skipWhitespaceAndComments(lex);
  const { bytes } = trimmed;
  let pos = trimmed.pos;
  if (pos >= bytes.length) {
    return { token: { type: "eof" }, next: { bytes, pos } };
  }

  const b = bytes[pos] ?? 0;

  // punctuators
  if (b === 0x3c && (bytes[pos + 1] ?? 0) === 0x3c) {
    return { token: { type: "punct", value: "<<" }, next: { bytes, pos: pos + 2 } };
  }
  if (b === 0x3e && (bytes[pos + 1] ?? 0) === 0x3e) {
    return { token: { type: "punct", value: ">>" }, next: { bytes, pos: pos + 2 } };
  }
  if (b === 0x5b) return { token: { type: "punct", value: "[" }, next: { bytes, pos: pos + 1 } };
  if (b === 0x5d) return { token: { type: "punct", value: "]" }, next: { bytes, pos: pos + 1 } };

  if (b === 0x2f) {
    const { value, next } = readName({ bytes, pos });
    return { token: { type: "name", value }, next: { bytes, pos: next } };
  }
  if (b === 0x28) {
    const { bytes: str, next } = readLiteralString({ bytes, pos });
    return { token: { type: "string", bytes: str }, next: { bytes, pos: next } };
  }
  if (b === 0x3c) {
    // hexstring
    const { bytes: hex, next } = readHexString({ bytes, pos });
    return { token: { type: "hexstring", bytes: hex }, next: { bytes, pos: next } };
  }

  return (() => {
    const { token, next } = readNumberOrKeyword({ bytes, pos });
    return { token, next: { bytes, pos: next } };
  })();
}
