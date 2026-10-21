/**
 * A PDF the API generated, and what it is called.
 *
 * The name comes from the server's `Content-Disposition` header rather than
 * being built here. Two thirds of it — the document's number and the date it
 * was issued — are decided when the PDF is made, so rebuilding it on this
 * side would be a second copy of a format that identifies a legal document
 * to a customer. The old `invoice-<uuid>.pdf` was exactly that: a name
 * invented by whoever happened to be saving the file.
 */

import { HttpResponse } from '@angular/common/http';

export interface GeneratedDocument {
  readonly blob: Blob;
  readonly fileName: string;
}

/**
 * `filename*=UTF-8''...` first, then the plain `filename="..."`.
 *
 * The starred form is the one that survives an accented customer name, and
 * the server sends both. Anything percent-encoded in it is decoded here.
 */
function parseFileName(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);

  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      /* A malformed encoding should fall through to the plain parameter
         rather than throw in the middle of a download. */
    }
  }

  const plain = /filename="([^"]+)"/i.exec(header) ?? /filename=([^;]+)/i.exec(header);

  return plain ? plain[1].trim() : null;
}

/**
 * Pulls the blob and its name out of a PDF response.
 *
 * `fallback` covers the one case the header cannot: a deployment where CORS
 * is not yet exposing `Content-Disposition`, where the browser hides it from
 * us entirely. Better a dull name than a download that fails.
 */
export function generatedDocument(
  response: HttpResponse<Blob>,
  fallback: string,
): GeneratedDocument {
  return {
    blob: response.body ?? new Blob(),
    fileName: parseFileName(response.headers.get('Content-Disposition')) ?? fallback,
  };
}

/** Saves a blob under the name the server gave it. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  globalThis.URL.revokeObjectURL(url);
}
