/**
 * Type declarations for zstd-codec
 */
declare module "zstd-codec" {
  export interface ZstdSimple {
    compress(contentBytes: Uint8Array, compressionLevel?: number): Uint8Array | null;
    decompress(compressedBytes: Uint8Array): Uint8Array | null;
  }

  export interface ZstdGeneric {
    compressBound(contentBytes: Uint8Array): number | null;
    contentSize(compressedBytes: Uint8Array): number | null;
  }

  export interface ZstdStreaming {
    compressChunks(chunks: Uint8Array[], compressionLevel?: number): Uint8Array | null;
    decompressChunks(chunks: Uint8Array[]): Uint8Array | null;
  }

  export interface ZstdBinding {
    Simple: new () => ZstdSimple;
    Generic: new () => ZstdGeneric;
    Streaming: new () => ZstdStreaming;
  }

  export class ZstdCodec {
    static run(callback: (binding: ZstdBinding) => void): void;
  }
}
