/**
 * @file DSV Dialect definitions
 *
 * A "dialect" captures the syntactic conventions of a particular DSV format.
 * CSV, TSV, and many vendor-specific formats differ in:
 * - Field delimiter (comma, tab, semicolon, pipe, etc.)
 * - Quote character (double-quote, single-quote, none)
 * - Escape mechanism (doubling the quote char, or backslash escape)
 * - Record terminator (CRLF, LF, CR)
 * - Whether to trim whitespace around fields
 * - Whether the first row is a header
 * - Comment character (some formats allow # or ; prefixed comment lines)
 *
 * RFC 4180 defines the "standard" CSV dialect, but real-world CSVs
 * deviate from it extensively. This module provides both named presets
 * and full customization.
 *
 * @see https://www.rfc-editor.org/rfc/rfc4180
 * @see https://docs.python.org/3/library/csv.html#csv.Dialect
 */

// =============================================================================
// Escape strategy
// =============================================================================

/**
 * How quote characters inside a quoted field are escaped.
 *
 * - "double": RFC 4180 style. A quote inside a quoted field is written as
 *   two consecutive quote characters. e.g., `"he said ""hello"""` → `he said "hello"`
 *
 * - "backslash": C-style backslash escaping. A quote inside a quoted field
 *   is preceded by a backslash. e.g., `"he said \"hello\""` → `he said "hello"`
 *   This also enables `\n`, `\t`, `\\` inside quoted fields.
 */
export type EscapeStrategy = "double" | "backslash";

// =============================================================================
// Dialect
// =============================================================================

/**
 * Complete dialect specification for DSV parsing and building.
 *
 * Every field has a defined default. Users need only override
 * the fields that differ from the preset they start from.
 */
export type DsvDialect = {
  /**
   * Field delimiter character.
   * Must be exactly one character (or one code point).
   *
   * Common values: "," (CSV), "\t" (TSV), ";" (European CSV), "|" (pipe-delimited)
   */
  readonly delimiter: string;

  /**
   * Quote character used to enclose fields that contain the delimiter,
   * the quote character itself, or record terminators.
   *
   * Set to `undefined` to disable quoting entirely (every character is literal).
   * When quoting is disabled, fields cannot contain the delimiter or newlines.
   */
  readonly quoteChar: string | undefined;

  /**
   * How quotes inside a quoted field are escaped.
   * Only relevant when `quoteChar` is defined.
   */
  readonly escapeStrategy: EscapeStrategy;

  /**
   * Whether the first record is a header row.
   *
   * - true: first row is consumed as column headers
   * - false: all rows are data rows, no headers
   */
  readonly hasHeader: boolean;

  /**
   * Whether to trim leading/trailing whitespace from unquoted fields.
   *
   * Quoted fields are never trimmed (the quotes define exact boundaries).
   * When true, ` hello ` becomes `hello`, but `" hello "` stays ` hello `.
   */
  readonly trimFields: boolean;

  /**
   * Whether to skip completely empty lines (lines with zero characters
   * before the record terminator).
   *
   * This does not affect lines that contain only whitespace or only delimiters.
   */
  readonly skipEmptyLines: boolean;

  /**
   * Comment line prefix. Lines starting with this character (after optional
   * leading whitespace if trimFields is true) are ignored entirely.
   *
   * Set to `undefined` to disable comment detection.
   * Common values: "#", ";"
   */
  readonly commentChar: string | undefined;

  /**
   * Record terminator for output (building).
   * Parsing always accepts "\r\n", "\n", and "\r" regardless of this setting.
   *
   * Common values: "\n" (Unix), "\r\n" (Windows/RFC 4180)
   */
  readonly recordTerminator: string;

  /**
   * When building: under what condition fields are quoted.
   *
   * - "minimal": only quote when the field contains delimiter, quote char,
   *   or record terminator (RFC 4180 compliant output)
   * - "all": always quote every field
   * - "non-numeric": quote all fields except those that look like numbers
   * - "none": never quote (dangerous — output may not be parseable if
   *   fields contain special characters)
   */
  readonly quotePolicy: "minimal" | "all" | "non-numeric" | "none";
};

// =============================================================================
// Presets
// =============================================================================

/**
 * RFC 4180 compliant CSV dialect.
 * This is the canonical CSV format and the default.
 *
 * @see https://www.rfc-editor.org/rfc/rfc4180
 */
export const CSV_DIALECT: DsvDialect = {
  delimiter: ",",
  quoteChar: '"',
  escapeStrategy: "double",
  hasHeader: true,
  trimFields: false,
  skipEmptyLines: false,
  commentChar: undefined,
  recordTerminator: "\r\n",
  quotePolicy: "minimal",
};

/**
 * Tab-separated values dialect.
 *
 * TSV traditionally does not use quoting — tabs and newlines inside
 * field values are escaped as `\t` and `\n` literal character sequences.
 * However, many tools produce TSV with double-quote quoting.
 * This preset enables quoting for maximum compatibility.
 */
export const TSV_DIALECT: DsvDialect = {
  delimiter: "\t",
  quoteChar: '"',
  escapeStrategy: "double",
  hasHeader: true,
  trimFields: false,
  skipEmptyLines: false,
  commentChar: undefined,
  recordTerminator: "\n",
  quotePolicy: "minimal",
};

/**
 * European CSV dialect (semicolon-delimited).
 *
 * In many European locales, the comma is used as a decimal separator,
 * so CSV files use semicolons instead. Excel on European-locale Windows
 * produces this format.
 */
export const EUROPEAN_CSV_DIALECT: DsvDialect = {
  delimiter: ";",
  quoteChar: '"',
  escapeStrategy: "double",
  hasHeader: true,
  trimFields: false,
  skipEmptyLines: false,
  commentChar: undefined,
  recordTerminator: "\r\n",
  quotePolicy: "minimal",
};

/**
 * Pipe-delimited dialect.
 * Common in legacy systems and data interchange.
 */
export const PIPE_DIALECT: DsvDialect = {
  delimiter: "|",
  quoteChar: '"',
  escapeStrategy: "double",
  hasHeader: true,
  trimFields: true,
  skipEmptyLines: false,
  commentChar: undefined,
  recordTerminator: "\n",
  quotePolicy: "minimal",
};

/**
 * Strict TSV dialect (IANA text/tab-separated-values).
 *
 * Per the IANA registration, TSV does NOT support quoting.
 * Tabs and newlines in values are forbidden.
 * This dialect is rarely used in practice but exists for spec compliance.
 *
 * @see https://www.iana.org/assignments/media-types/text/tab-separated-values
 */
export const STRICT_TSV_DIALECT: DsvDialect = {
  delimiter: "\t",
  quoteChar: undefined,
  escapeStrategy: "double",
  hasHeader: true,
  trimFields: false,
  skipEmptyLines: false,
  commentChar: undefined,
  recordTerminator: "\n",
  quotePolicy: "none",
};

/**
 * MySQL-style CSV export dialect.
 *
 * MySQL's SELECT ... INTO OUTFILE uses backslash escaping,
 * tab delimiters by default, and newline record terminators.
 */
export const MYSQL_DIALECT: DsvDialect = {
  delimiter: "\t",
  quoteChar: '"',
  escapeStrategy: "backslash",
  hasHeader: false,
  trimFields: false,
  skipEmptyLines: false,
  commentChar: undefined,
  recordTerminator: "\n",
  quotePolicy: "minimal",
};

// =============================================================================
// Dialect map for named access
// =============================================================================

export type DialectName =
  | "csv"
  | "tsv"
  | "european-csv"
  | "pipe"
  | "strict-tsv"
  | "mysql";

export const DIALECT_PRESETS: Readonly<Record<DialectName, DsvDialect>> = {
  csv: CSV_DIALECT,
  tsv: TSV_DIALECT,
  "european-csv": EUROPEAN_CSV_DIALECT,
  pipe: PIPE_DIALECT,
  "strict-tsv": STRICT_TSV_DIALECT,
  mysql: MYSQL_DIALECT,
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a custom dialect by overriding fields of a base dialect.
 *
 * @param base - Base dialect to extend (defaults to CSV_DIALECT)
 * @param overrides - Fields to override
 * @returns New dialect with overrides applied
 */
export function createDialect(
  overrides: Partial<DsvDialect>,
  base: DsvDialect = CSV_DIALECT,
): DsvDialect {
  return { ...base, ...overrides };
}

/**
 * Resolve a dialect from either a preset name or a full/partial dialect object.
 *
 * @param input - Dialect name string or partial dialect override
 * @returns Fully resolved dialect
 */
export function resolveDialect(
  input: DialectName | Partial<DsvDialect> | undefined,
): DsvDialect {
  if (input === undefined) {
    return CSV_DIALECT;
  }
  if (typeof input === "string") {
    return DIALECT_PRESETS[input];
  }
  return createDialect(input);
}
