/**
 * @file XLS cell styles conversion tests
 */

import { convertXlsStylesToXlsxCellStyles } from "./cell-styles";
import { createXlsWarningCollector } from "../warnings";

describe("convertXlsStylesToXlsxCellStyles", () => {
  it("converts built-in Normal and outline styles", () => {
    const styles = convertXlsStylesToXlsxCellStyles(
      {
        styles: [
          { kind: "builtIn", styleXfIndex: 0, builtInStyleId: 0, outlineLevel: 0 },
          { kind: "builtIn", styleXfIndex: 1, builtInStyleId: 1, outlineLevel: 2 },
        ],
      },
      new Map([
        [0, 0],
        [1, 1],
      ]),
    );

    expect(styles).toEqual([
      { name: "Normal", xfId: 0, builtinId: 0 },
      { name: "RowLevel_3", xfId: 1, builtinId: 1 },
    ]);
  });

  it("sanitizes and uniquifies duplicate user-defined style names", () => {
    const collector = createXlsWarningCollector();
    const styles = convertXlsStylesToXlsxCellStyles(
      {
        styles: [
          { kind: "userDefined", styleXfIndex: 0, name: "\u000020% - Accent" },
          { kind: "userDefined", styleXfIndex: 1, name: "\u000020% - Accent" },
        ],
      },
      new Map([
        [0, 0],
        [1, 1],
      ]),
      { mode: "lenient", warn: collector.warn },
    );

    expect(styles).toEqual([
      { name: "20% - Accent", xfId: 0 },
      { name: "20% - Accent (2)", xfId: 1 },
    ]);
    expect(collector.warnings.map((w) => w.code)).toContain("STYLE_DUPLICATE_NAME");
  });
});
