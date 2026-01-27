/**
 * @file src/pdf/parser/image-extractor.native.ts
 */

import type { NativePdfPage, PdfArray, PdfBool, PdfDict, PdfName, PdfNumber, PdfObject, PdfStream } from "../../native";
import { decodeStreamData } from "../../native/filters";
import { decodePdfStream } from "../../native/stream/stream";
import type { PdfColorSpace, PdfGraphicsState, PdfImage } from "../../domain";
import { clamp01, getColorSpaceComponents } from "../../domain";
import { cmykToRgb, grayToRgb, rgbToRgbBytes } from "../../domain/color";
import type { ParsedImage } from "../core/operator-parser";
import { decodeCcittFax, type CcittFaxDecodeParms } from "./ccitt-fax-decode";
import { decodeJpegToRgb } from "./jpeg-decode";
import {
  evalIccCurve,
  evalIccLutToPcs01,
  makeBradfordAdaptationMatrix,
  parseIccProfile,
  type ParsedIccProfile,
} from "../color/icc-profile.native";
import { downsampleJpxTo8Bit, type JpxDecodeFn } from "../jpeg2000/jpx-decoder";

export type ImageExtractorOptions = {
  readonly extractImages?: boolean;
  readonly maxDimension?: number;
  readonly pageHeight: number;
  readonly jpxDecode?: JpxDecodeFn;
};

export function decodeImageXObjectStreamNative(
  pdfPage: NativePdfPage,
  imageStream: PdfStream,
  graphicsState: PdfGraphicsState,
  options: Readonly<Pick<ImageExtractorOptions, "maxDimension" | "jpxDecode">> = {},
): PdfImage | null {
  const maxDimension = options.maxDimension ?? 4096;

  const dict = imageStream.dict;
  const subtype = asName(dictGet(dict, "Subtype"))?.value ?? "";
  if (subtype !== "Image") {return null;}

  const width = getNumberValue(dict, "Width") ?? 0;
  const height = getNumberValue(dict, "Height") ?? 0;
  if (width === 0 || height === 0) {return null;}
  if (width > maxDimension || height > maxDimension) {return null;}

  const imageMask = getBoolValue(dict, "ImageMask") ?? false;
  const bitsPerComponent = imageMask ? 1 : (getNumberValue(dict, "BitsPerComponent") ?? 8);
  const colorSpaceInfo = getColorSpaceInfo(pdfPage, dict);
  const colorSpace = colorSpaceInfo.kind === "direct" ? colorSpaceInfo.colorSpace : "DeviceRGB";
  const filters = getFilterNames(pdfPage, dict);
  const decode = getDecodeArray(pdfPage, dict) ?? undefined;
  const softMaskInfo = getSoftMaskInfo(pdfPage, dict, width, height, { jpxDecode: options.jpxDecode });
  const alpha = softMaskInfo?.alpha ?? undefined;
  const softMaskMatte = softMaskInfo?.matte ?? undefined;
  const maskEntry = getMaskEntry(pdfPage, dict);

  const dataState: { data: Uint8Array | null } = { data: null };

  if (imageMask) {
    const decoded = decodePdfStream(imageStream);
    const invert = decode?.length === 2 && decode[0] === 1 && decode[1] === 0;
    const out = expandImageMaskToRgbAlpha({
      decoded,
      width,
      height,
      invert,
      fillColor: graphicsState.fillColor,
    });
    const combinedAlpha = alpha ? combineAlpha(out.alpha, alpha) : out.alpha;
    return {
      type: "image",
      data: out.rgb,
      alpha: combinedAlpha,
      softMaskMatte,
      width,
      height,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      graphicsState,
    };
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
    dataState.data = decodeCcittFax({ encoded: preDecoded, width, height, parms: ccittParms });
  } else {
    const normalized = filters.map((f) => (f === "DCT" ? "DCTDecode" : f === "JPX" ? "JPXDecode" : f));
    const dctIndex = normalized.indexOf("DCTDecode");
    const jpxIndex = normalized.indexOf("JPXDecode");

    if (jpxIndex >= 0) {
      if (jpxIndex !== normalized.length - 1) {
        throw new Error(`[PDF Image] Unsupported filter chain with /JPXDecode: ${filters.join(", ")}`);
      }
      const decoder = options.jpxDecode;
      if (!decoder) {
        throw new Error("[PDF Image] /JPXDecode requires options.jpxDecode");
      }
      const jpxBytes = decodePdfStream(imageStream);
      const decodedJpx = decoder(jpxBytes, { expectedWidth: width, expectedHeight: height });
      if (decodedJpx.width !== width || decodedJpx.height !== height) {
        throw new Error(
          `[PDF Image] /JPXDecode size mismatch: expected ${width}x${height}, got ${decodedJpx.width}x${decodedJpx.height}`,
        );
      }
      const down = downsampleJpxTo8Bit(decodedJpx);

      const components = decodedJpx.components;
      const expectedLen = width * height * components;
      if (down.data.length !== expectedLen) {
        throw new Error(`[PDF Image] /JPXDecode length mismatch: expected ${expectedLen}, got ${down.data.length}`);
      }

      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyColorKeyMask({
            data: down.data,
            width,
            height,
            components,
            bitsPerComponent: 8,
            ranges: maskEntry.ranges,
          }),
        );
      }

      const jpxColorSpace = components === 1 ? "DeviceGray" : components === 3 ? "DeviceRGB" : "DeviceCMYK";

      return {
        type: "image",
        data: down.data,
        alpha: combinedAlpha.value,
        decode,
        softMaskMatte,
        width,
        height,
        colorSpace: jpxColorSpace,
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    if (dctIndex >= 0) {
      if (dctIndex !== normalized.length - 1) {
        throw new Error(`[PDF Image] Unsupported filter chain with /DCTDecode: ${filters.join(", ")}`);
      }
      const jpegBytes = decodePdfStream(imageStream);
      const rgb = decodeJpegToRgb(jpegBytes, { expectedWidth: width, expectedHeight: height });
      const data = rgb.data;
      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyColorKeyMask({ data, width, height, components: 3, bitsPerComponent: 8, ranges: maskEntry.ranges }),
        );
      }
      return {
        type: "image",
        data,
        alpha: combinedAlpha.value,
        decode,
        softMaskMatte,
        width,
        height,
        colorSpace: "DeviceRGB",
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    const decoded = decodePdfStream(imageStream);
    const decodeParms = getDecodeParms(pdfPage, dict);
    const predictorComponents = getPredictorComponents(colorSpaceInfo);
    const data = reversePngPredictor(decoded, width, height, predictorComponents, decodeParms);

    if (colorSpaceInfo.kind === "indexed") {
      const samples = unpackIndexedSamples(data, width, height, bitsPerComponent);
      const expanded = expandIndexedToRgb({
        samples,
        bitsPerComponent,
        base: colorSpaceInfo.base,
        hival: colorSpaceInfo.hival,
        lookup: colorSpaceInfo.lookup,
        decode,
      });
      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyIndexedColorKeyMask({ packedIndices: data, width, height, bitsPerComponent, ranges: maskEntry.ranges, decode }),
        );
      }
      return {
        type: "image",
        data: expanded,
        alpha: combinedAlpha.value,
        softMaskMatte,
        width,
        height,
        colorSpace: "DeviceRGB",
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    if (colorSpaceInfo.kind === "tint") {
      const expanded = expandTintImageToRgb({
        data,
        width,
        height,
        components: colorSpaceInfo.components,
        bitsPerComponent,
        decode,
      });

      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyColorKeyMask({
            data,
            width,
            height,
            components: colorSpaceInfo.components,
            bitsPerComponent,
            ranges: maskEntry.ranges,
          }),
        );
      }

      return {
        type: "image",
        data: expanded,
        alpha: combinedAlpha.value,
        softMaskMatte,
        width,
        height,
        colorSpace: "DeviceRGB",
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    if (colorSpaceInfo.kind === "lab") {
      const expanded = labToRgbBytes({
        data,
        width,
        height,
        bitsPerComponent,
        decode,
        whitePoint: colorSpaceInfo.whitePoint,
        range: colorSpaceInfo.range,
      });

      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyColorKeyMask({ data, width, height, components: 3, bitsPerComponent, ranges: maskEntry.ranges }),
        );
      }

      return {
        type: "image",
        data: expanded,
        alpha: combinedAlpha.value,
        softMaskMatte,
        width,
        height,
        colorSpace: "DeviceRGB",
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    if (colorSpaceInfo.kind === "calGray") {
      const expanded = calGrayToRgbBytes({
        data,
        width,
        height,
        bitsPerComponent,
        decode,
        whitePoint: colorSpaceInfo.whitePoint,
        gamma: colorSpaceInfo.gamma,
      });

      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyColorKeyMask({ data, width, height, components: 1, bitsPerComponent, ranges: maskEntry.ranges }),
        );
      }

      return {
        type: "image",
        data: expanded,
        alpha: combinedAlpha.value,
        softMaskMatte,
        width,
        height,
        colorSpace: "DeviceRGB",
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    if (colorSpaceInfo.kind === "calRgb") {
      const expanded = calRgbToRgbBytes({
        data,
        width,
        height,
        bitsPerComponent,
        decode,
        gamma: colorSpaceInfo.gamma,
        matrix: colorSpaceInfo.matrix,
      });

      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyColorKeyMask({ data, width, height, components: 3, bitsPerComponent, ranges: maskEntry.ranges }),
        );
      }

      return {
        type: "image",
        data: expanded,
        alpha: combinedAlpha.value,
        softMaskMatte,
        width,
        height,
        colorSpace: "DeviceRGB",
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    if (colorSpaceInfo.kind === "iccBased") {
      const expanded = iccBasedToRgbBytes({
        data,
        width,
        height,
        bitsPerComponent,
        decode,
        profile: colorSpaceInfo.profile,
      });

      const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
      if (maskEntry.kind === "explicit") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
        );
      } else if (maskEntry.kind === "colorKey") {
        combinedAlpha.value = combineAlpha(
          combinedAlpha.value,
          applyColorKeyMask({
            data,
            width,
            height,
            components: colorSpaceInfo.components,
            bitsPerComponent,
            ranges: maskEntry.ranges,
          }),
        );
      }

      return {
        type: "image",
        data: expanded,
        alpha: combinedAlpha.value,
        softMaskMatte,
        width,
        height,
        colorSpace: "DeviceRGB",
        bitsPerComponent: 8,
        graphicsState,
      };
    }

    dataState.data = data;
  }

  const data = dataState.data;
  if (!data) {
    throw new Error("[PDF Image] Internal error: image data was not produced");
  }

  const combinedAlpha: { value: Uint8Array | undefined } = { value: alpha };
  if (maskEntry.kind === "explicit") {
    combinedAlpha.value = combineAlpha(
      combinedAlpha.value,
      decodeExplicitMaskAlpha8(pdfPage, maskEntry.stream, width, height),
    );
  } else if (maskEntry.kind === "colorKey" && colorSpaceInfo.kind === "direct") {
    const components = getColorSpaceComponents(colorSpaceInfo.colorSpace);
    if (components > 0) {
      combinedAlpha.value = combineAlpha(
        combinedAlpha.value,
        applyColorKeyMask({ data, width, height, components, bitsPerComponent, ranges: maskEntry.ranges }),
      );
    }
  }

  return {
    type: "image",
    data,
    alpha: combinedAlpha.value,
    decode,
    softMaskMatte,
    width,
    height,
    colorSpace: colorSpace as PdfColorSpace,
    bitsPerComponent,
    graphicsState,
  };
}

function decodeMaskSamplesToAlpha8(
  data: Uint8Array,
  width: number,
  height: number,
  bitsPerComponent: number,
): Uint8Array {
  const pixelCount = width * height;

  switch (bitsPerComponent) {
    case 8: {
      if (data.length === pixelCount) {return data;}
      // Some producers may encode the soft mask as RGB; treat the first component as alpha.
      if (data.length === pixelCount * 3) {
        const alpha = new Uint8Array(pixelCount);
        for (let i = 0; i < pixelCount; i += 1) {alpha[i] = data[i * 3] ?? 0;}
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
      for (let i = 0; i < pixelCount; i += 1) {alpha[i] = data[i * 2] ?? 0;}
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
  if (!filterObj) {return [];}
  if (filterObj.type === "name") {return [filterObj.value];}
  if (filterObj.type === "array") {
    const out: string[] = [];
    for (const item of filterObj.items) {
      const name = item.type === "name" ? item.value : null;
      if (name) {out.push(name);}
    }
    return out;
  }
  return [];
}

function shouldInvertSoftMaskDecode(page: NativePdfPage, dict: PdfDict): boolean {
  const decodeObj = resolve(page, dictGet(dict, "Decode"));
  const decode = asArray(decodeObj);
  if (!decode || decode.items.length < 2) {return false;}
  const a = decode.items[0]?.type === "number" ? decode.items[0].value : null;
  const b = decode.items[1]?.type === "number" ? decode.items[1].value : null;
  if (a === null || b === null) {return false;}
  return a === 1 && b === 0;
}

function decodeCcittFaxStreamToPacked1bpp(
  page: NativePdfPage,
  stream: PdfStream,
  width: number,
  height: number,
): Uint8Array {
  const dict = stream.dict;
  const filters = getFilterNames(page, dict);
  if (!filters.includes("CCITTFaxDecode")) {
    throw new Error("[PDF Image] decodeCcittFaxStreamToPacked1bpp called without /CCITTFaxDecode");
  }

  const ccittIndex = filters.findIndex((f) => f === "CCITTFaxDecode");
  if (ccittIndex !== filters.length - 1) {
    throw new Error(
      `[PDF Image] Unsupported filter chain: filters after /CCITTFaxDecode (${filters.join(", ")})`,
    );
  }

  const pre = ccittIndex > 0 ? filters.slice(0, ccittIndex) : [];
  const preDecoded = pre.length > 0 ? decodeStreamData(stream.data, { filters: pre }) : stream.data;
  const ccittParms = getCcittDecodeParms(page, dict, filters, width, height);
  return decodeCcittFax({ encoded: preDecoded, width, height, parms: ccittParms });
}

type SoftMaskInfo = Readonly<{
  readonly alpha: Uint8Array;
  readonly matte?: readonly number[];
}>;

function extractNumberArray(page: NativePdfPage, arr: PdfArray): readonly number[] {
  const out: number[] = [];
  for (const item of arr.items) {
    const resolved = resolve(page, item);
    if (resolved?.type === "number" && Number.isFinite(resolved.value)) {
      out.push(resolved.value);
    }
  }
  return out;
}

function getSoftMaskInfo(
  page: NativePdfPage,
  imageDict: PdfDict,
  width: number,
  height: number,
  options: Readonly<{ readonly jpxDecode?: JpxDecodeFn }>,
): SoftMaskInfo | null {
  try {
    const smaskObj = resolve(page, dictGet(imageDict, "SMask"));
    const smaskStream = asStream(smaskObj);
    if (!smaskStream) {return null;}

    const smaskDict = smaskStream.dict;
    const subtype = asName(dictGet(smaskDict, "Subtype"))?.value ?? "";
    if (subtype.length > 0 && subtype !== "Image") {return null;}

    const matteObj = resolve(page, dictGet(smaskDict, "Matte"));
    const matteArray = asArray(matteObj);
    const matte = matteArray ? extractNumberArray(page, matteArray) : null;

    const mw = getNumberValue(smaskDict, "Width") ?? 0;
    const mh = getNumberValue(smaskDict, "Height") ?? 0;
    if (mw !== width || mh !== height) {
      throw new Error(`[PDF Image] Soft mask dimensions mismatch: image=${width}x${height}, smask=${mw}x${mh}`);
    }

    const bitsPerComponent = getNumberValue(smaskDict, "BitsPerComponent") ?? 8;
    const filters = getFilterNames(page, smaskDict);

    if (filters.includes("CCITTFaxDecode")) {
      if (bitsPerComponent !== 1) {
        throw new Error(`[PDF Image] Soft mask /CCITTFaxDecode requires BitsPerComponent=1 (got ${bitsPerComponent})`);
      }
      const packed = decodeCcittFaxStreamToPacked1bpp(page, smaskStream, mw, mh);
      const alpha = decodeMaskSamplesToAlpha8(packed, mw, mh, bitsPerComponent);
      if (shouldInvertSoftMaskDecode(page, smaskDict)) {
        for (let i = 0; i < alpha.length; i += 1) {alpha[i] = 255 - (alpha[i] ?? 0);}
      }
      return { alpha, matte: matte && matte.length > 0 ? matte : undefined };
    }

    const normalized = filters.map((f) => (f === "DCT" ? "DCTDecode" : f === "JPX" ? "JPXDecode" : f));
    if (normalized.includes("JPXDecode")) {
      const decoder = options.jpxDecode;
      if (!decoder) {
        throw new Error("[PDF Image] Soft mask with /JPXDecode requires options.jpxDecode");
      }
      const jpxBytes = decodePdfStream(smaskStream);
      const decoded = decoder(jpxBytes, { expectedWidth: mw, expectedHeight: mh });
      if (decoded.width !== mw || decoded.height !== mh) {
        throw new Error(`[PDF Image] Soft mask /JPXDecode size mismatch: expected ${mw}x${mh}, got ${decoded.width}x${decoded.height}`);
      }
      const down = downsampleJpxTo8Bit(decoded);
      const comps = decoded.components;
      const alpha = new Uint8Array(mw * mh);
      if (comps === 1) {
        if (down.data.length !== mw * mh) {
          throw new Error(`[PDF Image] Soft mask /JPXDecode length mismatch: expected ${mw * mh}, got ${down.data.length}`);
        }
        alpha.set(down.data);
      } else {
        const expected = mw * mh * comps;
        if (down.data.length !== expected) {
          throw new Error(`[PDF Image] Soft mask /JPXDecode length mismatch: expected ${expected}, got ${down.data.length}`);
        }
        for (let i = 0; i < mw * mh; i += 1) {
          alpha[i] = down.data[i * comps] ?? 0;
        }
      }
      if (shouldInvertSoftMaskDecode(page, smaskDict)) {
        for (let i = 0; i < alpha.length; i += 1) {alpha[i] = 255 - (alpha[i] ?? 0);}
      }
      return { alpha, matte: matte && matte.length > 0 ? matte : undefined };
    }

    const dctIndex = normalized.indexOf("DCTDecode");
    if (dctIndex >= 0) {
      if (dctIndex !== normalized.length - 1) {
        throw new Error(`[PDF Image] Unsupported soft mask filter chain with /DCTDecode: ${filters.join(", ")}`);
      }
      const jpegBytes = decodePdfStream(smaskStream);
      const rgb = decodeJpegToRgb(jpegBytes, { expectedWidth: mw, expectedHeight: mh });
      const alpha = new Uint8Array(mw * mh);
      for (let i = 0; i < mw * mh; i += 1) {alpha[i] = rgb.data[i * 3] ?? 0;}
      return { alpha, matte: matte && matte.length > 0 ? matte : undefined };
    }

    const decoded = decodePdfStream(smaskStream);
    const alpha = decodeMaskSamplesToAlpha8(decoded, mw, mh, bitsPerComponent);
    if (shouldInvertSoftMaskDecode(page, smaskDict)) {
      for (let i = 0; i < alpha.length; i += 1) {alpha[i] = 255 - (alpha[i] ?? 0);}
    }
    return { alpha, matte: matte && matte.length > 0 ? matte : undefined };
  } catch (error) {
    console.warn("Failed to decode /SMask:", error);
    return null;
  }
}

type MaskEntry =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "colorKey"; ranges: readonly number[] }>
  | Readonly<{ kind: "explicit"; stream: PdfStream }>;

function getMaskEntry(page: NativePdfPage, imageDict: PdfDict): MaskEntry {
  const maskObj = resolve(page, dictGet(imageDict, "Mask"));
  if (!maskObj) {return { kind: "none" };}
  if (maskObj.type === "array") {
    const ranges: number[] = [];
    for (const item of maskObj.items) {
      const v = resolve(page, item);
      if (v?.type === "number" && Number.isFinite(v.value)) {ranges.push(Math.trunc(v.value));}
    }
    return ranges.length > 0 ? { kind: "colorKey", ranges } : { kind: "none" };
  }
  if (maskObj.type === "stream") {
    return { kind: "explicit", stream: maskObj };
  }
  return { kind: "none" };
}

function unpackSample(
  data: Uint8Array,
  sampleIndex: number,
  bitsPerComponent: number,
): number {
  if (bitsPerComponent === 8) {return data[sampleIndex] ?? 0;}
  if (bitsPerComponent === 16) {
    const i = sampleIndex * 2;
    return (((data[i] ?? 0) << 8) | (data[i + 1] ?? 0)) >>> 0;
  }
  if (bitsPerComponent === 1 || bitsPerComponent === 2 || bitsPerComponent === 4) {
    const samplesPerByte = 8 / bitsPerComponent;
    const mask = (1 << bitsPerComponent) - 1;
    const byteIdx = Math.floor(sampleIndex / samplesPerByte);
    const bitOffset = (samplesPerByte - 1 - (sampleIndex % samplesPerByte)) * bitsPerComponent;
    const byte = data[byteIdx] ?? 0;
    return (byte >> bitOffset) & mask;
  }
  throw new Error(`[PDF Image] Unsupported BitsPerComponent=${bitsPerComponent} for mask processing`);
}

function applyColorKeyMask(args: {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly components: number;
  readonly bitsPerComponent: number;
  readonly ranges: readonly number[];
}): Uint8Array {
  const { data, width, height, components, bitsPerComponent, ranges } = args;
  if (components <= 0) {throw new Error("[PDF Image] Color key mask requires components > 0");}
  if (ranges.length !== components * 2) {
    throw new Error(`[PDF Image] /Mask color key length mismatch: expected ${components * 2}, got ${ranges.length}`);
  }

  const pixelCount = width * height;
  const alpha = new Uint8Array(pixelCount);

  pixelLoop: for (let p = 0; p < pixelCount; p += 1) {
    for (let c = 0; c < components; c += 1) {
      const sampleIndex = p * components + c;
      const v = unpackSample(data, sampleIndex, bitsPerComponent);
      const min = ranges[c * 2] ?? 0;
      const max = ranges[c * 2 + 1] ?? 0;
      if (v < min || v > max) {
        alpha[p] = 255;
        continue pixelLoop;
      }
    }
    alpha[p] = 0;
  }

  return alpha;
}

function applyIndexedColorKeyMask(args: {
  readonly packedIndices: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly bitsPerComponent: number;
  readonly ranges: readonly number[];
  readonly decode?: readonly number[];
}): Uint8Array {
  const { packedIndices, width, height, bitsPerComponent, ranges, decode } = args;
  if (ranges.length !== 2) {
    throw new Error(`[PDF Image] /Indexed /Mask color key length mismatch: expected 2, got ${ranges.length}`);
  }
  const min = ranges[0] ?? 0;
  const max = ranges[1] ?? 0;

  const decodePair = getOptionalDecodePair(decode);
  const sampleMax = (1 << bitsPerComponent) - 1;

  const pixelCount = width * height;
  const alpha = new Uint8Array(pixelCount);
  for (let p = 0; p < pixelCount; p += 1) {
    const raw = unpackSample(packedIndices, p, bitsPerComponent);
    const decoded = (() => {
      if (!decodePair) {return raw;}
      const v = sampleMax > 0 ? raw / sampleMax : 0;
      return Math.round(decodePair[0] + v * (decodePair[1] - decodePair[0]));
    })();
    alpha[p] = decoded >= min && decoded <= max ? 0 : 255;
  }

  return alpha;
}

function getOptionalDecodePair(decode: readonly number[] | undefined): readonly [number, number] | null {
  if (!decode || decode.length !== 2) {return null;}
  const d0 = decode[0];
  const d1 = decode[1];
  if (!Number.isFinite(d0) || !Number.isFinite(d1)) {return null;}
  return [d0, d1];
}

function decodeExplicitMaskAlpha8(page: NativePdfPage, maskStream: PdfStream, width: number, height: number): Uint8Array {
  const dict = maskStream.dict;
  const subtype = asName(dictGet(dict, "Subtype"))?.value ?? "";
  if (subtype.length > 0 && subtype !== "Image") {
    throw new Error(`[PDF Image] Unsupported explicit /Mask subtype: ${subtype}`);
  }

  const mw = getNumberValue(dict, "Width") ?? 0;
  const mh = getNumberValue(dict, "Height") ?? 0;
  if (mw !== width || mh !== height) {
    throw new Error(`[PDF Image] Explicit mask dimensions mismatch: image=${width}x${height}, mask=${mw}x${mh}`);
  }

  const imageMask = getBoolValue(dict, "ImageMask") ?? false;
  const bpc = imageMask ? 1 : (getNumberValue(dict, "BitsPerComponent") ?? 1);
  if (bpc !== 1) {
    throw new Error(`[PDF Image] Explicit /Mask must be 1bpp (got BitsPerComponent=${bpc})`);
  }

  const filters = getFilterNames(page, dict);
  const decoded = decodeExplicitMaskStreamToPacked1bpp(page, maskStream, filters, width, height);
  const rowBytes = Math.ceil(width / 8);
  const expectedLen = rowBytes * height;
  if (decoded.length !== expectedLen) {
    throw new Error(`[PDF Image] Explicit mask data length mismatch: expected ${expectedLen}, got ${decoded.length}`);
  }

  const invert = shouldInvertSoftMaskDecode(page, dict);
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
  return alpha;
}

function decodeExplicitMaskStreamToPacked1bpp(
  page: NativePdfPage,
  maskStream: PdfStream,
  filters: readonly string[],
  width: number,
  height: number,
): Uint8Array {
  if (filters.includes("CCITTFaxDecode")) {
    return decodeCcittFaxStreamToPacked1bpp(page, maskStream, width, height);
  }
  return decodePdfStream(maskStream);
}

function combineAlpha(base: Uint8Array | undefined, extra: Uint8Array): Uint8Array {
  if (!base) {return extra;}
  if (base.length !== extra.length) {
    throw new Error(`[PDF Image] Alpha length mismatch: base=${base.length}, extra=${extra.length}`);
  }
  const out = new Uint8Array(base.length);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Math.round(((base[i] ?? 255) * (extra[i] ?? 255)) / 255);
  }
  return out;
}

type DecodeParms = {
  readonly predictor: number;
  readonly columns: number;
  readonly colors: number;
};

function getDecodeParms(page: NativePdfPage, dict: PdfDict): DecodeParms | null {
  const parmsObj = resolve(page, dictGet(dict, "DecodeParms"));
  const parms = asDict(parmsObj);
  if (!parms) {return null;}

  const predictor = getNumberValue(parms, "Predictor") ?? 1;
  if (predictor < 10 || predictor > 15) {return null;}

  return {
    predictor,
    columns: getNumberValue(parms, "Columns") ?? 1,
    colors: getNumberValue(parms, "Colors") ?? 1,
  };
}

function getPredictorComponents(colorSpaceInfo: ColorSpaceInfo): number {
  if (colorSpaceInfo.kind === "indexed") {return 1;}
  if (colorSpaceInfo.kind === "tint") {return colorSpaceInfo.components;}
  if (colorSpaceInfo.kind === "lab") {return 3;}
  if (colorSpaceInfo.kind === "calRgb") {return 3;}
  if (colorSpaceInfo.kind === "calGray") {return 1;}
  if (colorSpaceInfo.kind === "iccBased") {return colorSpaceInfo.components;}
  if (colorSpaceInfo.kind === "direct") {return getColorSpaceComponents(colorSpaceInfo.colorSpace);}
  return 3;
}

function applyMat3ToXyz(m: readonly number[], v: readonly [number, number, number]): readonly [number, number, number] {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  return [
    (m[0] ?? 0) * x + (m[1] ?? 0) * y + (m[2] ?? 0) * z,
    (m[3] ?? 0) * x + (m[4] ?? 0) * y + (m[5] ?? 0) * z,
    (m[6] ?? 0) * x + (m[7] ?? 0) * y + (m[8] ?? 0) * z,
  ] as const;
}

function iccBasedToRgbBytes(args: {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly bitsPerComponent: number;
  readonly decode?: readonly number[];
  readonly profile: ParsedIccProfile;
}): Uint8Array {
  const { data, width, height, bitsPerComponent, decode, profile } = args;
  const pixelCount = width * height;
  const rgb = new Uint8Array(pixelCount * 3);

  const max = bitsPerComponent === 16 ? 65535 : (1 << bitsPerComponent) - 1;
  const D65: readonly [number, number, number] = [0.9505, 1, 1.089];
  const adapt = makeBradfordAdaptationMatrix({ srcWhitePoint: profile.whitePoint, dstWhitePoint: D65 });

  if (profile.kind === "gray") {
    const decodePair = getOptionalDecodePair(decode);
    for (let p = 0; p < pixelCount; p += 1) {
      const raw = unpackSample(data, p, bitsPerComponent);
      const v01 = max > 0 ? raw / max : 0;
      const decoded = applyDecodeToNormalizedSample(v01, decodePair);
      const linear = evalIccCurve(profile.kTRC, decoded);

      const xyz = applyMat3ToXyz(adapt, [
        (profile.whitePoint[0] ?? 0) * linear,
        (profile.whitePoint[1] ?? 0) * linear,
        (profile.whitePoint[2] ?? 0) * linear,
      ]);
      const [r, g, b] = xyzToSrgbBytes(xyz[0], xyz[1], xyz[2]);
      const off = p * 3;
      rgb[off] = r;
      rgb[off + 1] = g;
      rgb[off + 2] = b;
    }
    return rgb;
  }

  if (profile.kind === "lut") {
    const decodePairs = getDecodePairsN(decode, profile.a2b0.inChannels);

    const labToXyzD50 = (Lstar: number, astar: number, bstar: number): readonly [number, number, number] => {
      const delta = 6 / 29;
      const finv = (t: number): number => {
        if (t > delta) {return t * t * t;}
        return 3 * delta * delta * (t - 4 / 29);
      };
      const fy = (Lstar + 16) / 116;
      const fx = fy + astar / 500;
      const fz = fy - bstar / 200;
      const D50: readonly [number, number, number] = [0.9642, 1, 0.8249];
      return [D50[0] * finv(fx), D50[1] * finv(fy), D50[2] * finv(fz)] as const;
    };

    const D50: readonly [number, number, number] = [0.9642, 1, 0.8249];
    const adaptD50ToD65 = makeBradfordAdaptationMatrix({ srcWhitePoint: D50, dstWhitePoint: D65 });

    for (let p = 0; p < pixelCount; p += 1) {
      const comps: number[] = [];
      for (let c = 0; c < profile.a2b0.inChannels; c += 1) {
        const raw = unpackSample(data, p * profile.a2b0.inChannels + c, bitsPerComponent);
        const v01 = max > 0 ? raw / max : 0;
        const decoded = applyDecodeToNormalizedSample(v01, decodePairs ? decodePairs[c] ?? null : null);
        comps.push(decoded);
      }

      const pcs01 = evalIccLutToPcs01(profile, comps);
      if (!pcs01) {continue;}

      const xyz = (() => {
        if (profile.pcs === "XYZ ") {
          return pcs01;
        }
        const Lstar = clamp01OrZero(pcs01[0]) * 100;
        const astar = clamp01OrZero(pcs01[1]) * 255 - 128;
        const bstar = clamp01OrZero(pcs01[2]) * 255 - 128;
        return labToXyzD50(Lstar, astar, bstar);
      })();

      const xyzD65 = profile.pcs === "Lab " ? applyMat3ToXyz(adaptD50ToD65, xyz) : applyMat3ToXyz(adapt, xyz);
      const [r, g, b] = xyzToSrgbBytes(xyzD65[0], xyzD65[1], xyzD65[2]);
      const off = p * 3;
      rgb[off] = r;
      rgb[off + 1] = g;
      rgb[off + 2] = b;
    }

    return rgb;
  }

  const decodePairs = getDecodePairs3(decode);
  for (let p = 0; p < pixelCount; p += 1) {
    const rraw = unpackSample(data, p * 3 + 0, bitsPerComponent);
    const graw = unpackSample(data, p * 3 + 1, bitsPerComponent);
    const braw = unpackSample(data, p * 3 + 2, bitsPerComponent);

    const r01 = max > 0 ? rraw / max : 0;
    const g01 = max > 0 ? graw / max : 0;
    const b01 = max > 0 ? braw / max : 0;

    const R = evalIccCurve(profile.rTRC, applyDecodeToNormalizedSample(r01, decodePairs ? decodePairs[0] ?? null : null));
    const G = evalIccCurve(profile.gTRC, applyDecodeToNormalizedSample(g01, decodePairs ? decodePairs[1] ?? null : null));
    const B = evalIccCurve(profile.bTRC, applyDecodeToNormalizedSample(b01, decodePairs ? decodePairs[2] ?? null : null));

    const X = (profile.rXYZ[0] ?? 0) * R + (profile.gXYZ[0] ?? 0) * G + (profile.bXYZ[0] ?? 0) * B;
    const Y = (profile.rXYZ[1] ?? 0) * R + (profile.gXYZ[1] ?? 0) * G + (profile.bXYZ[1] ?? 0) * B;
    const Z = (profile.rXYZ[2] ?? 0) * R + (profile.gXYZ[2] ?? 0) * G + (profile.bXYZ[2] ?? 0) * B;

    const xyz = applyMat3ToXyz(adapt, [X, Y, Z]);
    const [r, g, b] = xyzToSrgbBytes(xyz[0], xyz[1], xyz[2]);
    const off = p * 3;
    rgb[off] = r;
    rgb[off + 1] = g;
    rgb[off + 2] = b;
  }

  return rgb;
}

function getCcittDecodeParms(
  page: NativePdfPage,
  dict: PdfDict,
  filters: readonly string[],
  width: number,
  height: number,
): CcittFaxDecodeParms {
  const index = filters.findIndex((f) => f === "CCITTFaxDecode");
  if (index < 0) {throw new Error("getCcittDecodeParms: missing /CCITTFaxDecode filter");}

  const decodeParmsObj = resolve(page, dictGet(dict, "DecodeParms"));
  const ccittDict = (() => {
    if (!decodeParmsObj) {return null;}
    if (decodeParmsObj.type === "dict") {return decodeParmsObj;}
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
  | Readonly<{ kind: "indexed"; base: PdfColorSpace; hival: number; lookup: Uint8Array }>
  | Readonly<{ kind: "tint"; components: number }>
  | Readonly<{ kind: "lab"; whitePoint: readonly [number, number, number]; range: readonly [number, number, number, number] }>
  | Readonly<{ kind: "calGray"; whitePoint: readonly [number, number, number]; gamma: number }>
  | Readonly<{ kind: "calRgb"; whitePoint: readonly [number, number, number]; gamma: readonly [number, number, number]; matrix: readonly number[] }>
  | Readonly<{ kind: "iccBased"; components: 1 | 3 | 4; profile: ParsedIccProfile }>;

function getColorSpaceInfo(page: NativePdfPage, dict: PdfDict): ColorSpaceInfo {
  const csObj = resolve(page, dictGet(dict, "ColorSpace"));
  if (!csObj) {return { kind: "direct", colorSpace: "DeviceRGB" };}

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
          if (n === 1 || n === 3 || n === 4) {
            const bytes = (() => {
              try {
                return decodePdfStream(profileStream);
              } catch {
                return null;
              }
            })();
            const parsed = bytes ? parseIccProfile(bytes) : null;
            if (
              parsed &&
              ((n === 1 && parsed.kind === "gray") ||
                (n === 3 && parsed.kind === "rgb") ||
                (n === 4 && parsed.kind === "lut" && parsed.a2b0.inChannels === 4 && parsed.a2b0.outChannels === 3))
            ) {
              return { kind: "iccBased", components: n as 1 | 3 | 4, profile: parsed };
            }
          }
          if (n === 1) {return { kind: "direct", colorSpace: "DeviceGray" };}
          if (n === 3) {return { kind: "direct", colorSpace: "DeviceRGB" };}
          if (n === 4) {return { kind: "direct", colorSpace: "DeviceCMYK" };}
          if (n && n > 0) {return { kind: "tint", components: Math.trunc(n) };}
        }
        return { kind: "direct", colorSpace: "DeviceRGB" };
      }

      if (name === "Indexed" && csObj.items.length >= 4) {
        const base = extractIndexedBaseColorSpace(page, csObj.items[1]);

        const hivalObj = resolve(page, csObj.items[2]);
        const hival = hivalObj?.type === "number" && Number.isFinite(hivalObj.value) ? Math.trunc(hivalObj.value) : null;

        const lookup = extractIndexedLookupBytes(page, csObj.items[3]);

        if (base && hival != null && hival >= 0 && lookup) {
          return { kind: "indexed", base, hival, lookup };
        }

        return { kind: "direct", colorSpace: "DeviceRGB" };
      }

      if (name === "Separation" && csObj.items.length >= 4) {
        // [/Separation name alternateSpace tintTransform]
        // We don't evaluate tintTransform yet; use a deterministic fallback by treating the image as 1-channel tint data.
        return { kind: "tint", components: 1 };
      }

      if (name === "DeviceN" && csObj.items.length >= 4) {
        // [/DeviceN names alternateSpace tintTransform]
        // We don't evaluate tintTransform yet; use a deterministic fallback by treating the image as N-channel tint data.
        const namesObj = resolve(page, csObj.items[1]);
        const namesArr = asArray(namesObj);
        const components = namesArr ? namesArr.items.filter((it) => it?.type === "name").length : 0;
        return { kind: "tint", components: components > 0 ? components : 1 };
      }

      if (name === "Lab" && csObj.items.length >= 2) {
        const paramsObj = resolve(page, csObj.items[1]);
        const params = asDict(paramsObj);
        if (params) {
          const wp = resolve(page, dictGet(params, "WhitePoint"));
          const wpArr = asArray(wp);
          const w0 = wpArr?.items[0];
          const w1 = wpArr?.items[1];
          const w2 = wpArr?.items[2];
          if (w0?.type === "number" && w1?.type === "number" && w2?.type === "number") {
            const rangeObj = resolve(page, dictGet(params, "Range"));
            const rangeArr = asArray(rangeObj);
            const range = parseLabRangeOrDefault(rangeArr);
            return { kind: "lab", whitePoint: [w0.value, w1.value, w2.value], range };
          }
        }
        return { kind: "direct", colorSpace: "DeviceRGB" };
      }

      if (name === "CalGray" && csObj.items.length >= 2) {
        const paramsObj = resolve(page, csObj.items[1]);
        const params = asDict(paramsObj);
        if (params) {
          const wp = resolve(page, dictGet(params, "WhitePoint"));
          const wpArr = asArray(wp);
          const w0 = wpArr?.items[0];
          const w1 = wpArr?.items[1];
          const w2 = wpArr?.items[2];
          if (w0?.type === "number" && w1?.type === "number" && w2?.type === "number") {
            const gammaObj = resolve(page, dictGet(params, "Gamma"));
            const gamma = gammaObj?.type === "number" && Number.isFinite(gammaObj.value) ? gammaObj.value : 1;
            return { kind: "calGray", whitePoint: [w0.value, w1.value, w2.value], gamma };
          }
        }
        return { kind: "direct", colorSpace: "DeviceGray" };
      }

      if (name === "CalRGB" && csObj.items.length >= 2) {
        const paramsObj = resolve(page, csObj.items[1]);
        const params = asDict(paramsObj);
        if (params) {
          const wp = resolve(page, dictGet(params, "WhitePoint"));
          const wpArr = asArray(wp);
          const w0 = wpArr?.items[0];
          const w1 = wpArr?.items[1];
          const w2 = wpArr?.items[2];
          if (w0?.type === "number" && w1?.type === "number" && w2?.type === "number") {
            const gammaObj = resolve(page, dictGet(params, "Gamma"));
            const gammaArr = asArray(gammaObj);
            const gamma: readonly [number, number, number] = (() => {
              if (gammaArr && gammaArr.items.length >= 3) {
                const g0 = resolve(page, gammaArr.items[0]);
                const g1 = resolve(page, gammaArr.items[1]);
                const g2 = resolve(page, gammaArr.items[2]);
                const v0 = g0?.type === "number" && Number.isFinite(g0.value) ? g0.value : 1;
                const v1 = g1?.type === "number" && Number.isFinite(g1.value) ? g1.value : 1;
                const v2 = g2?.type === "number" && Number.isFinite(g2.value) ? g2.value : 1;
                return [v0, v1, v2];
              }
              return [1, 1, 1];
            })();

            const matrixObj = resolve(page, dictGet(params, "Matrix"));
            const matrixArr = asArray(matrixObj);
            const matrix: number[] = [];
            if (matrixArr) {
              for (const item of matrixArr.items) {
                const v = resolve(page, item);
                if (v?.type === "number" && Number.isFinite(v.value)) {matrix.push(v.value);}
              }
            }
            const useMatrix = matrix.length === 9 ? matrix : [1, 0, 0, 0, 1, 0, 0, 0, 1];

            return { kind: "calRgb", whitePoint: [w0.value, w1.value, w2.value], gamma, matrix: useMatrix };
          }
        }
        return { kind: "direct", colorSpace: "DeviceRGB" };
      }

      return { kind: "direct", colorSpace: parseColorSpaceName(name) };
    }
  }

  return { kind: "direct", colorSpace: "DeviceRGB" };
}

function applyDecodeToNormalizedSample(value01: number, decodePair: readonly [number, number] | null): number {
  const v = clamp01(value01);
  if (!decodePair) {return v;}
  const dmin = decodePair[0];
  const dmax = decodePair[1];
  const decoded = dmin + v * (dmax - dmin);
  return clamp01(decoded);
}

function clamp01OrZero(value: number): number {
  return clamp01(Number.isFinite(value) ? value : 0);
}

function labToSrgbByte(value01: number): number {
  const v = clamp01OrZero(value01);
  const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(clamp01OrZero(encoded) * 255);
}

function getDecodePairs3(decode: readonly number[] | undefined): readonly (readonly [number, number])[] | null {
  if (!decode || decode.length !== 6) {return null;}
  const d00 = decode[0];
  const d01 = decode[1];
  const d10 = decode[2];
  const d11 = decode[3];
  const d20 = decode[4];
  const d21 = decode[5];
  if (!Number.isFinite(d00) || !Number.isFinite(d01)) {return null;}
  if (!Number.isFinite(d10) || !Number.isFinite(d11)) {return null;}
  if (!Number.isFinite(d20) || !Number.isFinite(d21)) {return null;}
  return [
    [d00, d01] as const,
    [d10, d11] as const,
    [d20, d21] as const,
  ];
}

function xyzToSrgbBytes(X: number, Y: number, Z: number): readonly [number, number, number] {
  // XYZ -> linear sRGB via standard matrix.
  const rLin = 3.2406 * X + -1.5372 * Y + -0.4986 * Z;
  const gLin = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const bLin = 0.0557 * X + -0.2040 * Y + 1.0570 * Z;
  return [labToSrgbByte(rLin), labToSrgbByte(gLin), labToSrgbByte(bLin)];
}

function calGrayToRgbBytes(args: {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly bitsPerComponent: number;
  readonly decode?: readonly number[];
  readonly whitePoint: readonly [number, number, number];
  readonly gamma: number;
}): Uint8Array {
  const { data, width, height, bitsPerComponent, decode, whitePoint, gamma } = args;
  const pixelCount = width * height;
  const rgb = new Uint8Array(pixelCount * 3);

  const max = bitsPerComponent === 16 ? 65535 : (1 << bitsPerComponent) - 1;
  const decodePair = decode && decode.length === 2 ? ([decode[0] ?? 0, decode[1] ?? 1] as const) : null;
  const g = Number.isFinite(gamma) && gamma > 0 ? gamma : 1;

  const Xn = whitePoint[0];
  const Yn = whitePoint[1];
  const Zn = whitePoint[2];

  for (let p = 0; p < pixelCount; p += 1) {
    const raw = unpackSample(data, p, bitsPerComponent);
    const value01 = max > 0 ? raw / max : 0;
    const decoded = applyDecodeToNormalizedSample(value01, decodePair);
    const A = Math.pow(decoded, g);

    const [r, gg, b] = xyzToSrgbBytes(Xn * A, Yn * A, Zn * A);
    const off = p * 3;
    rgb[off] = r;
    rgb[off + 1] = gg;
    rgb[off + 2] = b;
  }

  return rgb;
}

function calRgbToRgbBytes(args: {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly bitsPerComponent: number;
  readonly decode?: readonly number[];
  readonly gamma: readonly [number, number, number];
  readonly matrix: readonly number[];
}): Uint8Array {
  const { data, width, height, bitsPerComponent, decode, gamma, matrix } = args;
  const pixelCount = width * height;
  const rgb = new Uint8Array(pixelCount * 3);

  const max = bitsPerComponent === 16 ? 65535 : (1 << bitsPerComponent) - 1;
  const decodePairs = getDecodePairs3(decode);
  const g0 = Number.isFinite(gamma[0]) && (gamma[0] ?? 0) > 0 ? gamma[0] : 1;
  const g1 = Number.isFinite(gamma[1]) && (gamma[1] ?? 0) > 0 ? gamma[1] : 1;
  const g2 = Number.isFinite(gamma[2]) && (gamma[2] ?? 0) > 0 ? gamma[2] : 1;

  for (let p = 0; p < pixelCount; p += 1) {
    const rraw = unpackSample(data, p * 3 + 0, bitsPerComponent);
    const graw = unpackSample(data, p * 3 + 1, bitsPerComponent);
    const braw = unpackSample(data, p * 3 + 2, bitsPerComponent);

    const r01 = max > 0 ? rraw / max : 0;
    const g01 = max > 0 ? graw / max : 0;
    const b01 = max > 0 ? braw / max : 0;

    const R = Math.pow(applyDecodeToNormalizedSample(r01, decodePairs ? decodePairs[0] ?? null : null), g0);
    const G = Math.pow(applyDecodeToNormalizedSample(g01, decodePairs ? decodePairs[1] ?? null : null), g1);
    const B = Math.pow(applyDecodeToNormalizedSample(b01, decodePairs ? decodePairs[2] ?? null : null), g2);

    const Xa = matrix[0] ?? 1;
    const Xb = matrix[1] ?? 0;
    const Xc = matrix[2] ?? 0;
    const Ya = matrix[3] ?? 0;
    const Yb = matrix[4] ?? 1;
    const Yc = matrix[5] ?? 0;
    const Za = matrix[6] ?? 0;
    const Zb = matrix[7] ?? 0;
    const Zc = matrix[8] ?? 1;

    const X = Xa * R + Xb * G + Xc * B;
    const Y = Ya * R + Yb * G + Yc * B;
    const Z = Za * R + Zb * G + Zc * B;

    const [r, gg, bb] = xyzToSrgbBytes(X, Y, Z);
    const off = p * 3;
    rgb[off] = r;
    rgb[off + 1] = gg;
    rgb[off + 2] = bb;
  }

  return rgb;
}

function parseLabRangeOrDefault(rangeArr: PdfArray | null): readonly [number, number, number, number] {
  const r0 = rangeArr?.items[0];
  const r1 = rangeArr?.items[1];
  const r2 = rangeArr?.items[2];
  const r3 = rangeArr?.items[3];
  if (r0?.type === "number" && r1?.type === "number" && r2?.type === "number" && r3?.type === "number") {
    return [r0.value, r1.value, r2.value, r3.value];
  }
  return [-128, 127, -128, 127];
}

function labToRgbBytes(args: {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly bitsPerComponent: number;
  readonly decode?: readonly number[];
  readonly whitePoint: readonly [number, number, number];
  readonly range: readonly [number, number, number, number];
}): Uint8Array {
  const { data, width, height, bitsPerComponent, decode, whitePoint, range } = args;
  const pixelCount = width * height;
  const rgb = new Uint8Array(pixelCount * 3);

  const max = bitsPerComponent === 16 ? 65535 : (1 << bitsPerComponent) - 1;
  const decodePairs =
    getDecodePairs3(decode) ??
    ([
      [0, 100],
      [range[0], range[1]],
      [range[2], range[3]],
    ] as const);

  const delta = 6 / 29;
  const finv = (t: number): number => {
    if (t > delta) {return t * t * t;}
    return 3 * delta * delta * (t - 4 / 29);
  };

  const Xn = whitePoint[0];
  const Yn = whitePoint[1];
  const Zn = whitePoint[2];

  for (let p = 0; p < pixelCount; p += 1) {
    const Lraw = unpackSample(data, p * 3 + 0, bitsPerComponent);
    const araw = unpackSample(data, p * 3 + 1, bitsPerComponent);
    const braw = unpackSample(data, p * 3 + 2, bitsPerComponent);

    const L01 = max > 0 ? Lraw / max : 0;
    const a01 = max > 0 ? araw / max : 0;
    const b01 = max > 0 ? braw / max : 0;

    const Lstar = (decodePairs[0][0] + clamp01OrZero(L01) * (decodePairs[0][1] - decodePairs[0][0]));
    const astar = (decodePairs[1][0] + clamp01OrZero(a01) * (decodePairs[1][1] - decodePairs[1][0]));
    const bstar = (decodePairs[2][0] + clamp01OrZero(b01) * (decodePairs[2][1] - decodePairs[2][0]));

    const fy = (Lstar + 16) / 116;
    const fx = fy + astar / 500;
    const fz = fy - bstar / 200;

    const X = Xn * finv(fx);
    const Y = Yn * finv(fy);
    const Z = Zn * finv(fz);

    const off = p * 3;
    const [r, g, b] = xyzToSrgbBytes(X, Y, Z);
    rgb[off] = r;
    rgb[off + 1] = g;
    rgb[off + 2] = b;
  }

  return rgb;
}

function expandTintImageToRgb(args: {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly components: number;
  readonly bitsPerComponent: number;
  readonly decode?: readonly number[];
}): Uint8Array {
  const { data, width, height, components, bitsPerComponent, decode } = args;
  if (components <= 0) {throw new Error("[PDF Image] Tint image requires components > 0");}

  const pixelCount = width * height;
  const rgb = new Uint8Array(pixelCount * 3);

  const max = bitsPerComponent === 16 ? 65535 : (1 << bitsPerComponent) - 1;
  const decodePairs = getDecodePairsN(decode, components);

  for (let p = 0; p < pixelCount; p += 1) {
    let sum = 0;
    for (let c = 0; c < components; c += 1) {
      const sampleIndex = p * components + c;
      const raw = unpackSample(data, sampleIndex, bitsPerComponent);
      const value01 = max > 0 ? raw / max : 0;
      const decoded = applyDecodeToNormalizedSample(value01, decodePairs ? decodePairs[c] ?? null : null);
      sum += decoded;
    }
    const avg = sum / components;
    // Deterministic fallback: map tint (0..1) to gray by inverting (1=full colorant => darker).
    const g = Math.round(clamp01(1 - avg) * 255);
    const off = p * 3;
    rgb[off] = g;
    rgb[off + 1] = g;
    rgb[off + 2] = g;
  }

  return rgb;
}

function getDecodePairsN(decode: readonly number[] | undefined, components: number): readonly (readonly [number, number])[] | null {
  if (!decode) {return null;}
  if (decode.length !== components * 2) {return null;}
  const out: Array<readonly [number, number]> = [];
  for (let i = 0; i < components; i += 1) {
    const d0 = decode[i * 2];
    const d1 = decode[i * 2 + 1];
    if (!Number.isFinite(d0) || !Number.isFinite(d1)) {return null;}
    out.push([d0, d1]);
  }
  return out;
}

function extractIndexedBaseColorSpace(page: NativePdfPage, baseObj: PdfObject | undefined): PdfColorSpace | null {
  const resolved = resolve(page, baseObj);
  if (resolved?.type === "name") {
    return parseColorSpaceName(resolved.value);
  }
  if (resolved?.type === "array") {
    const first = resolved.items[0];
    if (first?.type === "name") {
      return parseColorSpaceName(first.value);
    }
  }
  return null;
}

function extractIndexedLookupBytes(page: NativePdfPage, lookupObj: PdfObject | undefined): Uint8Array | null {
  const resolved = resolve(page, lookupObj);
  if (resolved?.type === "string") {
    return resolved.bytes;
  }
  if (resolved?.type === "stream") {
    return decodePdfStream(resolved);
  }
  return null;
}

function getDecodeArray(page: NativePdfPage, dict: PdfDict): readonly number[] | null {
  const decodeObj = resolve(page, dictGet(dict, "Decode"));
  if (!decodeObj || decodeObj.type !== "array") {return null;}
  const nums = decodeObj.items
    .map((it) => (it?.type === "number" ? it.value : null))
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (nums.length === 0) {return null;}
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
  if (!comps) {throw new Error(`[PDF Image] /Indexed base color space not supported: ${base}`);}

  const expectedLookupLen = (hival + 1) * comps;
  if (lookup.length < expectedLookupLen) {
    throw new Error(`[PDF Image] /Indexed lookup length mismatch: expected >= ${expectedLookupLen}, got ${lookup.length}`);
  }

  const decodePair = decode && decode.length === 2 ? decode : null;
  const sampleMax = (1 << bitsPerComponent) - 1;
  const out = new Uint8Array(samples.length * 3);

  for (let i = 0; i < samples.length; i += 1) {
    const idxState = { idx: samples[i] ?? 0 };
    if (decodePair) {
      const dmin = decodePair[0] ?? 0;
      const dmax = decodePair[1] ?? hival;
      const v = sampleMax > 0 ? idxState.idx / sampleMax : 0;
      idxState.idx = Math.round(dmin + v * (dmax - dmin));
    }
    if (idxState.idx < 0) {idxState.idx = 0;}
    if (idxState.idx > hival) {idxState.idx = hival;}
    const idx = idxState.idx;

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
  if (!decodeParms) {return data;}

  const bytesPerPixel = components;
  const rowBytesWithFilter = width * bytesPerPixel + 1;
  const rowBytesOutput = width * bytesPerPixel;

  const expectedLength = height * rowBytesWithFilter;
  if (data.length !== expectedLength) {return data;}

  const output = new Uint8Array(height * rowBytesOutput);

  for (let y = 0; y < height; y += 1) {
    const filterType = data[y * rowBytesWithFilter] ?? 0;
    const srcRowStart = y * rowBytesWithFilter + 1;
    const dstRowStart = y * rowBytesOutput;

    switch (filterType) {
      case 0: // None
        for (let x = 0; x < rowBytesOutput; x += 1) {output[dstRowStart + x] = data[srcRowStart + x] ?? 0;}
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
        for (let x = 0; x < rowBytesOutput; x += 1) {output[dstRowStart + x] = data[srcRowStart + x] ?? 0;}
    }
  }

  return output;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {return a;}
  if (pb <= pc) {return b;}
  return c;
}











/** Extract images referenced by parsed XObject `/Do` calls (native parser). */
export async function extractImagesNative(
  pdfPage: NativePdfPage,
  parsedImages: readonly ParsedImage[],
  options: ImageExtractorOptions,
  xObjectsOverride?: PdfDict,
): Promise<PdfImage[]> {
  const { extractImages = true, maxDimension = 4096 } = options;
  if (!extractImages) {return [];}

  const xObjects =
    xObjectsOverride ??
    (() => {
      const resources = pdfPage.getResourcesDict();
      if (!resources) {return null;}
      return resolveDict(pdfPage, dictGet(resources, "XObject"));
    })();
  if (!xObjects) {return [];}

  const images: PdfImage[] = [];

  for (const parsed of parsedImages) {
    try {
      const cleanName = parsed.name.startsWith("/") ? parsed.name.slice(1) : parsed.name;
      const imageObj = resolve(pdfPage, dictGet(xObjects, cleanName));
      const imageStream = asStream(imageObj);
      if (!imageStream) {continue;}

      const dict = imageStream.dict;
      const subtype = asName(dictGet(dict, "Subtype"))?.value ?? "";
      if (subtype !== "Image") {continue;}
      const decoded = decodeImageXObjectStreamNative(pdfPage, imageStream, parsed.graphicsState, {
        maxDimension,
        jpxDecode: options.jpxDecode,
      });
      if (decoded) {images.push(decoded);}
    } catch (error) {
      if (error instanceof Error && error.message.includes("requires options.jpxDecode")) {
        throw error;
      }
      console.warn(`Failed to extract image "${parsed.name}":`, error);
      continue;
    }
  }

  return images;
}
