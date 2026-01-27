/**
 * @file Test helpers for PPTX module
 *
 * Provides mock implementations of context types for testing.
 */

import type { XmlElement } from "@oxen/xml";
import type { ColorResolveContext } from "./domain/color/context";
import type { SlideContext, ResourceContext } from "./parser/slide/context";
import type { ColorMap, ColorScheme, PlaceholderTable, ResourceMap, ZipFile, FormatScheme, RawMasterTextStyles } from "./domain";
import { DEFAULT_RENDER_OPTIONS } from "./render/render-options";

/**
 * Create an empty XML element for testing
 */
export function el(name: string, attrs: Record<string, string> = {}): XmlElement {
  return { type: "element", name, attrs, children: [] };
}

/**
 * Create mock placeholder table
 */
export function createMockPlaceholderTable(): PlaceholderTable {
  return {
    byIdx: new Map(),
    byType: {},
  };
}

/**
 * Create mock resource map
 */
export function createMockResourceMap(): ResourceMap {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
    getTargetByType: () => undefined,
    getAllTargetsByType: () => [],
  };
}

/**
 * Create mock color map
 * Returns identity mapping for common scheme colors.
 */
export function createMockColorMap(): ColorMap {
  return {
    tx1: "dk1",
    tx2: "dk2",
    bg1: "lt1",
    bg2: "lt2",
  };
}

/**
 * Create mock color scheme
 */
export function createMockColorScheme(): ColorScheme {
  return {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "44546A",
    lt2: "E7E6E6",
    accent1: "4472C4",
    accent2: "ED7D31",
    accent3: "A5A5A5",
    accent4: "FFC000",
    accent5: "5B9BD5",
    accent6: "70AD47",
    hlink: "0563C1",
    folHlink: "954F72",
  };
}

/**
 * Create mock format scheme
 */
export function createMockFormatScheme(): FormatScheme {
  return {
    lineStyles: [],
    fillStyles: [],
    effectStyles: [],
    bgFillStyles: [],
  };
}

/**
 * Create mock master text styles
 */
export function createMockMasterTextStyles(): RawMasterTextStyles {
  return {
    titleStyle: undefined,
    bodyStyle: undefined,
    otherStyle: undefined,
  };
}

/**
 * Create mock zip file
 */
export function createMockZipFile(): ZipFile {
  return {
    file: () => null,
  };
}

/**
 * Create mock ColorResolveContext
 */
export function createMockColorContext(): ColorResolveContext {
  return {
    colorMap: createMockColorMap(),
    colorScheme: createMockColorScheme(),
  };
}

/**
 * Create mock ResourceContext
 */
export function createMockResourceContext(): ResourceContext {
  return {
    resolveResource: () => undefined,
    readFile: () => null,
    resolveBlipFill: () => undefined,
  };
}

/**
 * Create mock SlideRenderContext
 */
export function createMockSlideRenderContext(
  options: Partial<{
    colorMap: ColorMap;
    colorScheme: ColorScheme;
    resources: ResourceMap;
    placeholders: PlaceholderTable;
    formatScheme: FormatScheme;
    zip: ZipFile;
  }> = {},
): SlideContext {
  const colorMap = options.colorMap ?? createMockColorMap();
  const colorScheme = options.colorScheme ?? createMockColorScheme();
  const resources = options.resources ?? createMockResourceMap();
  const placeholders = options.placeholders ?? createMockPlaceholderTable();
  const formatScheme = options.formatScheme ?? createMockFormatScheme();
  const zip = options.zip ?? createMockZipFile();

  const ctx: SlideContext = {
    slide: {
      content: el("p:sld"),
      resources,
    },
    layout: {
      placeholders,
      resources,
    },
    master: {
      textStyles: createMockMasterTextStyles(),
      placeholders,
      colorMap,
      resources,
    },
    presentation: {
      theme: {
        fontScheme: {
          majorFont: { latin: "Calibri Light", eastAsian: undefined, complexScript: undefined },
          minorFont: { latin: "Calibri", eastAsian: undefined, complexScript: undefined },
        },
        colorScheme,
        formatScheme,
        customColors: [],
        extraColorSchemes: [],
        themeElements: undefined,
        themeManager: undefined,
        themeOverrides: [],
        objectDefaults: {},
      },
      defaultTextStyle: null,
      zip,
      renderOptions: DEFAULT_RENDER_OPTIONS,
    },
    forShape: (type?: string, idx?: number) => {
      const shapeCtx = {
        slide: ctx,
        type: type ?? "body",
        idx,
        forParagraph: (lvl?: number) => ({
          lvl: lvl ?? 1,
          type: type ?? "body",
          idx,
          shape: shapeCtx,
          getDefRPr: () => undefined,
          getDefPPr: () => undefined,
          resolveThemeFont: (typeface: string) => typeface,
          resolveSchemeColor: () => undefined,
        }),
        getLayoutPlaceholder: () => undefined,
        getMasterPlaceholder: () => undefined,
      };
      return shapeCtx;
    },
    readFile: () => null,
    resolveResource: () => undefined,
    toColorContext: () => ({
      colorMap,
      colorScheme,
    }),
    toPlaceholderContext: () => ({
      layoutPlaceholders: placeholders,
      masterPlaceholders: placeholders,
    }),
    toResourceContext: () => ({
      resolveResource: () => undefined,
      readFile: () => null,
      resolveBlipFill: () => undefined,
    }),
    toThemeResourceContext: () => ({
      resolveResource: () => undefined,
      readFile: () => null,
      resolveBlipFill: () => undefined,
    }),
    toTextStyleContext: () => ({
      masterTextStyles: createMockMasterTextStyles(),
      defaultTextStyle: null,
      placeholders: {
        layoutPlaceholders: placeholders,
        masterPlaceholders: placeholders,
      },
    }),
  };

  return ctx;
}
