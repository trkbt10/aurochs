import { PdfResolver } from "./resolver";
import { loadXRef, type XRefTable } from "./xref";
import type { PdfDict, PdfObject, PdfRef, PdfStream, PdfString } from "./types";
import { decodePdfStream } from "./stream";

export type NativePdfEncryptionMode = "reject" | "ignore";

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

function readMediaBox(dict: PdfDict): readonly number[] | null {
  const mb = dictGet(dict, "MediaBox");
  if (!mb || mb.type !== "array") return null;
  const nums: number[] = [];
  for (const item of mb.items) {
    if (item.type !== "number") return null;
    nums.push(item.value);
  }
  return nums.length === 4 ? nums : null;
}

function readInherited(dict: PdfDict, resolver: PdfResolver): { resources: PdfDict | null; mediaBox: readonly number[] | null } {
  let cur: PdfDict | null = dict;
  let resources: PdfDict | null = null;
  let mediaBox: readonly number[] | null = null;
  while (cur) {
    if (!resources) {
      const resourcesObj = dictGet(cur, "Resources");
      if (resourcesObj) {
        const resolved = resolver.deref(resourcesObj);
        const resDict = asDict(resolved);
        if (resDict) resources = resDict;
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
          if (nums.length === 4) mediaBox = nums;
        }
      }
    }

    if (resources && mediaBox) break;

    const parentRef = asRef(dictGet(cur, "Parent"));
    if (!parentRef) break;
    const parent = resolver.getObject(parentRef.obj);
    cur = asDict(parent);
  }
  return { resources, mediaBox };
}

function collectPages(pagesNode: PdfDict, resolver: PdfResolver): readonly PdfDict[] {
  const type = asName(dictGet(pagesNode, "Type"));
  if (type === "Page") return [pagesNode];
  if (type !== "Pages") throw new Error("Pages tree: node is neither /Pages nor /Page");

  const kidsObj = dictGet(pagesNode, "Kids");
  if (!kidsObj || kidsObj.type !== "array") return [];
  const out: PdfDict[] = [];
  for (const kid of kidsObj.items) {
    const resolved = resolver.deref(kid);
    const dict = asDict(resolved);
    if (!dict) continue;
    out.push(...collectPages(dict, resolver));
  }
  return out;
}

function extractInfoMetadata(info: PdfDict): NativePdfMetadata {
  const title = asString(dictGet(info, "Title"))?.text;
  const author = asString(dictGet(info, "Author"))?.text;
  const subject = asString(dictGet(info, "Subject"))?.text;
  const out: { title?: string; author?: string; subject?: string } = {};
  if (title) out.title = title;
  if (author) out.author = author;
  if (subject) out.subject = subject;
  return out;
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
    if (!bytes) throw new Error("bytes is required");
    if (!options) throw new Error("options is required");
    if (!options.encryption) throw new Error("options.encryption is required");

    this.xref = loadXRef(bytes);
    this.trailer = this.xref.trailer;
    this.resolver = new PdfResolver(bytes, this.xref);

    if (options.encryption === "reject" && this.trailer.map.has("Encrypt")) {
      throw new Error("Encrypted PDF");
    }

    const rootRef = asRef(dictGet(this.trailer, "Root"));
    if (!rootRef) throw new Error("Missing trailer /Root");
    const catalogObj = this.resolver.getObject(rootRef.obj);
    const catalog = asDict(catalogObj);
    if (!catalog) throw new Error("/Root is not a dictionary");
    this.catalog = catalog;

    const pagesRef = asRef(dictGet(this.catalog, "Pages"));
    if (!pagesRef) throw new Error("Missing catalog /Pages");
    const pagesObj = this.resolver.getObject(pagesRef.obj);
    const pagesNode = asDict(pagesObj);
    if (!pagesNode) throw new Error("Catalog /Pages is not a dictionary");
    this.pages = collectPages(pagesNode, this.resolver);

    const infoRef = asRef(dictGet(this.trailer, "Info"));
    const infoDict = infoRef ? asDict(this.resolver.getObject(infoRef.obj)) : null;
    this.metadata = infoDict ? extractInfoMetadata(infoDict) : {};
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
      const mediaBox = inherited.mediaBox ?? readMediaBox(pageDict);
      const resources = inherited.resources;

      const getSize = () => {
        const box = mediaBox;
        if (!box) throw new Error("Page MediaBox is missing");
        const [llx, lly, urx, ury] = box;
        return { width: (urx ?? 0) - (llx ?? 0), height: (ury ?? 0) - (lly ?? 0) };
      };

      const getResourcesDict = () => resources;

      const getDecodedContentStreams = () => {
        const contents = dictGet(pageDict, "Contents");
        if (!contents) return [];
        const resolved = this.resolver.deref(contents);
        const streams: PdfStream[] = [];
        if (resolved.type === "stream") {
          streams.push(resolved);
        } else if (resolved.type === "array") {
          for (const item of resolved.items) {
            const obj = this.resolver.deref(item);
            if (obj.type === "stream") streams.push(obj);
          }
        }
        return streams.map(decodeStream);
      };

      out.push({
        pageNumber,
        getSize,
        getResourcesDict,
        getDecodedContentStreams,
        lookup: (obj) => this.resolver.deref(obj),
      });
    }
    return out;
  }
}

export function loadNativePdfDocument(data: Uint8Array | ArrayBuffer, options: NativePdfLoadOptions): NativePdfDocument {
  if (!data) throw new Error("data is required");
  if (!options) throw new Error("options is required");
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return new NativePdfDocument(bytes, options);
}
