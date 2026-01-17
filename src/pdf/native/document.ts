import { PdfResolver } from "./resolver";
import { loadXRef, type XRefTable } from "./xref";
import type { PdfDict, PdfObject, PdfRef, PdfStream, PdfString } from "./types";
import { decodePdfStream } from "./stream";
import { extractXmpMetadata } from "./xmp";
import { createStandardDecrypter } from "./encryption/standard";

export type NativePdfEncryptionMode =
  | { readonly mode: "reject" }
  | { readonly mode: "ignore" }
  | { readonly mode: "password"; readonly password: string };

export type NativePdfLoadOptions = Readonly<{
  readonly encryption: NativePdfEncryptionMode;
}>;

export type NativePdfMetadata = Readonly<{
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
}>;

export type NativePdfPage = Readonly<{
  readonly pageNumber: number;
  getSize: () => { width: number; height: number };
  getBox: (name: "MediaBox" | "CropBox" | "BleedBox" | "TrimBox" | "ArtBox") => readonly number[] | null;
  getResourcesDict: () => PdfDict | null;
  getDecodedContentStreams: () => readonly Uint8Array[];
  lookup: (obj: PdfObject) => PdfObject;
}>;

function asDict(obj: PdfObject): PdfDict | null {
  return obj.type === "dict" ? obj : null;
}
function asRef(obj: PdfObject | undefined): PdfRef | null {
  return obj?.type === "ref" ? obj : null;
}
function asArray(obj: PdfObject | undefined): PdfObject[] | null {
  return obj?.type === "array" ? [...obj.items] : null;
}
function asName(obj: PdfObject | undefined): string | null {
  return obj?.type === "name" ? obj.value : null;
}
function asString(obj: PdfObject | undefined): PdfString | null {
  return obj?.type === "string" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function decodeStream(stream: PdfStream): Uint8Array {
  return decodePdfStream(stream);
}

function readBox(dict: PdfDict, key: string): readonly number[] | null {
  const mb = dictGet(dict, key);
  if (!mb || mb.type !== "array") {return null;}
  const nums: number[] = [];
  for (const item of mb.items) {
    if (item.type !== "number") {return null;}
    nums.push(item.value);
  }
  return nums.length === 4 ? nums : null;
}

function readRotate(dict: PdfDict): number | null {
  const v = dictGet(dict, "Rotate");
  if (!v || v.type !== "number") {return null;}
  if (!Number.isFinite(v.value)) {return null;}
  return Math.trunc(v.value);
}

function normalizeRotate(value: number | null): 0 | 90 | 180 | 270 {
  const raw = value ?? 0;
  const mod = ((raw % 360) + 360) % 360;
  if (mod === 90) {return 90;}
  if (mod === 180) {return 180;}
  if (mod === 270) {return 270;}
  return 0;
}

function readUserUnit(dict: PdfDict): number | null {
  const v = dictGet(dict, "UserUnit");
  if (!v || v.type !== "number") {return null;}
  if (!Number.isFinite(v.value)) {return null;}
  if (v.value <= 0) {return null;}
  return v.value;
}

function readInherited(
  dict: PdfDict,
  resolver: PdfResolver,
): {
  resources: PdfDict | null;
  mediaBox: readonly number[] | null;
  cropBox: readonly number[] | null;
  bleedBox: readonly number[] | null;
  trimBox: readonly number[] | null;
  artBox: readonly number[] | null;
  rotate: number | null;
  userUnit: number | null;
} {
  let cur: PdfDict | null = dict;
  let resources: PdfDict | null = null;
  let mediaBox: readonly number[] | null = null;
  let cropBox: readonly number[] | null = null;
  let bleedBox: readonly number[] | null = null;
  let trimBox: readonly number[] | null = null;
  let artBox: readonly number[] | null = null;
  let rotate: number | null = null;
  let userUnit: number | null = null;
  while (cur) {
    if (!resources) {
      const resourcesObj = dictGet(cur, "Resources");
      if (resourcesObj) {
        const resolved = resolver.deref(resourcesObj);
        const resDict = asDict(resolved);
        if (resDict) {resources = resDict;}
      }
    }

    if (!mediaBox) {
      const mediaBoxObj = dictGet(cur, "MediaBox");
      if (mediaBoxObj) {
        const resolved = resolver.deref(mediaBoxObj);
        if (resolved.type === "array") {
          const nums: number[] = [];
          for (const item of resolved.items) {
            if (item.type !== "number") {
              nums.length = 0;
              break;
            }
            nums.push(item.value);
          }
          if (nums.length === 4) {mediaBox = nums;}
        }
      }
    }

    if (!cropBox) {
      const cropBoxObj = dictGet(cur, "CropBox");
      if (cropBoxObj) {
        const resolved = resolver.deref(cropBoxObj);
        if (resolved.type === "array") {
          const nums: number[] = [];
          for (const item of resolved.items) {
            if (item.type !== "number") {
              nums.length = 0;
              break;
            }
            nums.push(item.value);
          }
          if (nums.length === 4) {cropBox = nums;}
        }
      }
    }

    if (!bleedBox) {
      const bleedBoxObj = dictGet(cur, "BleedBox");
      if (bleedBoxObj) {
        const resolved = resolver.deref(bleedBoxObj);
        if (resolved.type === "array") {
          const nums: number[] = [];
          for (const item of resolved.items) {
            if (item.type !== "number") {
              nums.length = 0;
              break;
            }
            nums.push(item.value);
          }
          if (nums.length === 4) {bleedBox = nums;}
        }
      }
    }

    if (!trimBox) {
      const trimBoxObj = dictGet(cur, "TrimBox");
      if (trimBoxObj) {
        const resolved = resolver.deref(trimBoxObj);
        if (resolved.type === "array") {
          const nums: number[] = [];
          for (const item of resolved.items) {
            if (item.type !== "number") {
              nums.length = 0;
              break;
            }
            nums.push(item.value);
          }
          if (nums.length === 4) {trimBox = nums;}
        }
      }
    }

    if (!artBox) {
      const artBoxObj = dictGet(cur, "ArtBox");
      if (artBoxObj) {
        const resolved = resolver.deref(artBoxObj);
        if (resolved.type === "array") {
          const nums: number[] = [];
          for (const item of resolved.items) {
            if (item.type !== "number") {
              nums.length = 0;
              break;
            }
            nums.push(item.value);
          }
          if (nums.length === 4) {artBox = nums;}
        }
      }
    }

    if (rotate == null) {
      const rotateObj = resolver.deref(dictGet(cur, "Rotate") ?? { type: "null" });
      if (rotateObj.type === "number") {rotate = Math.trunc(rotateObj.value);}
    }

    if (userUnit == null) {
      const userUnitObj = resolver.deref(dictGet(cur, "UserUnit") ?? { type: "null" });
      if (userUnitObj.type === "number" && userUnitObj.value > 0) {userUnit = userUnitObj.value;}
    }

    if (resources && mediaBox && cropBox && bleedBox && trimBox && artBox && rotate != null && userUnit != null) {break;}

    const parentRef = asRef(dictGet(cur, "Parent"));
    if (!parentRef) {break;}
    const parent = resolver.getObject(parentRef.obj);
    cur = asDict(parent);
  }
  return { resources, mediaBox, cropBox, bleedBox, trimBox, artBox, rotate, userUnit };
}

function collectPages(pagesNode: PdfDict, resolver: PdfResolver): readonly PdfDict[] {
  const type = asName(dictGet(pagesNode, "Type"));
  if (type === "Page") {return [pagesNode];}
  if (type !== "Pages") {throw new Error("Pages tree: node is neither /Pages nor /Page");}

  const kidsObj = dictGet(pagesNode, "Kids");
  if (!kidsObj || kidsObj.type !== "array") {return [];}
  const out: PdfDict[] = [];
  for (const kid of kidsObj.items) {
    const resolved = resolver.deref(kid);
    const dict = asDict(resolved);
    if (!dict) {continue;}
    out.push(...collectPages(dict, resolver));
  }
  return out;
}

function extractInfoMetadata(info: PdfDict): NativePdfMetadata {
  const title = asString(dictGet(info, "Title"))?.text;
  const author = asString(dictGet(info, "Author"))?.text;
  const subject = asString(dictGet(info, "Subject"))?.text;
  const out: { title?: string; author?: string; subject?: string } = {};
  if (title) {out.title = title;}
  if (author) {out.author = author;}
  if (subject) {out.subject = subject;}
  return out;
}

function mergeMetadata(
  info: NativePdfMetadata,
  xmp: NativePdfMetadata | null,
): NativePdfMetadata {
  if (!xmp) {return info;}
  return {
    title: info.title ?? xmp.title,
    author: info.author ?? xmp.author,
    subject: info.subject ?? xmp.subject,
  };
}











export class NativePdfDocument {
  private readonly xref: XRefTable;
  private readonly resolver: PdfResolver;
  private readonly trailer: PdfDict;
  private readonly catalog: PdfDict;
  private readonly pages: readonly PdfDict[];

  private readonly metadata: NativePdfMetadata;

  constructor(
    private readonly bytes: Uint8Array,
    options: NativePdfLoadOptions,
  ) {
    if (!bytes) {throw new Error("bytes is required");}
    if (!options) {throw new Error("options is required");}
    if (!options.encryption) {throw new Error("options.encryption is required");}

    this.xref = loadXRef(bytes);
    this.trailer = this.xref.trailer;

    const encryptRef = asRef(dictGet(this.trailer, "Encrypt"));
    if (encryptRef) {
      if (options.encryption.mode === "reject") {
        throw new Error("Encrypted PDF");
      }

      if (options.encryption.mode === "password") {
        const idArr = asArray(dictGet(this.trailer, "ID"));
        const id0 = idArr && idArr.length > 0 ? asString(idArr[0])?.bytes : null;
        if (!id0) {throw new Error("Encrypted PDF: trailer /ID is missing");}

        const tmpResolver = new PdfResolver(bytes, this.xref);
        const encryptObj = tmpResolver.getObject(encryptRef.obj);
        const encryptDict = asDict(encryptObj);
        if (!encryptDict) {throw new Error("Encrypted PDF: /Encrypt is not a dictionary");}

        const decrypter = createStandardDecrypter({
          encryptDict,
          fileId0: id0,
          password: options.encryption.password,
        });

        this.resolver = new PdfResolver(bytes, this.xref, {
          decrypter,
          skipDecryptObjectNums: new Set([encryptRef.obj]),
        });
      } else {
        // ignore
        this.resolver = new PdfResolver(bytes, this.xref);
      }
    } else {
      this.resolver = new PdfResolver(bytes, this.xref);
    }

    const rootRef = asRef(dictGet(this.trailer, "Root"));
    if (!rootRef) {throw new Error("Missing trailer /Root");}
    const catalogObj = this.resolver.getObject(rootRef.obj);
    const catalog = asDict(catalogObj);
    if (!catalog) {throw new Error("/Root is not a dictionary");}
    this.catalog = catalog;

    const pagesRef = asRef(dictGet(this.catalog, "Pages"));
    if (!pagesRef) {throw new Error("Missing catalog /Pages");}
    const pagesObj = this.resolver.getObject(pagesRef.obj);
    const pagesNode = asDict(pagesObj);
    if (!pagesNode) {throw new Error("Catalog /Pages is not a dictionary");}
    this.pages = collectPages(pagesNode, this.resolver);

    const infoRef = asRef(dictGet(this.trailer, "Info"));
    const infoDict = infoRef ? asDict(this.resolver.getObject(infoRef.obj)) : null;
    const info = infoDict ? extractInfoMetadata(infoDict) : {};
    const xmp = extractXmpMetadata(this.catalog, (o) => this.resolver.deref(o), decodePdfStream);
    this.metadata = mergeMetadata(info, xmp);
  }

  getPageCount(): number {
    return this.pages.length;
  }

  getMetadata(): NativePdfMetadata | undefined {
    const has = this.metadata.title || this.metadata.author || this.metadata.subject;
    return has ? this.metadata : undefined;
  }

  getPages(): readonly NativePdfPage[] {
    const out: NativePdfPage[] = [];
    for (let i = 0; i < this.pages.length; i += 1) {
      const pageDict = this.pages[i]!;
      const pageNumber = i + 1;

      const inherited = readInherited(pageDict, this.resolver);
      const mediaBox = inherited.mediaBox ?? readBox(pageDict, "MediaBox");
      const cropBox = inherited.cropBox ?? readBox(pageDict, "CropBox");
      const bleedBox = inherited.bleedBox ?? readBox(pageDict, "BleedBox");
      const trimBox = inherited.trimBox ?? readBox(pageDict, "TrimBox");
      const artBox = inherited.artBox ?? readBox(pageDict, "ArtBox");
      const resources = inherited.resources;
      const rotate = normalizeRotate(inherited.rotate ?? readRotate(pageDict));
      const userUnit = inherited.userUnit ?? readUserUnit(pageDict) ?? 1;

      // Defaulting per ISO 32000:
      // - CropBox defaults to MediaBox
      // - BleedBox/TrimBox/ArtBox default to CropBox
      const effectiveMediaBox = mediaBox;
      const effectiveCropBox = cropBox ?? effectiveMediaBox;
      const effectiveBleedBox = bleedBox ?? effectiveCropBox;
      const effectiveTrimBox = trimBox ?? effectiveCropBox;
      const effectiveArtBox = artBox ?? effectiveCropBox;

      const scaleBox = (box: readonly number[] | null): readonly number[] | null => {
        if (!box) {return null;}
        return [box[0] ?? 0, box[1] ?? 0, box[2] ?? 0, box[3] ?? 0].map((v) => v * userUnit);
      };

      const getSize = () => {
        const box = effectiveCropBox ?? effectiveMediaBox;
        if (!box) {throw new Error("Page MediaBox is missing");}
        const [llx, lly, urx, ury] = box;
        const w = ((urx ?? 0) - (llx ?? 0)) * userUnit;
        const h = ((ury ?? 0) - (lly ?? 0)) * userUnit;
        return rotate === 90 || rotate === 270 ? { width: h, height: w } : { width: w, height: h };
      };

      const getBox = (name: "MediaBox" | "CropBox" | "BleedBox" | "TrimBox" | "ArtBox") => {
        switch (name) {
          case "MediaBox":
            return scaleBox(effectiveMediaBox);
          case "CropBox":
            return scaleBox(effectiveCropBox);
          case "BleedBox":
            return scaleBox(effectiveBleedBox);
          case "TrimBox":
            return scaleBox(effectiveTrimBox);
          case "ArtBox":
            return scaleBox(effectiveArtBox);
          default: {
            const exhaustive: never = name;
            throw new Error(`Unsupported box name: ${String(exhaustive)}`);
          }
        }
      };

      const getResourcesDict = () => resources;

      const getDecodedContentStreams = () => {
        const contents = dictGet(pageDict, "Contents");
        if (!contents) {return [];}
        const resolved = this.resolver.deref(contents);
        const streams: PdfStream[] = [];
        if (resolved.type === "stream") {
          streams.push(resolved);
        } else if (resolved.type === "array") {
          for (const item of resolved.items) {
            const obj = this.resolver.deref(item);
            if (obj.type === "stream") {streams.push(obj);}
          }
        }
        return streams.map(decodeStream);
      };

      out.push({
        pageNumber,
        getSize,
        getBox,
        getResourcesDict,
        getDecodedContentStreams,
        lookup: (obj) => this.resolver.deref(obj),
      });
    }
    return out;
  }
}











export function loadNativePdfDocument(data: Uint8Array | ArrayBuffer, options: NativePdfLoadOptions): NativePdfDocument {
  if (!data) {throw new Error("data is required");}
  if (!options) {throw new Error("options is required");}
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return new NativePdfDocument(bytes, options);
}
