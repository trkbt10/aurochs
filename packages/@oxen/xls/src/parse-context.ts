/**
 * @file XLS parse/conversion context
 */

import type { XlsWarning, XlsWarningSink } from "./warnings";

export type XlsParseMode = "strict" | "lenient";

export type XlsParseContext = {
  readonly mode: XlsParseMode;
  readonly warn?: XlsWarningSink;
};

/** Return true when parsing/conversion runs in strict mode. */
export function isStrict(ctx: XlsParseContext): boolean {
  return ctx.mode === "strict";
}

/** Emit a warning in lenient mode, or throw `strictError` in strict mode. */
export function warnOrThrow(ctx: XlsParseContext, warning: XlsWarning, strictError: Error): void {
  if (isStrict(ctx)) {
    throw strictError;
  }
  if (!ctx.warn) {
    throw new Error(`lenient mode requires warn sink: ${warning.code} (${warning.where})`);
  }
  ctx.warn(warning);
}
