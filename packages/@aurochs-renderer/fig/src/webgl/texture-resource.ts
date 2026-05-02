/** @file WebGL texture resource identities. */

export type TextureResourceId = string & { readonly __brand: "TextureResourceId" };

export type ImageTextureResource = {
  readonly kind: "image";
  readonly id: TextureResourceId;
  readonly imageRef: string;
};

export type TextureResource = ImageTextureResource;

function makeTextureResourceId(value: string): TextureResourceId {
  return value as TextureResourceId;
}

/** Build the domain identity for an image texture. */
export function imageTextureResource(imageRef: string): ImageTextureResource {
  if (imageRef.length === 0) {
    throw new Error("imageTextureResource requires a non-empty imageRef");
  }
  return {
    kind: "image",
    id: makeTextureResourceId(`image:${imageRef}`),
    imageRef,
  };
}
