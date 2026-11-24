export default function VersionHistory({ versions, onOpen, onDownload }) {
  return (
    <aside className="versions card">
      <h3>Version history</h3>
      <p className="muted small">Every save creates a new immutable version. Restoring an old one creates a newer copy of it.</p>
      <ul className="list">
        {versions.map((v) => (
          <li key={v.version}>
            <div className="grow">
              <strong>v{v.version}</strong>
              <div className="muted small">{new Date(v.savedAt).toLocaleString()}{v.note ? ` · ${v.note}` : ''}</div>
            </div>
            <button className="btn small" onClick={() => onOpen(v.version)}>Open</button>
            <button className="btn small" onClick={() => onDownload(v.version)}>PDF</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
