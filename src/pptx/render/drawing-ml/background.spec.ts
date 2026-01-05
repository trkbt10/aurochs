/**
 * @file Tests for background processing utilities
 */

import { getSlideBackgroundFill, getBackgroundFillData } from "./background";
import type { SlideRenderContext } from "../core/slide-context";
import type { XmlElement } from "../../../xml/index";

/**
 * Create XmlElement for tests
 */
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

describe("getSlideBackgroundFill", () => {
  const createMockSlideCtx = (opts: {
    files?: Record<string, ArrayBuffer>;
    slideContent?: XmlElement;
    layoutContent?: XmlElement;
    masterContent?: XmlElement;
    masterResObj?: Record<string, string>;
    layoutResObj?: Record<string, string>;
    slideResObj?: Record<string, string>;
  }): SlideRenderContext => {
    const emptyPlaceholders = { byIdx: new Map(), byType: {} };
    const emptyResources = {
      getTarget: () => undefined,
      getType: () => undefined,
      getTargetByType: () => undefined, getAllTargetsByType: () => [],
    };

    return {
      slide: {
        content: opts.slideContent ?? el("p:sld"),
        resources:
          opts.slideResObj !== undefined
            ? {
                getTarget: (id: string) => opts.slideResObj?.[id],
                getType: () => undefined,
                getTargetByType: () => undefined, getAllTargetsByType: () => [],
              }
            : emptyResources,
      },
      layout: {
        content: opts.layoutContent,
        placeholders: emptyPlaceholders,
        resources:
          opts.layoutResObj !== undefined
            ? {
                getTarget: (id: string) => opts.layoutResObj?.[id],
                getType: () => undefined,
                getTargetByType: () => undefined, getAllTargetsByType: () => [],
              }
            : emptyResources,
      },
      master: {
        content: opts.masterContent,
        textStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
        placeholders: emptyPlaceholders,
        colorMap: {},
        resources:
          opts.masterResObj !== undefined
            ? {
                getTarget: (id: string) => opts.masterResObj?.[id],
                getType: () => undefined,
                getTargetByType: () => undefined, getAllTargetsByType: () => [],
              }
            : emptyResources,
      },
      presentation: {
        theme: {
          fontScheme: {
            majorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
            minorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
          },
          colorScheme: {},
          formatScheme: { lineStyles: [], fillStyles: [], effectStyles: [], bgFillStyles: [] },
          customColors: [],
          extraColorSchemes: [],
          themeElements: undefined,
          themeManager: undefined,
          themeOverrides: [],
          objectDefaults: {},
        },
        defaultTextStyle: null,
        zip: {
          file: (path: string) => {
            const content = opts.files?.[path];
            if (content === undefined) {
              return null;
            }
            return {
              asArrayBuffer: () => content,
              asText: () => new TextDecoder().decode(content),
            };
          },
        },
        renderOptions: {
          dialect: "ecma376",
          lineSpacingMode: "fontSizeMultiplier",
          baselineMode: "svgBaseline",
          libreofficeLineSpacingFactor: 0.75,
          tableScalingMode: "natural",
        },
      },
      forShape: () => ({}) as never,
      readFile: (path: string) => opts.files?.[path] ?? null,
      resolveResource: (rId: string) => {
        return opts.slideResObj?.[rId] ?? opts.layoutResObj?.[rId] ?? opts.masterResObj?.[rId];
      },
      toColorContext: () => ({
        colorMap: {},
        colorScheme: {},
      }),
      toPlaceholderContext: () => ({
        layoutPlaceholders: emptyPlaceholders,
        masterPlaceholders: emptyPlaceholders,
      }),
      toResourceContext: () => ({
        resolveResource: (rId: string) =>
          opts.slideResObj?.[rId] ?? opts.layoutResObj?.[rId] ?? opts.masterResObj?.[rId],
        readFile: (path: string) => opts.files?.[path] ?? null,
      }),
      toThemeResourceContext: () => ({
        resolveResource: () => undefined,
        readFile: (path: string) => opts.files?.[path] ?? null,
      }),
      toTextStyleContext: () => ({
        masterTextStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
        defaultTextStyle: null,
        placeholders: {
          layoutPlaceholders: emptyPlaceholders,
          masterPlaceholders: emptyPlaceholders,
        },
      }),
    };
  };

  describe("solid fill backgrounds", () => {
    it("should return solid fill from slide background", () => {
      const ctx = createMockSlideCtx({
        slideContent: el("p:sld", {}, [
          el("p:cSld", {}, [
            el("p:bg", {}, [el("p:bgPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])])]),
          ]),
        ]),
      });

      const result = getSlideBackgroundFill(ctx);
      expect(result).toContain("background-color");
      expect(result).toContain("FF0000");
    });

    it("should fall back to slide layout background", () => {
      const ctx = createMockSlideCtx({
        slideContent: el("p:sld", {}, [el("p:cSld")]),
        layoutContent: el("p:sldLayout", {}, [
          el("p:cSld", {}, [
            el("p:bg", {}, [el("p:bgPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "00FF00" })])])]),
          ]),
        ]),
      });

      const result = getSlideBackgroundFill(ctx);
      expect(result).toContain("background-color");
      expect(result).toContain("00FF00");
    });

    it("should fall back to slide master background", () => {
      const ctx = createMockSlideCtx({
        slideContent: el("p:sld", {}, [el("p:cSld")]),
        layoutContent: el("p:sldLayout", {}, [el("p:cSld")]),
        masterContent: el("p:sldMaster", {}, [
          el("p:cSld", {}, [
            el("p:bg", {}, [el("p:bgPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "0000FF" })])])]),
          ]),
        ]),
      });

      const result = getSlideBackgroundFill(ctx);
      expect(result).toContain("background-color");
      expect(result).toContain("0000FF");
    });
  });

  describe("background reference (p:bgRef)", () => {
    it("should resolve p:bgRef idx=1001 from bgFillStyleLst", () => {
      /**
       * ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef):
       * - idx 1001+ uses bgFillStyleLst[idx-1001]
       * - The child element (a:schemeClr) provides phClr substitution
       */
      const emptyPlaceholders = { byIdx: new Map(), byType: {} };
      const emptyResources = {
        getTarget: () => undefined,
        getType: () => undefined,
        getTargetByType: () => undefined, getAllTargetsByType: () => [],
      };

      const ctx: SlideRenderContext = {
        slide: {
          content: el("p:sld", {}, [el("p:cSld")]),
          resources: emptyResources,
        },
        layout: {
          content: el("p:sldLayout", {}, [el("p:cSld")]),
          placeholders: emptyPlaceholders,
          resources: emptyResources,
        },
        master: {
          content: el("p:sldMaster", {}, [
            el("p:cSld", {}, [
              el("p:bg", {}, [
                el("p:bgRef", { idx: "1001" }, [
                  el("a:schemeClr", { val: "bg1" }),
                ]),
              ]),
            ]),
          ]),
          textStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
          placeholders: emptyPlaceholders,
          colorMap: {},
          resources: emptyResources,
        },
        presentation: {
          theme: {
            fontScheme: {
              majorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
              minorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
            },
            colorScheme: {
              // bg1 maps to lt1 via DEFAULT_SCHEME_MAPPING, so lt1 must be in colorScheme
              lt1: "FFFFFF",
            },
            formatScheme: {
              lineStyles: [],
              fillStyles: [],
              effectStyles: [],
              // bgFillStyleLst[0] = solidFill with phClr (placeholder color)
              bgFillStyles: [
                el("a:solidFill", {}, [el("a:schemeClr", { val: "phClr" })]),
              ],
            },
            customColors: [],
            extraColorSchemes: [],
            themeElements: undefined,
            themeManager: undefined,
            themeOverrides: [],
            objectDefaults: {},
          },
          defaultTextStyle: null,
          zip: { file: () => null },
          renderOptions: {
            dialect: "ecma376",
            lineSpacingMode: "fontSizeMultiplier",
            baselineMode: "svgBaseline",
            libreofficeLineSpacingFactor: 0.75,
            tableScalingMode: "natural",
          },
        },
        forShape: () => ({}) as never,
        readFile: () => null,
        resolveResource: () => undefined,
        toColorContext: () => ({
          colorMap: {},
          colorScheme: { lt1: "FFFFFF" },
        }),
        toPlaceholderContext: () => ({
          layoutPlaceholders: emptyPlaceholders,
          masterPlaceholders: emptyPlaceholders,
        }),
        toResourceContext: () => ({
          resolveResource: () => undefined,
          readFile: () => null,
        }),
        toThemeResourceContext: () => ({
          resolveResource: () => undefined,
          readFile: () => null,
        }),
        toTextStyleContext: () => ({
          masterTextStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
          defaultTextStyle: null,
          placeholders: {
            layoutPlaceholders: emptyPlaceholders,
            masterPlaceholders: emptyPlaceholders,
          },
        }),
      };

      const result = getSlideBackgroundFill(ctx);
      // Should resolve to solid fill with bg1 color (white)
      expect(result).toContain("FFFFFF");
      expect(result).toContain("background-color");
    });

    it("should return empty when bgFillStyles is empty for bgRef", () => {
      const emptyPlaceholders = { byIdx: new Map(), byType: {} };
      const emptyResources = {
        getTarget: () => undefined,
        getType: () => undefined,
        getTargetByType: () => undefined, getAllTargetsByType: () => [],
      };

      const ctx: SlideRenderContext = {
        slide: {
          content: el("p:sld", {}, [el("p:cSld")]),
          resources: emptyResources,
        },
        layout: {
          content: el("p:sldLayout", {}, [el("p:cSld")]),
          placeholders: emptyPlaceholders,
          resources: emptyResources,
        },
        master: {
          content: el("p:sldMaster", {}, [
            el("p:cSld", {}, [
              el("p:bg", {}, [
                el("p:bgRef", { idx: "1001" }, [
                  el("a:schemeClr", { val: "bg1" }),
                ]),
              ]),
            ]),
          ]),
          textStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
          placeholders: emptyPlaceholders,
          colorMap: {},
          resources: emptyResources,
        },
        presentation: {
          theme: {
            fontScheme: {
              majorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
              minorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
            },
            colorScheme: {
              bg1: "FFFFFF",
            },
            formatScheme: {
              lineStyles: [],
              fillStyles: [],
              effectStyles: [],
              // Empty bgFillStyles - this should cause fallback
              bgFillStyles: [],
            },
            customColors: [],
            extraColorSchemes: [],
            themeElements: undefined,
            themeManager: undefined,
            themeOverrides: [],
            objectDefaults: {},
          },
          defaultTextStyle: null,
          zip: { file: () => null },
          renderOptions: {
            dialect: "ecma376",
            lineSpacingMode: "fontSizeMultiplier",
            baselineMode: "svgBaseline",
            libreofficeLineSpacingFactor: 0.75,
            tableScalingMode: "natural",
          },
        },
        forShape: () => ({}) as never,
        readFile: () => null,
        resolveResource: () => undefined,
        toColorContext: () => ({
          colorMap: {},
          colorScheme: { lt1: "FFFFFF" },
        }),
        toPlaceholderContext: () => ({
          layoutPlaceholders: emptyPlaceholders,
          masterPlaceholders: emptyPlaceholders,
        }),
        toResourceContext: () => ({
          resolveResource: () => undefined,
          readFile: () => null,
        }),
        toThemeResourceContext: () => ({
          resolveResource: () => undefined,
          readFile: () => null,
        }),
        toTextStyleContext: () => ({
          masterTextStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
          defaultTextStyle: null,
          placeholders: {
            layoutPlaceholders: emptyPlaceholders,
            masterPlaceholders: emptyPlaceholders,
          },
        }),
      };

      const result = getSlideBackgroundFill(ctx);
      // With empty bgFillStyles, should fall back to bgRef color directly
      // This tests the fallback path in getBackgroundRefCSS
      expect(result).toContain("FFFFFF");
    });
  });

  describe("picture fill backgrounds", () => {
    it("should return picture fill from slide master with masterResObj", () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const ctx = createMockSlideCtx({
        files: { "ppt/media/image1.jpeg": jpegBytes.buffer as ArrayBuffer },
        slideContent: el("p:sld", {}, [el("p:cSld")]),
        layoutContent: el("p:sldLayout", {}, [el("p:cSld")]),
        masterContent: el("p:sldMaster", {}, [
          el("p:cSld", {}, [
            el("p:bg", {}, [
              el("p:bgPr", {}, [el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId12" }), el("a:stretch")])]),
            ]),
          ]),
        ]),
        masterResObj: {
          rId12: "ppt/media/image1.jpeg",
        },
      });

      const result = getSlideBackgroundFill(ctx);
      expect(result).toContain("background-image");
      expect(result).toContain("data:image/jpeg;base64,");
    });

    it("should return picture fill from slide layout with layoutResObj", () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const ctx = createMockSlideCtx({
        files: { "ppt/media/layout-bg.png": pngBytes.buffer as ArrayBuffer },
        slideContent: el("p:sld", {}, [el("p:cSld")]),
        layoutContent: el("p:sldLayout", {}, [
          el("p:cSld", {}, [
            el("p:bg", {}, [
              el("p:bgPr", {}, [el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId5" }), el("a:stretch")])]),
            ]),
          ]),
        ]),
        layoutResObj: {
          rId5: "ppt/media/layout-bg.png",
        },
      });

      const result = getSlideBackgroundFill(ctx);
      expect(result).toContain("background-image");
      expect(result).toContain("data:image/png;base64,");
    });

    it("should return empty string when image relationship is missing", () => {
      const ctx = createMockSlideCtx({
        slideContent: el("p:sld", {}, [el("p:cSld")]),
        layoutContent: el("p:sldLayout", {}, [el("p:cSld")]),
        masterContent: el("p:sldMaster", {}, [
          el("p:cSld", {}, [
            el("p:bg", {}, [
              el("p:bgPr", {}, [el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId12" }), el("a:stretch")])]),
            ]),
          ]),
        ]),
        // No masterResObj with rId12
        masterResObj: {},
      });

      const result = getSlideBackgroundFill(ctx);
      // Should return empty since the image cannot be resolved
      expect(result).toBe("");
    });
  });
});

describe("getBackgroundFillData", () => {
  const createMockSlideCtx = (opts: {
    files?: Record<string, ArrayBuffer>;
    slideContent?: XmlElement;
    layoutContent?: XmlElement;
    masterContent?: XmlElement;
    masterResObj?: Record<string, string>;
  }): SlideRenderContext => {
    const emptyPlaceholders = { byIdx: new Map(), byType: {} };
    const emptyResources = {
      getTarget: () => undefined,
      getType: () => undefined,
      getTargetByType: () => undefined, getAllTargetsByType: () => [],
    };

    return {
      slide: {
        content: opts.slideContent ?? el("p:sld"),
        resources: emptyResources,
      },
      layout: {
        content: opts.layoutContent,
        placeholders: emptyPlaceholders,
        resources: emptyResources,
      },
      master: {
        content: opts.masterContent,
        textStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
        placeholders: emptyPlaceholders,
        colorMap: {},
        resources:
          opts.masterResObj !== undefined
            ? {
                getTarget: (id: string) => opts.masterResObj?.[id],
                getType: () => undefined,
                getTargetByType: () => undefined, getAllTargetsByType: () => [],
              }
            : emptyResources,
      },
      presentation: {
        theme: {
          fontScheme: {
            majorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
            minorFont: { latin: undefined, eastAsian: undefined, complexScript: undefined },
          },
          colorScheme: {},
          formatScheme: { lineStyles: [], fillStyles: [], effectStyles: [], bgFillStyles: [] },
          customColors: [],
          extraColorSchemes: [],
          themeElements: undefined,
          themeManager: undefined,
          themeOverrides: [],
          objectDefaults: {},
        },
        defaultTextStyle: null,
        zip: {
          file: (path: string) => {
            const content = opts.files?.[path];
            if (content === undefined) {
              return null;
            }
            return {
              asArrayBuffer: () => content,
              asText: () => new TextDecoder().decode(content),
            };
          },
        },
        renderOptions: {
          dialect: "ecma376",
          lineSpacingMode: "fontSizeMultiplier",
          baselineMode: "svgBaseline",
          libreofficeLineSpacingFactor: 0.75,
          tableScalingMode: "natural",
        },
      },
      forShape: () => ({}) as never,
      readFile: (path: string) => opts.files?.[path] ?? null,
      resolveResource: (rId: string) => opts.masterResObj?.[rId],
      toColorContext: () => ({
        colorMap: {},
        colorScheme: {},
      }),
      toPlaceholderContext: () => ({
        layoutPlaceholders: emptyPlaceholders,
        masterPlaceholders: emptyPlaceholders,
      }),
      toResourceContext: () => ({
        resolveResource: (rId: string) => opts.masterResObj?.[rId],
        readFile: (path: string) => opts.files?.[path] ?? null,
      }),
      toThemeResourceContext: () => ({
        resolveResource: () => undefined,
        readFile: (path: string) => opts.files?.[path] ?? null,
      }),
      toTextStyleContext: () => ({
        masterTextStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
        defaultTextStyle: null,
        placeholders: {
          layoutPlaceholders: emptyPlaceholders,
          masterPlaceholders: emptyPlaceholders,
        },
      }),
    };
  };

  it("should return image data URI for picture fill from master", () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const ctx = createMockSlideCtx({
      files: { "ppt/media/image1.jpeg": jpegBytes.buffer as ArrayBuffer },
      slideContent: el("p:sld", {}, [el("p:cSld")]),
      layoutContent: el("p:sldLayout", {}, [el("p:cSld")]),
      masterContent: el("p:sldMaster", {}, [
        el("p:cSld", {}, [
          el("p:bg", {}, [
            el("p:bgPr", {}, [el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId12" }), el("a:stretch")])]),
          ]),
        ]),
      ]),
      masterResObj: {
        rId12: "ppt/media/image1.jpeg",
      },
    });

    const result = getBackgroundFillData(ctx);
    expect(result.isSolid).toBe(false);
    expect(result.image).toBeDefined();
    expect(result.image ?? "").toContain("data:image/jpeg;base64,");
    expect(result.imageFillMode).toBe("stretch");
  });
});
