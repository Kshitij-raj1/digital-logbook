import { useRef, useState } from 'react';

const CURSORS = { pen: 'crosshair', eraser: 'cell', 'add-text': 'copy', 'add-checkbox': 'copy', 'add-select': 'copy' };
const FIELD_SIZE = { text: { w: 150, h: 20 }, select: { w: 150, h: 20 }, checkbox: { w: 16, h: 16 } };

// A transparent SVG on top of the page. It draws the saved pen strokes and handles the tools:
//   pen    - draws a new stroke
//   eraser - removes strokes under the pointer
//   add-*  - places a new field where you click
// In "select" mode it lets clicks pass through so the form fields underneath still work.
// Pointer events work for mouse, touch and stylus.
export default function InkLayer({ pageNumber, size, scale, strokes, tool, pen, actions, onPlaced }) {
  const svgRef = useRef(null);
  const current = useRef(null);           // the stroke being drawn (a ref, so moving the pen is cheap)
  const [live, setLive] = useState(null); // copy of it in state, so it shows while drawing
  const active = tool !== 'select';

  // screen position -> PDF points
  const toPoint = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  };

  const erase = (e) => {
    const [x, y] = toPoint(e);
    const radius = 8 + pen.width;
    const hit = strokes.filter((s) => s.points.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < radius ** 2)).map((s) => s.id);
    if (hit.length) actions.deleteStrokes(hit);
  };

  const onPointerDown = (e) => {
    if (tool.startsWith('add-')) return placeField(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'pen') {
      current.current = { page: pageNumber, color: pen.color, width: pen.width, points: [toPoint(e)] };
      setLive({ ...current.current });
    } else if (tool === 'eraser') {
      current.current = { erasing: true };
      erase(e);
    }
  };

  const onPointerMove = (e) => {
    const s = current.current;
    if (!s) return;
    if (s.erasing) return erase(e);
    const [x, y] = toPoint(e);
    const [lx, ly] = s.points.at(-1);
    if ((x - lx) ** 2 + (y - ly) ** 2 < 0.25) return; // skip tiny movements
    s.points.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    setLive({ ...s });
  };

  const onPointerUp = () => {
    const s = current.current;
    current.current = null;
    setLive(null);
    if (s && !s.erasing && s.points.length) actions.addStroke({ page: s.page, color: s.color, width: s.width, points: s.points });
  };

  function placeField(e) {
    const [x, y] = toPoint(e);
    const type = tool.slice('add-'.length); // text | checkbox | select
    actions.addCustom({
      page: pageNumber, type, x: Math.max(0, x - 4), y: Math.max(0, y - 8), ...FIELD_SIZE[type], fontSize: 11,
      value: type === 'checkbox' ? false : '',
      ...(type === 'select' && { options: ['Option 1', 'Option 2'] }),
    });
    onPlaced();
  }

  const points = (s) => s.points.map(([x, y]) => `${x * scale},${y * scale}`).join(' ');

  return (
    <svg ref={svgRef} className="ink" width={size.w} height={size.h}
      style={{ pointerEvents: active ? 'auto' : 'none', cursor: CURSORS[tool] ?? 'default' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {[...strokes, ...(live ? [live] : [])].map((s, i) => (s.points.length === 1
        ? <circle key={s.id ?? `live${i}`} cx={s.points[0][0] * scale} cy={s.points[0][1] * scale} r={(s.width * scale) / 2} fill={s.color} />
        : <polyline key={s.id ?? `live${i}`} points={points(s)} fill="none" stroke={s.color} strokeWidth={s.width * scale} strokeLinecap="round" strokeLinejoin="round" />))}
    </svg>
  );
}
