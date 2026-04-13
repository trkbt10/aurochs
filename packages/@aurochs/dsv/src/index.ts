/**
 * @file DSV module exports
 *
 * Delimiter-Separated Values (CSV, TSV, etc.) and JSON Lines
 * parsing, building, and semantic analysis.
 *
 * Architecture: parser → type → context → builder
 *
 * - Parser: text → token stream → AST (lexer.ts, parser.ts)
 * - Type: AST node definitions (ast.ts)
 * - Context: semantic interpretation, type inference (context.ts)
 * - Builder: AST → text output (builder.ts)
 * - Dialect: format configuration (dialect.ts)
 * - JSONL: JSON Lines support (jsonl.ts)
 */

// =============================================================================
// AST Types
// =============================================================================

export type {
  SourcePosition,
  SourceSpan,
  FieldQuoting,
  DsvField,
  DsvRecord,
  DsvDocument,
  JsonlFieldType,
  JsonlField,
  JsonlRecord,
  JsonlDocument,
  AnyField,
  AnyRecord,
  AnyDocument,
} from "./ast";

export {
  isDsvField,
  isDsvRecord,
  isDsvDocument,
  isJsonlField,
  isJsonlRecord,
  isJsonlDocument,
} from "./ast";

// =============================================================================
// Dialect
// =============================================================================

export type { EscapeStrategy, DsvDialect, DialectName } from "./dialect";

export {
  CSV_DIALECT,
  TSV_DIALECT,
  EUROPEAN_CSV_DIALECT,
  PIPE_DIALECT,
  STRICT_TSV_DIALECT,
  MYSQL_DIALECT,
  DIALECT_PRESETS,
  createDialect,
  resolveDialect,
} from "./dialect";

// =============================================================================
// Lexer
// =============================================================================

export type { DsvToken, DsvLexer } from "./lexer";
export { TokenType, createDsvLexer } from "./lexer";

// =============================================================================
// Parser
// =============================================================================

export type { DsvParseOptions } from "./parser";
export { parseDsv, parseRecords } from "./parser";

// =============================================================================
// Context
// =============================================================================

export type {
  InferredFieldType,
  ColumnMeta,
  DsvParseContext,
  DsvBuildContext,
  JsonlParseContext,
} from "./context";

export {
  inferFieldType,
  coerceFieldValue,
  analyzeColumns,
  createParseContext,
  createBuildContext,
  createJsonlParseContext,
} from "./context";

// =============================================================================
// Builder
// =============================================================================

export type { DsvBuildOptions, DsvStreamBuilder } from "./builder";

export {
  buildDsv,
  buildRecord,
  buildDsvFromObjects,
  buildDsvFromObjectsWithContext,
  createDsvStreamBuilder,
} from "./builder";

// =============================================================================
// JSONL
// =============================================================================

export type {
  JsonlParseOptions,
  JsonlParseResult,
  JsonlParseError,
  JsonlBuildOptions,
} from "./jsonl";

export {
  parseJsonl,
  parseJsonlRecords,
  buildJsonl,
  buildJsonlFromDocument,
} from "./jsonl";
