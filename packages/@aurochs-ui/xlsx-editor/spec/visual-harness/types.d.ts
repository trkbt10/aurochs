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

declare global {
  interface Window {
    renderWorkbook: (json: string, config: RenderConfig) => Promise<void>;
    waitForRender: () => Promise<void>;
    __renderComplete?: boolean;
  }
}

export {};
