import { convertXlsStylesToXlsxCellStyles } from "./cell-styles";

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
});
