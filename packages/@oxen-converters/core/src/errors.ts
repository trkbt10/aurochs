/**
 * @file Error types for converter packages
 */

import type { ConvertWarning } from "./types";

/** Base error class for conversion errors */
export class ConvertError extends Error {
  readonly code: string;
  readonly where?: string;
  readonly meta?: Record<string, unknown>;

  constructor(warning: ConvertWarning) {
    super(warning.message);
    this.name = "ConvertError";
    this.code = warning.code;
    this.where = warning.where;
    this.meta = warning.meta;
  }

  toWarning(): ConvertWarning {
    return {
      code: this.code,
      message: this.message,
      where: this.where,
      meta: this.meta,
    };
  }
}
