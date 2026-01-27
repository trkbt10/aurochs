/**
 * @file src/pdf/native/encryption/standard.spec.ts
 */

import { createCipheriv } from "node:crypto";
import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import { loadNativePdfDocument } from "../document/document";
import { concatBytes, int32le, objKeySalt } from "./bytes";
import { md5 } from "./md5";
import { rc4 } from "./rc4";

const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41,
  0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

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

function deriveObjectKeyAesV2(fileKey: Uint8Array, objNum: number, gen: number): Uint8Array {
  const aesSalt = new Uint8Array([0x73, 0x41, 0x6c, 0x54]); // "sAlT"
  const digest = md5(concatBytes(fileKey, objKeySalt(objNum, gen), aesSalt));
  return digest.slice(0, Math.min(fileKey.length + 5, 16));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function asciiBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function buildEncryptedPdfR3(args: {
  readonly userPassword: string;
  readonly ownerPassword: string;
  readonly text: string;
}): Uint8Array {
  const id0 = new Uint8Array(Array.from({ length: 16 }, (_, i) => i));
  const p = -4;
  const keyLengthBytes = 16;

  const userPassword32 = padPassword32(encodePasswordBytes(args.userPassword));
  const ownerPassword32 = padPassword32(encodePasswordBytes(args.ownerPassword));
  const ownerKey = computeOwnerKeyR3(ownerPassword32, keyLengthBytes);
  const o = computeOValueR3(ownerKey, userPassword32);
  const fileKey = computeFileKeyR3({ userPassword32, o, p, id0, keyLengthBytes });
  const u16 = computeU16R3(fileKey, id0);
  const u = new Uint8Array(32);
  u.set(u16, 0);

  const contentPlain = `BT /F1 12 Tf 72 720 Td (${args.text}) Tj ET\n`;
  const contentPlainBytes = asciiBytes(contentPlain);
  const encryptedContent = rc4(deriveObjectKeyRc4(fileKey, 4, 0), contentPlainBytes);

  const obj1 = asciiBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const obj2 = asciiBytes("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");
  const obj3 = asciiBytes(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n",
  );

  const streamPrefix = asciiBytes(`4 0 obj\n<< /Length ${encryptedContent.length} >>\nstream\n`);
  const streamSuffix = asciiBytes("\nendstream\nendobj\n");
  const obj4 = concatBytes(streamPrefix, encryptedContent, streamSuffix);

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

describe("Standard Security Handler (V=2/R=3)", () => {
  it("decrypts encrypted stream data with password", () => {
    const bytes = buildEncryptedPdfR3({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "pw" } });
    const page0 = doc.getPages()[0]!;
    const decoded = page0.getDecodedContentStreams();
    expect(decoded.length).toBe(1);
    const content = new TextDecoder("latin1").decode(decoded[0]!);
    expect(content).toContain("(HELLO)");
  });

  it("rejects with wrong password", () => {
    const bytes = buildEncryptedPdfR3({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    expect(() => loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "wrong" } })).toThrow(/password/i);
  });
});

function buildEncryptedPdfR4AesV2(args: {
  readonly userPassword: string;
  readonly ownerPassword: string;
  readonly text: string;
}): Uint8Array {
  const id0 = new Uint8Array(Array.from({ length: 16 }, (_, i) => i));
  const p = -4;
  const keyLengthBytes = 16;

  const userPassword32 = padPassword32(encodePasswordBytes(args.userPassword));
  const ownerPassword32 = padPassword32(encodePasswordBytes(args.ownerPassword));
  const ownerKey = computeOwnerKeyR3(ownerPassword32, keyLengthBytes);
  const o = computeOValueR3(ownerKey, userPassword32);
  const fileKey = computeFileKeyR3({ userPassword32, o, p, id0, keyLengthBytes });
  const u16 = computeU16R3(fileKey, id0);
  const u = new Uint8Array(32);
  u.set(u16, 0);

  const contentPlain = `BT /F1 12 Tf 72 720 Td (${args.text}) Tj ET\n`;
  const contentPlainBytes = asciiBytes(contentPlain);
  const objKey = deriveObjectKeyAesV2(fileKey, 4, 0);
  if (objKey.length !== 16) {throw new Error("expected 16-byte AES object key");}

  const iv = new Uint8Array(Array.from({ length: 16 }, (_, i) => 15 - i));
  const cipher = createCipheriv("aes-128-cbc", Buffer.from(objKey), Buffer.from(iv));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(contentPlainBytes)), cipher.final()]);
  const encryptedContent = new Uint8Array(16 + ciphertext.length);
  encryptedContent.set(iv, 0);
  encryptedContent.set(ciphertext, 16);

  const obj1 = asciiBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const obj2 = asciiBytes("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");
  const obj3 = asciiBytes(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n",
  );

  const streamPrefix = asciiBytes(`4 0 obj\n<< /Length ${encryptedContent.length} >>\nstream\n`);
  const streamSuffix = asciiBytes("\nendstream\nendobj\n");
  const obj4 = concatBytes(streamPrefix, encryptedContent, streamSuffix);

  const encryptDict = asciiBytes(
    `5 0 obj\n<< /Filter /Standard /V 4 /R 4 /Length 128 /O <${toHex(o)}> /U <${toHex(u)}> /P ${p} ` +
    "/CF << /StdCF << /CFM /AESV2 >> >> /StmF /StdCF /StrF /StdCF >>\nendobj\n",
  );

  const header = asciiBytes("%PDF-1.4\n");
  const objects = [obj1, obj2, obj3, obj4, encryptDict];

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
  cursor.value += encryptDict.length;

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

describe("Standard Security Handler (V=4/R=4, AESV2)", () => {
  it("decrypts encrypted stream data with password", () => {
    const bytes = buildEncryptedPdfR4AesV2({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "pw" } });
    const page0 = doc.getPages()[0]!;
    const decoded = page0.getDecodedContentStreams();
    expect(decoded.length).toBe(1);
    const content = new TextDecoder("latin1").decode(decoded[0]!);
    expect(content).toContain("(HELLO)");
  });

  it("rejects with wrong password", () => {
    const bytes = buildEncryptedPdfR4AesV2({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    expect(() => loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "wrong" } })).toThrow(/password/i);
  });
});

function renderPdfkitEncryptedV5(args: { readonly userPassword: string; readonly ownerPassword: string; readonly text: string }): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      compress: false,
      pdfVersion: "1.7ext3",
      userPassword: args.userPassword,
      ownerPassword: args.ownerPassword,
      permissions: {},
      info: {
        Title: "pdfkit-encrypted-v5",
        Creator: "web-pptx",
        Producer: "web-pptx pdfkit encrypted tests",
        CreationDate: new Date("2000-01-01T00:00:00.000Z"),
        ModDate: new Date("2000-01-01T00:00:00.000Z"),
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));

    doc.addPage({ size: [300, 200], margin: 0 });
    doc.fontSize(18).text(args.text, 20, 20);
    doc.end();
  });
}

describe("Standard Security Handler (V=5/R=5, AESV3)", () => {
  it("decrypts encrypted stream data with password (pdfkit-generated)", async () => {
    const bytes = await renderPdfkitEncryptedV5({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "pw" } });
    const page0 = doc.getPages()[0]!;
    const decoded = page0.getDecodedContentStreams();
    expect(decoded.length).toBe(1);
    const content = new TextDecoder("latin1").decode(decoded[0]!);
    expect(content).toContain("<48454c4c4f>");
  });

  it("rejects with wrong password (pdfkit-generated)", async () => {
    const bytes = await renderPdfkitEncryptedV5({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    expect(() => loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "wrong" } })).toThrow(/password/i);
  });
});

function mod3BigEndian(bytes: Uint8Array): 0 | 1 | 2 {
  let r = 0;
  for (const b of bytes) {
    r = (r * 256 + (b & 0xff)) % 3;
  }
  return r as 0 | 1 | 2;
}

function repeatBytes(data: Uint8Array, times: number): Uint8Array {
  const out = new Uint8Array(data.length * times);
  for (let i = 0; i < times; i += 1) {
    out.set(data, i * data.length);
  }
  return out;
}

function computeR6HardenedHashNode(args: {
  readonly passwordBytes: Uint8Array;
  readonly salt: Uint8Array;
  readonly userKey?: Uint8Array;
}): Uint8Array {
  const u = args.userKey ?? new Uint8Array(0);
  let k = createHash("sha256").update(Buffer.from(args.passwordBytes)).update(Buffer.from(args.salt)).update(Buffer.from(u)).digest();
  let e = Buffer.alloc(0);
  for (let i = 0; ; i += 1) {
    const k1 = Buffer.concat([Buffer.from(args.passwordBytes), k, Buffer.from(u)]);
    const k1Repeated = Buffer.from(repeatBytes(new Uint8Array(k1), 64));
    const aesKey = k.subarray(0, 16);
    const aesIv = k.subarray(16, 32);
    const cipher = createCipheriv("aes-128-cbc", aesKey, aesIv);
    cipher.setAutoPadding(false);
    e = Buffer.concat([cipher.update(k1Repeated), cipher.final()]);

    const selector = mod3BigEndian(new Uint8Array(e.subarray(0, 16)));
    if (selector === 0) {
      k = createHash("sha256").update(e).digest();
    } else if (selector === 1) {
      k = createHash("sha384").update(e).digest();
    } else {
      k = createHash("sha512").update(e).digest();
    }

    const last = e[e.length - 1] ?? 0;
    if (i >= 63 && last <= (i - 31)) {
      break;
    }
  }
  return new Uint8Array(k.subarray(0, 32));
}

function buildEncryptedPdfR6AesV3(args: {
  readonly userPassword: string;
  readonly ownerPassword: string;
  readonly text: string;
}): Uint8Array {
  const id0 = new Uint8Array(Array.from({ length: 16 }, (_, i) => i));
  const p = -4;

  const passwordBytes = new TextEncoder().encode(args.userPassword);
  const ownerPasswordBytes = new TextEncoder().encode(args.ownerPassword);

  const encryptionKey = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));

  const userValidationSalt = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  const userKeySalt = new Uint8Array([8, 9, 10, 11, 12, 13, 14, 15]);
  const userHash = computeR6HardenedHashNode({ passwordBytes, salt: userValidationSalt });
  const userKey = computeR6HardenedHashNode({ passwordBytes, salt: userKeySalt });

  const iv0 = Buffer.alloc(16, 0);
  const ueCipher = createCipheriv("aes-256-cbc", Buffer.from(userKey), iv0);
  ueCipher.setAutoPadding(false);
  const ue = Buffer.concat([ueCipher.update(Buffer.from(encryptionKey)), ueCipher.final()]);

  const uEntry = new Uint8Array(48);
  uEntry.set(userHash, 0);
  uEntry.set(userValidationSalt, 32);
  uEntry.set(userKeySalt, 40);

  const ownerValidationSalt = new Uint8Array([16, 17, 18, 19, 20, 21, 22, 23]);
  const ownerKeySalt = new Uint8Array([24, 25, 26, 27, 28, 29, 30, 31]);
  const ownerHash = computeR6HardenedHashNode({ passwordBytes: ownerPasswordBytes, salt: ownerValidationSalt, userKey: uEntry });
  const ownerKey = computeR6HardenedHashNode({ passwordBytes: ownerPasswordBytes, salt: ownerKeySalt, userKey: uEntry });

  const oeCipher = createCipheriv("aes-256-cbc", Buffer.from(ownerKey), iv0);
  oeCipher.setAutoPadding(false);
  const oe = Buffer.concat([oeCipher.update(Buffer.from(encryptionKey)), oeCipher.final()]);

  const oEntry = new Uint8Array(48);
  oEntry.set(ownerHash, 0);
  oEntry.set(ownerValidationSalt, 32);
  oEntry.set(ownerKeySalt, 40);

  const contentPlain = `BT /F1 12 Tf 72 720 Td (${args.text}) Tj ET\n`;
  const contentPlainBytes = asciiBytes(contentPlain);
  const iv = new Uint8Array(Array.from({ length: 16 }, (_, i) => 15 - i));
  const contentCipher = createCipheriv("aes-256-cbc", Buffer.from(encryptionKey), Buffer.from(iv));
  const contentCiphertext = Buffer.concat([contentCipher.update(Buffer.from(contentPlainBytes)), contentCipher.final()]);
  const encryptedContent = new Uint8Array(16 + contentCiphertext.length);
  encryptedContent.set(iv, 0);
  encryptedContent.set(contentCiphertext, 16);

  const obj1 = asciiBytes("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const obj2 = asciiBytes("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");
  const obj3 = asciiBytes(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n",
  );

  const streamPrefix = asciiBytes(`4 0 obj\n<< /Length ${encryptedContent.length} >>\nstream\n`);
  const streamSuffix = asciiBytes("\nendstream\nendobj\n");
  const obj4 = concatBytes(streamPrefix, encryptedContent, streamSuffix);

  const encryptDict = asciiBytes(
    `5 0 obj\n<< /Filter /Standard /V 5 /R 6 /Length 256 /O <${toHex(oEntry)}> /U <${toHex(uEntry)}> /OE <${oe.toString("hex")}> /UE <${ue.toString("hex")}> /P ${p} ` +
    "/CF << /StdCF << /CFM /AESV3 /Length 32 >> >> /StmF /StdCF /StrF /StdCF >>\nendobj\n",
  );

  const header = asciiBytes("%PDF-1.7\n");
  const objects = [obj1, obj2, obj3, obj4, encryptDict];

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
  cursor.value += encryptDict.length;

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

describe("Standard Security Handler (V=5/R=6, AESV3)", () => {
  it("decrypts encrypted stream data with password", () => {
    const bytes = buildEncryptedPdfR6AesV3({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "pw" } });
    const page0 = doc.getPages()[0]!;
    const decoded = page0.getDecodedContentStreams();
    expect(decoded.length).toBe(1);
    const content = new TextDecoder("latin1").decode(decoded[0]!);
    expect(content).toContain("(HELLO)");
  });

  it("rejects with wrong password", () => {
    const bytes = buildEncryptedPdfR6AesV3({ userPassword: "pw", ownerPassword: "pw", text: "HELLO" });
    expect(() => loadNativePdfDocument(bytes, { encryption: { mode: "password", password: "wrong" } })).toThrow(/password/i);
  });
});
