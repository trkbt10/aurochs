/**
 * @file Type declarations for zstd-codec
 */
declare module "zstd-codec" {
  export type ZstdSimple = {
    compress(contentBytes: Uint8Array, compressionLevel?: number): Uint8Array | null;
    decompress(compressedBytes: Uint8Array): Uint8Array | null;
  }

  export type ZstdGeneric = {
    compressBound(contentBytes: Uint8Array): number | null;
    contentSize(compressedBytes: Uint8Array): number | null;
  }

  export type ZstdStreaming = {
    compressChunks(chunks: Uint8Array[], compressionLevel?: number): Uint8Array | null;
    decompressChunks(chunks: Uint8Array[]): Uint8Array | null;
  }

  export type ZstdBinding = {
    Simple: new () => ZstdSimple;
    Generic: new () => ZstdGeneric;
    Streaming: new () => ZstdStreaming;
  }

  /** ZstdCodec namespace providing static factory method. */
  export type ZstdCodecStatic = {
    run(callback: (binding: ZstdBinding) => void): void;
  };

  /** ZstdCodec factory. */
  export const ZstdCodec: ZstdCodecStatic;
}
