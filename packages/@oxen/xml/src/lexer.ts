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
const enum LexerState {
  Content,
  InsideTag,
}

/**
 * XML Lexer class.
 * Tokenizes XML input string into a stream of tokens.
 */
export class XmlLexer {
  private readonly input: string;
  private pos: number = 0;
  private state: LexerState = LexerState.Content;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Get the next token from the input.
   */
  nextToken(): Token {
    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: "", pos: this.pos };
    }

    if (this.state === LexerState.InsideTag) {
      return this.readInsideTag();
    }

    return this.readContent();
  }

  /**
   * Read tokens when in content state (between tags).
   */
  private readContent(): Token {
    const char = this.input[this.pos];

    if (char === "<") {
      return this.readTagStart();
    }

    return this.readText();
  }

  /**
   * Read the start of a tag or special construct.
   */
  private readTagStart(): Token {
    const startPos = this.pos;

    // Check for end tag </
    if (this.input[this.pos + 1] === "/") {
      this.pos += 2;
      this.state = LexerState.InsideTag;
      return { type: TokenType.TAG_OPEN_END, value: "</", pos: startPos };
    }

    // Check for comment <!--
    if (
      this.input[this.pos + 1] === "!" &&
      this.input[this.pos + 2] === "-" &&
      this.input[this.pos + 3] === "-"
    ) {
      return this.readComment();
    }

    // Check for CDATA <![CDATA[
    if (this.input.slice(this.pos + 1, this.pos + 9) === "![CDATA[") {
      return this.readCData();
    }

    // Check for DOCTYPE <!DOCTYPE
    if (this.input[this.pos + 1] === "!") {
      return this.readDocType();
    }

    // Check for declaration <?
    if (this.input[this.pos + 1] === "?") {
      return this.readDeclaration();
    }

    // Regular start tag <
    this.pos++;
    this.state = LexerState.InsideTag;
    return { type: TokenType.TAG_OPEN, value: "<", pos: startPos };
  }

  /**
   * Read text content until next tag.
   */
  private readText(): Token {
    const startPos = this.pos;
    let text = "";

    while (this.pos < this.input.length && this.input[this.pos] !== "<") {
      text += this.input[this.pos];
      this.pos++;
    }

    return { type: TokenType.TEXT, value: decodeEntities(text), pos: startPos };
  }

  /**
   * Read XML comment <!-- ... -->.
   */
  private readComment(): Token {
    const startPos = this.pos;
    this.pos += 4; // Skip <!--

    const endIndex = this.input.indexOf("-->", this.pos);
    if (endIndex === -1) {
      const content = this.input.slice(this.pos);
      this.pos = this.input.length;
      return { type: TokenType.COMMENT, value: content, pos: startPos };
    }

    const content = this.input.slice(this.pos, endIndex);
    this.pos = endIndex + 3;
    return { type: TokenType.COMMENT, value: content, pos: startPos };
  }

  /**
   * Read CDATA section <![CDATA[ ... ]]>.
   */
  private readCData(): Token {
    const startPos = this.pos;
    this.pos += 9; // Skip <![CDATA[

    const endIndex = this.input.indexOf("]]>", this.pos);
    if (endIndex === -1) {
      const content = this.input.slice(this.pos);
      this.pos = this.input.length;
      return { type: TokenType.CDATA, value: content, pos: startPos };
    }

    const content = this.input.slice(this.pos, endIndex);
    this.pos = endIndex + 3;
    return { type: TokenType.CDATA, value: content, pos: startPos };
  }

  /**
   * Read DOCTYPE declaration <!DOCTYPE ...>.
   */
  private readDocType(): Token {
    const startPos = this.pos;
    this.pos += 2; // Skip <!

    const endIndex = this.input.indexOf(">", this.pos);
    if (endIndex === -1) {
      const content = this.input.slice(this.pos);
      this.pos = this.input.length;
      return { type: TokenType.DOCTYPE, value: content, pos: startPos };
    }

    const content = this.input.slice(this.pos, endIndex);
    this.pos = endIndex + 1;
    return { type: TokenType.DOCTYPE, value: content, pos: startPos };
  }

  /**
   * Read XML declaration <?xml ...?>.
   */
  private readDeclaration(): Token {
    const startPos = this.pos;
    this.pos += 2; // Skip <?

    const endIndex = this.input.indexOf("?>", this.pos);
    if (endIndex === -1) {
      const content = this.input.slice(this.pos);
      this.pos = this.input.length;
      return { type: TokenType.DECLARATION, value: content.trim(), pos: startPos };
    }

    const content = this.input.slice(this.pos, endIndex);
    this.pos = endIndex + 2;
    return { type: TokenType.DECLARATION, value: content.trim(), pos: startPos };
  }

  /**
   * Read tokens when inside a tag.
   */
  private readInsideTag(): Token {
    this.skipWhitespace();

    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: "", pos: this.pos };
    }

    const char = this.input[this.pos];

    // Self-closing />
    if (char === "/" && this.input[this.pos + 1] === ">") {
      const startPos = this.pos;
      this.pos += 2;
      this.state = LexerState.Content;
      return { type: TokenType.TAG_SELF_CLOSE, value: "/>", pos: startPos };
    }

    // Tag close >
    if (char === ">") {
      const startPos = this.pos;
      this.pos++;
      this.state = LexerState.Content;
      return { type: TokenType.TAG_CLOSE, value: ">", pos: startPos };
    }

    // Equals sign
    if (char === "=") {
      const startPos = this.pos;
      this.pos++;
      return { type: TokenType.ATTR_EQ, value: "=", pos: startPos };
    }

    // Quoted attribute value
    if (char === '"' || char === "'") {
      return this.readAttributeValue(char);
    }

    // Name (tag name or attribute name)
    if (isNameChar(char)) {
      return this.readName();
    }

    // Skip unknown character
    this.pos++;
    return this.readInsideTag();
  }

  /**
   * Skip whitespace characters.
   */
  private skipWhitespace(): void {
    while (this.pos < this.input.length && isWhitespace(this.input[this.pos])) {
      this.pos++;
    }
  }

  /**
   * Read a name (tag name or attribute name).
   */
  private readName(): Token {
    const startPos = this.pos;
    let name = "";

    while (this.pos < this.input.length && isNameChar(this.input[this.pos])) {
      name += this.input[this.pos];
      this.pos++;
    }

    // Determine if this is a tag name or attribute name
    // If we just entered the tag, it's a tag name
    // Otherwise, it's an attribute name
    const nextNonWhitespace = this.peekNextNonWhitespace();
    if (nextNonWhitespace === "=") {
      return { type: TokenType.ATTR_NAME, value: name, pos: startPos };
    }

    // Check if previous token context suggests this is an attr name
    // For simplicity: if there's an = after skipping whitespace, it's attr name
    // Otherwise it's tag name
    return { type: TokenType.TAG_NAME, value: name, pos: startPos };
  }

  /**
   * Peek at next non-whitespace character without advancing position.
   */
  private peekNextNonWhitespace(): string {
    let tempPos = this.pos;
    while (tempPos < this.input.length && isWhitespace(this.input[tempPos])) {
      tempPos++;
    }
    const char = this.input[tempPos];
    if (char === undefined) {
      return "";
    }
    return char;
  }

  /**
   * Read a quoted attribute value.
   */
  private readAttributeValue(quote: string): Token {
    const startPos = this.pos;
    this.pos++; // Skip opening quote

    let value = "";
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      value += this.input[this.pos];
      this.pos++;
    }

    this.pos++; // Skip closing quote
    return { type: TokenType.ATTR_VALUE, value: decodeEntities(value), pos: startPos };
  }
}
