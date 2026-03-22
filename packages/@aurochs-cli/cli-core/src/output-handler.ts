/**
 * @file CLI output handler
 */

import type { Result } from "./result";
import { formatJson } from "./json-output";

export type OutputMode = "json" | "pretty" | "mermaid";

type OutputOptions<T> = {
  readonly result: Result<T>;
  readonly mode: OutputMode;
  readonly prettyFormatter: (data: T) => string;
  readonly mermaidFormatter?: (data: T) => string;
};

/**
 * Output a result to the console.
 * Handles JSON, pretty, and mermaid output modes.
 */
export function output<T>(options: OutputOptions<T>): void {
  const { result, mode, prettyFormatter, mermaidFormatter } = options;
  if (mode === "json") {
    console.log(formatJson(result));
  } else {
    const formatter =
      mode === "mermaid" && mermaidFormatter ? mermaidFormatter : prettyFormatter;
    if (result.success) {
      console.log(formatter(result.data));
    } else {
      console.error(`Error [${result.error.code}]: ${result.error.message}`);
    }
  }

  if (!result.success) {
    process.exitCode = 1;
  }
}
