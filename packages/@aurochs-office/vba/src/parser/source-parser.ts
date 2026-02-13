/**
 * @file VBA Source Code Parser
 *
 * Parses VBA source code into AST (statements and expressions).
 * This is a minimal parser for basic VBA constructs.
 *
 * @see MS-VBAL (VBA Language Specification)
 */

import type { VbaStatement } from "../ir/statement";
import type { VbaExpression, VbaLiteralValue, VbaBinaryOp } from "../ir/expression";

// =============================================================================
// Tokenizer
// =============================================================================

/**
 * Token types.
 */
type TokenType =
  | "identifier"
  | "number"
  | "string"
  | "date"
  | "keyword"
  | "operator"
  | "punctuation"
  | "newline"
  | "eof";

/**
 * Token structure.
 */
type Token = {
  readonly type: TokenType;
  readonly value: string;
  readonly line: number;
  readonly column: number;
};

/**
 * VBA keywords.
 */
const KEYWORDS = new Set([
  "and", "as", "byref", "byval", "call", "case", "const", "dim", "do", "each",
  "else", "elseif", "end", "eqv", "exit", "false", "for", "function", "get",
  "goto", "if", "imp", "in", "is", "let", "like", "loop", "mod", "new", "next",
  "not", "nothing", "on", "optional", "or", "paramarray", "preserve", "private",
  "property", "public", "raiseevent", "redim", "resume", "return", "select",
  "set", "step", "sub", "then", "to", "true", "until", "wend", "while", "with",
  "xor", "error", "attribute",
]);

/**
 * Tokenize VBA source code.
 */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const c = { pos: 0, line: 1, column: 1 };

  while (c.pos < source.length) {
    const startLine = c.line;
    const startColumn = c.column;
    const char = source[c.pos];

    // Skip whitespace (except newlines)
    if (char === " " || char === "\t") {
      c.pos++;
      c.column++;
      continue;
    }

    // Newline
    if (char === "\r" || char === "\n") {
      if (char === "\r" && source[c.pos + 1] === "\n") {
        c.pos++;
      }
      tokens.push({ type: "newline", value: "\n", line: startLine, column: startColumn });
      c.pos++;
      c.line++;
      c.column = 1;
      continue;
    }

    // Line continuation (_)
    if (char === "_" && (source[c.pos + 1] === "\r" || source[c.pos + 1] === "\n")) {
      c.pos++;
      if (source[c.pos] === "\r") {c.pos++;}
      if (source[c.pos] === "\n") {c.pos++;}
      c.line++;
      c.column = 1;
      continue;
    }

    // Comment (')
    if (char === "'") {
      while (c.pos < source.length && source[c.pos] !== "\r" && source[c.pos] !== "\n") {
        c.pos++;
      }
      continue;
    }

    // Rem comment
    if (source.substring(c.pos, c.pos + 3).toLowerCase() === "rem" &&
        (c.pos + 3 >= source.length || /\s/.test(source[c.pos + 3]))) {
      while (c.pos < source.length && source[c.pos] !== "\r" && source[c.pos] !== "\n") {
        c.pos++;
      }
      continue;
    }

    // String literal
    if (char === '"') {
      const chars: string[] = [];
      c.pos++;
      c.column++;
      while (c.pos < source.length) {
        if (source[c.pos] === '"') {
          if (source[c.pos + 1] === '"') {
            // Escaped quote
            chars.push('"');
            c.pos += 2;
            c.column += 2;
          } else {
            // End of string
            c.pos++;
            c.column++;
            break;
          }
        } else {
          chars.push(source[c.pos]);
          c.pos++;
          c.column++;
        }
      }
      tokens.push({ type: "string", value: chars.join(""), line: startLine, column: startColumn });
      continue;
    }

    // Date literal
    if (char === "#") {
      const chars: string[] = [];
      c.pos++;
      c.column++;
      while (c.pos < source.length && source[c.pos] !== "#") {
        chars.push(source[c.pos]);
        c.pos++;
        c.column++;
      }
      c.pos++; // Skip closing #
      c.column++;
      tokens.push({ type: "date", value: chars.join(""), line: startLine, column: startColumn });
      continue;
    }

    // Number
    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(source[c.pos + 1] || ""))) {
      const numberValue = parseNumber(source, c);
      tokens.push({ type: "number", value: numberValue, line: startLine, column: startColumn });
      continue;
    }

    // Identifier or keyword
    if (/[A-Za-z_]/.test(char)) {
      const identValue = parseIdentifier(source, c);
      const lower = identValue.toLowerCase();
      const type: TokenType = KEYWORDS.has(lower) ? "keyword" : "identifier";
      tokens.push({ type, value: identValue, line: startLine, column: startColumn });
      continue;
    }

    // Multi-character operators
    const twoChar = source.substring(c.pos, c.pos + 2);
    if (["<>", "<=", ">=", ":="].includes(twoChar)) {
      tokens.push({ type: "operator", value: twoChar, line: startLine, column: startColumn });
      c.pos += 2;
      c.column += 2;
      continue;
    }

    // Single-character operators and punctuation
    if ("+-*/\\^&=<>".includes(char)) {
      tokens.push({ type: "operator", value: char, line: startLine, column: startColumn });
      c.pos++;
      c.column++;
      continue;
    }

    if ("(),.;:".includes(char)) {
      tokens.push({ type: "punctuation", value: char, line: startLine, column: startColumn });
      c.pos++;
      c.column++;
      continue;
    }

    // Unknown character - skip
    c.pos++;
    c.column++;
  }

  tokens.push({ type: "eof", value: "", line: c.line, column: c.column });
  return tokens;
}

/**
 * Parse a number literal from source.
 */
function parseNumber(source: string, c: { pos: number; line: number; column: number }): string {
  const chars: string[] = [];
  const char = source[c.pos];

  // Handle hex (&H) and octal (&O)
  if (char === "&" && (source[c.pos + 1] === "H" || source[c.pos + 1] === "h" ||
                       source[c.pos + 1] === "O" || source[c.pos + 1] === "o")) {
    chars.push(source.substring(c.pos, c.pos + 2));
    c.pos += 2;
    c.column += 2;
    while (c.pos < source.length && /[0-9A-Fa-f]/.test(source[c.pos])) {
      chars.push(source[c.pos]);
      c.pos++;
      c.column++;
    }
  } else {
    while (c.pos < source.length && /[0-9.]/.test(source[c.pos])) {
      chars.push(source[c.pos]);
      c.pos++;
      c.column++;
    }
    // Exponent
    if ((source[c.pos] === "E" || source[c.pos] === "e") &&
        (/[0-9+-]/.test(source[c.pos + 1] || ""))) {
      chars.push(source[c.pos]);
      c.pos++;
      c.column++;
      if (source[c.pos] === "+" || source[c.pos] === "-") {
        chars.push(source[c.pos]);
        c.pos++;
        c.column++;
      }
      while (c.pos < source.length && /[0-9]/.test(source[c.pos])) {
        chars.push(source[c.pos]);
        c.pos++;
        c.column++;
      }
    }
    // Type suffix
    if (/[%&!#@]/.test(source[c.pos] || "")) {
      chars.push(source[c.pos]);
      c.pos++;
      c.column++;
    }
  }
  return chars.join("");
}

/**
 * Parse an identifier from source.
 */
function parseIdentifier(source: string, c: { pos: number; line: number; column: number }): string {
  const chars: string[] = [];
  while (c.pos < source.length && /[A-Za-z0-9_]/.test(source[c.pos])) {
    chars.push(source[c.pos]);
    c.pos++;
    c.column++;
  }
  // Type suffix
  if (/[%&!#@$]/.test(source[c.pos] || "")) {
    chars.push(source[c.pos]);
    c.pos++;
    c.column++;
  }
  return chars.join("");
}

// =============================================================================
// Parser
// =============================================================================

type ParserApi = {
  readonly parseStatements: () => VbaStatement[];
  readonly parseSingleExpression: () => VbaExpression;
  readonly parseProcedureBody: () => VbaStatement[];
};

/**
 * Create a VBA parser.
 */
function createParser(tokens: Token[]): ParserApi {
  const state = { pos: 0 };

  // Token access
  function current(): Token {
    return tokens[state.pos] ?? { type: "eof", value: "", line: 0, column: 0 };
  }

  function advance(): Token {
    const token = current();
    if (token.type !== "eof") {
      state.pos++;
    }
    return token;
  }

  function expect(type: TokenType, value?: string): Token {
    const token = current();
    if (token.type !== type || (value !== undefined && token.value.toLowerCase() !== value.toLowerCase())) {
      throw new Error(`Expected ${value ?? type} at line ${token.line}, column ${token.column}, got ${token.value}`);
    }
    return advance();
  }

  function match(type: TokenType, value?: string): boolean {
    const token = current();
    return token.type === type && (value === undefined || token.value.toLowerCase() === value.toLowerCase());
  }

  function matchKeyword(...keywords: string[]): boolean {
    const token = current();
    return token.type === "keyword" && keywords.some(k => token.value.toLowerCase() === k);
  }

  function skipNewlines(): void {
    while (match("newline")) {
      advance();
    }
  }

  function expectNewlineOrEof(): void {
    if (!match("newline") && !match("eof")) {
      const token = current();
      throw new Error(`Expected end of line at line ${token.line}, column ${token.column}`);
    }
    if (match("newline")) {
      advance();
    }
  }

  function skipToEndOfLine(): void {
    while (!match("newline") && !match("eof")) {
      advance();
    }
  }

  function skipProcedureDeclaration(): void {
    const procType = advance().value.toLowerCase();
    skipNewlines();

    if (procType === "property") {
      if (matchKeyword("get", "let", "set")) {
        advance();
      }
    }

    skipToEndOfLine();
    skipNewlines();

    const counter = { depth: 1 };
    while (counter.depth > 0 && !match("eof")) {
      if (matchKeyword("sub", "function", "property")) {
        counter.depth++;
      } else if (matchKeyword("end")) {
        advance();
        if (matchKeyword("sub", "function", "property")) {
          counter.depth--;
          advance();
        }
      } else {
        advance();
      }
    }
  }

  // ==========================================================================
  // Statement Parsing
  // ==========================================================================

  function parseStatements(): VbaStatement[] {
    const statements: VbaStatement[] = [];
    skipNewlines();

    while (!match("eof")) {
      if (matchKeyword("attribute")) {
        skipToEndOfLine();
        skipNewlines();
        continue;
      }

      if (matchKeyword("option")) {
        skipToEndOfLine();
        skipNewlines();
        continue;
      }

      if (matchKeyword("public", "private")) {
        advance();
        skipNewlines();
      }

      if (matchKeyword("sub", "function", "property")) {
        skipProcedureDeclaration();
        skipNewlines();
        continue;
      }

      const stmt = parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      skipNewlines();
    }

    return statements;
  }

  function parseSingleExpression(): VbaExpression {
    skipNewlines();
    return parseExpression();
  }

  function parseProcedureBody(): VbaStatement[] {
    const statements: VbaStatement[] = [];
    skipNewlines();

    while (!match("eof") && !matchKeyword("end")) {
      const stmt = parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      skipNewlines();
    }

    return statements;
  }

  function parseStatement(): VbaStatement | null {
    if (match("newline") || match("eof")) {
      return null;
    }

    if (matchKeyword("dim", "redim")) {
      return parseDim();
    }
    if (matchKeyword("if")) {
      return parseIf();
    }
    if (matchKeyword("select")) {
      return parseSelectCase();
    }
    if (matchKeyword("for")) {
      return parseFor();
    }
    if (matchKeyword("do")) {
      return parseDoLoop();
    }
    if (matchKeyword("while")) {
      return parseWhile();
    }
    if (matchKeyword("with")) {
      return parseWith();
    }
    if (matchKeyword("exit")) {
      return parseExit();
    }
    if (matchKeyword("on")) {
      return parseOnError();
    }
    if (matchKeyword("set")) {
      return parseSet();
    }
    if (matchKeyword("call")) {
      return parseCall();
    }
    if (matchKeyword("raiseevent")) {
      return parseRaiseEvent();
    }
    if (match("identifier")) {
      return parseAssignmentOrCall();
    }

    skipToEndOfLine();
    return null;
  }

  // ==========================================================================
  // Statement Implementations
  // ==========================================================================

  function parseDim(): VbaStatement {
    advance(); // Dim or ReDim

    const declarations: Array<{
      name: string;
      typeName: string | null;
      isArray: boolean;
      arrayBounds: Array<{ lower: number; upper: number }> | null;
    }> = [];

    do {
      if (match("punctuation", ",")) {
        advance();
      }

      const nameToken = expect("identifier");
      const decl = {
        isArray: false,
        arrayBounds: null as Array<{ lower: number; upper: number }> | null,
        typeName: null as string | null,
      };

      if (match("punctuation", "(")) {
        advance();
        decl.isArray = true;
        decl.arrayBounds = [];

        if (!match("punctuation", ")")) {
          do {
            if (match("punctuation", ",")) {
              advance();
            }
            const upperBound = parseNumericLiteral();
            decl.arrayBounds.push({ lower: 0, upper: upperBound });
          } while (match("punctuation", ","));
        }

        expect("punctuation", ")");
      }

      if (matchKeyword("as")) {
        advance();
        if (matchKeyword("new")) {
          advance();
        }
        decl.typeName = expect("identifier").value;
      }

      declarations.push({ name: nameToken.value, typeName: decl.typeName, isArray: decl.isArray, arrayBounds: decl.arrayBounds });
    } while (match("punctuation", ","));

    return { type: "dim", declarations };
  }

  function parseNumericLiteral(): number {
    const token = current();
    if (token.type === "number") {
      advance();
      return parseFloat(token.value);
    }
    throw new Error(`Expected number at line ${token.line}, column ${token.column}`);
  }

  function parseIf(): VbaStatement {
    expect("keyword", "if");
    const condition = parseExpression();
    expect("keyword", "then");

    if (!match("newline") && !match("eof")) {
      const thenStmt = parseStatement();
      const thenBlock = thenStmt ? [thenStmt] : [];

      const result = { elseBlock: null as VbaStatement[] | null };
      if (matchKeyword("else")) {
        advance();
        const elseStmt = parseStatement();
        result.elseBlock = elseStmt ? [elseStmt] : [];
      }

      return { type: "if", condition, thenBlock, elseIfBlocks: [], elseBlock: result.elseBlock };
    }

    expectNewlineOrEof();
    skipNewlines();

    const thenBlock = parseBlockUntil("elseif", "else", "end");
    const elseIfBlocks: Array<{ condition: VbaExpression; block: VbaStatement[] }> = [];
    const ifState = { elseBlock: null as VbaStatement[] | null };

    while (matchKeyword("elseif")) {
      advance();
      const elseIfCondition = parseExpression();
      expect("keyword", "then");
      expectNewlineOrEof();
      skipNewlines();
      const block = parseBlockUntil("elseif", "else", "end");
      elseIfBlocks.push({ condition: elseIfCondition, block });
    }

    if (matchKeyword("else")) {
      advance();
      expectNewlineOrEof();
      skipNewlines();
      ifState.elseBlock = parseBlockUntil("end");
    }

    expect("keyword", "end");
    expect("keyword", "if");

    return { type: "if", condition, thenBlock, elseIfBlocks, elseBlock: ifState.elseBlock };
  }

  function parseBlockUntil(...stopKeywords: string[]): VbaStatement[] {
    const statements: VbaStatement[] = [];

    while (!match("eof") && !matchKeyword(...stopKeywords)) {
      const stmt = parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      skipNewlines();
    }

    return statements;
  }

  function parseSelectCase(): VbaStatement {
    expect("keyword", "select");
    expect("keyword", "case");
    const testExpr = parseExpression();
    expectNewlineOrEof();
    skipNewlines();

    const cases: Array<{ conditions: VbaExpression[]; block: VbaStatement[] }> = [];
    const selectState = { elseBlock: null as VbaStatement[] | null };

    while (matchKeyword("case")) {
      advance();

      if (matchKeyword("else")) {
        advance();
        expectNewlineOrEof();
        skipNewlines();
        selectState.elseBlock = parseBlockUntil("case", "end");
        break;
      }

      const conditions: VbaExpression[] = [];
      do {
        if (match("punctuation", ",")) {
          advance();
        }
        conditions.push(parseExpression());
      } while (match("punctuation", ","));

      expectNewlineOrEof();
      skipNewlines();
      const block = parseBlockUntil("case", "end");
      cases.push({ conditions, block });
    }

    expect("keyword", "end");
    expect("keyword", "select");

    return { type: "selectCase", testExpr, cases, elseBlock: selectState.elseBlock };
  }

  function parseFor(): VbaStatement {
    expect("keyword", "for");

    if (matchKeyword("each")) {
      advance();
      const element = expect("identifier").value;
      expect("keyword", "in");
      const collection = parseExpression();
      expectNewlineOrEof();
      skipNewlines();
      const body = parseBlockUntil("next");
      expect("keyword", "next");
      if (match("identifier")) {
        advance();
      }
      return { type: "forEach", element, collection, body };
    }

    const counter = expect("identifier").value;
    expect("operator", "=");
    const start = parseExpression();
    expect("keyword", "to");
    const end = parseExpression();

    const forState = { step: null as VbaExpression | null };
    if (matchKeyword("step")) {
      advance();
      forState.step = parseExpression();
    }

    expectNewlineOrEof();
    skipNewlines();
    const body = parseBlockUntil("next");
    expect("keyword", "next");
    if (match("identifier")) {
      advance();
    }

    return { type: "for", counter, start, end, step: forState.step, body };
  }

  function parseDoLoop(): VbaStatement {
    expect("keyword", "do");

    const loopState = {
      condition: null as VbaExpression | null,
      conditionType: null as "while" | "until" | null,
      conditionPosition: "pre" as "pre" | "post",
    };

    if (matchKeyword("while", "until")) {
      loopState.conditionType = advance().value.toLowerCase() as "while" | "until";
      loopState.condition = parseExpression();
    }

    expectNewlineOrEof();
    skipNewlines();
    const body = parseBlockUntil("loop");
    expect("keyword", "loop");

    if (loopState.condition === null && matchKeyword("while", "until")) {
      loopState.conditionType = advance().value.toLowerCase() as "while" | "until";
      loopState.condition = parseExpression();
      loopState.conditionPosition = "post";
    }

    return { type: "doLoop", condition: loopState.condition, conditionType: loopState.conditionType, conditionPosition: loopState.conditionPosition, body };
  }

  function parseWhile(): VbaStatement {
    expect("keyword", "while");
    const condition = parseExpression();
    expectNewlineOrEof();
    skipNewlines();
    const body = parseBlockUntil("wend");
    expect("keyword", "wend");
    return { type: "while", condition, body };
  }

  function parseWith(): VbaStatement {
    expect("keyword", "with");
    const object = parseExpression();
    expectNewlineOrEof();
    skipNewlines();
    const body = parseBlockUntil("end");
    expect("keyword", "end");
    expect("keyword", "with");
    return { type: "with", object, body };
  }

  function parseExit(): VbaStatement {
    expect("keyword", "exit");
    const exitTypeToken = advance();
    const exitType = exitTypeToken.value.toLowerCase() as "sub" | "function" | "for" | "do" | "property";
    return { type: "exit", exitType };
  }

  function parseOnError(): VbaStatement {
    expect("keyword", "on");
    expect("keyword", "error");

    const handler = parseOnErrorHandler();

    return { type: "onError", handler };
  }

  function parseOnErrorHandler(): "resume" | "resumeNext" | "goto0" | { label: string } {
    if (matchKeyword("resume")) {
      advance();
      if (matchKeyword("next")) {
        advance();
        return "resumeNext";
      }
      return "resume";
    }
    if (matchKeyword("goto")) {
      advance();
      const target = current().value;
      advance();
      if (target === "0") {
        return "goto0";
      }
      return { label: target };
    }
    return "goto0";
  }

  function parseSet(): VbaStatement {
    expect("keyword", "set");
    const target = parseExpression();
    expect("operator", "=");
    const value = parseExpression();
    return { type: "set", target, value };
  }

  function parseCall(): VbaStatement {
    expect("keyword", "call");
    const target = parseExpression();

    const args: VbaExpression[] = [];
    if (match("punctuation", "(")) {
      advance();
      if (!match("punctuation", ")")) {
        do {
          if (match("punctuation", ",")) {
            advance();
          }
          args.push(parseExpression());
        } while (match("punctuation", ","));
      }
      expect("punctuation", ")");
    }

    return { type: "call", target, arguments: args };
  }

  function parseRaiseEvent(): VbaStatement {
    expect("keyword", "raiseevent");
    const eventName = expect("identifier").value;

    const args: VbaExpression[] = [];
    if (match("punctuation", "(")) {
      advance();
      if (!match("punctuation", ")")) {
        do {
          if (match("punctuation", ",")) {
            advance();
          }
          args.push(parseExpression());
        } while (match("punctuation", ","));
      }
      expect("punctuation", ")");
    }

    return { type: "raiseEvent", eventName, arguments: args };
  }

  function parseAssignmentOrCall(): VbaStatement {
    const target = parseAssignmentTarget();

    if (match("operator", "=")) {
      advance();
      const value = parseExpression();
      return { type: "assignment", target, value };
    }

    const args: VbaExpression[] = [];
    while (!match("newline") && !match("eof") && !match("punctuation", ":")) {
      if (match("punctuation", ",")) {
        advance();
      }
      if (match("newline") || match("eof")) {break;}
      args.push(parseExpression());
    }

    return { type: "call", target, arguments: args };
  }

  function parseAssignmentTarget(): VbaExpression {
    const state = { expr: parsePrimaryExpression() as VbaExpression };

    while (true) {
      if (match("punctuation", ".")) {
        advance();
        const member = expect("identifier").value;
        state.expr = { type: "memberAccess", object: state.expr, member };
        continue;
      }

      if (match("punctuation", "(")) {
        advance();
        const indices: VbaExpression[] = [];
        if (!match("punctuation", ")")) {
          do {
            if (match("punctuation", ",")) {
              advance();
            }
            indices.push(parseExpression());
          } while (match("punctuation", ","));
        }
        expect("punctuation", ")");
        state.expr = { type: "index", target: state.expr, indices };
        continue;
      }

      break;
    }

    return state.expr;
  }

  // ==========================================================================
  // Expression Parsing
  // ==========================================================================

  function parseExpression(): VbaExpression {
    return parseOrExpression();
  }

  function parseOrExpression(): VbaExpression {
    const state = { left: parseAndExpression() as VbaExpression };

    while (matchKeyword("or", "xor", "eqv", "imp")) {
      const op = advance().value as VbaBinaryOp;
      const right = parseAndExpression();
      state.left = { type: "binary", operator: op, left: state.left, right };
    }

    return state.left;
  }

  function parseAndExpression(): VbaExpression {
    const state = { left: parseNotExpression() as VbaExpression };

    while (matchKeyword("and")) {
      advance();
      const right = parseNotExpression();
      state.left = { type: "binary", operator: "And", left: state.left, right };
    }

    return state.left;
  }

  function parseNotExpression(): VbaExpression {
    if (matchKeyword("not")) {
      advance();
      const operand = parseNotExpression();
      return { type: "unary", operator: "Not", operand };
    }
    return parseComparisonExpression();
  }

  function parseComparisonExpression(): VbaExpression {
    const state = { left: parseConcatExpression() as VbaExpression };

    while (match("operator", "=") || match("operator", "<>") ||
           match("operator", "<") || match("operator", ">") ||
           match("operator", "<=") || match("operator", ">=") ||
           matchKeyword("is", "like")) {
      const opToken = advance();
      const op = opToken.value as VbaBinaryOp;
      const right = parseConcatExpression();
      state.left = { type: "binary", operator: op, left: state.left, right };
    }

    return state.left;
  }

  function parseConcatExpression(): VbaExpression {
    const state = { left: parseAddExpression() as VbaExpression };

    while (match("operator", "&")) {
      advance();
      const right = parseAddExpression();
      state.left = { type: "binary", operator: "&", left: state.left, right };
    }

    return state.left;
  }

  function parseAddExpression(): VbaExpression {
    const state = { left: parseModExpression() as VbaExpression };

    while (match("operator", "+") || match("operator", "-")) {
      const op = advance().value as VbaBinaryOp;
      const right = parseModExpression();
      state.left = { type: "binary", operator: op, left: state.left, right };
    }

    return state.left;
  }

  function parseModExpression(): VbaExpression {
    const state = { left: parseIntDivExpression() as VbaExpression };

    while (matchKeyword("mod")) {
      advance();
      const right = parseIntDivExpression();
      state.left = { type: "binary", operator: "Mod", left: state.left, right };
    }

    return state.left;
  }

  function parseIntDivExpression(): VbaExpression {
    const state = { left: parseMulExpression() as VbaExpression };

    while (match("operator", "\\")) {
      advance();
      const right = parseMulExpression();
      state.left = { type: "binary", operator: "\\", left: state.left, right };
    }

    return state.left;
  }

  function parseMulExpression(): VbaExpression {
    const state = { left: parsePowerExpression() as VbaExpression };

    while (match("operator", "*") || match("operator", "/")) {
      const op = advance().value as VbaBinaryOp;
      const right = parsePowerExpression();
      state.left = { type: "binary", operator: op, left: state.left, right };
    }

    return state.left;
  }

  function parsePowerExpression(): VbaExpression {
    const state = { left: parseUnaryExpression() as VbaExpression };

    while (match("operator", "^")) {
      advance();
      const right = parseUnaryExpression();
      state.left = { type: "binary", operator: "^", left: state.left, right };
    }

    return state.left;
  }

  function parseUnaryExpression(): VbaExpression {
    if (match("operator", "-")) {
      advance();
      const operand = parseUnaryExpression();
      return { type: "unary", operator: "-", operand };
    }
    if (match("operator", "+")) {
      advance();
      return parseUnaryExpression();
    }
    return parsePostfixExpression();
  }

  function parsePostfixExpression(): VbaExpression {
    const state = { expr: parsePrimaryExpression() as VbaExpression };

    while (true) {
      if (match("punctuation", ".")) {
        advance();
        const member = expect("identifier").value;
        state.expr = { type: "memberAccess", object: state.expr, member };
        continue;
      }

      if (match("punctuation", "(")) {
        advance();
        const indices: VbaExpression[] = [];
        if (!match("punctuation", ")")) {
          do {
            if (match("punctuation", ",")) {
              advance();
            }
            indices.push(parseExpression());
          } while (match("punctuation", ","));
        }
        expect("punctuation", ")");
        state.expr = { type: "index", target: state.expr, indices };
        continue;
      }

      break;
    }

    return state.expr;
  }

  function parsePrimaryExpression(): VbaExpression {
    const token = current();

    if (token.type === "number") {
      advance();
      const num = parseFloat(token.value);
      const kind: VbaLiteralValue["kind"] = Number.isInteger(num) ? "long" : "double";
      return { type: "literal", value: { kind, value: num } };
    }

    if (token.type === "string") {
      advance();
      return { type: "literal", value: { kind: "string", value: token.value } };
    }

    if (token.type === "date") {
      advance();
      const date = new Date(token.value);
      return { type: "literal", value: { kind: "date", value: date } };
    }

    if (matchKeyword("true")) {
      advance();
      return { type: "literal", value: { kind: "boolean", value: true } };
    }
    if (matchKeyword("false")) {
      advance();
      return { type: "literal", value: { kind: "boolean", value: false } };
    }

    if (matchKeyword("nothing")) {
      advance();
      return { type: "literal", value: { kind: "nothing" } };
    }

    if (matchKeyword("new")) {
      advance();
      const className = expect("identifier").value;
      return { type: "new", className };
    }

    if (matchKeyword("typeof")) {
      advance();
      const object = parseExpression();
      expect("keyword", "is");
      const typeName = expect("identifier").value;
      return { type: "typeOf", object, typeName };
    }

    if (match("punctuation", "(")) {
      advance();
      const expr = parseExpression();
      expect("punctuation", ")");
      return { type: "paren", expression: expr };
    }

    if (match("punctuation", ".")) {
      advance();
      const member = expect("identifier").value;
      return { type: "memberAccess", object: null, member };
    }

    if (token.type === "identifier" || token.type === "keyword") {
      advance();
      return { type: "identifier", name: token.value };
    }

    throw new Error(`Unexpected token at line ${token.line}, column ${token.column}: ${token.value}`);
  }

  return {
    parseStatements,
    parseSingleExpression,
    parseProcedureBody,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse VBA source code into statements.
 */
export function parseVbaSource(source: string): VbaStatement[] {
  const tokens = tokenize(source);
  const parser = createParser(tokens);
  return parser.parseStatements();
}

/**
 * Parse VBA procedure body into statements.
 */
export function parseVbaProcedureBody(source: string): VbaStatement[] {
  const tokens = tokenize(source);
  const parser = createParser(tokens);
  return parser.parseProcedureBody();
}

/**
 * Parse a single VBA expression.
 */
export function parseVbaExpression(source: string): VbaExpression {
  const tokens = tokenize(source);
  const parser = createParser(tokens);
  return parser.parseSingleExpression();
}
