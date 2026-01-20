import JSZip from "jszip";

export type GetZipTextFileContent = (path: string) => Promise<string | undefined>;

export async function createGetZipTextFileContentFromBytes(
  bytes: ArrayBuffer | Uint8Array,
): Promise<GetZipTextFileContent> {
  const zip = await JSZip.loadAsync(bytes);
  return async (path: string) => {
    const entry = zip.file(path);
    return entry ? await entry.async("text") : undefined;
  };
}

