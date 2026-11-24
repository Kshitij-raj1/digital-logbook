const TOOLS = [
  { id: 'select', label: '🖱 Fill' },
  { id: 'pen', label: '✏️ Pen' },
  { id: 'eraser', label: '🧽 Eraser' },
  { id: 'add-text', label: '＋ Text box' },
  { id: 'add-checkbox', label: '＋ Checkbox' },
  { id: 'add-select', label: '＋ Dropdown' },
];

// The two bars at the top of the editor: document buttons, and the drawing / field tools.
export default function EditorToolbar({
  doc, tool, onTool, pen, onPen, scale, onScale, onBack,
  onUndoStroke, canUndo, historyCount, onToggleHistory,
}) {
  const { meta, dirty, viewing, saving } = doc;
  return (
    <>
      <div className="toolbar">
        <button className="btn ghost" onClick={onBack}>← Back</button>
        <strong className="doc-title">{meta.title}</strong>
        <span className="muted small">v{meta.latestVersion}{viewing ? ` (viewing v${viewing})` : ''}{dirty ? ' · unsaved changes' : ''}</span>
        <span className="spacer" />
        <button className="btn primary" disabled={saving || (!dirty && !viewing)} onClick={doc.save}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button className="btn" onClick={() => doc.download()}>Download final PDF</button>
        <button className="btn" onClick={onToggleHistory}>History ({historyCount})</button>
      </div>

      <div className="toolbar tools">
        {TOOLS.map((t) => (
          <button key={t.id} className={`btn ${tool === t.id ? 'active' : ''}`} onClick={() => onTool(t.id)}>{t.label}</button>
        ))}
        <span className="sep" />
        <label className="inline">Colour <input type="color" value={pen.color} onChange={(e) => onPen({ ...pen, color: e.target.value })} /></label>
        <label className="inline">Width
          <input type="range" min="1" max="10" step="0.5" value={pen.width} onChange={(e) => onPen({ ...pen, width: Number(e.target.value) })} />
        </label>
        <button className="btn" onClick={onUndoStroke} disabled={!canUndo}>↶ Undo stroke</button>
        <span className="spacer" />
        <button className="btn" onClick={() => onScale(Math.max(0.6, +(scale - 0.15).toFixed(2)))}>−</button>
        <span className="small">{Math.round(scale * 100)}%</span>
        <button className="btn" onClick={() => onScale(Math.min(3, +(scale + 0.15).toFixed(2)))}>＋</button>
      </div>
    </>
  );
}
