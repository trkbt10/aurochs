import type { NativePdfPage, PdfArray, PdfBool, PdfDict, PdfName, PdfNumber, PdfObject, PdfRef, PdfStream } from "../native";
import { decodeStreamData } from "../native/filters";
import { decodePdfStream } from "../native/stream";
import type { PdfColorSpace, PdfImage } from "../domain";
import { getColorSpaceComponents } from "../domain";
import { cmykToRgb, grayToRgb, rgbToRgbBytes } from "../domain/color";
import type { ParsedImage } from "./operator-parser";
import { decodeCcittFax, type CcittFaxDecodeParms } from "./ccitt-fax-decode";
import { decodeJpegToRgb } from "./jpeg-decode";

export type ImageExtractorOptions = {
  readonly extractImages?: boolean;
  readonly maxDimension?: number;
  readonly pageHeight: number;
};

function decodeMaskSamplesToAlpha8(
  data: Uint8Array,
  width: number,
  height: number,
  bitsPerComponent: number,
): Uint8Array {
  const pixelCount = width * height;

  switch (bitsPerComponent) {
    case 8: {
      if (data.length === pixelCount) return data;
      // Some producers may encode the soft mask as RGB; treat the first component as alpha.
      if (data.length === pixelCount * 3) {
        const alpha = new Uint8Array(pixelCount);
        for (let i = 0; i < pixelCount; i += 1) alpha[i] = data[i * 3] ?? 0;
        return alpha;
      }
      throw new Error(
        `[PDF Image] Soft mask length mismatch (bpc=8): expected ${pixelCount} (or ${pixelCount * 3}) bytes, got ${data.length}`,
      );
    }
    case 16: {
      if (data.length !== pixelCount * 2) {
        throw new Error(
          `[PDF Image] Soft mask length mismatch (bpc=16): expected ${pixelCount * 2} bytes, got ${data.length}`,
        );
      }
      const alpha = new Uint8Array(pixelCount);
      for (let i = 0; i < pixelCount; i += 1) alpha[i] = data[i * 2] ?? 0;
      return alpha;
    }
    case 1:
    case 2:
    case 4: {
      const expected = Math.ceil((pixelCount * bitsPerComponent) / 8);
      if (data.length !== expected) {
        throw new Error(
          `[PDF Image] Soft mask length mismatch (bpc=${bitsPerComponent}): expected ${expected} bytes, got ${data.length}`,
        );
      }
      const samplesPerByte = 8 / bitsPerComponent;
      const mask = (1 << bitsPerComponent) - 1;
      const scale = 255 / mask;

      const alpha = new Uint8Array(pixelCount);
      for (let i = 0; i < pixelCount; i += 1) {
        const byteIdx = Math.floor(i / samplesPerByte);
        const bitOffset = (samplesPerByte - 1 - (i % samplesPerByte)) * bitsPerComponent;
        const byte = data[byteIdx] ?? 0;
        const value = (byte >> bitOffset) & mask;
        alpha[i] = Math.round(value * scale);
      }
      return alpha;
    }
    default:
      throw new Error(`[PDF Image] Unsupported soft mask BitsPerComponent=${bitsPerComponent}`);
  }
}

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}
function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}
function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}
function asNumber(obj: PdfObject | undefined): PdfNumber | null {
  return obj?.type === "number" ? obj : null;
}
function asBool(obj: PdfObject | undefined): PdfBool | null {
  return obj?.type === "bool" ? obj : null;
}
function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}
function asRef(obj: PdfObject | undefined): PdfRef | null {
  return obj?.type === "ref" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) return undefined;
  return page.lookup(obj);
}

function resolveDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  return asDict(resolve(page, obj));
}

function getNumberValue(dict: PdfDict, key: string): number | null {
  const v = dictGet(dict, key);
  const n = asNumber(v);
  return n ? n.value : null;
}

function getBoolValue(dict: PdfDict, key: string): boolean | null {
  const v = dictGet(dict, key);
  const b = asBool(v);
  return b ? b.value : null;
}

function getFilterNames(page: NativePdfPage, dict: PdfDict): readonly string[] {
  const filterObj = resolve(page, dictGet(dict, "Filter"));
  if (!filterObj) return [];
  if (filterObj.type === "name") return [filterObj.value];
  if (filterObj.type === "array") {
    const out: string[] = [];
    for (const item of filterObj.items) {
      const name = item.type === "name" ? item.value : null;
      if (name) out.push(name);
    }
    return out;
  }
  return [];
}

function shouldInvertSoftMaskDecode(page: NativePdfPage, dict: PdfDict): boolean {
  const decodeObj = resolve(page, dictGet(dict, "Decode"));
  const decode = asArray(decodeObj);
  if (!decode || decode.items.length < 2) return false;
  const a = decode.items[0]?.type === "number" ? decode.items[0].value : null;
  const b = decode.items[1]?.type === "number" ? decode.items[1].value : null;
  if (a === null || b === null) return false;
  return a === 1 && b === 0;
}

function getSoftMaskAlpha8(page: NativePdfPage, imageDict: PdfDict, width: number, height: number): Uint8Array | null {
  try {
    const smaskObj = resolve(page, dictGet(imageDict, "SMask"));
    const smaskStream = asStream(smaskObj);
    if (!smaskStream) return null;

    const smaskDict = smaskStream.dict;
    const subtype = asName(dictGet(smaskDict, "Subtype"))?.value ?? "";
    if (subtype.length > 0 && subtype !== "Image") return null;

    const mw = getNumberValue(smaskDict, "Width") ?? 0;
    const mh = getNumberValue(smaskDict, "Height") ?? 0;
    if (mw !== width || mh !== height) {
      throw new Error(`[PDF Image] Soft mask dimensions mismatch: image=${width}x${height}, smask=${mw}x${mh}`);
    }

    const bitsPerComponent = getNumberValue(smaskDict, "BitsPerComponent") ?? 8;
    const filters = getFilterNames(page, smaskDict);

    if (filters.includes("CCITTFaxDecode")) {
      throw new Error("[PDF Image] Soft mask with /CCITTFaxDecode is not supported yet");
    }

    const normalized = filters.map((f) => (f === "DCT" ? "DCTDecode" : f === "JPX" ? "JPXDecode" : f));
    if (normalized.includes("JPXDecode")) {
      throw new Error("[PDF Image] Soft mask with /JPXDecode is not supported yet");
    }

    const dctIndex = normalized.indexOf("DCTDecode");
    let decoded: Uint8Array;
    if (dctIndex >= 0) {
      if (dctIndex !== normalized.length - 1) {
        throw new Error(`[PDF Image] Unsupported soft mask filter chain with /DCTDecode: ${filters.join(", ")}`);
      }
      const jpegBytes = decodePdfStream(smaskStream);
      const rgb = decodeJpegToRgb(jpegBytes, { expectedWidth: mw, expectedHeight: mh });
      const alpha = new Uint8Array(mw * mh);
      for (let i = 0; i < mw * mh; i += 1) alpha[i] = rgb.data[i * 3] ?? 0;
      return alpha;
    }

    decoded = decodePdfStream(smaskStream);
    const alpha = decodeMaskSamplesToAlpha8(decoded, mw, mh, bitsPerComponent);
    if (shouldInvertSoftMaskDecode(page, smaskDict)) {
      for (let i = 0; i < alpha.length; i += 1) alpha[i] = 255 - (alpha[i] ?? 0);
    }
    return alpha;
  } catch (error) {
    console.warn("Failed to decode /SMask:", error);
    return null;
  }
}

type DecodeParms = {
  readonly predictor: number;
  readonly columns: number;
  readonly colors: number;
};

function getDecodeParms(page: NativePdfPage, dict: PdfDict): DecodeParms | null {
  const parmsObj = resolve(page, dictGet(dict, "DecodeParms"));
  const parms = asDict(parmsObj);
  if (!parms) return null;

  const predictor = getNumberValue(parms, "Predictor") ?? 1;
  if (predictor < 10 || predictor > 15) return null;

  return {
    predictor,
    columns: getNumberValue(parms, "Columns") ?? 1,
    colors: getNumberValue(parms, "Colors") ?? 1,
  };
}

function getCcittDecodeParms(
  page: NativePdfPage,
  dict: PdfDict,
  filters: readonly string[],
  width: number,
  height: number,
): CcittFaxDecodeParms {
  const index = filters.findIndex((f) => f === "CCITTFaxDecode");
  if (index < 0) throw new Error("getCcittDecodeParms: missing /CCITTFaxDecode filter");

  const decodeParmsObj = resolve(page, dictGet(dict, "DecodeParms"));
  const ccittDict = (() => {
    if (!decodeParmsObj) return null;
    if (decodeParmsObj.type === "dict") return decodeParmsObj;
    if (decodeParmsObj.type === "array") {
      const entry = decodeParmsObj.items[index];
      const resolved = resolve(page, entry);
      return asDict(resolved);
    }
    return null;
  })();

  const k = ccittDict ? (getNumberValue(ccittDict, "K") ?? 0) : 0;
  const columns = ccittDict ? (getNumberValue(ccittDict, "Columns") ?? width) : width;
  const rows = ccittDict ? (getNumberValue(ccittDict, "Rows") ?? height) : height;
  const endOfLine = ccittDict ? (getBoolValue(ccittDict, "EndOfLine") ?? false) : false;
  const encodedByteAlign = ccittDict ? (getBoolValue(ccittDict, "EncodedByteAlign") ?? false) : false;
  const blackIs1 = ccittDict ? (getBoolValue(ccittDict, "BlackIs1") ?? false) : false;
  const endOfBlock = ccittDict ? (getBoolValue(ccittDict, "EndOfBlock") ?? true) : true;
  const damagedRowsBeforeError = ccittDict ? (getNumberValue(ccittDict, "DamagedRowsBeforeError") ?? 0) : 0;

  return {
    k,
    columns,
    rows,
    endOfLine,
    encodedByteAlign,
    blackIs1,
    endOfBlock,
    damagedRowsBeforeError,
  };
}

function parseColorSpaceName(name: string): PdfColorSpace {
  switch (name) {
    case "DeviceGray":
    case "CalGray":
      return "DeviceGray";
    case "DeviceRGB":
    case "CalRGB":
      return "DeviceRGB";
    case "DeviceCMYK":
      return "DeviceCMYK";
    default:
      return "DeviceRGB";
  }
}

type ColorSpaceInfo =
  | Readonly<{ kind: "direct"; colorSpace: PdfColorSpace }>
  | Readonly<{ kind: "indexed"; base: PdfColorSpace; hival: number; lookup: Uint8Array }>;

function getColorSpaceInfo(page: NativePdfPage, dict: PdfDict): ColorSpaceInfo {
  const csObj = resolve(page, dictGet(dict, "ColorSpace"));
  if (!csObj) return { kind: "direct", colorSpace: "DeviceRGB" };

  if (csObj.type === "name") {
    return { kind: "direct", colorSpace: parseColorSpaceName(csObj.value) };
  }

  if (csObj.type === "array" && csObj.items.length > 0) {
    const first = csObj.items[0];
    if (first?.type === "name") {
      const name = first.value;
      if (name === "ICCBased" && csObj.items.length > 1) {
        const profile = resolve(page, csObj.items[1]);
        const profileStream = asStream(profile);
        if (profileStream) {
          const n = getNumberValue(profileStream.dict, "N");
          if (n === 1) return { kind: "direct", colorSpace: "DeviceGray" };
          if (n === 3) return { kind: "direct", colorSpace: "DeviceRGB" };
          if (n === 4) return { kind: "direct", colorSpace: "DeviceCMYK" };
        }
        return { kind: "direct", colorSpace: "DeviceRGB" };
      }

      if (name === "Indexed" && csObj.items.length >= 4) {
        const baseObj = resolve(page, csObj.items[1]);
        const base =
          baseObj?.type === "name"
            ? parseColorSpaceName(baseObj.value)
            : baseObj?.type === "array" && baseObj.items[0]?.type === "name"
              ? parseColorSpaceName(baseObj.items[0].value)
              : null;

        const hivalObj = resolve(page, csObj.items[2]);
        const hival = hivalObj?.type === "number" && Number.isFinite(hivalObj.value) ? Math.trunc(hivalObj.value) : null;

        const lookupObj = resolve(page, csObj.items[3]);
        const lookup =
          lookupObj?.type === "string"
            ? lookupObj.bytes
            : lookupObj?.type === "stream"
              ? decodePdfStream(lookupObj)
              : null;

        if (base && hival != null && hival >= 0 && lookup) {
          return { kind: "indexed", base, hival, lookup };
        }

        return { kind: "direct", colorSpace: "DeviceRGB" };
      }

      return { kind: "direct", colorSpace: parseColorSpaceName(name) };
    }
  }

  return { kind: "direct", colorSpace: "DeviceRGB" };
}

function getDecodeArray(page: NativePdfPage, dict: PdfDict): readonly number[] | null {
  const decodeObj = resolve(page, dictGet(dict, "Decode"));
  if (!decodeObj || decodeObj.type !== "array") return null;
  const nums = decodeObj.items
    .map((it) => (it?.type === "number" ? it.value : null))
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (nums.length === 0) return null;
  return nums;
}

function unpackIndexedSamples(data: Uint8Array, width: number, height: number, bitsPerComponent: number): Uint8Array {
  const pixelCount = width * height;
  if (bitsPerComponent === 8) {
    if (data.length !== pixelCount) {
      throw new Error(`[PDF Image] Indexed sample length mismatch: expected ${pixelCount}, got ${data.length}`);
    }
    return data;
  }
  if (bitsPerComponent !== 1 && bitsPerComponent !== 2 && bitsPerComponent !== 4) {
    throw new Error(`[PDF Image] Indexed BitsPerComponent must be 1,2,4,8 (got ${bitsPerComponent})`);
  }

  const out = new Uint8Array(pixelCount);
  const samplesPerByte = 8 / bitsPerComponent;
  const mask = (1 << bitsPerComponent) - 1;

  for (let i = 0; i < pixelCount; i += 1) {
    const byteIdx = Math.floor(i / samplesPerByte);
    const bitOffset = (samplesPerByte - 1 - (i % samplesPerByte)) * bitsPerComponent;
    const byte = data[byteIdx] ?? 0;
    out[i] = (byte >> bitOffset) & mask;
  }

  return out;
}

function expandIndexedToRgb(args: {
  readonly samples: Uint8Array;
  readonly bitsPerComponent: number;
  readonly base: PdfColorSpace;
  readonly hival: number;
  readonly lookup: Uint8Array;
  readonly decode?: readonly number[];
}): Uint8Array {
  const { base, hival, lookup, samples, bitsPerComponent, decode } = args;
  const comps = base === "DeviceGray" ? 1 : base === "DeviceRGB" ? 3 : null;
  if (!comps) throw new Error(`[PDF Image] /Indexed base color space not supported: ${base}`);

  const expectedLookupLen = (hival + 1) * comps;
  if (lookup.length < expectedLookupLen) {
    throw new Error(`[PDF Image] /Indexed lookup length mismatch: expected >= ${expectedLookupLen}, got ${lookup.length}`);
  }

  const decodePair = decode && decode.length === 2 ? decode : null;
  const sampleMax = (1 << bitsPerComponent) - 1;
  const out = new Uint8Array(samples.length * 3);

  for (let i = 0; i < samples.length; i += 1) {
    let idx = samples[i] ?? 0;
    if (decodePair) {
      const dmin = decodePair[0] ?? 0;
      const dmax = decodePair[1] ?? hival;
      const v = sampleMax > 0 ? idx / sampleMax : 0;
      idx = Math.round(dmin + v * (dmax - dmin));
    }
    if (idx < 0) idx = 0;
    if (idx > hival) idx = hival;

    const dst = i * 3;
    if (comps === 1) {
      const g = lookup[idx] ?? 0;
      out[dst] = g;
      out[dst + 1] = g;
      out[dst + 2] = g;
    } else {
      const src = idx * 3;
      out[dst] = lookup[src] ?? 0;
      out[dst + 1] = lookup[src + 1] ?? 0;
      out[dst + 2] = lookup[src + 2] ?? 0;
    }
  }

  return out;
}

function expandImageMaskToRgbAlpha(args: {
  readonly decoded: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly invert: boolean;
  readonly fillColor: { readonly colorSpace: string; readonly components: readonly number[] };
}): { readonly rgb: Uint8Array; readonly alpha: Uint8Array } {
  const { decoded, width, height, invert, fillColor } = args;
  const rowBytes = Math.ceil(width / 8);
  const expectedLen = rowBytes * height;
  if (decoded.length !== expectedLen) {
    throw new Error(`[PDF Image] ImageMask length mismatch: expected ${expectedLen} bytes, got ${decoded.length}`);
  }

  const pixelCount = width * height;
  const alpha = new Uint8Array(pixelCount);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const byte = decoded[y * rowBytes + Math.floor(x / 8)] ?? 0;
      const bit = (byte >> (7 - (x % 8))) & 1;
      const sample = invert ? 1 - bit : bit;
      alpha[y * width + x] = sample ? 255 : 0;
    }
  }

  const rgbFill = (() => {
    switch (fillColor.colorSpace) {
      case "DeviceGray":
        return grayToRgb(fillColor.components[0] ?? 0);
      case "DeviceRGB":
        return rgbToRgbBytes(fillColor.components[0] ?? 0, fillColor.components[1] ?? 0, fillColor.components[2] ?? 0);
      case "DeviceCMYK":
        return cmykToRgb(
          fillColor.components[0] ?? 0,
          fillColor.components[1] ?? 0,
          fillColor.components[2] ?? 0,
          fillColor.components[3] ?? 0,
        );
      default:
        return [0, 0, 0] as const;
    }
  })();

  const rgb = new Uint8Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i += 1) {
    const dst = i * 3;
    rgb[dst] = rgbFill[0];
    rgb[dst + 1] = rgbFill[1];
    rgb[dst + 2] = rgbFill[2];
  }

  return { rgb, alpha };
}

function reversePngPredictor(
  data: Uint8Array,
  width: number,
  height: number,
  components: number,
  decodeParms: DecodeParms | null,
): Uint8Array {
  if (!decodeParms) return data;

  const bytesPerPixel = components;
  const rowBytesWithFilter = width * bytesPerPixel + 1;
  const rowBytesOutput = width * bytesPerPixel;

  const expectedLength = height * rowBytesWithFilter;
  if (data.length !== expectedLength) return data;

  const output = new Uint8Array(height * rowBytesOutput);

  for (let y = 0; y < height; y += 1) {
    const filterType = data[y * rowBytesWithFilter] ?? 0;
    const srcRowStart = y * rowBytesWithFilter + 1;
    const dstRowStart = y * rowBytesOutput;

    switch (filterType) {
      case 0: // None
        for (let x = 0; x < rowBytesOutput; x += 1) output[dstRowStart + x] = data[srcRowStart + x] ?? 0;
        break;
      case 1: // Sub
        for (let x = 0; x < rowBytesOutput; x += 1) {
          const raw = data[srcRowStart + x] ?? 0;
          const left = x >= bytesPerPixel ? (output[dstRowStart + x - bytesPerPixel] ?? 0) : 0;
          output[dstRowStart + x] = (raw + left) & 0xff;
        }
        break;
      case 2: // Up
        for (let x = 0; x < rowBytesOutput; x += 1) {
          const raw = data[srcRowStart + x] ?? 0;
          const above = y > 0 ? (output[dstRowStart - rowBytesOutput + x] ?? 0) : 0;
          output[dstRowStart + x] = (raw + above) & 0xff;
        }
        break;
      case 3: // Average
        for (let x = 0; x < rowBytesOutput; x += 1) {
          const raw = data[srcRowStart + x] ?? 0;
          const left = x >= bytesPerPixel ? (output[dstRowStart + x - bytesPerPixel] ?? 0) : 0;
          const above = y > 0 ? (output[dstRowStart - rowBytesOutput + x] ?? 0) : 0;
          output[dstRowStart + x] = (raw + Math.floor((left + above) / 2)) & 0xff;
        }
        break;
      case 4: // Paeth
        for (let x = 0; x < rowBytesOutput; x += 1) {
          const raw = data[srcRowStart + x] ?? 0;
          const left = x >= bytesPerPixel ? (output[dstRowStart + x - bytesPerPixel] ?? 0) : 0;
          const above = y > 0 ? (output[dstRowStart - rowBytesOutput + x] ?? 0) : 0;
          const upperLeft =
            y > 0 && x >= bytesPerPixel ? (output[dstRowStart - rowBytesOutput + x - bytesPerPixel] ?? 0) : 0;
          output[dstRowStart + x] = (raw + paethPredictor(left, above, upperLeft)) & 0xff;
        }
        break;
      default:
        for (let x = 0; x < rowBytesOutput; x += 1) output[dstRowStart + x] = data[srcRowStart + x] ?? 0;
    }
  }

  return output;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export async function extractImagesNative(
  pdfPage: NativePdfPage,
  parsedImages: readonly ParsedImage[],
  options: ImageExtractorOptions,
  xObjectsOverride?: PdfDict,
): Promise<PdfImage[]> {
  const { extractImages = true, maxDimension = 4096, pageHeight: _pageHeight } = options;
  if (!extractImages) return [];

  const xObjects =
    xObjectsOverride ??
    (() => {
      const resources = pdfPage.getResourcesDict();
      if (!resources) return null;
      return resolveDict(pdfPage, dictGet(resources, "XObject"));
    })();
  if (!xObjects) return [];

  const images: PdfImage[] = [];

  for (const parsed of parsedImages) {
    try {
      const cleanName = parsed.name.startsWith("/") ? parsed.name.slice(1) : parsed.name;
      const imageObj = resolve(pdfPage, dictGet(xObjects, cleanName));
      const imageStream = asStream(imageObj);
      if (!imageStream) continue;

      const dict = imageStream.dict;
      const subtype = asName(dictGet(dict, "Subtype"))?.value ?? "";
      if (subtype !== "Image") continue;

      const width = getNumberValue(dict, "Width") ?? 0;
      const height = getNumberValue(dict, "Height") ?? 0;
      if (width === 0 || height === 0) continue;
      if (width > maxDimension || height > maxDimension) continue;

      const imageMask = getBoolValue(dict, "ImageMask") ?? false;
      const bitsPerComponent = imageMask ? 1 : (getNumberValue(dict, "BitsPerComponent") ?? 8);
      const colorSpaceInfo = getColorSpaceInfo(pdfPage, dict);
      const colorSpace = colorSpaceInfo.kind === "indexed" ? "DeviceRGB" : colorSpaceInfo.colorSpace;
      const filters = getFilterNames(pdfPage, dict);
      const decode = getDecodeArray(pdfPage, dict) ?? undefined;
      const alpha = getSoftMaskAlpha8(pdfPage, dict, width, height) ?? undefined;

      let data: Uint8Array;
      if (imageMask) {
        const decoded = decodePdfStream(imageStream);
        const invert = decode?.length === 2 && decode[0] === 1 && decode[1] === 0;
        const out = expandImageMaskToRgbAlpha({
          decoded,
          width,
          height,
          invert,
          fillColor: parsed.graphicsState.fillColor,
        });
        images.push({
          type: "image",
          data: out.rgb,
          alpha: out.alpha,
          width,
          height,
          colorSpace: "DeviceRGB",
          bitsPerComponent: 8,
          graphicsState: parsed.graphicsState,
        });
        continue;
      }
      if (filters.includes("CCITTFaxDecode")) {
        if (bitsPerComponent !== 1) {
          throw new Error(`[PDF Image] /CCITTFaxDecode requires BitsPerComponent=1 (got ${bitsPerComponent})`);
        }
        const ccittIndex = filters.findIndex((f) => f === "CCITTFaxDecode");
        if (ccittIndex !== filters.length - 1) {
          throw new Error(
            `[PDF Image] Unsupported filter chain: filters after /CCITTFaxDecode (${filters.join(", ")})`,
          );
        }
        const pre = ccittIndex > 0 ? filters.slice(0, ccittIndex) : [];
        const preDecoded = pre.length > 0 ? decodeStreamData(imageStream.data, { filters: pre }) : imageStream.data;
        const ccittParms = getCcittDecodeParms(pdfPage, dict, filters, width, height);
        data = decodeCcittFax({ encoded: preDecoded, width, height, parms: ccittParms });
      } else {
        const normalized = filters.map((f) => (f === "DCT" ? "DCTDecode" : f === "JPX" ? "JPXDecode" : f));
        const dctIndex = normalized.indexOf("DCTDecode");
        const jpxIndex = normalized.indexOf("JPXDecode");

        if (jpxIndex >= 0) {
          throw new Error("[PDF Image] /JPXDecode is not supported yet");
        }

        if (dctIndex >= 0) {
          if (dctIndex !== normalized.length - 1) {
            throw new Error(`[PDF Image] Unsupported filter chain with /DCTDecode: ${filters.join(", ")}`);
          }
          const jpegBytes = decodePdfStream(imageStream);
          const rgb = decodeJpegToRgb(jpegBytes, { expectedWidth: width, expectedHeight: height });
          data = rgb.data;
          images.push({
            type: "image",
            data,
            alpha,
            decode,
            width,
            height,
            colorSpace: "DeviceRGB",
            bitsPerComponent: 8,
            graphicsState: parsed.graphicsState,
          });
          continue;
        }

        const decoded = decodePdfStream(imageStream);
        const decodeParms = getDecodeParms(pdfPage, dict);
        const predictorComponents =
          colorSpaceInfo.kind === "indexed" ? 1 : getColorSpaceComponents(colorSpaceInfo.colorSpace);
        data = reversePngPredictor(decoded, width, height, predictorComponents, decodeParms);

        if (colorSpaceInfo.kind === "indexed") {
          const samples = unpackIndexedSamples(data, width, height, bitsPerComponent);
          data = expandIndexedToRgb({
            samples,
            bitsPerComponent,
            base: colorSpaceInfo.base,
            hival: colorSpaceInfo.hival,
            lookup: colorSpaceInfo.lookup,
            decode,
          });
          images.push({
            type: "image",
            data,
            alpha,
            width,
            height,
            colorSpace: "DeviceRGB",
            bitsPerComponent: 8,
            graphicsState: parsed.graphicsState,
          });
          continue;
        }
      }

      images.push({
        type: "image",
        data,
        alpha,
        decode,
        width,
        height,
        colorSpace: colorSpace as PdfColorSpace,
        bitsPerComponent,
        graphicsState: parsed.graphicsState,
      });
    } catch (error) {
      console.warn(`Failed to extract image "${parsed.name}":`, error);
      continue;
    }
  }

  return images;
}
