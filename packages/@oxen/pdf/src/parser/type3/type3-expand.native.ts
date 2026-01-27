/**
 * @file src/pdf/parser/type3-expand.native.ts
 *
 * Expands Type3 text runs into parsed graphics elements (paths/images) so the
 * rest of the native pipeline (Form expansion, image extraction) can treat them
 * like normal content-stream graphics.
 */

import type { FontMappings } from "../../domain";
import type { NativePdfPage, PdfDict, PdfName, PdfObject, PdfStream } from "../../native";
import { extractExtGStateFromResourcesNative, type ExtGStateParams } from "../graphics-state/ext-gstate.native";
import { extractFontMappingsFromResourcesNative } from "../font/font-decoder.native";
import { extractPatternsFromResourcesNative } from "../pattern/pattern.native";
import { extractShadingFromResourcesNative } from "../shading/shading.native";
import { extractColorSpacesFromResourcesNative, type ParsedNamedColorSpace } from "../color/color-space.native";
import type { ParsedElement, ParsedImage, ParsedText } from "../operator";
import type { PdfPattern } from "../pattern/pattern.types";
import type { PdfShading } from "../shading/shading.types";
import { renderType3TextRun } from "./type3-glyph.native";

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}
function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}
function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) {return undefined;}
  return page.lookup(obj);
}

function resolveDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  return asDict(resolve(page, obj));
}

function getFontsDict(page: NativePdfPage, resources: PdfDict): PdfDict | null {
  const fonts = resolve(page, dictGet(resources, "Font"));
  return asDict(fonts);
}

type Type3ResourceScope = Readonly<{
  readonly fontName: string;
  readonly xObjects: PdfDict | null;
  readonly extGState: ReadonlyMap<string, ExtGStateParams>;
  readonly shadings: ReadonlyMap<string, PdfShading>;
  readonly patterns: ReadonlyMap<string, PdfPattern>;
  readonly colorSpaces: ReadonlyMap<string, ParsedNamedColorSpace>;
  readonly fontMappings: FontMappings;
}>;

function buildType3Scopes(page: NativePdfPage, resources: PdfDict): ReadonlyMap<string, Type3ResourceScope> {
  const fonts = getFontsDict(page, resources);
  if (!fonts) {return new Map();}

  const out = new Map<string, Type3ResourceScope>();

  for (const [fontName, refOrObj] of fonts.map.entries()) {
    const fontDict = asDict(resolve(page, refOrObj));
    if (!fontDict) {continue;}

    const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
    if (subtype !== "Type3") {continue;}

    const res = resolveDict(page, dictGet(fontDict, "Resources"));
    const xObjects = res ? resolveDict(page, dictGet(res, "XObject")) : null;
    const extGState = res ? extractExtGStateFromResourcesNative(page, res) : new Map();
    const fontMappings = res ? extractFontMappingsFromResourcesNative(page, res) : new Map();
    const shadings = res ? extractShadingFromResourcesNative(page, res) : new Map();
    const patterns = res ? extractPatternsFromResourcesNative(page, res) : new Map();
    const colorSpaces = extractColorSpacesFromResourcesNative(page, res);

    out.set(fontName, { fontName, xObjects, extGState, shadings, patterns, colorSpaces, fontMappings });
  }

  return out;
}

function mergeFontMappingsWithOverride(base: FontMappings, extra: FontMappings): FontMappings {
  if (extra.size === 0) {return base;}
  if (base.size === 0) {return extra;}
  const merged: FontMappings = new Map();
  for (const [k, v] of base) {merged.set(k, v);}
  for (const [k, v] of extra) {merged.set(k, v);}
  return merged;
}

function addBaseFontKeysFromMappings(target: FontMappings, extra: FontMappings): void {
  for (const info of extra.values()) {
    const baseFont = info.baseFont;
    if (!baseFont) {continue;}

    const baseKey = baseFont;
    if (!target.has(baseKey)) {target.set(baseKey, info);}

    const plusIndex = baseFont.indexOf("+");
    if (plusIndex > 0) {
      const stripped = baseFont.slice(plusIndex + 1);
      if (stripped.length > 0 && !target.has(stripped)) {target.set(stripped, info);}
    }
  }
}

function mergeExtGState(
  base: ReadonlyMap<string, ExtGStateParams>,
  extra: ReadonlyMap<string, ExtGStateParams>,
): ReadonlyMap<string, ExtGStateParams> {
  if (extra.size === 0) {return base;}
  if (base.size === 0) {return extra;}
  const merged = new Map<string, ExtGStateParams>();
  for (const [k, v] of base) {merged.set(k, v);}
  for (const [k, v] of extra) {merged.set(k, v);}
  return merged;
}

function resolveXObjectStreamByName(page: NativePdfPage, xObjects: PdfDict, name: string): PdfStream | null {
  const clean = name.startsWith("/") ? name.slice(1) : name;
  const entry = dictGet(xObjects, clean);
  return asStream(resolve(page, entry));
}

function remapType3ImageXObjects(
  page: NativePdfPage,
  elements: readonly ParsedElement[],
  xObjects: PdfDict | null,
  registerXObjectStream: (stream: PdfStream) => string,
): ParsedElement[] {
  if (!xObjects) {return [...elements];}
  const out: ParsedElement[] = [];

  for (const elem of elements) {
    if (elem.type !== "image") {
      out.push(elem);
      continue;
    }
    const stream = resolveXObjectStreamByName(page, xObjects, elem.name);
    if (!stream) {
      out.push(elem);
      continue;
    }
    const newName = registerXObjectStream(stream);
    const replaced: ParsedImage = { ...elem, name: `/${newName}` };
    out.push(replaced);
  }

  return out;
}

function tagType3Sources(elements: readonly ParsedElement[]): ParsedElement[] {
  const out: ParsedElement[] = [];
  for (const elem of elements) {
    if (elem.type === "path") {
      out.push({ ...elem, source: "type3" });
      continue;
    }
    out.push(elem);
  }
  return out;
}

/**
 * Expand Type3 text elements into parsed elements, using the font’s `/Resources`
 * for ExtGState and XObject resolution.
 */
export function expandType3TextElementsNative(args: {
  readonly page: NativePdfPage;
  readonly resources: PdfDict | null;
  readonly parsedElements: readonly ParsedElement[];
  readonly fontMappings: FontMappings;
  readonly pageExtGState: ReadonlyMap<string, ExtGStateParams>;
  readonly shadingMaxSize: number;
  readonly clipPathMaxSize: number;
  readonly pageBBox: readonly [number, number, number, number];
  readonly registerXObjectStream: (stream: PdfStream) => string;
}): ParsedElement[] {
  if (!args.resources) {return [...args.parsedElements];}

  const type3Scopes = buildType3Scopes(args.page, args.resources);
  if (type3Scopes.size === 0) {return [...args.parsedElements];}

  // Type3 glyph programs can reference additional fonts in the Type3 font's `/Resources`.
  // We want those base-font mappings available during conversion (decodeText) without
  // risking conflicts on resource-local names like `/F2`.
  for (const scope of type3Scopes.values()) {
    addBaseFontKeysFromMappings(args.fontMappings, scope.fontMappings);
  }

  const out: ParsedElement[] = [];

  for (const elem of args.parsedElements) {
    if (elem.type !== "text") {
      out.push(elem);
      continue;
    }

    const textElem = elem as ParsedText;
    let pendingRuns: ParsedText["runs"] = [];

    for (const run of textElem.runs) {
      const cleanFont = run.fontName.startsWith("/") ? run.fontName.slice(1) : run.fontName;
      const info = args.fontMappings.get(cleanFont);
      const type3 = info?.type3;

      if (!type3 || !info) {
        pendingRuns = [...pendingRuns, run];
        continue;
      }

      if (pendingRuns.length > 0) {
        out.push({ ...textElem, runs: pendingRuns });
        pendingRuns = [];
      }

      const scope = type3Scopes.get(cleanFont);
      const mergedExt = mergeExtGState(args.pageExtGState, scope?.extGState ?? new Map());
      const scopedFonts = scope ? mergeFontMappingsWithOverride(args.fontMappings, scope.fontMappings) : args.fontMappings;
      const rendered = renderType3TextRun(run, info, type3, scopedFonts, {
        extGState: mergedExt,
        shadings: scope?.shadings ?? new Map(),
        patterns: scope?.patterns ?? new Map(),
        colorSpaces: scope?.colorSpaces ?? new Map(),
        shadingMaxSize: args.shadingMaxSize,
        clipPathMaxSize: args.clipPathMaxSize,
        pageBBox: args.pageBBox,
      });
      const remapped = remapType3ImageXObjects(args.page, rendered, scope?.xObjects ?? null, args.registerXObjectStream);
      out.push(...tagType3Sources(remapped));
    }

    if (pendingRuns.length > 0) {
      out.push({ ...textElem, runs: pendingRuns });
    }
  }

  return out;
}
