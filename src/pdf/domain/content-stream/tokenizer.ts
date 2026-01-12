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
// eslint-disable-next-line no-control-regex -- PDF spec requires these control characters
const WHITESPACE = /[\x00\x09\x0a\x0c\x0d\x20]/;
// PDF Reference Table 2 - Delimiter characters
const DELIMITER = /[()<>[\]{}/%]/;

/**
 * Tokenize a PDF content stream
 */
export function tokenizeContentStream(content: string): PdfToken[] {
  const tokens: PdfToken[] = [];
  // eslint-disable-next-line no-restricted-syntax -- position tracking requires mutation
  let pos = 0;

  while (pos < content.length) {
    // Skip whitespace
    while (pos < content.length && WHITESPACE.test(content[pos])) {
      pos++;
    }

    if (pos >= content.length) {
      break;
    }

    const char = content[pos];

    // Comment (skip until end of line)
    if (char === "%") {
      while (pos < content.length && content[pos] !== "\n" && content[pos] !== "\r") {
        pos++;
      }
      continue;
    }

    // String literal (parentheses)
    if (char === "(") {
      const [str, newPos] = parseParenString(content, pos);
      tokens.push({
        type: "string",
        value: str,
        raw: content.slice(pos, newPos),
      });
      pos = newPos;
      continue;
    }

    // Hex string
    if (char === "<" && content[pos + 1] !== "<") {
      const [str, newPos] = parseHexString(content, pos);
      tokens.push({
        type: "string",
        value: str,
        raw: content.slice(pos, newPos),
      });
      pos = newPos;
      continue;
    }

    // Dictionary start
    if (char === "<" && content[pos + 1] === "<") {
      tokens.push({
        type: "dict_start",
        value: "<<",
        raw: "<<",
      });
      pos += 2;
      continue;
    }

    // Dictionary end
    if (char === ">" && content[pos + 1] === ">") {
      tokens.push({
        type: "dict_end",
        value: ">>",
        raw: ">>",
      });
      pos += 2;
      continue;
    }

    // Array start
    if (char === "[") {
      tokens.push({
        type: "array_start",
        value: "[",
        raw: "[",
      });
      pos++;
      continue;
    }

    // Array end
    if (char === "]") {
      tokens.push({
        type: "array_end",
        value: "]",
        raw: "]",
      });
      pos++;
      continue;
    }

    // Name
    if (char === "/") {
      const [name, newPos] = parseName(content, pos);
      tokens.push({
        type: "name",
        value: name,
        raw: content.slice(pos, newPos),
      });
      pos = newPos;
      continue;
    }

    // Number or operator
    if (isNumberStart(char, content[pos + 1])) {
      const [num, newPos] = parseNumber(content, pos);
      if (num !== null) {
        tokens.push({
          type: "number",
          value: num,
          raw: content.slice(pos, newPos),
        });
        pos = newPos;
        continue;
      }
    }

    // Operator (regular name)
    if (isOperatorChar(char)) {
      const [op, newPos] = parseOperator(content, pos);
      tokens.push({
        type: "operator",
        value: op,
        raw: op,
      });
      pos = newPos;
      continue;
    }

    // Skip unknown character
    pos++;
  }

  return tokens;
}

// =============================================================================
// Parse Functions
// =============================================================================

/* eslint-disable no-restricted-syntax -- parsers require mutable state for position tracking */

function isNumberStart(char: string, nextChar: string | undefined): boolean {
  if (char >= "0" && char <= "9") return true;
  if (char === "-" || char === "+") {
    return nextChar !== undefined && (nextChar >= "0" && nextChar <= "9" || nextChar === ".");
  }
  if (char === ".") {
    return nextChar !== undefined && nextChar >= "0" && nextChar <= "9";
  }
  return false;
}

function parseNumber(content: string, pos: number): [number | null, number] {
  const start = pos;

  // Optional sign
  if (content[pos] === "-" || content[pos] === "+") {
    pos++;
  }

  // Integer part
  while (pos < content.length && content[pos] >= "0" && content[pos] <= "9") {
    pos++;
  }

  // Decimal part
  if (pos < content.length && content[pos] === ".") {
    pos++;
    while (pos < content.length && content[pos] >= "0" && content[pos] <= "9") {
      pos++;
    }
  }

  const raw = content.slice(start, pos);
  if (raw === "" || raw === "-" || raw === "+" || raw === ".") {
    return [null, start];
  }

  const num = parseFloat(raw);
  if (isNaN(num)) {
    return [null, start];
  }

  return [num, pos];
}

function parseParenString(content: string, pos: number): [string, number] {
  let result = "";
  pos++; // skip opening (
  let depth = 1;

  while (pos < content.length && depth > 0) {
    const char = content[pos];

    if (char === "\\") {
      // Escape sequence
      pos++;
      if (pos >= content.length) break;

      const escaped = content[pos];
      switch (escaped) {
        case "n":
          result += "\n";
          break;
        case "r":
          result += "\r";
          break;
        case "t":
          result += "\t";
          break;
        case "b":
          result += "\b";
          break;
        case "f":
          result += "\f";
          break;
        case "(":
        case ")":
        case "\\":
          result += escaped;
          break;
        default:
          // Octal escape or ignored
          if (escaped >= "0" && escaped <= "7") {
            let octal = escaped;
            if (pos + 1 < content.length && content[pos + 1] >= "0" && content[pos + 1] <= "7") {
              pos++;
              octal += content[pos];
              if (pos + 1 < content.length && content[pos + 1] >= "0" && content[pos + 1] <= "7") {
                pos++;
                octal += content[pos];
              }
            }
            result += String.fromCharCode(parseInt(octal, 8));
          } else {
            result += escaped;
          }
      }
    } else if (char === "(") {
      depth++;
      result += char;
    } else if (char === ")") {
      depth--;
      if (depth > 0) {
        result += char;
      }
    } else {
      result += char;
    }
    pos++;
  }

  return [result, pos];
}

function parseHexString(content: string, pos: number): [string, number] {
  pos++; // skip <
  let hex = "";

  while (pos < content.length && content[pos] !== ">") {
    const char = content[pos];
    if (!WHITESPACE.test(char)) {
      hex += char;
    }
    pos++;
  }
  pos++; // skip >

  // Pad with 0 if odd length
  if (hex.length % 2 !== 0) {
    hex += "0";
  }

  // Convert hex to string
  let result = "";
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (!isNaN(byte)) {
      result += String.fromCharCode(byte);
    }
  }

  return [result, pos];
}

function parseName(content: string, pos: number): [string, number] {
  pos++; // skip /
  let name = "";

  while (pos < content.length) {
    const char = content[pos];
    if (WHITESPACE.test(char) || DELIMITER.test(char)) {
      break;
    }

    // Handle #XX escape
    if (char === "#" && pos + 2 < content.length) {
      const hex = content.slice(pos + 1, pos + 3);
      const code = parseInt(hex, 16);
      if (!isNaN(code)) {
        name += String.fromCharCode(code);
        pos += 3;
        continue;
      }
    }

    name += char;
    pos++;
  }

  return [name, pos];
}

function isOperatorChar(char: string): boolean {
  return (
    (char >= "a" && char <= "z") ||
    (char >= "A" && char <= "Z") ||
    char === "*" ||
    char === "'" ||
    char === '"'
  );
}

function parseOperator(content: string, pos: number): [string, number] {
  const start = pos;

  while (pos < content.length) {
    const char = content[pos];
    if (!isOperatorChar(char)) {
      break;
    }
    pos++;
  }

  return [content.slice(start, pos), pos];
}
