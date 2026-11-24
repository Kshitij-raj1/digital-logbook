// Cleans up the draft sent by the browser before we save or export it.
// We never trust it as-is: every value is checked and limited in size.
//
// A draft looks like this:
//   fields:  { fieldName: value }                      values of the PDF's own form fields
//   custom:  [{ id, page, type, x, y, w, h, value }]   fields the user added on the page
//   strokes: [{ id, page, color, width, points }]      pen drawings
// Positions are in PDF points measured from the top-left of the page, so zoom doesn't matter.
import { badRequest } from '../../lib/httpError.js';

export const emptyState = () => ({ fields: {}, custom: [], strokes: [] });

const COLOR = /^#[0-9a-fA-F]{6}$/;
const str = (v, max = 5000) => String(v ?? '').slice(0, max);

function num(v, min = -1e5, max = 1e5) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw badRequest('Invalid number in state');
  return Math.min(max, Math.max(min, n));
}

function cleanFields(input) {
  if (!input || typeof input !== 'object') return {};
  const entries = Object.entries(input);
  if (entries.length > 5000) throw badRequest('Too many fields');
  const fields = {};
  for (const [key, value] of entries) {
    if (value == null) continue;
    fields[str(key, 300)] =
      typeof value === 'boolean' ? value
      : Array.isArray(value) ? value.slice(0, 200).map((x) => str(x, 500))
      : str(value);
  }
  return fields;
}

function cleanCustom(list) {
  return (Array.isArray(list) ? list : []).slice(0, 2000).map((c) => {
    const type = ['text', 'checkbox', 'select'].includes(c.type) ? c.type : 'text';
    return {
      id: str(c.id, 64),
      page: Math.trunc(num(c.page, 1, 100000)),
      type,
      x: num(c.x), y: num(c.y), w: num(c.w, 4, 5000), h: num(c.h, 4, 5000),
      value: type === 'checkbox' ? Boolean(c.value) : str(c.value),
      options: type === 'select' ? (Array.isArray(c.options) ? c.options.slice(0, 100).map((o) => str(o, 200)) : []) : undefined,
      fontSize: num(c.fontSize ?? 11, 4, 72),
    };
  });
}

function cleanStrokes(list) {
  return (Array.isArray(list) ? list : []).slice(0, 20000).map((s) => ({
    id: str(s.id, 64),
    page: Math.trunc(num(s.page, 1, 100000)),
    color: COLOR.test(s.color) ? s.color : '#1d4ed8',
    width: num(s.width ?? 2, 0.5, 40),
    points: (Array.isArray(s.points) ? s.points.slice(0, 20000) : []).map((p) => [num(p?.[0]), num(p?.[1])]),
  })).filter((s) => s.points.length > 0);
}

export function sanitizeState(input) {
  if (!input || typeof input !== 'object') throw badRequest('state must be an object');
  return { fields: cleanFields(input.fields), custom: cleanCustom(input.custom), strokes: cleanStrokes(input.strokes) };
}
