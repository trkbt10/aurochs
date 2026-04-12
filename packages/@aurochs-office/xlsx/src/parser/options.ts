/**
 * @file XLSX parser options
 *
 * Parser options are intentionally explicit: non-standard behaviors must be enabled
 * via an option flag. The default behavior aims to follow ECMA-376 as closely as possible.
 */

export type XlsxParseOptions = {
  readonly compatibility?: {
    /**
     * Allow `<c>` elements that omit the `r` attribute (cell reference).
     *
     * Note: This is not assumed by default; enable only for known fixtures that rely on it.
     */
    readonly allowMissingCellRef?: boolean;
  };

  /**
   * Include rich text formatting information in shared strings.
   *
   * When enabled, `sharedStringsRich` will be populated with full formatting details.
   * @default false
   */
  readonly includeRichText?: boolean;

  /**
   * Binary file reader for resolving embedded resources (images).
   *
   * When provided, images referenced in drawings will be resolved and
   * registered in a ResourceStore, which is returned via `XlsxParseResult`.
   *
   * Without this, drawings will still be parsed but images will not have
   * their binary data available for rendering.
   */
  readonly readBinary?: (path: string) => ArrayBuffer | null;
};

