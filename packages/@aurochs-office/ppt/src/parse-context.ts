/**
 * @file PPT parse/conversion context
 */

import type { PptWarning, PptWarningSink } from "./warnings";

export type PptParseMode = "strict" | "lenient";

export type PptParseContext = {
  readonly mode: PptParseMode;
  readonly warn?: PptWarningSink;
};

/** Return true when parsing/conversion runs in strict mode. */
export function isStrict(ctx: PptParseContext): boolean {
  return ctx.mode === "strict";
}

/** Emit a warning in lenient mode, or throw `strictError` in strict mode. */
export function warnOrThrow(ctx: PptParseContext, warning: PptWarning, strictError: Error): void {
  if (isStrict(ctx)) {
    throw strictError;
  }
  if (!ctx.warn) {
    throw new Error(`lenient mode requires warn sink: ${warning.code} (${warning.where})`);
  }
  ctx.warn(warning);
}
