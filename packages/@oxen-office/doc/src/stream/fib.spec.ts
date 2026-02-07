/** @file FIB parser tests */
import { parseFib } from "./fib";

describe("parseFib", () => {
  it("rejects too-short stream", () => {
    expect(() => parseFib(new Uint8Array(100))).toThrow("too short for FIB");
  });

  it("rejects invalid magic number", () => {
    const data = new Uint8Array(1024);
    // Set wrong magic
    new DataView(data.buffer).setUint16(0, 0xbeef, true);
    expect(() => parseFib(data)).toThrow("Invalid DOC magic number");
  });

  it("parses valid FIB header fields", () => {
    const data = new Uint8Array(1024);
    const view = new DataView(data.buffer);

    // wIdent
    view.setUint16(0, 0xa5ec, true);
    // nFib
    view.setUint16(2, 0x00c1, true);
    // flags at 0x0A – set bit 9 (fWhichTblStm = 1Table)
    view.setUint16(0x0a, 0x0200, true);
    // ccpText at 0x004C
    view.setInt32(0x004c, 42, true);
    // ccpFtn at 0x0050
    view.setInt32(0x0050, 5, true);
    // ccpHdd at 0x0054
    view.setInt32(0x0054, 3, true);
    // ccpAtn at 0x005C
    view.setInt32(0x005c, 1, true);
    // fcClx at 0x01A2
    view.setUint32(0x01a2, 256, true);
    // lcbClx at 0x01A6
    view.setUint32(0x01a6, 100, true);

    const fib = parseFib(data);

    expect(fib.wIdent).toBe(0xa5ec);
    expect(fib.nFib).toBe(0x00c1);
    expect(fib.fWhichTblStm).toBe(true);
    expect(fib.ccpText).toBe(42);
    expect(fib.ccpFtn).toBe(5);
    expect(fib.ccpHdd).toBe(3);
    expect(fib.ccpAtn).toBe(1);
    expect(fib.fcClx).toBe(256);
    expect(fib.lcbClx).toBe(100);
  });

  it("reads fWhichTblStm=false when bit 9 is clear", () => {
    const data = new Uint8Array(1024);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0xa5ec, true);
    view.setUint16(0x0a, 0x0000, true);

    const fib = parseFib(data);
    expect(fib.fWhichTblStm).toBe(false);
  });
});
