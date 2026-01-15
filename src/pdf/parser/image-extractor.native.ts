import type { NativePdfPage, PdfArray, PdfBool, PdfDict, PdfName, PdfNumber, PdfObject, PdfRef, PdfStream } from "../native";
import { decodeStreamData } from "../native/filters";
import { decodePdfStream } from "../native/stream";
import type { PdfColorSpace, PdfImage } from "../domain";
import { getColorSpaceComponents } from "../domain";
import type { ParsedImage } from "./operator-parser";
import { decodeCcittFax, type CcittFaxDecodeParms } from "./ccitt-fax-decode";

export type ImageExtractorOptions = {
  readonly extractImages?: boolean;
  readonly maxDimension?: number;
  readonly pageHeight: number;
};

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

function getColorSpace(page: NativePdfPage, dict: PdfDict): PdfColorSpace {
  const csObj = resolve(page, dictGet(dict, "ColorSpace"));
  if (!csObj) return "DeviceRGB";

  if (csObj.type === "name") {
    return parseColorSpaceName(csObj.value);
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
          if (n === 1) return "DeviceGray";
          if (n === 3) return "DeviceRGB";
          if (n === 4) return "DeviceCMYK";
        }
      }
      return parseColorSpaceName(name);
    }
  }

  return "DeviceRGB";
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
): Promise<PdfImage[]> {
  const { extractImages = true, maxDimension = 4096, pageHeight: _pageHeight } = options;
  if (!extractImages) return [];

  const resources = pdfPage.getResourcesDict();
  if (!resources) return [];

  const xObjects = resolveDict(pdfPage, dictGet(resources, "XObject"));
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

      const bitsPerComponent = getNumberValue(dict, "BitsPerComponent") ?? 8;
      const colorSpace = getColorSpace(pdfPage, dict);
      const filters = getFilterNames(pdfPage, dict);

      let data: Uint8Array;
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
        const decoded = decodePdfStream(imageStream);
        const decodeParms = getDecodeParms(pdfPage, dict);
        const components = getColorSpaceComponents(colorSpace);
        data = reversePngPredictor(decoded, width, height, components, decodeParms);
      }

      images.push({
        type: "image",
        data,
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
