/**
 * @file Fig error classes
 */

/** Base error for fig operations */
export class FigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FigError";
  }
}

/** Error during parsing */
// eslint-disable-next-line no-restricted-syntax -- Error classes require inheritance
export class FigParseError extends FigError {
  constructor(
    message: string,
    public readonly offset?: number
  ) {
    super(offset !== undefined ? `${message} at offset ${offset}` : message);
    this.name = "FigParseError";
  }
}

/** Error during building */
// eslint-disable-next-line no-restricted-syntax -- Error classes require inheritance
export class FigBuildError extends FigError {
  constructor(message: string) {
    super(message);
    this.name = "FigBuildError";
  }
}

/** Error during decompression */
// eslint-disable-next-line no-restricted-syntax -- Error classes require inheritance
export class FigDecompressError extends FigError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(cause ? `${message}: ${cause.message}` : message);
    this.name = "FigDecompressError";
  }
}
