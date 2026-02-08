/** @file Picture extractor tests */
import { parsePicStructure, picToDisplayEmu, type PicData } from "./picture-extractor";
import { OA_RT, OFFICEART_HEADER_SIZE } from "../stream/officeart-reader";

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

/** Build a PIC structure with embedded BLIP. */
function buildPicWithBlip(options: {
  dxaGoal: number;
  dyaGoal: number;
  mx: number;
  my: number;
  cropLeft?: number;
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  blipRecType: number;
  blipInstance: number;
  imageData: Uint8Array;
}): Uint8Array {
  const cbHeader = 0x44; // 68 bytes

  // Build BLIP data: 17-byte header (1 UID) + image bytes
  const blipHeader = new Uint8Array(17);
  const blipContent = new Uint8Array(blipHeader.length + options.imageData.length);
  blipContent.set(blipHeader, 0);
  blipContent.set(options.imageData, blipHeader.length);
  const blipRecord = buildRawRecord(0, options.blipInstance, options.blipRecType, blipContent);

  const lcb = cbHeader + blipRecord.length;
  const pic = new Uint8Array(lcb);
  const view = new DataView(pic.buffer);

  // lcb (4B) + cbHeader (2B)
  view.setInt32(0, lcb, true);
  view.setUint16(4, cbHeader, true);

  // mfp (6B: mm, xExt, yExt) - zero
  // bm (14B) - zero

  // dxaGoal, dyaGoal, mx, my, crops at offset 26
  const hdrBase = 26;
  view.setUint16(hdrBase, options.dxaGoal, true);
  view.setUint16(hdrBase + 2, options.dyaGoal, true);
  view.setUint16(hdrBase + 4, options.mx, true);
  view.setUint16(hdrBase + 6, options.my, true);
  view.setInt16(hdrBase + 8, options.cropLeft ?? 0, true);
  view.setInt16(hdrBase + 10, options.cropTop ?? 0, true);
  view.setInt16(hdrBase + 12, options.cropRight ?? 0, true);
  view.setInt16(hdrBase + 14, options.cropBottom ?? 0, true);

  // brcl (2B) + brc (16B) + dxaOrigin (2B) + dyaOrigin (2B) - zero

  // OfficeArt data after cbHeader
  pic.set(blipRecord, cbHeader);

  return pic;
}

describe("parsePicStructure", () => {
  it("parses PIC with inline JPEG BLIP", () => {
    const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const pic = buildPicWithBlip({
      dxaGoal: 2880,  // 2 inches
      dyaGoal: 1440,  // 1 inch
      mx: 1000,       // 100%
      my: 1000,       // 100%
      blipRecType: OA_RT.BlipJPEG1,
      blipInstance: 0x46a,
      imageData,
    });

    const result = parsePicStructure(pic, 0);
    expect(result).toBeDefined();
    expect(result!.widthTwips).toBe(2880);
    expect(result!.heightTwips).toBe(1440);
    expect(result!.scaleX).toBe(1000);
    expect(result!.scaleY).toBe(1000);
    expect(result!.contentType).toBe("image/jpeg");
    expect(result!.imageData).toEqual(imageData);
  });

  it("parses PIC with PNG BLIP", () => {
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const pic = buildPicWithBlip({
      dxaGoal: 3600,
      dyaGoal: 2700,
      mx: 500,   // 50%
      my: 750,   // 75%
      blipRecType: OA_RT.BlipPNG,
      blipInstance: 0x6e0,
      imageData,
    });

    const result = parsePicStructure(pic, 0);
    expect(result).toBeDefined();
    expect(result!.widthTwips).toBe(3600);
    expect(result!.heightTwips).toBe(2700);
    expect(result!.scaleX).toBe(500);
    expect(result!.scaleY).toBe(750);
    expect(result!.contentType).toBe("image/png");
    expect(result!.imageData).toEqual(imageData);
  });

  it("parses PIC with cropping values", () => {
    const imageData = new Uint8Array([0xaa]);
    const pic = buildPicWithBlip({
      dxaGoal: 4000,
      dyaGoal: 3000,
      mx: 1000,
      my: 1000,
      cropLeft: 100,
      cropTop: 200,
      cropRight: 150,
      cropBottom: 250,
      blipRecType: OA_RT.BlipDIB,
      blipInstance: 0x7a8,
      imageData,
    });

    const result = parsePicStructure(pic, 0);
    expect(result).toBeDefined();
    expect(result!.cropLeft).toBe(100);
    expect(result!.cropTop).toBe(200);
    expect(result!.cropRight).toBe(150);
    expect(result!.cropBottom).toBe(250);
  });

  it("parses PIC at non-zero offset", () => {
    const imageData = new Uint8Array([0xcc]);
    const pic = buildPicWithBlip({
      dxaGoal: 1440,
      dyaGoal: 720,
      mx: 1000,
      my: 1000,
      blipRecType: OA_RT.BlipJPEG1,
      blipInstance: 0x46a,
      imageData,
    });

    const padding = 200;
    const stream = new Uint8Array(padding + pic.length);
    stream.set(pic, padding);

    const result = parsePicStructure(stream, padding);
    expect(result).toBeDefined();
    expect(result!.widthTwips).toBe(1440);
    expect(result!.contentType).toBe("image/jpeg");
  });

  it("returns undefined for insufficient data", () => {
    expect(parsePicStructure(new Uint8Array(4), 0)).toBeUndefined();
  });

  it("returns undefined for negative lcb", () => {
    const buf = new Uint8Array(100);
    const view = new DataView(buf.buffer);
    view.setInt32(0, -1, true);
    expect(parsePicStructure(buf, 0)).toBeUndefined();
  });

  it("returns undefined for cbHeader less than minimum", () => {
    const buf = new Uint8Array(100);
    const view = new DataView(buf.buffer);
    view.setInt32(0, 80, true);   // lcb
    view.setUint16(4, 0x20, true); // cbHeader too small
    expect(parsePicStructure(buf, 0)).toBeUndefined();
  });

  it("resolves blipId from SpContainer via FOPT", () => {
    const cbHeader = 0x44;
    const imageData = new Uint8Array([0xff, 0xd8]);

    // Build FOPT with blipId = 1 (property 0x0104)
    const propCount = 1;
    const foptData = new Uint8Array(6);
    const foptView = new DataView(foptData.buffer);
    foptView.setUint16(0, 0x0104, true); // propId = pib
    foptView.setUint32(2, 1, true);       // value = 1 (blipId)
    const foptRecord = buildRawRecord(0x03, propCount, OA_RT.FOPT, foptData);

    // Build FSP record
    const fspData = new Uint8Array(8);
    const fspRecord = buildRawRecord(0x02, 0, OA_RT.FSP, fspData);

    // Build SpContainer with FSP + FOPT
    const spChildren = new Uint8Array(fspRecord.length + foptRecord.length);
    spChildren.set(fspRecord, 0);
    spChildren.set(foptRecord, fspRecord.length);
    const spContainer = buildRawRecord(0x0f, 0, OA_RT.SpContainer, spChildren);

    // Build PIC structure
    const lcb = cbHeader + spContainer.length;
    const pic = new Uint8Array(lcb);
    const picView = new DataView(pic.buffer);
    picView.setInt32(0, lcb, true);
    picView.setUint16(4, cbHeader, true);
    // dxaGoal, dyaGoal, mx, my
    const hdrBase = 26;
    picView.setUint16(hdrBase, 2000, true);
    picView.setUint16(hdrBase + 2, 1500, true);
    picView.setUint16(hdrBase + 4, 1000, true);
    picView.setUint16(hdrBase + 6, 1000, true);
    pic.set(spContainer, cbHeader);

    // BStoreContainer entries
    const blipStore = [
      { index: 1, contentType: "image/jpeg", data: imageData },
    ];

    const result = parsePicStructure(pic, 0, blipStore);
    expect(result).toBeDefined();
    expect(result!.widthTwips).toBe(2000);
    expect(result!.contentType).toBe("image/jpeg");
    expect(result!.imageData).toEqual(imageData);
  });
});

describe("picToDisplayEmu", () => {
  it("calculates display size at 100% scale", () => {
    const pic: PicData = {
      widthTwips: 1440,  // 1 inch
      heightTwips: 720,  // 0.5 inch
      scaleX: 1000,
      scaleY: 1000,
      cropLeft: 0,
      cropTop: 0,
      cropRight: 0,
      cropBottom: 0,
      contentType: "image/jpeg",
      imageData: new Uint8Array(0),
    };

    const { widthEmu, heightEmu } = picToDisplayEmu(pic);
    // 1440 twips × 914.4 = 1,316,736 EMU (1 inch)
    expect(widthEmu).toBe(Math.round(1440 * 914.4));
    expect(heightEmu).toBe(Math.round(720 * 914.4));
  });

  it("applies scaling", () => {
    const pic: PicData = {
      widthTwips: 2880,
      heightTwips: 2880,
      scaleX: 500,   // 50%
      scaleY: 250,   // 25%
      cropLeft: 0,
      cropTop: 0,
      cropRight: 0,
      cropBottom: 0,
      contentType: "image/png",
      imageData: new Uint8Array(0),
    };

    const { widthEmu, heightEmu } = picToDisplayEmu(pic);
    // width = 2880 * 500/1000 = 1440 twips
    expect(widthEmu).toBe(Math.round(1440 * 914.4));
    // height = 2880 * 250/1000 = 720 twips
    expect(heightEmu).toBe(Math.round(720 * 914.4));
  });

  it("subtracts cropping", () => {
    const pic: PicData = {
      widthTwips: 2880,
      heightTwips: 2880,
      scaleX: 1000,
      scaleY: 1000,
      cropLeft: 200,
      cropTop: 100,
      cropRight: 200,
      cropBottom: 100,
      contentType: "image/png",
      imageData: new Uint8Array(0),
    };

    const { widthEmu, heightEmu } = picToDisplayEmu(pic);
    // width = 2880 - 200 - 200 = 2480 twips
    expect(widthEmu).toBe(Math.round(2480 * 914.4));
    // height = 2880 - 100 - 100 = 2680 twips
    expect(heightEmu).toBe(Math.round(2680 * 914.4));
  });

  it("clamps to zero for excessive cropping", () => {
    const pic: PicData = {
      widthTwips: 100,
      heightTwips: 100,
      scaleX: 1000,
      scaleY: 1000,
      cropLeft: 500,
      cropTop: 500,
      cropRight: 500,
      cropBottom: 500,
      contentType: "image/png",
      imageData: new Uint8Array(0),
    };

    const { widthEmu, heightEmu } = picToDisplayEmu(pic);
    expect(widthEmu).toBe(0);
    expect(heightEmu).toBe(0);
  });
});
