import { useRef } from 'react';

// A field the user added on top of the PDF (useful for flat PDFs with no form fields).
// When selected it can be moved, resized and deleted. Dropdown options are typed in as a comma list.
export default function CustomField({ field: c, scale, selected, onSelect, onChange, onDelete }) {
  const drag = useRef(null);
  const style = { left: c.x * scale, top: c.y * scale, width: c.w * scale, height: c.h * scale, fontSize: (c.fontSize || 11) * scale };

  const startDrag = (mode) => (e) => {
    e.stopPropagation(); e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, c: { ...c } };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
    if (d.mode === 'move') onChange({ x: Math.max(0, d.c.x + dx), y: Math.max(0, d.c.y + dy) });
    else onChange({ w: Math.max(10, d.c.w + dx), h: Math.max(10, d.c.h + dy) });
  };
  const end = () => { drag.current = null; };

  return (
    <div className={`custom ${selected ? 'selected' : ''}`} style={style} onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}>
      {c.type === 'text' && (
        c.h > 34
          ? <textarea className="w-input" value={c.value} onChange={(e) => onChange({ value: e.target.value })} />
          : <input className="w-input" value={c.value} onChange={(e) => onChange({ value: e.target.value })} />
      )}
      {c.type === 'checkbox' && <input type="checkbox" className="w-check" checked={!!c.value} onChange={(e) => onChange({ value: e.target.checked })} />}
      {c.type === 'select' && (
        <select className="w-input" value={c.value} onChange={(e) => onChange({ value: e.target.value })}>
          <option value="" />
          {(c.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {selected && (
        <>
          <div className="handles" style={{ fontSize: 12 }}>
            <span className="handle" title="Move" onPointerDown={startDrag('move')} onPointerMove={move} onPointerUp={end}>✥</span>
            <span className="handle" title="Delete" onClick={onDelete}>✕</span>
            {c.type === 'text' && (
              <select className="handle" title="Font size" value={c.fontSize} onChange={(e) => onChange({ fontSize: Number(e.target.value) })}>
                {[8, 9, 10, 11, 12, 14, 16, 18].map((n) => <option key={n} value={n}>{n}pt</option>)}
              </select>
            )}
            {c.type === 'select' && (
              <input className="handle opts" title="Comma-separated options" defaultValue={(c.options || []).join(', ')}
                onBlur={(e) => onChange({ options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            )}
          </div>
          {c.type !== 'checkbox' && <span className="resize" onPointerDown={startDrag('resize')} onPointerMove={move} onPointerUp={end} />}
        </>
      )}
    </div>
  );
}
