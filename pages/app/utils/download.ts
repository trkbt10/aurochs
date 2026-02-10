/**
 * @file Browser file download utility.
 */

/**
 * Trigger a browser download of binary data as a file.
 */
export function downloadBlob(bytes: Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
