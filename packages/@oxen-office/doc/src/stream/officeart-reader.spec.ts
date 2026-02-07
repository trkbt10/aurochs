/** @file OfficeArt record reader tests */
import {
  readOfficeArtRecord,
  iterateOfficeArtRecords,
  isContainerRecord,
  findChildRecord,
  isBlipType,
  OFFICEART_HEADER_SIZE,
  OA_RT,
} from "./officeart-reader";

/** Build a minimal OfficeArt record header + data. */
function buildRecord(
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

describe("readOfficeArtRecord", () => {
  it("reads a simple record", () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    const buf = buildRecord(0x02, 0x00, 0xf00a, data);
    const record = readOfficeArtRecord(buf, 0);

    expect(record).toBeDefined();
    expect(record!.recVer).toBe(0x02);
    expect(record!.recInstance).toBe(0);
    expect(record!.recType).toBe(OA_RT.FSP);
    expect(record!.recLen).toBe(3);
    expect(record!.data).toEqual(data);
  });

  it("reads recInstance from upper 12 bits of verAndInstance", () => {
    // verAndInstance = 0x1234 → recVer=4, recInstance=0x123
    const buf = buildRecord(0x04, 0x123, 0xf00b, new Uint8Array(0));
    const record = readOfficeArtRecord(buf, 0);

    expect(record!.recVer).toBe(0x04);
    expect(record!.recInstance).toBe(0x123);
    expect(record!.recType).toBe(OA_RT.FOPT);
  });

  it("returns undefined for insufficient data", () => {
    expect(readOfficeArtRecord(new Uint8Array(4), 0)).toBeUndefined();
  });

  it("returns undefined when offset exceeds data", () => {
    const buf = buildRecord(0, 0, 0xf00a, new Uint8Array(4));
    expect(readOfficeArtRecord(buf, buf.length)).toBeUndefined();
  });

  it("reads record at non-zero offset", () => {
    const padding = new Uint8Array(10);
    const rec = buildRecord(0x01, 0, 0xf008, new Uint8Array([0xaa, 0xbb]));
    const combined = new Uint8Array(padding.length + rec.length);
    combined.set(padding, 0);
    combined.set(rec, padding.length);

    const record = readOfficeArtRecord(combined, 10);
    expect(record).toBeDefined();
    expect(record!.recType).toBe(OA_RT.FDG);
    expect(record!.data).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it("truncates data when recLen exceeds buffer", () => {
    const buf = new Uint8Array(OFFICEART_HEADER_SIZE + 2);
    const view = new DataView(buf.buffer);
    view.setUint16(0, 0, true);  // verAndInstance
    view.setUint16(2, 0xf00a, true); // recType
    view.setUint32(4, 100, true); // recLen = 100 (exceeds buffer)
    buf[8] = 0xaa;
    buf[9] = 0xbb;

    const record = readOfficeArtRecord(buf, 0);
    expect(record).toBeDefined();
    expect(record!.recLen).toBe(100);
    // Data is truncated to available bytes
    expect(record!.data.length).toBe(2);
  });
});

describe("iterateOfficeArtRecords", () => {
  it("iterates multiple records", () => {
    const rec1 = buildRecord(0, 0, 0xf009, new Uint8Array([0x01]));
    const rec2 = buildRecord(0, 0, 0xf00a, new Uint8Array([0x02, 0x03]));
    const combined = new Uint8Array(rec1.length + rec2.length);
    combined.set(rec1, 0);
    combined.set(rec2, rec1.length);

    const records = iterateOfficeArtRecords(combined, 0, combined.length);
    expect(records).toHaveLength(2);
    expect(records[0].recType).toBe(OA_RT.FSPGR);
    expect(records[1].recType).toBe(OA_RT.FSP);
  });

  it("returns empty for empty range", () => {
    const buf = buildRecord(0, 0, 0xf00a, new Uint8Array(4));
    expect(iterateOfficeArtRecords(buf, 0, 0)).toEqual([]);
  });

  it("stops at end boundary", () => {
    const rec1 = buildRecord(0, 0, 0xf009, new Uint8Array(2));
    const rec2 = buildRecord(0, 0, 0xf00a, new Uint8Array(2));
    const combined = new Uint8Array(rec1.length + rec2.length);
    combined.set(rec1, 0);
    combined.set(rec2, rec1.length);

    // Only include first record in the range
    const records = iterateOfficeArtRecords(combined, 0, rec1.length);
    expect(records).toHaveLength(1);
    expect(records[0].recType).toBe(OA_RT.FSPGR);
  });
});

describe("isContainerRecord", () => {
  it("returns true for recVer=0x0F", () => {
    const buf = buildRecord(0x0f, 0, 0xf000, new Uint8Array(0));
    const record = readOfficeArtRecord(buf, 0)!;
    expect(isContainerRecord(record)).toBe(true);
  });

  it("returns false for non-container", () => {
    const buf = buildRecord(0x02, 0, 0xf00a, new Uint8Array(0));
    const record = readOfficeArtRecord(buf, 0)!;
    expect(isContainerRecord(record)).toBe(false);
  });
});

describe("findChildRecord", () => {
  it("finds child record by type within container", () => {
    // Build a container (recVer=0x0F) with two child records
    const child1 = buildRecord(0x02, 0, 0xf009, new Uint8Array([0xaa]));
    const child2 = buildRecord(0x02, 0, 0xf00a, new Uint8Array([0xbb]));
    const childData = new Uint8Array(child1.length + child2.length);
    childData.set(child1, 0);
    childData.set(child2, child1.length);

    const container = buildRecord(0x0f, 0, 0xf000, childData);
    const containerRec = readOfficeArtRecord(container, 0)!;

    const found = findChildRecord(containerRec, OA_RT.FSP);
    expect(found).toBeDefined();
    expect(found!.recType).toBe(OA_RT.FSP);
    expect(found!.data).toEqual(new Uint8Array([0xbb]));
  });

  it("returns undefined for non-container", () => {
    const buf = buildRecord(0x02, 0, 0xf00a, new Uint8Array(4));
    const record = readOfficeArtRecord(buf, 0)!;
    expect(findChildRecord(record, 0xf00a)).toBeUndefined();
  });

  it("returns undefined when type not found", () => {
    const child = buildRecord(0x02, 0, 0xf009, new Uint8Array(2));
    const container = buildRecord(0x0f, 0, 0xf000, child);
    const containerRec = readOfficeArtRecord(container, 0)!;

    expect(findChildRecord(containerRec, 0xf00a)).toBeUndefined();
  });
});

describe("isBlipType", () => {
  it("returns true for all BLIP types", () => {
    expect(isBlipType(OA_RT.BlipJPEG1)).toBe(true);
    expect(isBlipType(OA_RT.BlipJPEG2)).toBe(true);
    expect(isBlipType(OA_RT.BlipPNG)).toBe(true);
    expect(isBlipType(OA_RT.BlipDIB)).toBe(true);
    expect(isBlipType(OA_RT.BlipEMF)).toBe(true);
    expect(isBlipType(OA_RT.BlipWMF)).toBe(true);
    expect(isBlipType(OA_RT.BlipTIFF)).toBe(true);
    expect(isBlipType(OA_RT.BlipPICT)).toBe(true);
  });

  it("returns false for non-BLIP types", () => {
    expect(isBlipType(OA_RT.FSP)).toBe(false);
    expect(isBlipType(OA_RT.FOPT)).toBe(false);
    expect(isBlipType(OA_RT.DggContainer)).toBe(false);
  });
});
