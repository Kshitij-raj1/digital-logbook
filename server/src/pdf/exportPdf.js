// Builds the downloadable PDF from the template and a saved draft.
// "Flattened" means the form fields are turned into normal page content, so the file can't be edited
// anymore and looks the same in every PDF viewer.
import {
  PDFDocument, PDFName, PDFRef, StandardFonts, rgb,
  PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList,
} from 'pdf-lib';

const INK = rgb(0.05, 0.05, 0.05);

// The built-in PDF font only has basic Latin characters. Anything else becomes "?" so export doesn't crash.
const winAnsi = (s) => String(s).replace(/[^\u0009\u000A\u000D -~ -ÿ]/g, '?');

const hexToRgb = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export async function buildPdf(templateBytes, state) {
  const pdf = await PDFDocument.load(templateBytes, { updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();

  applyFormValues(form, state.fields ?? {});
  form.updateFieldAppearances(font);
  form.flatten();
  removeDanglingAnnotations(pdf);

  const pages = pdf.getPages();
  drawCustomFields(pages, state.custom ?? [], font);
  drawStrokes(pages, state.strokes ?? []);

  return Buffer.from(await pdf.save());
}

// Step 1: fill in the PDF's own form fields
function applyFormValues(form, values) {
  for (const [name, value] of Object.entries(values)) {
    let field;
    try { field = form.getField(name); } catch { continue; } // field no longer exists in the template
    try {
      if (field instanceof PDFTextField) {
        // pdf-lib draws multi-line fields in a huge font when the size is "auto", so use 11pt
        if (field.isMultiline()) field.setFontSize(11);
        field.setText(winAnsi(Array.isArray(value) ? value.join('\n') : String(value)));
      } else if (field instanceof PDFCheckBox) {
        if (value === true || value === 'true' || value === 'on') field.check(); else field.uncheck();
      } else if (field instanceof PDFRadioGroup) {
        if (value) field.select(String(value));
      } else if (field instanceof PDFDropdown) {
        if (value) field.select(value);
      } else if (field instanceof PDFOptionList) {
        const selected = Array.isArray(value) ? value : [String(value)];
        if (selected.length) field.select(selected);
      }
    } catch (err) {
      console.warn(`Export: could not set field "${name}": ${err.message}`);
    }
  }
}

// After flatten(), pdf-lib deletes the fields but leaves links to them in each page's /Annots list.
// Viewers like poppler print warnings about that, so we remove the broken links and the empty /AcroForm.
function removeDanglingAnnotations(pdf) {
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i--) {
      const entry = annots.get(i);
      if (entry instanceof PDFRef && !pdf.context.lookup(entry)) annots.remove(i);
    }
    if (annots.size() === 0) page.node.delete(PDFName.of('Annots'));
  }
  pdf.catalog.delete(PDFName.of('AcroForm'));
}

// Step 2: draw the fields the user added on top of the page
function drawCustomFields(pages, fields, font) {
  for (const field of fields) {
    const page = pages[field.page - 1];
    if (!page) continue;
    // We store positions from the top-left, but PDF measures from the bottom-left
    const top = page.getHeight() - field.y;
    if (field.type === 'checkbox') drawCheckMark(page, field, top);
    else if (field.value) drawWrappedText(page, field, top, font);
  }
}

function drawCheckMark(page, { x, w, h, value }, top) {
  if (!value) return;
  const pad = Math.min(w, h) * 0.2;
  const style = { thickness: Math.max(1.2, Math.min(w, h) * 0.12), color: INK };
  page.drawLine({ start: { x: x + pad, y: top - h + pad }, end: { x: x + w - pad, y: top - pad }, ...style });
  page.drawLine({ start: { x: x + pad, y: top - pad }, end: { x: x + w - pad, y: top - h + pad }, ...style });
}

function drawWrappedText(page, { x, w, h, value, fontSize }, top, font) {
  const size = fontSize || 11;
  const lines = wrapText(winAnsi(value), w, size, font);
  lines.forEach((line, i) => {
    const y = top - size - i * size * 1.2 + 1;
    if (y > top - h - size) page.drawText(line, { x: x + 1, y, size, font, color: INK });
  });
}

function wrapText(text, maxWidth, size, font) {
  const lines = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(test, size) > maxWidth) { lines.push(line); line = word; }
      else line = test;
    }
    lines.push(line);
  }
  return lines;
}

// Step 3: draw the pen strokes
function drawStrokes(pages, strokes) {
  for (const stroke of strokes) {
    const page = pages[stroke.page - 1];
    if (!page) continue;
    const H = page.getHeight();
    const color = hexToRgb(stroke.color);
    const [first, ...rest] = stroke.points;
    if (rest.length === 0) {
      page.drawCircle({ x: first[0], y: H - first[1], size: stroke.width / 2, color, borderWidth: 0 });
      continue;
    }
    let prev = first;
    for (const point of rest) {
      page.drawLine({
        start: { x: prev[0], y: H - prev[1] },
        end: { x: point[0], y: H - point[1] },
        thickness: stroke.width, color, lineCap: 1, // 1 = round ends
      });
      prev = point;
    }
  }
}
