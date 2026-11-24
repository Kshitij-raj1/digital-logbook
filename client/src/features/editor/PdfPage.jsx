import { useEffect, useRef, useState } from 'react';
import CustomField from './CustomField.jsx';
import FormWidget from './FormWidget.jsx';
import InkLayer from './InkLayer.jsx';
import { rectToCss } from './pdfjs.js';

// One page of the PDF, made of three layers stacked on each other:
//   1. a canvas with the page drawn by pdf.js
//   2. HTML inputs for the PDF's form fields, plus the fields the user added
//   3. the ink layer for pen strokes
export default function PdfPage({ pdf, pageNumber, scale, draft, actions, tool, onToolChange, pen }) {
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 800 });
  const [widgets, setWidgets] = useState([]);
  const [selected, setSelected] = useState(null);

  // Draw the page and read its form fields. Runs again when the zoom changes.
  useEffect(() => {
    let cancelled = false;
    let renderTask;
    (async () => {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1; // keeps the page sharp on high-resolution screens
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setSize({ w: viewport.width, h: viewport.height });

      renderTask = page.render({
        canvasContext: canvas.getContext('2d'), canvas, viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
      });
      try { await renderTask.promise; } catch { /* render cancelled */ }

      const annotations = await page.getAnnotations({ intent: 'display' });
      if (cancelled) return;
      setWidgets(annotations
        .filter((a) => a.subtype === 'Widget' && a.fieldName)
        .map((a) => ({ annotation: a, box: rectToCss(a.rect, viewport) })));
    })();
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pdf, pageNumber, scale]);

  const customFields = draft.custom.filter((c) => c.page === pageNumber);
  const strokes = draft.strokes.filter((s) => s.page === pageNumber);
  // When a pen or placing tool is active, the inputs must not catch clicks
  const widgetsInteractive = tool === 'select';

  return (
    <div className="page-wrap">
      <div className="page-label">Page {pageNumber} / {pdf.numPages}</div>
      <div className="page" style={{ width: size.w, height: size.h }} onPointerDown={() => setSelected(null)}>
        <canvas ref={canvasRef} />

        <div className="layer" style={{ pointerEvents: widgetsInteractive ? 'auto' : 'none' }}>
          {widgets.map(({ annotation, box }, i) => (
            <FormWidget key={`${annotation.id}-${i}`} annotation={annotation} box={box} scale={scale}
              fields={draft.fields} setField={actions.setField} />
          ))}
          {customFields.map((c) => (
            <CustomField key={c.id} field={c} scale={scale} selected={selected === c.id}
              onSelect={() => setSelected(c.id)} onChange={(patch) => actions.updateCustom(c.id, patch)} onDelete={() => actions.deleteCustom(c.id)} />
          ))}
        </div>

        <InkLayer pageNumber={pageNumber} size={size} scale={scale} strokes={strokes} tool={tool} pen={pen}
          actions={actions} onPlaced={() => onToolChange('select')} />
      </div>
    </div>
  );
}
