/**
 * Hands a blob to the browser as a file download.
 *
 * The object URL is revoked immediately after the click: the browser has
 * already taken its own reference to the data by then, and leaving the URL
 * alive keeps the whole blob in memory for the life of the document.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  globalThis.URL.revokeObjectURL(url);
}
