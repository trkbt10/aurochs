/**
 * @file MS-CFB error types
 */

/** Error thrown when CFB bytes violate the format constraints. */
export class CfbFormatError extends Error {
  readonly name = "CfbFormatError";
}

/** Error thrown for CFB features that are not supported by this implementation. */
export class CfbUnsupportedError extends Error {
  readonly name = "CfbUnsupportedError";
}
