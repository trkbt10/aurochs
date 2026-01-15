import { unzlibSync } from "fflate";

export function decodeFlate(data: Uint8Array): Uint8Array {
  // FlateDecode uses zlib-wrapped DEFLATE per ISO 32000.
  return unzlibSync(data);
}

