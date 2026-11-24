// pdf.js setup, plus one small helper for positions.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const loadPdf = (arrayBuffer) => pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

// PDF measures from the bottom-left corner, the screen from the top-left.
// This turns a field's rectangle from PDF units into screen pixels using the viewport's matrix.
export function rectToCss(pdfRect, viewport) {
  const [a, b, c, d, e, f] = viewport.transform;
  const [x1, y1, x2, y2] = pdfRect;
  const px = [x1 * a + y1 * c + e, x2 * a + y2 * c + e];
  const py = [x1 * b + y1 * d + f, x2 * b + y2 * d + f];
  return {
    left: Math.min(...px), top: Math.min(...py),
    width: Math.abs(px[1] - px[0]), height: Math.abs(py[1] - py[0]),
  };
}
