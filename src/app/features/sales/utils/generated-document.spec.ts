import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { generatedDocument } from './generated-document';

/**
 * The header is the only place the real filename exists on this side — it is
 * built from the document's own number and issue date, which only the server
 * knows. Parse it wrongly and every invoice is saved as something invented
 * here, which is the bug this replaced.
 */
describe('generatedDocument', () => {
  const FILENAME = 'Ayisha Mohammed - Invoice INV-202610-35FB345A - 21 Oct 2026.pdf';

  const response = (disposition?: string): HttpResponse<Blob> =>
    new HttpResponse({
      body: new Blob(['pdf']),
      headers: new HttpHeaders(
        disposition ? { 'Content-Disposition': disposition } : {},
      ),
    });

  it('prefers the encoded form, which survives an accented name', () => {
    const header =
      `attachment; filename="Caf_ Noel.pdf"; ` +
      `filename*=UTF-8''${encodeURIComponent('Café Noël.pdf')}`;

    expect(generatedDocument(response(header), 'x.pdf').fileName).toBe('Café Noël.pdf');
  });

  it('reads the quoted plain form when that is all there is', () => {
    expect(
      generatedDocument(response(`attachment; filename="${FILENAME}"`), 'x.pdf').fileName,
    ).toBe(FILENAME);
  });

  it('reads an unquoted filename too', () => {
    expect(
      generatedDocument(response('attachment; filename=Invoice.pdf'), 'x.pdf').fileName,
    ).toBe('Invoice.pdf');
  });

  /* The name has spaces and hyphens in it, so a parser that stopped at the
     first space would save "Ayisha". */
  it('keeps the whole name, spaces and all', () => {
    const name = generatedDocument(
      response(`attachment; filename="${FILENAME}"`),
      'x.pdf',
    ).fileName;

    expect(name).toContain('Ayisha Mohammed');
    expect(name).toContain('INV-202610-35FB345A');
    expect(name).toContain('21 Oct 2026');
  });

  /* CORS may not be exposing the header yet on an older deployment, in which
     case the browser hides it from us entirely. A dull name beats a download
     that fails. */
  it('falls back when the header is absent', () => {
    expect(generatedDocument(response(), 'Invoice.pdf').fileName).toBe('Invoice.pdf');
  });

  it('falls back rather than throwing on a malformed encoding', () => {
    const header = "attachment; filename*=UTF-8''%E0%A4%A";

    expect(generatedDocument(response(header), 'Invoice.pdf').fileName).toBe(
      'Invoice.pdf',
    );
  });

  it('carries the blob through', async () => {
    const { blob } = generatedDocument(response(), 'Invoice.pdf');

    expect(await blob.text()).toBe('pdf');
  });
});
