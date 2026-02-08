/**
 * @file src/pdf/native/filters/crypt.spec.ts
 */

import { zlibSync } from "fflate";
import { loadNativePdfDocument } from "../document/document";
import { concatBytes, int32le, objKeySalt } from "../encryption/bytes";
import { md5 } from "../encryption/md5";
import { rc4 } from "../encryption/rc4";

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function asciiBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodePasswordBytes(password: string): Uint8Array {
  const bytes = new Uint8Array(password.length);
  for (let i = 0; i < password.length; i += 1) {bytes[i] = password.charCodeAt(i) & 0xff;}
  return bytes;
}

function padPassword32(passwordBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  const n = Math.min(passwordBytes.length, 32);
  out.set(passwordBytes.subarray(0, n), 0);
  if (n < 32) {out.set(PASSWORD_PADDING.subarray(0, 32 - n), n);}
  return out;
}

function xorKey(key: Uint8Array, value: number): Uint8Array {
  const out = new Uint8Array(key.length);
  for (let i = 0; i < key.length; i += 1) {out[i] = (key[i] ?? 0) ^ (value & 0xff);}
  return out;
}

function computeOwnerKeyR3(ownerPassword32: Uint8Array, keyLengthBytes: number): Uint8Array {
  const state = { digest: md5(ownerPassword32).slice(0, keyLengthBytes) };
  for (let i = 0; i < 50; i += 1) {state.digest = md5(state.digest).slice(0, keyLengthBytes);}
  return state.digest;
}

function computeOValueR3(ownerKey: Uint8Array, userPassword32: Uint8Array): Uint8Array {
  const state = { cur: rc4(ownerKey, userPassword32) };
  for (let i = 1; i <= 19; i += 1) {state.cur = rc4(xorKey(ownerKey, i), state.cur);}
  return state.cur;
}

function computeFileKeyR3(args: {
  readonly userPassword32: Uint8Array;
  readonly o: Uint8Array;
  readonly p: number;
  readonly id0: Uint8Array;
  readonly keyLengthBytes: number;
}): Uint8Array {
  const seed = concatBytes(args.userPassword32, args.o, int32le(args.p), args.id0);
  const state = { digest: md5(seed).slice(0, args.keyLengthBytes) };
  for (let i = 0; i < 50; i += 1) {state.digest = md5(state.digest).slice(0, args.keyLengthBytes);}
  return state.digest;
}

function computeU16R3(fileKey: Uint8Array, id0: Uint8Array): Uint8Array {
  const state = { cur: md5(concatBytes(PASSWORD_PADDING, id0)) };
  state.cur = rc4(fileKey, state.cur);
  for (let i = 1; i <= 19; i += 1) {state.cur = rc4(xorKey(fileKey, i), state.cur);}
  return state.cur;
}

function deriveObjectKeyRc4(fileKey: Uint8Array, objNum: number, gen: number): Uint8Array {
  const digest = md5(concatBytes(fileKey, objKeySalt(objNum, gen)));
  return digest.slice(0, Math.min(fileKey.length + 5, 16));
}

function buildEncryptedCryptFlatePdfR3(args: { readonly password: string; readonly text: string }): Uint8Array {
  // Deterministic file ID for test stability.
  const id0 = new Uint8Array(Array.from({ length: 16 }, (_, i) => (i * 7) & 0xff));
  const p = -4;
  const keyLengthBytes = 16;

  const userPassword32 = padPassword32(encodePasswordBytes(args.password));
  const ownerPassword32 = padPassword32(encodePasswordBytes(args.password));
  const ownerKey = computeOwnerKeyR3(ownerPassword32, keyLengthBytes);
  const o = computeOValueR3(ownerKey, userPassword32);
  const fileKey = computeFileKeyR3({ userPassword32, o, p, id0, keyLengthBytes });
  const u16 = computeU16R3(fileKey, id0);
  const u = new Uint8Array(32);
  u.set(u16, 0);

  const contentPlain = `BT /F1 12 Tf 72 720 Td (${args.text}) Tj ET\n`;
  const compressed = zlibSync(asciiBytes(contentPlain));
  const encrypted = rc4(deriveObjectKeyRc4(fileKey, 4, 0), compressed);

  const obj1 = asciiBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const obj2 = asciiBytes("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");
  const obj3 = asciiBytes(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n",
  );

  const streamPrefix = asciiBytes(
    `4 0 obj\n<< /Length ${encrypted.length} /Filter [/Crypt /FlateDecode] >>\nstream\n`,
  );
  const streamSuffix = asciiBytes("\nendstream\nendobj\n");
  const obj4 = concatBytes(streamPrefix, encrypted, streamSuffix);

  const obj5 = asciiBytes(
    `5 0 obj\n<< /Filter /Standard /V 2 /R 3 /Length 128 /O <${toHex(o)}> /U <${toHex(u)}> /P ${p} >>\nendobj\n`,
  );

  const header = asciiBytes("%PDF-1.4\n");
  const objects = [obj1, obj2, obj3, obj4, obj5];

  const offsets = new Map<number, number>();
  const cursor = { value: header.length };
  offsets.set(1, cursor.value);
  cursor.value += obj1.length;
  offsets.set(2, cursor.value);
  cursor.value += obj2.length;
  offsets.set(3, cursor.value);
  cursor.value += obj3.length;
  offsets.set(4, cursor.value);
  cursor.value += obj4.length;
  offsets.set(5, cursor.value);
  cursor.value += obj5.length;

  const xrefStart = cursor.value;
  const size = 6;
  const xrefLines: string[] = [];
  xrefLines.push("xref\n");
  xrefLines.push(`0 ${size}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let i = 1; i < size; i += 1) {
    const off = offsets.get(i) ?? 0;
    xrefLines.push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }

  const idHex = toHex(id0);
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R /Encrypt 5 0 R /ID [<${idHex}> <${idHex}>] >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return concatBytes(
    header,
    ...objects,
    asciiBytes(xrefLines.join("")),
    asciiBytes(trailer),
  );
}

describe("decodeStreamData (Crypt filter)", () => {
  it("accepts /Filter [/Crypt /FlateDecode] for encrypted PDFs (Crypt is a no-op after object decryption)", () => {
    const bytes = buildEncryptedCryptFlatePdfR3({ password: "pw", text: "HELLO" });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "pw" } });
    const page0 = doc.getPages()[0]!;
    const decoded = page0.getDecodedContentStreams();
    expect(decoded.length).toBe(1);
    const content = new TextDecoder("latin1").decode(decoded[0]!);
    expect(content).toContain("(HELLO)");
  });

  it("skips decryption for /Crypt with /DecodeParms << /Name /Identity >>", () => {
    const password = "pw";

    // Deterministic file ID for test stability.
    const id0 = new Uint8Array(Array.from({ length: 16 }, (_, i) => (i * 7) & 0xff));
    const p = -4;
    const keyLengthBytes = 16;

    const userPassword32 = padPassword32(encodePasswordBytes(password));
    const ownerPassword32 = padPassword32(encodePasswordBytes(password));
    const ownerKey = computeOwnerKeyR3(ownerPassword32, keyLengthBytes);
    const o = computeOValueR3(ownerKey, userPassword32);
    const fileKey = computeFileKeyR3({ userPassword32, o, p, id0, keyLengthBytes });
    const u16 = computeU16R3(fileKey, id0);
    const u = new Uint8Array(32);
    u.set(u16, 0);

    const contentPlain = "BT /F1 12 Tf 72 720 Td (HELLO) Tj ET\n";
    const compressed = zlibSync(asciiBytes(contentPlain));
    // Intentionally NOT encrypted: /Crypt /Name /Identity means this stream stays plaintext.
    const streamBytes = compressed;

    const obj1 = asciiBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    const obj2 = asciiBytes("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");
    const obj3 = asciiBytes(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n",
    );

    const streamPrefix = asciiBytes(
      `4 0 obj\n<< /Length ${streamBytes.length} /Filter [/Crypt /FlateDecode] /DecodeParms [<< /Name /Identity >> null] >>\nstream\n`,
    );
    const streamSuffix = asciiBytes("\nendstream\nendobj\n");
    const obj4 = concatBytes(streamPrefix, streamBytes, streamSuffix);

    const obj5 = asciiBytes(
      `5 0 obj\n<< /Filter /Standard /V 2 /R 3 /Length 128 /O <${toHex(o)}> /U <${toHex(u)}> /P ${p} >>\nendobj\n`,
    );

    const header = asciiBytes("%PDF-1.4\n");
    const objects = [obj1, obj2, obj3, obj4, obj5];

    const offsets = new Map<number, number>();
    const cursor = { value: header.length };
    offsets.set(1, cursor.value);
    cursor.value += obj1.length;
    offsets.set(2, cursor.value);
    cursor.value += obj2.length;
    offsets.set(3, cursor.value);
    cursor.value += obj3.length;
    offsets.set(4, cursor.value);
    cursor.value += obj4.length;
    offsets.set(5, cursor.value);
    cursor.value += obj5.length;

    const xrefStart = cursor.value;
    const size = 6;
    const xrefLines: string[] = [];
    xrefLines.push("xref\n");
    xrefLines.push(`0 ${size}\n`);
    xrefLines.push("0000000000 65535 f \n");
    for (let i = 1; i < size; i += 1) {
      const off = offsets.get(i) ?? 0;
      xrefLines.push(`${String(off).padStart(10, "0")} 00000 n \n`);
    }

    const idHex = toHex(id0);
    const trailer = `trailer\n<< /Size ${size} /Root 1 0 R /Encrypt 5 0 R /ID [<${idHex}> <${idHex}>] >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    const bytes = concatBytes(
      header,
      ...objects,
      asciiBytes(xrefLines.join("")),
      asciiBytes(trailer),
    );

    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "password", password } });
    const page0 = doc.getPages()[0]!;
    const decoded = page0.getDecodedContentStreams();
    expect(decoded.length).toBe(1);
    const content = new TextDecoder("latin1").decode(decoded[0]!);
    expect(content).toContain("(HELLO)");
  });
});
