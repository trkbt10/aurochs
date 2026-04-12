/**
 * @file PDF content stream tokenizer
 *
 * Parses PDF content stream into tokens for further processing.
 * PDF Reference Chapter 7 - Content Stream Syntax
 *
 * Content stream elements:
 * - Numbers: 123, -45.67, .5
 * - Strings: (Hello), <48656C6C6F>
 * - Names: /Name
 * - Operators: m, l, c, S, f, BT, ET, etc.
 * - Arrays: [...]
 * - Dictionaries: <<...>>
 */

// =============================================================================
// Token Types
// =============================================================================

export type PdfTokenType =
  | "number"
  | "string"
  | "name"
  | "operator"
  | "array_start"
  | "array_end"
  | "dict_start"
  | "dict_end";

export type PdfToken = {
  readonly type: PdfTokenType;
  readonly value: string | number;
  readonly raw: string;
};

// =============================================================================
// Tokenizer
// =============================================================================

// PDF Reference Table 1 - White-space characters
// NUL(0), TAB(9), LF(10), FF(12), CR(13), SPACE(32)
const PDF_WHITESPACE_CHARS = [0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20] as const;
const WHITESPACE = new RegExp(
  `[${PDF_WHITESPACE_CHARS.map((code) => String.fromCharCode(code)).join("")}]`,
);
// PDF Reference Table 2 - Delimiter characters
const DELIMITER = /[()<>[\]{}/%]/;

/**
 * Tokenize a PDF content stream
 */
export function tokenizeContentStream(content: string): PdfToken[] {
  const tokens: PdfToken[] = [];
  const cursor: Cursor = { pos: 0 };

  while (cursor.pos < content.length) {
    // Skip whitespace
    while (cursor.pos < content.length && WHITESPACE.test(content[cursor.pos])) {
      cursor.pos++;
    }

    if (cursor.pos >= content.length) {
      break;
    }

    const char = content[cursor.pos];

    // Comment (skip until end of line)
    if (char === "%") {
      while (cursor.pos < content.length && content[cursor.pos] !== "\n" && content[cursor.pos] !== "\r") {
        cursor.pos++;
      }
      continue;
    }

    // String literal (parentheses)
    if (char === "(") {
      const [str, newPos] = parseParenString(content, cursor.pos);
      tokens.push({
        type: "string",
        value: str,
        raw: content.slice(cursor.pos, newPos),
      });
      cursor.pos = newPos;
      continue;
    }

    // Hex string
    if (char === "<" && content[cursor.pos + 1] !== "<") {
      const [str, newPos] = parseHexString(content, cursor.pos);
      tokens.push({
        type: "string",
        value: str,
        raw: content.slice(cursor.pos, newPos),
      });
      cursor.pos = newPos;
      continue;
    }

    // Dictionary start
    if (char === "<" && content[cursor.pos + 1] === "<") {
      tokens.push({
        type: "dict_start",
        value: "<<",
        raw: "<<",
      });
      cursor.pos += 2;
      continue;
    }

    // Dictionary end
    if (char === ">" && content[cursor.pos + 1] === ">") {
      tokens.push({
        type: "dict_end",
        value: ">>",
        raw: ">>",
      });
      cursor.pos += 2;
      continue;
    }

    // Array start
    if (char === "[") {
      tokens.push({
        type: "array_start",
        value: "[",
        raw: "[",
      });
      cursor.pos++;
      continue;
    }

    // Array end
    if (char === "]") {
      tokens.push({
        type: "array_end",
        value: "]",
        raw: "]",
      });
      cursor.pos++;
      continue;
    }

    // Name
    if (char === "/") {
      const [name, newPos] = parseName(content, cursor.pos);
      tokens.push({
        type: "name",
        value: name,
        raw: content.slice(cursor.pos, newPos),
      });
      cursor.pos = newPos;
      continue;
    }

    // Number or operator
    if (isNumberStart(char, content[cursor.pos + 1])) {
      const [num, newPos] = parseNumber(content, cursor.pos);
      if (num !== null) {
        tokens.push({
          type: "number",
          value: num,
          raw: content.slice(cursor.pos, newPos),
        });
        cursor.pos = newPos;
        continue;
      }
    }

    // Operator: any token that's not a number, name, string, array, dict, delimiter, or whitespace.
    // PDF content stream operators may include digits (e.g. Type3 `d0`/`d1`).
    if (isOperatorStart(char)) {
      const [op, newPos] = parseOperator(content, cursor.pos);
      tokens.push({
        type: "operator",
        value: op,
        raw: op,
      });
      cursor.pos = newPos;
      continue;
    }

    // Skip unknown character
    cursor.pos++;
  }

  return tokens;
}

// =============================================================================
// Parse Functions
// =============================================================================

/**
 * Mutable cursor for tracking parse position.
 * Using an object avoids `let` declarations while allowing mutation
 * through a `const` binding.
 */
type Cursor = { pos: number };

function isNumberStart(char: string, nextChar: string | undefined): boolean {
  if (char >= "0" && char <= "9") {return true;}
  if (char === "-" || char === "+") {
    return nextChar !== undefined && (nextChar >= "0" && nextChar <= "9" || nextChar === ".");
  }
  if (char === ".") {
    return nextChar !== undefined && nextChar >= "0" && nextChar <= "9";
  }
  return false;
}

function parseNumber(content: string, pos: number): [number | null, number] {
  const cursor: Cursor = { pos };

  // Optional sign
  if (content[cursor.pos] === "-" || content[cursor.pos] === "+") {
    cursor.pos++;
  }

  // Integer part
  while (cursor.pos < content.length && content[cursor.pos] >= "0" && content[cursor.pos] <= "9") {
    cursor.pos++;
  }

  // Decimal part
  if (cursor.pos < content.length && content[cursor.pos] === ".") {
    cursor.pos++;
    while (cursor.pos < content.length && content[cursor.pos] >= "0" && content[cursor.pos] <= "9") {
      cursor.pos++;
    }
  }

  const raw = content.slice(pos, cursor.pos);
  if (raw === "" || raw === "-" || raw === "+" || raw === ".") {
    return [null, pos];
  }

  const num = parseFloat(raw);
  if (isNaN(num)) {
    return [null, pos];
  }

  return [num, cursor.pos];
}

/**
 * Parse an octal escape sequence starting at `cursor.pos`.
 * The first octal digit has already been read as `firstDigit`.
 * Advances `cursor.pos` past any additional octal digits consumed.
 */
function parseOctalEscape(content: string, cursor: Cursor, firstDigit: string): string {
  const digits: string[] = [firstDigit];
  if (cursor.pos + 1 < content.length && content[cursor.pos + 1] >= "0" && content[cursor.pos + 1] <= "7") {
    cursor.pos++;
    digits.push(content[cursor.pos]);
    if (cursor.pos + 1 < content.length && content[cursor.pos + 1] >= "0" && content[cursor.pos + 1] <= "7") {
      cursor.pos++;
      digits.push(content[cursor.pos]);
    }
  }
  return String.fromCharCode(parseInt(digits.join(""), 8));
}

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  f: "\f",
  "(": "(",
  ")": ")",
  "\\": "\\",
};

function parseParenString(content: string, pos: number): [string, number] {
  const parts: string[] = [];
  const cursor: Cursor = { pos: pos + 1 }; // skip opening (
  const depth: Cursor = { pos: 1 }; // reuse Cursor shape for depth counter

  while (cursor.pos < content.length && depth.pos > 0) {
    const char = content[cursor.pos];

    if (char === "\\") {
      // Escape sequence
      cursor.pos++;
      if (cursor.pos >= content.length) {break;}

      const escaped = content[cursor.pos];
      const simple = SIMPLE_ESCAPES[escaped];
      if (simple !== undefined) {
        parts.push(simple);
      } else if (escaped >= "0" && escaped <= "7") {
        parts.push(parseOctalEscape(content, cursor, escaped));
      } else {
        parts.push(escaped);
      }
    } else if (char === "(") {
      depth.pos++;
      parts.push(char);
    } else if (char === ")") {
      depth.pos--;
      if (depth.pos > 0) {
        parts.push(char);
      }
    } else {
      parts.push(char);
    }
    cursor.pos++;
  }

  return [parts.join(""), cursor.pos];
}

function parseHexString(content: string, pos: number): [string, number] {
  const cursor: Cursor = { pos: pos + 1 }; // skip <
  const hexParts: string[] = [];

  while (cursor.pos < content.length && content[cursor.pos] !== ">") {
    const char = content[cursor.pos];
    if (!WHITESPACE.test(char)) {
      hexParts.push(char);
    }
    cursor.pos++;
  }
  cursor.pos++; // skip >

  const hex = hexParts.join("") + (hexParts.length % 2 !== 0 ? "0" : "");

  // Convert hex to string
  const resultParts: string[] = [];
  for (const [i] of Array.from({ length: Math.floor(hex.length / 2) }, (_, idx) => [idx * 2])) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (!isNaN(byte)) {
      resultParts.push(String.fromCharCode(byte));
    }
  }

  return [resultParts.join(""), cursor.pos];
}

function parseName(content: string, pos: number): [string, number] {
  const cursor: Cursor = { pos: pos + 1 }; // skip /
  const parts: string[] = [];

  while (cursor.pos < content.length) {
    const char = content[cursor.pos];
    if (WHITESPACE.test(char) || DELIMITER.test(char)) {
      break;
    }

    // Handle #XX escape
    if (char === "#" && cursor.pos + 2 < content.length) {
      const hex = content.slice(cursor.pos + 1, cursor.pos + 3);
      const code = parseInt(hex, 16);
      if (!isNaN(code)) {
        parts.push(String.fromCharCode(code));
        cursor.pos += 3;
        continue;
      }
    }

    parts.push(char);
    cursor.pos++;
  }

  return [parts.join(""), cursor.pos];
}

function isOperatorStart(char: string): boolean {
  return !WHITESPACE.test(char) && !DELIMITER.test(char);
}

function parseOperator(content: string, pos: number): [string, number] {
  const cursor: Cursor = { pos };

  while (cursor.pos < content.length) {
    const char = content[cursor.pos];
    if (WHITESPACE.test(char) || DELIMITER.test(char)) {
      break;
    }
    cursor.pos++;
  }

  return [content.slice(pos, cursor.pos), cursor.pos];
}
