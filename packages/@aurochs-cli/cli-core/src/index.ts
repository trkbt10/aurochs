/**
 * @file CLI Core Package
 *
 * Shared utilities for CLI tools.
 */

// Result types
export type { SuccessResult, ErrorResult, Result } from "./result";
export { success, error } from "./result";

// JSON output
export { formatJson } from "./json-output";

// Output handler
export type { OutputMode } from "./output-handler";
export { output } from "./output-handler";
