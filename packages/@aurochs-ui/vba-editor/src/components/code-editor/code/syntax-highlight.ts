/**
 * @file VBA Syntax Highlighting
 *
 * Tokenizer for VBA source code.
 */

// =============================================================================
// Token Types
// =============================================================================

export type TokenType =
  | "keyword"
  | "type"
  | "builtin"
  | "string"
  | "comment"
  | "number"
  | "operator"
  | "identifier"
  | "whitespace"
  | "punctuation";

export type Token = {
  readonly type: TokenType;
  readonly text: string;
  readonly start: number;
  readonly end: number;
};

// =============================================================================
// VBA Keywords
// =============================================================================

/**
 * VBA keywords for completion.
 */
export const VBA_KEYWORDS_ARRAY = [
  // Declarations
  "Dim",
  "ReDim",
  "Preserve",
  "Const",
  "Static",
  "Public",
  "Private",
  "Friend",
  "Global",

  // Procedures
  "Sub",
  "Function",
  "Property",
  "Get",
  "Let",
  "Set",
  "End",
  "Exit",

  // Control flow
  "If",
  "Then",
  "Else",
  "ElseIf",
  "Select",
  "Case",
  "For",
  "To",
  "Step",
  "Next",
  "Each",
  "In",
  "Do",
  "While",
  "Until",
  "Loop",
  "Wend",
  "With",
  "GoTo",
  "GoSub",
  "Return",
  "On",
  "Resume",

  // Error handling
  "Error",

  // Operators
  "And",
  "Or",
  "Xor",
  "Not",
  "Mod",
  "Like",
  "Is",
  "TypeOf",

  // Other
  "As",
  "ByVal",
  "ByRef",
  "Optional",
  "ParamArray",
  "Call",
  "New",
  "Me",
  "MyBase",
  "MyClass",

  // Boolean and special values
  "True",
  "False",
  "Nothing",
  "Empty",
  "Null",
] as const;

const VBA_KEYWORDS = new Set([
  // Declarations
  "Dim",
  "ReDim",
  "Preserve",
  "Const",
  "Static",
  "Public",
  "Private",
  "Friend",
  "Global",

  // Procedures
  "Sub",
  "Function",
  "Property",
  "Get",
  "Let",
  "Set",
  "End",
  "Exit",

  // Control flow
  "If",
  "Then",
  "Else",
  "ElseIf",
  "Select",
  "Case",
  "For",
  "To",
  "Step",
  "Next",
  "Each",
  "In",
  "Do",
  "While",
  "Until",
  "Loop",
  "Wend",
  "With",
  "GoTo",
  "GoSub",
  "Return",
  "On",
  "Resume",

  // Error handling
  "Error",

  // Operators
  "And",
  "Or",
  "Xor",
  "Not",
  "Mod",
  "Like",
  "Is",
  "TypeOf",

  // Other
  "As",
  "ByVal",
  "ByRef",
  "Optional",
  "ParamArray",
  "Call",
  "New",
  "Me",
  "MyBase",
  "MyClass",

  // Boolean and special values
  "True",
  "False",
  "Nothing",
  "Empty",
  "Null",
]);

// =============================================================================
// VBA Built-in Types
// =============================================================================

/**
 * VBA types for completion.
 */
export const VBA_TYPES_ARRAY = [
  "Integer",
  "Long",
  "Single",
  "Double",
  "Currency",
  "String",
  "Boolean",
  "Date",
  "Variant",
  "Object",
  "Byte",
  "LongLong",
  "LongPtr",
] as const;

const VBA_TYPES: Set<string> = new Set(VBA_TYPES_ARRAY);

// =============================================================================
// VBA Built-in Functions
// =============================================================================

/**
 * VBA built-in functions for completion.
 */
export const VBA_BUILTINS_ARRAY = [
  // Type conversion
  "CBool",
  "CByte",
  "CCur",
  "CDate",
  "CDbl",
  "CDec",
  "CInt",
  "CLng",
  "CLngLng",
  "CLngPtr",
  "CSng",
  "CStr",
  "CVar",

  // String functions
  "Len",
  "Left",
  "Right",
  "Mid",
  "Trim",
  "LTrim",
  "RTrim",
  "UCase",
  "LCase",
  "InStr",
  "InStrRev",
  "Replace",
  "Split",
  "Join",
  "StrComp",
  "Space",
  "String",
  "Asc",
  "Chr",
  "Format",
  "Val",

  // Math functions
  "Abs",
  "Sgn",
  "Int",
  "Fix",
  "Round",
  "Sqr",
  "Exp",
  "Log",
  "Sin",
  "Cos",
  "Tan",
  "Atn",
  "Rnd",

  // Date functions
  "Now",
  "Date",
  "Time",
  "Year",
  "Month",
  "Day",
  "Hour",
  "Minute",
  "Second",
  "Weekday",
  "DateAdd",
  "DateDiff",
  "DatePart",
  "DateSerial",
  "DateValue",
  "TimeSerial",
  "TimeValue",

  // Array functions
  "Array",
  "LBound",
  "UBound",
  "IsArray",

  // Type checking
  "IsEmpty",
  "IsNull",
  "IsNumeric",
  "IsDate",
  "IsObject",
  "IsMissing",
  "TypeName",
  "VarType",

  // Other
  "MsgBox",
  "InputBox",
  "Debug",
  "Print",
] as const;

const VBA_BUILTINS: Set<string> = new Set(VBA_BUILTINS_ARRAY);

// =============================================================================
// Operators and Punctuation
// =============================================================================

const OPERATORS = new Set([
  "+",
  "-",
  "*",
  "/",
  "\\",
  "^",
  "&",
  "=",
  "<",
  ">",
  "<=",
  ">=",
  "<>",
]);

const PUNCTUATION = new Set(["(", ")", ",", ".", ":", ";", "_"]);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Classify an identifier token type.
 */
function classifyIdentifier(name: string): TokenType {
  if (VBA_KEYWORDS.has(name)) {
    return "keyword";
  }
  if (VBA_TYPES.has(name)) {
    return "type";
  }
  if (VBA_BUILTINS.has(name)) {
    return "builtin";
  }
  return "identifier";
}

// =============================================================================
// Tokenizer
// =============================================================================

/**
 * Tokenize a single line of VBA code.
 */
export function tokenizeLine(line: string): readonly Token[] {
  const tokens: Token[] = [];
  // eslint-disable-next-line no-restricted-syntax -- Tokenizer requires mutable position tracking
  let pos = 0;

  while (pos < line.length) {
    const char = line[pos];

    // Whitespace
    if (/\s/.test(char)) {
      const start = pos;
      while (pos < line.length && /\s/.test(line[pos])) {
        pos++;
      }
      tokens.push({
        type: "whitespace",
        text: line.slice(start, pos),
        start,
        end: pos,
      });
      continue;
    }

    // Comment (starts with ' or Rem)
    if (char === "'") {
      tokens.push({
        type: "comment",
        text: line.slice(pos),
        start: pos,
        end: line.length,
      });
      break;
    }

    // Check for Rem keyword at start or after separator
    if (
      (pos === 0 || /[\s:]/.test(line[pos - 1])) &&
      line.slice(pos, pos + 3).toLowerCase() === "rem" &&
      (pos + 3 >= line.length || /[\s]/.test(line[pos + 3]))
    ) {
      tokens.push({
        type: "comment",
        text: line.slice(pos),
        start: pos,
        end: line.length,
      });
      break;
    }

    // String literal
    if (char === '"') {
      const start = pos;
      pos++; // Skip opening quote
      while (pos < line.length) {
        if (line[pos] === '"') {
          if (pos + 1 < line.length && line[pos + 1] === '"') {
            // Escaped quote
            pos += 2;
          } else {
            // End of string
            pos++;
            break;
          }
        } else {
          pos++;
        }
      }
      tokens.push({
        type: "string",
        text: line.slice(start, pos),
        start,
        end: pos,
      });
      continue;
    }

    // Number
    if (/\d/.test(char) || (char === "." && pos + 1 < line.length && /\d/.test(line[pos + 1]))) {
      const start = pos;
      // Handle hex (&H) or octal (&O)
      if (char === "&" && pos + 1 < line.length && /[hHoO]/.test(line[pos + 1])) {
        pos += 2;
        while (pos < line.length && /[0-9a-fA-F]/.test(line[pos])) {
          pos++;
        }
      } else {
        // Decimal number
        while (pos < line.length && /[\d.]/.test(line[pos])) {
          pos++;
        }
        // Exponent
        if (pos < line.length && /[eE]/.test(line[pos])) {
          pos++;
          if (pos < line.length && /[+-]/.test(line[pos])) {
            pos++;
          }
          while (pos < line.length && /\d/.test(line[pos])) {
            pos++;
          }
        }
      }
      // Type suffix (%, &, !, #, @, $)
      if (pos < line.length && /[%&!#@$]/.test(line[pos])) {
        pos++;
      }
      tokens.push({
        type: "number",
        text: line.slice(start, pos),
        start,
        end: pos,
      });
      continue;
    }

    // Hex/Octal literal starting with &
    if (char === "&" && pos + 1 < line.length && /[hHoO]/.test(line[pos + 1])) {
      const start = pos;
      pos += 2;
      while (pos < line.length && /[0-9a-fA-F]/.test(line[pos])) {
        pos++;
      }
      if (pos < line.length && /[&]/.test(line[pos])) {
        pos++;
      }
      tokens.push({
        type: "number",
        text: line.slice(start, pos),
        start,
        end: pos,
      });
      continue;
    }

    // Multi-character operators
    if (pos + 1 < line.length) {
      const twoChar = line.slice(pos, pos + 2);
      if (OPERATORS.has(twoChar)) {
        tokens.push({
          type: "operator",
          text: twoChar,
          start: pos,
          end: pos + 2,
        });
        pos += 2;
        continue;
      }
    }

    // Single-character operators
    if (OPERATORS.has(char)) {
      tokens.push({
        type: "operator",
        text: char,
        start: pos,
        end: pos + 1,
      });
      pos++;
      continue;
    }

    // Punctuation
    if (PUNCTUATION.has(char)) {
      tokens.push({
        type: "punctuation",
        text: char,
        start: pos,
        end: pos + 1,
      });
      pos++;
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(char)) {
      const start = pos;
      while (pos < line.length && /[a-zA-Z0-9_]/.test(line[pos])) {
        pos++;
      }
      // Type suffix ($, %, &, !, #)
      if (pos < line.length && /[$%&!#]/.test(line[pos])) {
        pos++;
      }
      const text = line.slice(start, pos);
      const textForComparison = text.replace(/[$%&!#]$/, ""); // Remove type suffix for keyword check

      const type = classifyIdentifier(textForComparison);

      tokens.push({ type, text, start, end: pos });
      continue;
    }

    // Unknown character - treat as punctuation
    tokens.push({
      type: "punctuation",
      text: char,
      start: pos,
      end: pos + 1,
    });
    pos++;
  }

  return tokens;
}

// =============================================================================
// Token Colors (CSS custom property references)
// =============================================================================

/**
 * Get CSS color variable for token type.
 */
export function getTokenColor(type: TokenType): string {
  switch (type) {
    case "keyword":
      return "var(--vba-keyword-color, #0000ff)";
    case "type":
      return "var(--vba-type-color, #2b91af)";
    case "builtin":
      return "var(--vba-builtin-color, #795e26)";
    case "string":
      return "var(--vba-string-color, #a31515)";
    case "comment":
      return "var(--vba-comment-color, #008000)";
    case "number":
      return "var(--vba-number-color, #098658)";
    case "operator":
      return "var(--vba-operator-color, #000000)";
    case "identifier":
      return "var(--vba-identifier-color, #000000)";
    case "punctuation":
      return "var(--vba-punctuation-color, #000000)";
    case "whitespace":
      return "transparent";
    default:
      return "var(--vba-default-color, #000000)";
  }
}
