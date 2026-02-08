/**
 * @file DOC parse/conversion context
 */

import type { DocWarning, DocWarningSink } from "./warnings";

export type DocParseMode = "strict" | "lenient";

export type DocParseContext = {
  readonly mode: DocParseMode;
  readonly warn?: DocWarningSink;
};

/** Return true when parsing/conversion runs in strict mode. */
export function isStrict(ctx: DocParseContext): boolean {
  return ctx.mode === "strict";
}

/** Emit a warning in lenient mode, or throw `strictError` in strict mode. */
export function warnOrThrow(ctx: DocParseContext, warning: DocWarning, strictError: Error): void {
  if (isStrict(ctx)) {
    throw strictError;
  }
  if (!ctx.warn) {
    throw new Error(`lenient mode requires warn sink: ${warning.code} (${warning.where})`);
  }
  ctx.warn(warning);
}
