/**
 * @file JSON output formatter for CLI
 */

export type SuccessResult<T> = {
  readonly success: true;
  readonly data: T;
};

export type ErrorResult = {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
};

export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * Create a success result.
 */
export function success<T>(data: T): SuccessResult<T> {
  return { success: true, data };
}

/**
 * Create an error result.
 */
export function error(code: string, message: string): ErrorResult {
  return { success: false, error: { code, message } };
}

/**
 * Format a result as JSON string.
 */
export function formatJson<T>(result: Result<T>): string {
  return JSON.stringify(result, null, 2);
}
