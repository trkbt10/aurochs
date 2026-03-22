/**
 * @file XML Lexer (Tokenizer)
 * Converts XML string into a stream of tokens.
 *
 * Design: Stateful lexer that advances through input character by character,
 * producing tokens on demand via nextToken().
 */

/**
 * Token types for XML lexical analysis.
 */
export const TokenType = {
  TAG_OPEN: "TAG_OPEN", // <
  TAG_OPEN_END: "TAG_OPEN_END", // </
  TAG_CLOSE: "TAG_CLOSE", // >
  TAG_SELF_CLOSE: "TAG_SELF_CLOSE", // />
  TAG_NAME: "TAG_NAME", // element name
  ATTR_NAME: "ATTR_NAME", // attribute name
  ATTR_EQ: "ATTR_EQ", // =
  ATTR_VALUE: "ATTR_VALUE", // quoted attribute value
  TEXT: "TEXT", // text content
  COMMENT: "COMMENT", // <!-- ... -->
  DECLARATION: "DECLARATION", // <?xml ... ?>
  DOCTYPE: "DOCTYPE", // <!DOCTYPE ...>
  CDATA: "CDATA", // <![CDATA[ ... ]]>
  EOF: "EOF", // end of input
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

/**
 * Token produced by the lexer.
 */
export type Token = {
  readonly type: TokenType;
  readonly value: string;
  readonly pos: number;
};

/**
 * XML Lexer interface.
 * Tokenizes XML input string into a stream of tokens.
 */
export type XmlLexer = {
  /** Get the next token from the input. */
  readonly nextToken: () => Token;
};

/**
 * XML entity decoder.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Check if character is valid for tag/attribute names.
 */
function isNameChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) || // 0-9
    code === 45 || // -
    code === 95 || // _
    code === 58 || // : (namespace separator)
    code === 46 // . (in some XML variants)
  );
}

/**
 * Check if character is whitespace.
 */
function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

/**
 * Lexer state enum for tracking parsing context.
 */
const CONTENT = 0;
const INSIDE_TAG = 1;

/**
 * Create a new XML lexer for the given input.
 *
 * @param input - XML string to tokenize
 * @returns Lexer object with nextToken method
 */
export function createXmlLexer(input: string): XmlLexer {
  const pos = { value: 0 };
  const state = { value: CONTENT };

  /**
   * Skip whitespace characters.
   */
  function skipWhitespace(): void {
    while (pos.value < input.length && isWhitespace(input[pos.value])) {
      pos.value++;
    }
  }

  /**
   * Peek at next non-whitespace character without advancing position.
   */
  function peekNextNonWhitespace(): string {
    const remaining = input.slice(pos.value);
    const match = remaining.match(/^\s*/);
    const skipCount = match?.[0].length ?? 0;
    return input[pos.value + skipCount] ?? "";
  }

  /**
   * Read a quoted attribute value.
   */
  function readAttributeValue(quote: string): Token {
    const startPos = pos.value;
    pos.value++; // Skip opening quote

    const endPos = input.indexOf(quote, pos.value);
    const value = endPos === -1 ? input.slice(pos.value) : input.slice(pos.value, endPos);
    pos.value = endPos === -1 ? input.length : endPos + 1;

    return { type: TokenType.ATTR_VALUE, value: decodeEntities(value), pos: startPos };
  }

  /**
   * Read a name (tag name or attribute name).
   */
  function readName(): Token {
    const startPos = pos.value;

    while (pos.value < input.length && isNameChar(input[pos.value])) {
      pos.value++;
    }
    const name = input.slice(startPos, pos.value);

    // Determine if this is a tag name or attribute name
    // If there's an = after skipping whitespace, it's attr name
    // Otherwise it's tag name
    const nextNonWs = peekNextNonWhitespace();
    if (nextNonWs === "=") {
      return { type: TokenType.ATTR_NAME, value: name, pos: startPos };
    }

    return { type: TokenType.TAG_NAME, value: name, pos: startPos };
  }

  /**
   * Read text content until next tag.
   */
  function readText(): Token {
    const startPos = pos.value;
    const endPos = input.indexOf("<", pos.value);
    const text = endPos === -1 ? input.slice(pos.value) : input.slice(pos.value, endPos);
    pos.value = endPos === -1 ? input.length : endPos;

    return { type: TokenType.TEXT, value: decodeEntities(text), pos: startPos };
  }

  /**
   * Read XML comment <!-- ... -->.
   */
  function readComment(): Token {
    const startPos = pos.value;
    pos.value += 4; // Skip <!--

    const endIndex = input.indexOf("-->", pos.value);
    if (endIndex === -1) {
      const content = input.slice(pos.value);
      pos.value = input.length;
      return { type: TokenType.COMMENT, value: content, pos: startPos };
    }

    const content = input.slice(pos.value, endIndex);
    pos.value = endIndex + 3;
    return { type: TokenType.COMMENT, value: content, pos: startPos };
  }

  /**
   * Read CDATA section <![CDATA[ ... ]]>.
   */
  function readCData(): Token {
    const startPos = pos.value;
    pos.value += 9; // Skip <![CDATA[

    const endIndex = input.indexOf("]]>", pos.value);
    if (endIndex === -1) {
      const content = input.slice(pos.value);
      pos.value = input.length;
      return { type: TokenType.CDATA, value: content, pos: startPos };
    }

    const content = input.slice(pos.value, endIndex);
    pos.value = endIndex + 3;
    return { type: TokenType.CDATA, value: content, pos: startPos };
  }

  /**
   * Read DOCTYPE declaration <!DOCTYPE ...>.
   */
  function readDocType(): Token {
    const startPos = pos.value;
    pos.value += 2; // Skip <!

    const endIndex = input.indexOf(">", pos.value);
    if (endIndex === -1) {
      const content = input.slice(pos.value);
      pos.value = input.length;
      return { type: TokenType.DOCTYPE, value: content, pos: startPos };
    }

    const content = input.slice(pos.value, endIndex);
    pos.value = endIndex + 1;
    return { type: TokenType.DOCTYPE, value: content, pos: startPos };
  }

  /**
   * Read XML declaration <?xml ...?>.
   */
  function readDeclaration(): Token {
    const startPos = pos.value;
    pos.value += 2; // Skip <?

    const endIndex = input.indexOf("?>", pos.value);
    if (endIndex === -1) {
      const content = input.slice(pos.value);
      pos.value = input.length;
      return { type: TokenType.DECLARATION, value: content.trim(), pos: startPos };
    }

    const content = input.slice(pos.value, endIndex);
    pos.value = endIndex + 2;
    return { type: TokenType.DECLARATION, value: content.trim(), pos: startPos };
  }

  /**
   * Read the start of a tag or special construct.
   */
  function readTagStart(): Token {
    const startPos = pos.value;

    // Check for end tag </
    if (input[pos.value + 1] === "/") {
      pos.value += 2;
      state.value = INSIDE_TAG;
      return { type: TokenType.TAG_OPEN_END, value: "</", pos: startPos };
    }

    // Check for comment <!--
    if (
      input[pos.value + 1] === "!" &&
      input[pos.value + 2] === "-" &&
      input[pos.value + 3] === "-"
    ) {
      return readComment();
    }

    // Check for CDATA <![CDATA[
    if (input.slice(pos.value + 1, pos.value + 9) === "![CDATA[") {
      return readCData();
    }

    // Check for DOCTYPE <!DOCTYPE
    if (input[pos.value + 1] === "!") {
      return readDocType();
    }

    // Check for declaration <?
    if (input[pos.value + 1] === "?") {
      return readDeclaration();
    }

    // Regular start tag <
    pos.value++;
    state.value = INSIDE_TAG;
    return { type: TokenType.TAG_OPEN, value: "<", pos: startPos };
  }

  /**
   * Read tokens when in content state (between tags).
   */
  function readContent(): Token {
    const char = input[pos.value];

    if (char === "<") {
      return readTagStart();
    }

    return readText();
  }

  /**
   * Read tokens when inside a tag.
   */
  function readInsideTag(): Token {
    skipWhitespace();

    if (pos.value >= input.length) {
      return { type: TokenType.EOF, value: "", pos: pos.value };
    }

    const char = input[pos.value];

    // Self-closing />
    if (char === "/" && input[pos.value + 1] === ">") {
      const startPos = pos.value;
      pos.value += 2;
      state.value = CONTENT;
      return { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: startPos };
    }

    // Tag close >
    if (char === ">") {
      const startPos = pos.value;
      pos.value++;
      state.value = CONTENT;
      return { type: TokenType.TAG_CLOSE, value: ">", pos: startPos };
    }

    // Equals sign
    if (char === "=") {
      const startPos = pos.value;
      pos.value++;
      return { type: TokenType.ATTR_EQ, value: "=", pos: startPos };
    }

    // Quoted attribute value
    if (char === '"' || char === "'") {
      return readAttributeValue(char);
    }

    // Name (tag name or attribute name)
    if (isNameChar(char)) {
      return readName();
    }

    // Skip unknown character
    pos.value++;
    return readInsideTag();
  }

  /**
   * Get the next token from the input.
   */
  function nextToken(): Token {
    if (pos.value >= input.length) {
      return { type: TokenType.EOF, value: "", pos: pos.value };
    }

    if (state.value === INSIDE_TAG) {
      return readInsideTag();
    }

    return readContent();
  }

  return { nextToken };
}

