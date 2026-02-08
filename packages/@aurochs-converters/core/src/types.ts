/**
 * @file Common types for converter packages
 */

/** Warning generated during conversion */
export type ConvertWarning = {
  readonly code: string;
  readonly message: string;
  readonly where?: string;
  readonly meta?: Record<string, unknown>;
};

/** Result of a conversion operation */
export type ConvertResult<T> = {
  readonly data: T;
  readonly warnings?: readonly ConvertWarning[];
};

/** Progress notification for long-running conversions */
export type ConvertProgress = {
  readonly current: number;
  readonly total: number;
  readonly phase?: string;
};

/** Callback for progress updates */
export type OnProgress = (progress: ConvertProgress) => void;

/** Base converter interface */
export type Converter<TInput, TOutput, TOptions = object> = {
  readonly convert: (
    input: TInput,
    options?: TOptions & { onProgress?: OnProgress },
  ) => Promise<ConvertResult<TOutput>>;
};
