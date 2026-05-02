/** @file Types for the zstd-codec package. */

declare module "zstd-codec" {
  export type ZstdSimple = {
    compress(data: Uint8Array, level?: number): Uint8Array | null;
  };

  export type ZstdBinding = {
    readonly Simple: new () => ZstdSimple;
  };

  export type ZstdCodecStatic = {
    run(callback: (binding: ZstdBinding) => void): void;
  };

  export const ZstdCodec: ZstdCodecStatic;
}
