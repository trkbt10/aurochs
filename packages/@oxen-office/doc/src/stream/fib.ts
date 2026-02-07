/**
 * @file FIB (File Information Block) parser for .doc binary format
 *
 * Reference: [MS-DOC] 2.5.1 – Fib
 * The FIB is located at offset 0 of the WordDocument stream.
 */

/** Parsed FIB data extracted from .doc binary. */
export type Fib = {
  /** Magic number (must be 0xA5EC for Word doc) */
  readonly wIdent: number;
  /** nFib – version number */
  readonly nFib: number;
  /** Which table stream to use: false = "0Table", true = "1Table" */
  readonly fWhichTblStm: boolean;

  // --- FibRgLw97 character counts ---
  /** Character position of the last character of text + 1 */
  readonly ccpText: number;
  /** Character count of footnote text */
  readonly ccpFtn: number;
  /** Character count of header text */
  readonly ccpHdd: number;
  /** Character count of comment text */
  readonly ccpAtn: number;
  /** Character count of endnote text */
  readonly ccpEdn: number;
  /** Character count of textbox text */
  readonly ccpTxbx: number;
  /** Character count of header textbox text */
  readonly ccpHdrTxbx: number;

  // --- FibRgFcLcb97 offsets (fc=table stream offset, lcb=byte count) ---

  /** Style sheet (STSH) */
  readonly fcStshf: number;
  readonly lcbStshf: number;
  /** Footnote references (PlcffndRef) */
  readonly fcPlcffndRef: number;
  readonly lcbPlcffndRef: number;
  /** Footnote text (PlcffndTxt) */
  readonly fcPlcffndTxt: number;
  readonly lcbPlcffndTxt: number;
  /** Comment references (PlcfandRef) */
  readonly fcPlcfandRef: number;
  readonly lcbPlcfandRef: number;
  /** Comment text (PlcfandTxt) */
  readonly fcPlcfandTxt: number;
  readonly lcbPlcfandTxt: number;
  /** Section descriptors (PlcfSed) */
  readonly fcPlcfSed: number;
  readonly lcbPlcfSed: number;
  /** Header/footer (PlcfHdd) */
  readonly fcPlcfHdd: number;
  readonly lcbPlcfHdd: number;
  /** Character property BinTable (PlcfbteChpx) */
  readonly fcPlcfbteChpx: number;
  readonly lcbPlcfbteChpx: number;
  /** Paragraph property BinTable (PlcfbtePapx) */
  readonly fcPlcfbtePapx: number;
  readonly lcbPlcfbtePapx: number;
  /** Font table (SttbfFfn) */
  readonly fcSttbfFfn: number;
  readonly lcbSttbfFfn: number;
  /** Field positions main text (PlcfFldMom) */
  readonly fcPlcfFldMom: number;
  readonly lcbPlcfFldMom: number;
  /** Bookmark names (SttbfBkmk) */
  readonly fcSttbfBkmk: number;
  readonly lcbSttbfBkmk: number;
  /** Bookmark start positions (PlcfBkf) */
  readonly fcPlcfBkf: number;
  readonly lcbPlcfBkf: number;
  /** Bookmark end positions (PlcfBkl) */
  readonly fcPlcfBkl: number;
  readonly lcbPlcfBkl: number;
  /** Offset of Clx in table stream */
  readonly fcClx: number;
  /** Size of Clx in table stream */
  readonly lcbClx: number;
  /** Comment authors (grpXstAtnOwners) */
  readonly fcGrpXstAtnOwners: number;
  readonly lcbGrpXstAtnOwners: number;
  /** Annotation bookmark names (SttbfAtnBkmk) */
  readonly fcSttbfAtnBkmk: number;
  readonly lcbSttbfAtnBkmk: number;
  /** Shape positions in main text (PlcSpaMom) */
  readonly fcPlcSpaMom: number;
  readonly lcbPlcSpaMom: number;
  /** Annotation bookmark start (PlcfAtnBkf) */
  readonly fcPlcfAtnBkf: number;
  readonly lcbPlcfAtnBkf: number;
  /** Annotation bookmark end (PlcfAtnBkl) */
  readonly fcPlcfAtnBkl: number;
  readonly lcbPlcfAtnBkl: number;
  /** Endnote references (PlcfendRef) */
  readonly fcPlcfendRef: number;
  readonly lcbPlcfendRef: number;
  /** Endnote text (PlcfendTxt) */
  readonly fcPlcfendTxt: number;
  readonly lcbPlcfendTxt: number;
  /** OfficeArt drawing info (DggInfo) */
  readonly fcDggInfo: number;
  readonly lcbDggInfo: number;
  /** List definitions (PlfLst) */
  readonly fcPlfLst: number;
  readonly lcbPlfLst: number;
  /** List format override (PlfLfo) */
  readonly fcPlfLfo: number;
  readonly lcbPlfLfo: number;
  /** Textbox text positions (PlcfTxbxTxt) */
  readonly fcPlcfTxbxTxt: number;
  readonly lcbPlcfTxbxTxt: number;
};

/** Parse the FIB from the WordDocument stream. */
export function parseFib(data: Uint8Array): Fib {
  if (data.length < 898) {
    throw new Error(`WordDocument stream too short for FIB: ${data.length} bytes`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const wIdent = view.getUint16(0, true);
  if (wIdent !== 0xa5ec) {
    throw new Error(`Invalid DOC magic number: 0x${wIdent.toString(16)} (expected 0xA5EC)`);
  }

  const nFib = view.getUint16(2, true);

  // FibBase.flags at offset 0x0A (2 bytes)
  const flags = view.getUint16(0x0a, true);
  const fWhichTblStm = (flags & 0x0200) !== 0; // bit 9

  // FibRgLw97 starts at offset 64 (22 × uint32)
  // Layout: [0]cbMac, [1-2]reserved, [3]ccpText, [4]ccpFtn, [5]ccpHdd,
  //         [6]ccpMcr, [7]ccpAtn, [8]ccpEdn, [9]ccpTxbx, [10]ccpHdrTxbx, ...
  const ccpText = view.getInt32(0x004c, true);     // index 3: 64 + 12 = 76
  const ccpFtn = view.getInt32(0x0050, true);      // index 4: 64 + 16 = 80
  const ccpHdd = view.getInt32(0x0054, true);      // index 5: 64 + 20 = 84
  const ccpAtn = view.getInt32(0x005c, true);      // index 7: 64 + 28 = 92
  const ccpEdn = view.getInt32(0x0060, true);      // index 8: 64 + 32 = 96
  const ccpTxbx = view.getInt32(0x0064, true);     // index 9: 64 + 36 = 100
  const ccpHdrTxbx = view.getInt32(0x0068, true);  // index 10: 64 + 40 = 104

  // FibRgFcLcb97 starts at offset 154
  // Helper to read fc/lcb pair
  const fcLcb = (absOffset: number) => ({
    fc: view.getUint32(absOffset, true),
    lcb: view.getUint32(absOffset + 4, true),
  });

  const stshf = fcLcb(162);
  const plcffndRef = fcLcb(170);
  const plcffndTxt = fcLcb(178);
  const plcfandRef = fcLcb(186);
  const plcfandTxt = fcLcb(194);
  const plcfSed = fcLcb(202);
  const plcfHdd = fcLcb(242);
  const plcfbteChpx = fcLcb(250);
  const plcfbtePapx = fcLcb(258);
  const sttbfFfn = fcLcb(274);
  const plcfFldMom = fcLcb(282);
  const sttbfBkmk = fcLcb(322);
  const plcfBkf = fcLcb(330);
  const plcfBkl = fcLcb(338);
  const clx = fcLcb(418);
  const grpXstAtnOwners = fcLcb(442);
  const sttbfAtnBkmk = fcLcb(450);
  const plcSpaMom = fcLcb(474);
  const plcfAtnBkf = fcLcb(490);
  const plcfAtnBkl = fcLcb(498);
  const plcfendRef = fcLcb(522);
  const plcfendTxt = fcLcb(530);
  const dggInfo = fcLcb(554);
  const plfLst = fcLcb(738);
  const plfLfo = fcLcb(746);
  const plcfTxbxTxt = fcLcb(602);

  return {
    wIdent,
    nFib,
    fWhichTblStm,
    ccpText,
    ccpFtn,
    ccpHdd,
    ccpAtn,
    ccpEdn,
    ccpTxbx,
    ccpHdrTxbx,
    fcStshf: stshf.fc,
    lcbStshf: stshf.lcb,
    fcPlcffndRef: plcffndRef.fc,
    lcbPlcffndRef: plcffndRef.lcb,
    fcPlcffndTxt: plcffndTxt.fc,
    lcbPlcffndTxt: plcffndTxt.lcb,
    fcPlcfandRef: plcfandRef.fc,
    lcbPlcfandRef: plcfandRef.lcb,
    fcPlcfandTxt: plcfandTxt.fc,
    lcbPlcfandTxt: plcfandTxt.lcb,
    fcPlcfSed: plcfSed.fc,
    lcbPlcfSed: plcfSed.lcb,
    fcPlcfHdd: plcfHdd.fc,
    lcbPlcfHdd: plcfHdd.lcb,
    fcPlcfbteChpx: plcfbteChpx.fc,
    lcbPlcfbteChpx: plcfbteChpx.lcb,
    fcPlcfbtePapx: plcfbtePapx.fc,
    lcbPlcfbtePapx: plcfbtePapx.lcb,
    fcSttbfFfn: sttbfFfn.fc,
    lcbSttbfFfn: sttbfFfn.lcb,
    fcPlcfFldMom: plcfFldMom.fc,
    lcbPlcfFldMom: plcfFldMom.lcb,
    fcSttbfBkmk: sttbfBkmk.fc,
    lcbSttbfBkmk: sttbfBkmk.lcb,
    fcPlcfBkf: plcfBkf.fc,
    lcbPlcfBkf: plcfBkf.lcb,
    fcPlcfBkl: plcfBkl.fc,
    lcbPlcfBkl: plcfBkl.lcb,
    fcClx: clx.fc,
    lcbClx: clx.lcb,
    fcGrpXstAtnOwners: grpXstAtnOwners.fc,
    lcbGrpXstAtnOwners: grpXstAtnOwners.lcb,
    fcSttbfAtnBkmk: sttbfAtnBkmk.fc,
    lcbSttbfAtnBkmk: sttbfAtnBkmk.lcb,
    fcPlcSpaMom: plcSpaMom.fc,
    lcbPlcSpaMom: plcSpaMom.lcb,
    fcPlcfAtnBkf: plcfAtnBkf.fc,
    lcbPlcfAtnBkf: plcfAtnBkf.lcb,
    fcPlcfAtnBkl: plcfAtnBkl.fc,
    lcbPlcfAtnBkl: plcfAtnBkl.lcb,
    fcPlcfendRef: plcfendRef.fc,
    lcbPlcfendRef: plcfendRef.lcb,
    fcPlcfendTxt: plcfendTxt.fc,
    lcbPlcfendTxt: plcfendTxt.lcb,
    fcDggInfo: dggInfo.fc,
    lcbDggInfo: dggInfo.lcb,
    fcPlfLst: plfLst.fc,
    lcbPlfLst: plfLst.lcb,
    fcPlfLfo: plfLfo.fc,
    lcbPlfLfo: plfLfo.lcb,
    fcPlcfTxbxTxt: plcfTxbxTxt.fc,
    lcbPlcfTxbxTxt: plcfTxbxTxt.lcb,
  };
}
