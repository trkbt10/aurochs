/**
 * @file Tests for background parser functions
 */

import type { XmlElement } from "@oxen/xml";
import { DEFAULT_RENDER_OPTIONS } from "../../render/render-options";
import type { Theme } from "../../domain/theme/types";
import type { ResourceMap, PlaceholderTable, ZipFile } from "../../domain/opc";
import type { RawMasterTextStyles, ColorMap } from "../../domain/theme/types";
import type { SlideContext } from "../slide/context";
import { getBackgroundElement, getBgPrFromElement, getBgRefFromElement, resolveBgRefToXmlElement } from "./background";

function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

const EMPTY_RESOURCE_MAP: ResourceMap = {
  getTarget() {
    return undefined;
  },
  getType() {
    return undefined;
  },
  getTargetByType() {
    return undefined;
  },
  getAllTargetsByType() {
    return [];
  },
};

const EMPTY_PLACEHOLDERS: PlaceholderTable = {
  byIdx: new Map(),
  byType: {},
};

const EMPTY_TEXT_STYLES: RawMasterTextStyles = {
  titleStyle: undefined,
  bodyStyle: undefined,
  otherStyle: undefined,
};

function createTheme(params: {
  fillStyles: readonly XmlElement[];
  bgFillStyles: readonly XmlElement[];
}): Theme {
  return {
    fontScheme: { majorFont: {}, minorFont: {} },
    colorScheme: {},
    formatScheme: {
      lineStyles: [],
      fillStyles: params.fillStyles,
      effectStyles: [],
      bgFillStyles: params.bgFillStyles,
    },
    customColors: [],
    extraColorSchemes: [],
    themeOverrides: [],
    objectDefaults: {},
  };
}

function createSlideContextForBgRef(theme: Theme): SlideContext {
  const zip: ZipFile = {
    file() {
      return null;
    },
  };

  const colorMap: ColorMap = {};

  return {
    slide: { content: el("p:sld"), resources: EMPTY_RESOURCE_MAP },
    layout: { placeholders: EMPTY_PLACEHOLDERS, resources: EMPTY_RESOURCE_MAP },
    master: {
      textStyles: EMPTY_TEXT_STYLES,
      placeholders: EMPTY_PLACEHOLDERS,
      colorMap,
      resources: EMPTY_RESOURCE_MAP,
    },
    presentation: {
      theme,
      defaultTextStyle: null,
      zip,
      renderOptions: DEFAULT_RENDER_OPTIONS,
    },
    forShape() {
      throw new Error("not used in this spec");
    },
    readFile() {
      throw new Error("not used in this spec");
    },
    resolveResource() {
      throw new Error("not used in this spec");
    },
    toColorContext() {
      throw new Error("not used in this spec");
    },
    toPlaceholderContext() {
      throw new Error("not used in this spec");
    },
    toResourceContext() {
      throw new Error("not used in this spec");
    },
    toTextStyleContext() {
      throw new Error("not used in this spec");
    },
    toThemeResourceContext() {
      throw new Error("not used in this spec");
    },
  };
}

describe("getBackgroundElement", () => {
  it("returns undefined for undefined input", () => {
    expect(getBackgroundElement(undefined)).toBeUndefined();
  });

  it("returns undefined when p:cSld is missing", () => {
    expect(getBackgroundElement(el("p:sld"))).toBeUndefined();
  });

  it("returns undefined when p:bg is missing", () => {
    const sld = el("p:sld", {}, [el("p:cSld")]);
    expect(getBackgroundElement(sld)).toBeUndefined();
  });

  it("returns bgPr when present", () => {
    const bgPr = el("p:bgPr");
    const sld = el("p:sld", {}, [el("p:cSld", {}, [el("p:bg", {}, [bgPr])])]);
    expect(getBackgroundElement(sld)).toEqual({ bgPr, bgRef: undefined });
  });

  it("returns bgRef when present", () => {
    const bgRef = el("p:bgRef");
    const sld = el("p:sld", {}, [el("p:cSld", {}, [el("p:bg", {}, [bgRef])])]);
    expect(getBackgroundElement(sld)).toEqual({ bgPr: undefined, bgRef });
  });
});

describe("getBgPrFromElement / getBgRefFromElement", () => {
  it("returns direct children from standard p:cSld -> p:bg path", () => {
    const bgPr = el("p:bgPr");
    const bgRef = el("p:bgRef");
    const sld = el("p:sld", {}, [el("p:cSld", {}, [el("p:bg", {}, [bgPr, bgRef])])]);

    expect(getBgPrFromElement(sld)).toBe(bgPr);
    expect(getBgRefFromElement(sld)).toBe(bgRef);
  });
});

describe("resolveBgRefToXmlElement", () => {
  it("resolves idx 1-999 to formatScheme.fillStyles[idx-1]", () => {
    const fill0 = el("a:solidFill");
    const fill1 = el("a:gradFill");
    const ctx = createSlideContextForBgRef(createTheme({ fillStyles: [fill0, fill1], bgFillStyles: [] }));

    expect(resolveBgRefToXmlElement(el("p:bgRef", { idx: "1" }), ctx)).toBe(fill0);
    expect(resolveBgRefToXmlElement(el("p:bgRef", { idx: "2" }), ctx)).toBe(fill1);
  });

  it("resolves idx 1001+ to formatScheme.bgFillStyles[idx-1001]", () => {
    const bgFill0 = el("a:solidFill");
    const bgFill1 = el("a:gradFill");
    const ctx = createSlideContextForBgRef(createTheme({ fillStyles: [], bgFillStyles: [bgFill0, bgFill1] }));

    expect(resolveBgRefToXmlElement(el("p:bgRef", { idx: "1001" }), ctx)).toBe(bgFill0);
    expect(resolveBgRefToXmlElement(el("p:bgRef", { idx: "1002" }), ctx)).toBe(bgFill1);
  });

  it("returns undefined for missing or invalid idx", () => {
    const ctx = createSlideContextForBgRef(createTheme({ fillStyles: [], bgFillStyles: [] }));

    expect(resolveBgRefToXmlElement(el("p:bgRef"), ctx)).toBeUndefined();
    expect(resolveBgRefToXmlElement(el("p:bgRef", { idx: "0" }), ctx)).toBeUndefined();
    expect(resolveBgRefToXmlElement(el("p:bgRef", { idx: "abc" }), ctx)).toBeUndefined();
  });
});

