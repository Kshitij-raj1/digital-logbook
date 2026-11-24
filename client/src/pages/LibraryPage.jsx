import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/index.js';

const fmt = (iso) => new Date(iso).toLocaleString();

export default function LibraryPage({ onOpen }) {
  const [templates, setTemplates] = useState([]);
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([api.templates(), api.documents()]);
      setTemplates(t); setDocs(d);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const startDoc = (t) => run(async () => {
    const d = await api.createDocument(t.id, t.scope, t.name);
    onOpen(d.id);
  });

  const upload = (e) => {
    e.preventDefault();
    const file = fileRef.current.files[0];
    if (!file) return setError('Choose a PDF file first');
    run(async () => {
      await api.uploadTemplate(file);
      fileRef.current.value = '';
    });
  };

  const tplName = (d) => templates.find((t) => t.id === d.templateId)?.name || 'template';

  return (
    <main className="library">
      {error && <div className="error banner">{error}</div>}
      <section className="card">
        <h2>My documents</h2>
        {docs.length === 0 && <p className="muted">Nothing yet. Pick a template on the right to start your first logbook.</p>}
        <ul className="list">
          {docs.map((d) => (
            <li key={d.id}>
              <div className="grow">
                <strong>{d.title}</strong>
                <div className="muted small">{tplName(d)} · v{d.latestVersion} · updated {fmt(d.updatedAt)}</div>
              </div>
              <button className="btn primary" onClick={() => onOpen(d.id)}>Open / edit</button>
              <button className="btn" disabled={busy} onClick={() => run(() => api.download(d.id))}>Download PDF</button>
              <button className="btn danger" disabled={busy} onClick={() => confirm(`Delete "${d.title}" and all its versions?`) && run(() => api.deleteDocument(d.id))}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Templates</h2>
        <ul className="list">
          {templates.map((t) => (
            <li key={t.id}>
              <div className="grow">
                <strong>{t.name}</strong>{' '}
                <span className="pill">{t.scope === 'shared' ? 'college' : 'my upload'}</span>
                <div className="muted small">{t.pages} page{t.pages > 1 ? 's' : ''} · {(t.size / 1024).toFixed(0)} KB</div>
              </div>
              <button className="btn primary" disabled={busy} onClick={() => startDoc(t)}>Start filling</button>
              {t.scope === 'mine' && <button className="btn danger" disabled={busy} onClick={() => run(() => api.deleteTemplate(t.id))}>Remove</button>}
            </li>
          ))}
        </ul>
        <form className="upload" onSubmit={upload}>
          <h3>Upload a college PDF</h3>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" />
          <button className="btn" disabled={busy}>Upload template</button>
          <p className="muted small">PDF only, max 15 MB. Files with scripts or passwords are rejected.</p>
        </form>
      </section>
    </main>
  );
}
