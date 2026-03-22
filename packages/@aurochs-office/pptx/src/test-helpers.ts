/**
 * @file Test helpers for PPTX module
 *
 * Provides mock implementations of context types for testing.
 */

import type { XmlElement } from "@aurochs/xml";
import type { ColorMap, ColorResolveContext, ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import { DEFAULT_COLOR_MAPPING } from "@aurochs-office/pptx/domain/color/types";
import type { SlideContext, ResourceContext } from "./parser/slide/context";
import { DEFAULT_COLOR_SCHEME, type PlaceholderTable, type FormatScheme } from "./domain";
import type { MasterTextStyles } from "./domain/text-style";
import type { ResourceMap, ZipFile } from "@aurochs-office/opc";
import { DEFAULT_RENDER_OPTIONS } from "@aurochs-renderer/pptx";

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
  return { ...DEFAULT_COLOR_MAPPING };
}

/**
 * Create mock color scheme
 */
export function createMockColorScheme(): ColorScheme {
  return { ...DEFAULT_COLOR_SCHEME };
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
export function createMockMasterTextStyles(): MasterTextStyles {
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
