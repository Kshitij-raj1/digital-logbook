import { PDFDocument } from 'pdf-lib';
import { config } from '../config.js';
import { HttpError, badRequest as bad } from '../lib/httpError.js';

// Checks an uploaded PDF. We don't trust the file name or the content type the browser sends.
export async function validatePdf(buf) {
  if (!buf || buf.length < 8) throw bad('Empty file');
  if (buf.length > config.maxPdfBytes) throw new HttpError(413, 'File too large');
  // It must start like a PDF ("%PDF-" near the top of the file)
  if (!buf.subarray(0, 1024).toString('latin1').includes('%PDF-')) throw bad('Not a PDF file');
  // No JavaScript, launch actions or attachments. Logbook forms don't need them.
  const raw = buf.toString('latin1');
  if (/\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(raw)) {
    throw bad('PDF contains scripts, launch actions or embedded files, which are not allowed');
  }
  // It has to open properly and must not be password protected
  let doc;
  try {
    doc = await PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
  } catch (e) {
    throw bad(/encrypt/i.test(e.message) ? 'Encrypted PDFs are not supported' : 'PDF is corrupt or unreadable');
  }
  const pages = doc.getPageCount();
  if (pages < 1 || pages > config.maxPages) throw bad(`PDF must have between 1 and ${config.maxPages} pages`);
  return { pages };
}
