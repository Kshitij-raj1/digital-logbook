import { useCallback, useMemo, useState } from 'react';

// The draft is everything the student has filled in. It is saved to the server as JSON:
//   fields:  values of the PDF's own form fields, by field name
//   custom:  fields the user added on the page (text, checkbox, dropdown)
//   strokes: pen drawings, as lists of points
// Positions are in PDF points from the top-left of the page, so they stay right at any zoom.
export const EMPTY_DRAFT = { fields: {}, custom: [], strokes: [] };

const newId = () => crypto.randomUUID();

export function useDraft() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [dirty, setDirty] = useState(false);

  const change = useCallback((update) => { setDraft(update); setDirty(true); }, []);

  // Replace the whole draft, e.g. after loading it from the server
  const reset = useCallback((next, { dirty: isDirty = false } = {}) => {
    setDraft({ ...EMPTY_DRAFT, ...next });
    setDirty(isDirty);
  }, []);

  const actions = useMemo(() => ({
    setField: (name, value) => change((d) => ({ ...d, fields: { ...d.fields, [name]: value } })),
    addCustom: (field) => change((d) => ({ ...d, custom: [...d.custom, { id: newId(), ...field }] })),
    updateCustom: (id, patch) => change((d) => ({ ...d, custom: d.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    deleteCustom: (id) => change((d) => ({ ...d, custom: d.custom.filter((c) => c.id !== id) })),
    addStroke: (stroke) => change((d) => ({ ...d, strokes: [...d.strokes, { id: newId(), ...stroke }] })),
    deleteStrokes: (ids) => change((d) => ({ ...d, strokes: d.strokes.filter((s) => !ids.includes(s.id)) })),
  }), [change]);

  return { draft, dirty, actions, reset, markClean: () => setDirty(false) };
}
