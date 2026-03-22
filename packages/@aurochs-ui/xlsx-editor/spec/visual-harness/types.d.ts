/**
 * @file Type declarations for the XLSX visual test harness
 */

type RenderConfig = {
  width: number;
  height: number;
  sheetIndex?: number;
  scrollTop?: number;
  scrollLeft?: number;
};

type XlsxHarnessWindow = Window & {
  renderWorkbook: (json: string, config: RenderConfig) => Promise<void>;
  waitForRender: () => Promise<void>;
  __renderComplete?: boolean;
};

export type { XlsxHarnessWindow, RenderConfig };
