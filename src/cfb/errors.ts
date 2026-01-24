/**
 * @file MS-CFB error types
 */

export class CfbFormatError extends Error {
  readonly name = "CfbFormatError";
}

export class CfbUnsupportedError extends Error {
  readonly name = "CfbUnsupportedError";
}

