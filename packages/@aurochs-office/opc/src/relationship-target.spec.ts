/** @file Tests for OPC relationship target path resolution */
import { resolveRelationshipTargetPath } from "./relationship-target";

describe("OPC relationship target path resolution", () => {
  it("resolves simple parent directory reference", () => {
    const result = resolveRelationshipTargetPath(
      "ppt/charts/chart1.xml",
      "../embeddings/Microsoft_Excel_Worksheet1.xlsx",
    );
    expect(result).toBe("ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx");
  });

  it("resolves multiple parent directory references", () => {
    const result = resolveRelationshipTargetPath(
      "ppt/charts/sub/chart1.xml",
      "../../embeddings/file.xlsx",
    );
    expect(result).toBe("ppt/embeddings/file.xlsx");
  });

  it("resolves path without parent references", () => {
    const result = resolveRelationshipTargetPath(
      "ppt/charts/chart1.xml",
      "embeddings/file.xlsx",
    );
    expect(result).toBe("ppt/charts/embeddings/file.xlsx");
  });

  it("handles current directory reference", () => {
    const result = resolveRelationshipTargetPath(
      "ppt/charts/chart1.xml",
      "./file.xlsx",
    );
    expect(result).toBe("ppt/charts/file.xlsx");
  });

  it("handles deeply nested paths", () => {
    const result = resolveRelationshipTargetPath(
      "ppt/charts/nested/deep/chart1.xml",
      "../../../embeddings/file.xlsx",
    );
    expect(result).toBe("ppt/embeddings/file.xlsx");
  });

  it("drops a leading slash for absolute-path references", () => {
    const result = resolveRelationshipTargetPath(
      "ppt/charts/chart1.xml",
      "/ppt/media/image1.png",
    );
    expect(result).toBe("ppt/media/image1.png");
  });
});

