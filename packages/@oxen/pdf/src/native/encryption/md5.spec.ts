/**
 * @file src/pdf/native/encryption/md5.spec.ts
 */

import { md5 } from "./md5";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("md5", () => {
  it("matches known vectors", () => {
    expect(hex(md5(new TextEncoder().encode("")))).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(hex(md5(new TextEncoder().encode("abc")))).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(hex(md5(new TextEncoder().encode("message digest")))).toBe("f96b697d7cb7938d525a2f31aaf161d0");
  });
});
