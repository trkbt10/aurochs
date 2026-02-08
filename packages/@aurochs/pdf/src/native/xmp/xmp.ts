/**
 * @file src/pdf/native/xmp.ts
 */

import type { PdfDict, PdfObject, PdfStream } from "../core/types";

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function asStream(obj: PdfObject | null): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function normalizeXmlText(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .trim();
}

function firstMatch(text: string, re: RegExp): string | undefined {
  const m = re.exec(text);
  return m?.[1] ? normalizeXmlText(m[1]) : undefined;
}

function parseXmpFields(xml: string): { title?: string; author?: string; subject?: string } {
  // Minimal, best-effort extraction. Not a general XML parser.
  // Common patterns:
  // - dc:title: <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Title</rdf:li></rdf:Alt></dc:title>
  // - dc:creator: <dc:creator><rdf:Seq><rdf:li>Author</rdf:li></rdf:Seq></dc:creator>
  // - dc:description: similar to title; map to subject.
  const title =
    firstMatch(xml, /<dc:title[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>[\s\S]*?<\/dc:title>/i) ??
    firstMatch(xml, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);

  const author =
    firstMatch(xml, /<dc:creator[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>[\s\S]*?<\/dc:creator>/i) ??
    firstMatch(xml, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);

  const subject =
    firstMatch(xml, /<dc:description[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>[\s\S]*?<\/dc:description>/i) ??
    firstMatch(xml, /<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i);

  return { title, author, subject };
}











/** Extract document metadata from XMP packets under `/Metadata`. */
export function extractXmpMetadata(
  catalog: PdfDict,
  deref: (obj: PdfObject) => PdfObject,
  decodeStream: (stream: PdfStream) => Uint8Array,
): { title?: string; author?: string; subject?: string } | null {
  const metadataObj = dictGet(catalog, "Metadata");
  if (!metadataObj) {return null;}
  const resolved = deref(metadataObj);
  const stream = asStream(resolved);
  if (!stream) {return null;}

  const subtype = dictGet(stream.dict, "Subtype");
  if (subtype?.type === "name" && subtype.value !== "XML") {
    return null;
  }

  const bytes = decodeStream(stream);
  const xml = decodeUtf8(bytes);
  const parsed = parseXmpFields(xml);
  const has = parsed.title || parsed.author || parsed.subject;
  return has ? parsed : null;
}
