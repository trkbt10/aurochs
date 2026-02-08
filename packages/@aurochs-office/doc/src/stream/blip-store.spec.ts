/** @file BLIP store parser tests */
import { parseBStoreContainer, parseBlipData } from "./blip-store";
import { OA_RT, OFFICEART_HEADER_SIZE } from "./officeart-reader";

/** Build an OfficeArt record as raw bytes. */
function buildRawRecord(
  recVer: number,
  recInstance: number,
  recType: number,
  data: Uint8Array,
): Uint8Array {
  const buf = new Uint8Array(OFFICEART_HEADER_SIZE + data.length);
  const view = new DataView(buf.buffer);
  const verAndInstance = (recVer & 0x0f) | ((recInstance & 0x0fff) << 4);
  view.setUint16(0, verAndInstance, true);
  view.setUint16(2, recType, true);
  view.setUint32(4, data.length, true);
  buf.set(data, OFFICEART_HEADER_SIZE);
  return buf;
}

/** Build a fake BLIP with a 17-byte header (1 UID) + image data. */
function buildBlipData(imageBytes: Uint8Array): Uint8Array {
  // 17-byte header: 16-byte UID hash + 1-byte tag
  const header = new Uint8Array(17);
  const result = new Uint8Array(header.length + imageBytes.length);
  result.set(header, 0);
  result.set(imageBytes, header.length);
  return result;
}

/** Build a BStoreEntry (FBSE header + embedded BLIP record). */
function buildBStoreEntry(
  blipRecType: number,
  blipInstance: number,
  imageData: Uint8Array,
): Uint8Array {
  const blipContent = buildBlipData(imageData);
  const blipRecord = buildRawRecord(0, blipInstance, blipRecType, blipContent);
  // 44-byte FBSE header (zero-filled for test) + BLIP record
  const fbseHeader = new Uint8Array(44);
  const entryData = new Uint8Array(fbseHeader.length + blipRecord.length);
  entryData.set(fbseHeader, 0);
  entryData.set(blipRecord, fbseHeader.length);
  return entryData;
}

/** Build a full DggInfo structure with BStoreContainer. */
function buildDggInfo(bstoreEntries: Uint8Array[]): Uint8Array {
  // Build BStoreEntry records
  const entryRecords: Uint8Array[] = [];
  for (const entryData of bstoreEntries) {
    entryRecords.push(buildRawRecord(0x02, 0, OA_RT.BStoreEntry, entryData));
  }

  // Concatenate all entry records
  const totalEntryLen = entryRecords.reduce((sum, r) => sum + r.length, 0);
  const entriesData = new Uint8Array(totalEntryLen);
  let offset = 0;
  for (const rec of entryRecords) {
    entriesData.set(rec, offset);
    offset += rec.length;
  }

  // Build BStoreContainer
  const bstoreContainer = buildRawRecord(0x0f, bstoreEntries.length, OA_RT.BStoreContainer, entriesData);

  // Build FDGG (minimal, 16 bytes)
  const fdgg = buildRawRecord(0x00, 0, OA_RT.FDGG, new Uint8Array(16));

  // Build DggContainer
  const dggChildren = new Uint8Array(fdgg.length + bstoreContainer.length);
  dggChildren.set(fdgg, 0);
  dggChildren.set(bstoreContainer, fdgg.length);
  const dggContainer = buildRawRecord(0x0f, 0, OA_RT.DggContainer, dggChildren);

  return dggContainer;
}

describe("parseBlipData", () => {
  it("parses JPEG BLIP with 1 UID", () => {
    const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic
    const blipContent = buildBlipData(imageData);
    const result = parseBlipData(OA_RT.BlipJPEG1, 0x46a, blipContent);

    expect(result).toBeDefined();
    expect(result!.contentType).toBe("image/jpeg");
    expect(result!.data).toEqual(imageData);
  });

  it("parses PNG BLIP", () => {
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic
    const blipContent = buildBlipData(imageData);
    const result = parseBlipData(OA_RT.BlipPNG, 0x6e0, blipContent);

    expect(result).toBeDefined();
    expect(result!.contentType).toBe("image/png");
    expect(result!.data).toEqual(imageData);
  });

  it("returns undefined for non-BLIP record type", () => {
    expect(parseBlipData(OA_RT.FSP, 0, new Uint8Array(20))).toBeUndefined();
  });

  it("handles BLIP with 2 UIDs (odd instance)", () => {
    // 2-UID BLIP: 33-byte header for bitmap types
    const imageData = new Uint8Array([0xaa, 0xbb]);
    const header = new Uint8Array(33);
    const blipContent = new Uint8Array(header.length + imageData.length);
    blipContent.set(header, 0);
    blipContent.set(imageData, header.length);

    // Odd instance → 2 UIDs
    const result = parseBlipData(OA_RT.BlipJPEG1, 0x46b, blipContent);
    expect(result).toBeDefined();
    expect(result!.data).toEqual(imageData);
  });
});

describe("parseBStoreContainer", () => {
  it("returns empty for lcbDggInfo=0", () => {
    expect(parseBStoreContainer(new Uint8Array(100), 0, 0)).toEqual([]);
  });

  it("extracts single JPEG BLIP from DggInfo", () => {
    const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const entry = buildBStoreEntry(OA_RT.BlipJPEG1, 0x46a, imageData);
    const dggInfo = buildDggInfo([entry]);

    // Place DggInfo in a "table stream" at offset 0
    const tableStream = dggInfo;
    const blips = parseBStoreContainer(tableStream, 0, dggInfo.length);

    expect(blips).toHaveLength(1);
    expect(blips[0].index).toBe(1);
    expect(blips[0].contentType).toBe("image/jpeg");
    expect(blips[0].data).toEqual(imageData);
  });

  it("extracts multiple BLIPs", () => {
    const jpegData = new Uint8Array([0xff, 0xd8]);
    const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const entry1 = buildBStoreEntry(OA_RT.BlipJPEG1, 0x46a, jpegData);
    const entry2 = buildBStoreEntry(OA_RT.BlipPNG, 0x6e0, pngData);
    const dggInfo = buildDggInfo([entry1, entry2]);

    const tableStream = dggInfo;
    const blips = parseBStoreContainer(tableStream, 0, dggInfo.length);

    expect(blips).toHaveLength(2);
    expect(blips[0].index).toBe(1);
    expect(blips[0].contentType).toBe("image/jpeg");
    expect(blips[1].index).toBe(2);
    expect(blips[1].contentType).toBe("image/png");
    expect(blips[1].data).toEqual(pngData);
  });

  it("handles DggInfo at non-zero offset", () => {
    const imageData = new Uint8Array([0xaa]);
    const entry = buildBStoreEntry(OA_RT.BlipDIB, 0x7a8, imageData);
    const dggInfo = buildDggInfo([entry]);

    const padding = 100;
    const tableStream = new Uint8Array(padding + dggInfo.length);
    tableStream.set(dggInfo, padding);

    const blips = parseBStoreContainer(tableStream, padding, dggInfo.length);
    expect(blips).toHaveLength(1);
    expect(blips[0].contentType).toBe("image/bmp");
  });

  it("returns empty for DggInfo without BStoreContainer", () => {
    // DggContainer with only FDGG, no BStoreContainer
    const fdgg = buildRawRecord(0x00, 0, OA_RT.FDGG, new Uint8Array(16));
    const dggContainer = buildRawRecord(0x0f, 0, OA_RT.DggContainer, fdgg);

    const blips = parseBStoreContainer(dggContainer, 0, dggContainer.length);
    expect(blips).toEqual([]);
  });

  it("returns empty for non-DggContainer at offset", () => {
    // Put a random non-container record at the offset
    const buf = buildRawRecord(0x02, 0, OA_RT.FSP, new Uint8Array(10));
    expect(parseBStoreContainer(buf, 0, buf.length)).toEqual([]);
  });
});
