/**
 * @file src/pdf/native/encryption/r6-hash.spec.ts
 */

import { createCipheriv, createHash } from "node:crypto";
import { computeR6HardenedHash } from "./r6-hash";

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {throw new Error("hex must have even length");}
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

function computeR6HardenedHashNode(args: { readonly passwordBytes: Uint8Array; readonly salt: Uint8Array; readonly userKey?: Uint8Array }): Uint8Array {
  const u = args.userKey ?? new Uint8Array(0);
  let k = createHash("sha256").update(Buffer.from(args.passwordBytes)).update(Buffer.from(args.salt)).update(Buffer.from(u)).digest();
  let e = Buffer.alloc(0);
  for (let i = 0; ; i += 1) {
    const k1 = Buffer.concat([Buffer.from(args.passwordBytes), k, Buffer.from(u)]);
    const k1Repeated = Buffer.from(repeatBytes(new Uint8Array(k1), 64));
    const key = k.subarray(0, 16);
    const iv = k.subarray(16, 32);
    const cipher = createCipheriv("aes-128-cbc", key, iv);
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

describe("computeR6HardenedHash()", () => {
  it("matches node:crypto reference implementation", () => {
    const passwordBytes = new TextEncoder().encode("pw");
    const salt = fromHex("0001020304050607");
    const userKey = fromHex("00".repeat(48));

    const expected = computeR6HardenedHashNode({ passwordBytes, salt, userKey });
    const actual = computeR6HardenedHash({ passwordBytes, salt, userKey });

    expect(toHex(actual)).toBe(toHex(expected));
    expect(actual.length).toBe(32);
  });
});

