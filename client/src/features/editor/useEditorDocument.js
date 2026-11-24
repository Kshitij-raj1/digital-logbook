import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import { loadPdf } from './pdfjs.js';
import { useDraft } from './useDraft.js';

// Everything about one open document: loading it, saving versions, version history and downloading.
// The components just use what this hook returns.
export function useEditorDocument(docId) {
  const { draft, dirty, actions, reset, markClean } = useDraft();
  const [meta, setMeta] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [versions, setVersions] = useState([]);
  const [baseVersion, setBaseVersion] = useState(1); // the version we started editing from
  const [viewing, setViewing] = useState(null);       // number of the old version being viewed, if any
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' }); // message shown above the pages

  const flash = (type, text) => setStatus({ type, text });

  const refreshVersions = useCallback(() => api.versions(docId).then(setVersions), [docId]);

  // Load the document, its template PDF and the latest draft when the page opens
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doc = await api.getDocument(docId);
        const bytes = await api.templateBytes(doc.meta.templateScope, doc.meta.templateId);
        const loaded = await loadPdf(bytes);
        if (cancelled) return;
        setMeta(doc.meta);
        setBaseVersion(doc.version);
        reset(doc.state);
        setPdf(loaded);
        refreshVersions();
      } catch (err) {
        flash('error', err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [docId, reset, refreshVersions]);

  // Save the draft as a new version. Old versions are never changed.
  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await api.saveDocument(docId, draft, baseVersion);
      setMeta(updated);
      setBaseVersion(updated.latestVersion);
      setViewing(null);
      setConflict(false);
      markClean();
      flash('ok', `Saved as version ${updated.latestVersion}`);
      refreshVersions();
    } catch (err) {
      setConflict(err.status === 409); // someone saved from another tab or device
      flash('error', err.message);
    } finally {
      setSaving(false);
    }
  }, [docId, draft, baseVersion, saving, markClean, refreshVersions]);

  // Open a version. If it's an old one, saving it makes it the newest version.
  const openVersion = useCallback(async (version) => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    try {
      const doc = await api.getDocument(docId, version);
      const isLatest = version === doc.meta.latestVersion;
      setMeta(doc.meta);
      setBaseVersion(doc.meta.latestVersion);
      setViewing(isLatest ? null : version);
      setConflict(false);
      reset(doc.state, { dirty: !isLatest });
      flash('ok', isLatest ? `Loaded latest (v${version})` : `Viewing v${version}. Save to restore it as the newest version.`);
    } catch (err) {
      flash('error', err.message);
    }
  }, [docId, dirty, reset]);

  // Download the final PDF (of an old version if one is open)
  const download = useCallback(async (version = viewing) => {
    try {
      if (dirty && confirm('You have unsaved changes. Save first so they are included in the PDF?')) await save();
      await api.download(docId, version);
    } catch (err) {
      flash('error', err.message);
    }
  }, [docId, dirty, viewing, save]);

  return { meta, pdf, draft, dirty, actions, versions, viewing, saving, conflict, status, save, openVersion, download };
}
