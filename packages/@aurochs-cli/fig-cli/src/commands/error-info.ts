/**
 * @file Shared error helpers for fig-cli commands
 */

type ErrorLike = Readonly<{
  readonly code?: unknown;
  readonly message?: unknown;
  readonly path?: unknown;
}>;

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null;
}

/** Read errno-style error code when available. */
export function getErrorCode(error: unknown): string | undefined {
  if (!isErrorLike(error)) {
    return undefined;
  }
  if (typeof error.code !== "string") {
    return undefined;
  }
  return error.code;
}

/** Return a readable error message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isErrorLike(error) && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}
