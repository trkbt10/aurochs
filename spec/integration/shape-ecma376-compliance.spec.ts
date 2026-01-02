/**
 * @file ECMA-376準拠シェイプ描画テスト
 *
 * shapes.pptxを使用してシェイプ描画の仕様追従度をテストする。
 *
 * @see ECMA-376 Part 1, Section 19.3.1 (Presentation ML Shapes)
 * @see ECMA-376 Part 1, Section 20.1.9 (DrawingML Shapes)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import JSZip from "jszip";
import type { PresentationFile, Presentation } from "../../src/pptx";
import { openPresentation } from "../../src/pptx";
import { getByPath, getChild, getChildren, isXmlElement, getAttr } from "../../src/xml";

const FIXTURE_PATH = "fixtures/poi-test-data/test-data/slideshow/shapes.pptx";

type FileCache = Map<string, { text: string; buffer: ArrayBuffer }>;

async function loadPptxFile(filePath: string): Promise<PresentationFile> {
  const pptxBuffer = fs.readFileSync(filePath);
  const jszip = await JSZip.loadAsync(pptxBuffer);

  const cache: FileCache = new Map();
  const files = Object.keys(jszip.files);

  for (const fp of files) {
    const file = jszip.file(fp);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(fp, { text, buffer });
    }
  }

  return {
    readText(fp: string): string | null {
      return cache.get(fp)?.text ?? null;
    },
    readBinary(fp: string): ArrayBuffer | null {
      return cache.get(fp)?.buffer ?? null;
    },
    exists(fp: string): boolean {
      return cache.has(fp);
    },
  };
}

describe("shapes.pptx ECMA-376 compliance", () => {
  let presentationFile: PresentationFile;
  let presentation: Presentation;

  beforeAll(async () => {
    const fullPath = path.resolve(FIXTURE_PATH);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Fixture file not found: ${fullPath}`);
    }
    presentationFile = await loadPptxFile(fullPath);
    presentation = openPresentation(presentationFile);
  });

  describe("Slide 1 - Basic shapes", () => {
    /**
     * @test テキストボックス（rect プリセット）の描画
     * @see ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom)
     */
    it("should render TextBox with rect preset geometry", () => {
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();

      // TextBox "Learning PPTX" が描画されていること
      expect(svg).toContain("Learning PPTX");

      // rect パスが含まれること (M 0 0 L w 0 L w h L 0 h Z パターン)
      expect(svg).toMatch(/M\s+0\s+0\s+L\s+\d+\.?\d*\s+0\s+L\s+\d+\.?\d*\s+\d+\.?\d*\s+L\s+0\s+\d+\.?\d*\s+Z/);
    });

    /**
     * @test 水平コネクタ（line プリセット）の描画
     * @see ECMA-376 Part 1, Section 19.3.1.13 (p:cxnSp)
     * @see ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom prst="line")
     */
    it("should render horizontal connector (cxnSp) with line preset", () => {
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();

      // 水平線のパスが存在すること (cy=0の場合)
      // M 0 0 L {cx} 0 または M 0 {h/2} L {w} {h/2} パターン
      expect(svg).toMatch(/d="M\s+0\s+\d+\.?\d*\s+L\s+\d+\.?\d*\s+\d+\.?\d*"/);
    });

    /**
     * @test カスタムジオメトリ（Freeform/Cloud）の描画
     * @see ECMA-376 Part 1, Section 20.1.9.8 (a:custGeom)
     * @see ECMA-376 Part 1, Section 20.1.9.15 (a:path)
     *
     * Per ECMA-376: The path's w/h attributes define the coordinate space.
     * Path coordinates must be scaled from (w, h) to the shape's (cx, cy).
     */
    it("should render custom geometry (Freeform) with correct scaling", () => {
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();

      // カスタムパスが存在すること
      // Cloud shape has many coordinates
      expect(svg).toMatch(/d="M\s+\d+\.?\d*\s+\d+\.?\d*.*Z"/);

      // "Cloud" テキストが描画されていること
      expect(svg).toContain("Cloud");

      // カスタムジオメトリの座標がスケーリングされていること
      // Freeform 6 (Cloud) has path w=2426 h=1564, shape is ~268x167
      // Coordinates should NOT be in the 1000s range (unscaled)
      // Look for path coordinates - they should be reasonable screen coordinates
      const pathMatches = svg.match(/d="M\s+(\d+\.?\d*)/g) || [];
      pathMatches.forEach((match) => {
        const coord = parseFloat(match.match(/M\s+(\d+\.?\d*)/)?.[1] ?? "0");
        // Path first M coordinate should not exceed typical slide width (around 1000)
        // If coordinate is over 1500, it's likely unscaled
        expect(coord).toBeLessThan(1500);
      });
    });

    /**
     * @test 画像シェイプ（p:pic）の描画
     * @see ECMA-376 Part 1, Section 19.3.1.37 (p:pic)
     */
    it("should render picture shape (p:pic) with image", () => {
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();

      // image要素が存在すること
      expect(svg).toContain("<image");
      expect(svg).toContain("href=");
    });

    /**
     * @test テーブル（a:tbl）の描画
     * @see ECMA-376 Part 1, Section 21.1.3.13 (a:tbl)
     */
    it("should render table (graphicFrame with table)", () => {
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();

      // テーブルのヘッダーセルが描画されていること
      expect(svg).toContain("Column1");
      expect(svg).toContain("Column2");
      expect(svg).toContain("Column3");

      // テーブルのデータセルが描画されていること
      expect(svg).toContain("data1");
      expect(svg).toContain("data2");
      expect(svg).toContain("data3");
    });
  });

  describe("Slide 2 - Placeholders with style", () => {
    /**
     * @test プレースホルダーシェイプの描画
     * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
     */
    it("should render placeholder shapes (ctrTitle, subTitle)", () => {
      const slide = presentation.getSlide(2);
      const svg = slide.renderSVG();

      // タイトルプレースホルダーのテキストが描画されていること
      expect(svg).toContain("PPTX");
      expect(svg).toContain("Title");

      // サブタイトルプレースホルダーのテキストが描画されていること
      expect(svg).toContain("Subtitle");
      expect(svg).toContain("And second line");
    });

    /**
     * @test スタイルリファレンスからの線の解決
     * @see ECMA-376 Part 1, Section 19.3.1.46 (p:style)
     * @see ECMA-376 Part 1, Section 20.1.4.2.19 (a:lnRef)
     */
    it("should resolve line style from style reference (a:lnRef)", () => {
      const slide = presentation.getSlide(2);
      const svg = slide.renderSVG();

      // タイトルシェイプに線が適用されていること (stroke属性が存在)
      expect(svg).toMatch(/stroke="[^"]+"/);
    });
  });

  describe("Slide 3 - Group shapes", () => {
    /**
     * @test グループシェイプの描画
     * @see ECMA-376 Part 1, Section 19.3.1.22 (p:grpSp)
     * @see ECMA-376 Part 1, Section 20.1.7.6 (a:xfrm for group)
     */
    it("should render group shape (p:grpSp) with children", () => {
      const slide = presentation.getSlide(3);
      const svg = slide.renderSVG();

      // グループ内のシェイプが描画されていること
      // rect (Rectangle 1) と ellipse (Oval 2) が含まれる
      expect(svg).toMatch(/M\s+0\s+0\s+L\s+\d+\.?\d*\s+0\s+L\s+\d+\.?\d*\s+\d+\.?\d*/); // rect
      expect(svg).toMatch(/A\s+\d+\.?\d*\s+\d+\.?\d*/); // ellipse arc
    });

    /**
     * @test スタイルリファレンスからの塗りつぶし解決
     * @see ECMA-376 Part 1, Section 19.3.1.46 (p:style)
     * @see ECMA-376 Part 1, Section 20.1.4.2.19 (a:fillRef)
     */
    it("should resolve fill from style reference (a:fillRef)", () => {
      const slide = presentation.getSlide(3);
      const svg = slide.renderSVG();

      // テーマカラーの塗りつぶしが適用されていること
      // Slide 3には Rectangle 1 と Oval 2 がある
      // これらは p:style/a:fillRef でスタイル参照を持つ
      // fillRef idx="1" はテーマの fillStyleLst の1番目
      // 色は schemeClr accent1 = テーマの accent1 色

      // fill="none" 以外の fill 属性があること
      const fillMatches = svg.match(/fill="([^"]+)"/g) || [];
      const nonEmptyFills = fillMatches.filter(m => {
        const val = m.match(/fill="([^"]+)"/)?.[1];
        return val && val !== "none" && !val.startsWith("url(");
      });

      // 背景のfill以外にシェイプ用のfillが存在すること
      expect(nonEmptyFills.length).toBeGreaterThan(1);
    });

    /**
     * @test グループ内シェイプの座標変換
     * @see ECMA-376 Part 1, Section 20.1.7.6 (a:xfrm chOff/chExt)
     *
     * グループシェイプはchOff/chExtで子座標系を定義し、
     * 子シェイプの座標はこの座標系内で解釈される。
     */
    it("should apply group coordinate transformation to children", () => {
      const slide = presentation.getSlide(3);
      const svg = slide.renderSVG();

      // グループのtransformが適用されていること
      expect(svg).toMatch(/transform="translate\(\d+\.?\d*,?\s*\d+\.?\d*\)"/);
    });
  });

  describe("Preset geometry coverage", () => {
    /**
     * @test ellipse プリセットの描画
     * @see ECMA-376 Part 1, Section 20.1.9.18 (a:prstGeom prst="ellipse")
     */
    it("should render ellipse preset correctly", () => {
      const slide = presentation.getSlide(3);
      const svg = slide.renderSVG();

      // ellipse は A コマンドで描画される
      expect(svg).toMatch(/A\s+\d+\.?\d*\s+\d+\.?\d*\s+0\s+1\s+1/);
    });
  });

  describe("XML structure validation", () => {
    /**
     * @test スライド1のXML構造確認
     */
    it("should parse all shapes from slide 1 spTree", () => {
      const slide = presentation.getSlide(1);
      const spTree = getByPath(slide.content, ["p:sld", "p:cSld", "p:spTree"]);

      expect(spTree).toBeDefined();
      expect(isXmlElement(spTree)).toBe(true);

      if (isXmlElement(spTree)) {
        const shapes = spTree.children.filter(
          (child) =>
            isXmlElement(child) &&
            (child.name === "p:sp" ||
              child.name === "p:cxnSp" ||
              child.name === "p:pic" ||
              child.name === "p:grpSp" ||
              child.name === "p:graphicFrame")
        );

        // shapes.pptx slide 1 には複数のシェイプが含まれる
        expect(shapes.length).toBeGreaterThan(0);
      }
    });

    /**
     * @test カスタムジオメトリのパス構造確認
     */
    it("should parse custom geometry path commands", () => {
      const slide = presentation.getSlide(1);
      const spTree = getByPath(slide.content, ["p:sld", "p:cSld", "p:spTree"]);

      if (isXmlElement(spTree)) {
        // Find Freeform 6 (custom geometry)
        for (const child of spTree.children) {
          if (!isXmlElement(child) || child.name !== "p:sp") {continue;}

          const nvSpPr = getChild(child, "p:nvSpPr");
          const cNvPr = nvSpPr ? getChild(nvSpPr, "p:cNvPr") : undefined;
          const name = cNvPr ? getAttr(cNvPr, "name") : undefined;

          if (name === "Freeform 6") {
            const spPr = getChild(child, "p:spPr");
            const custGeom = spPr ? getChild(spPr, "a:custGeom") : undefined;

            expect(custGeom).toBeDefined();

            if (custGeom && isXmlElement(custGeom)) {
              const pathLst = getChild(custGeom, "a:pathLst");
              expect(pathLst).toBeDefined();

              if (pathLst && isXmlElement(pathLst)) {
                const paths = getChildren(pathLst, "a:path");
                expect(paths.length).toBeGreaterThan(0);
              }
            }
          }
        }
      }
    });

    /**
     * @test スタイルリファレンスのXML構造確認
     * @see ECMA-376 Part 1, Section 19.3.1.46 (p:style)
     */
    it("should have fillRef in slide 3 shapes", () => {
      const slide = presentation.getSlide(3);
      const spTree = getByPath(slide.content, ["p:sld", "p:cSld", "p:spTree"]);

      expect(isXmlElement(spTree)).toBe(true);
      if (!isXmlElement(spTree)) {return;}

      // Find shapes with p:style/a:fillRef (recursively through groups)
      const findFillRefs = (parent: XmlElement): XmlElement[] => {
        const results: XmlElement[] = [];
        for (const child of parent.children) {
          if (!isXmlElement(child)) {continue;}

          if (child.name === "p:sp") {
            const style = getChild(child, "p:style");
            const fillRef = style ? getChild(style, "a:fillRef") : undefined;
            if (fillRef) {
              results.push(fillRef);
            }
          } else if (child.name === "p:grpSp") {
            const grpSpTree = child; // Group contains shapes directly
            results.push(...findFillRefs(grpSpTree));
          }
        }
        return results;
      };

      const fillRefs = findFillRefs(spTree);
      expect(fillRefs.length).toBeGreaterThan(0);

      for (const fillRef of fillRefs) {
        const idx = getAttr(fillRef, "idx");
        expect(idx).toBeDefined();
        expect(Number(idx)).toBeGreaterThan(0);
      }
    });

    /**
     * @test テーマのfillStyleLst構造確認
     * @see ECMA-376 Part 1, Section 20.1.4.1.14 (a:fmtScheme)
     */
    it("should have fillStyleLst in theme", () => {
      const slide = presentation.getSlide(3);
      const fmtScheme = getByPath(slide.theme, [
        "a:theme",
        "a:themeElements",
        "a:fmtScheme",
      ]);

      expect(isXmlElement(fmtScheme)).toBe(true);
      if (!isXmlElement(fmtScheme)) {return;}

      const fillStyleLst = getChild(fmtScheme, "a:fillStyleLst");
      expect(fillStyleLst).toBeDefined();

      if (fillStyleLst && isXmlElement(fillStyleLst)) {
        const fills = fillStyleLst.children.filter(isXmlElement);
        expect(fills.length).toBeGreaterThan(0);
        // fillStyleLst should have at least 3 fills
        expect(fills.length).toBeGreaterThanOrEqual(3);
      }
    });
  });
});
