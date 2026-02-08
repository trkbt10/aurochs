/**
 * @file JSON output formatter for CLI
 */

import type { Result } from "./result";

/**
 * Format a result as JSON string.
 */
export function formatJson<T>(result: Result<T>): string {
  return JSON.stringify(result, null, 2);
}
