import { useEffect, useState } from 'react';
import EditorToolbar from '../features/editor/EditorToolbar.jsx';
import PdfPage from '../features/editor/PdfPage.jsx';
import VersionHistory from '../features/editor/VersionHistory.jsx';
import { useEditorDocument } from '../features/editor/useEditorDocument.js';

export default function EditorPage({ docId, onClose }) {
  const doc = useEditorDocument(docId);
  const [tool, setTool] = useState('select'); // select | pen | eraser | add-text | add-checkbox | add-select
  const [pen, setPen] = useState({ color: '#1d4ed8', width: 2 });
  const [scale, setScale] = useState(1.3);
  const [showHistory, setShowHistory] = useState(false);

  const { dirty, save } = doc;

  // Ctrl+S saves, and the browser warns if you close the tab with unsaved changes
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } };
    const onUnload = (e) => { if (dirty) e.preventDefault(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onUnload); };
  }, [save, dirty]);

  if (!doc.pdf || !doc.meta) {
    return <div className="center muted">{doc.status.type === 'error' ? <span className="error">{doc.status.text}</span> : 'Loading document…'}</div>;
  }

  const lastStroke = doc.draft.strokes.at(-1);

  return (
    <div className="editor">
      <EditorToolbar
        doc={doc} tool={tool} onTool={setTool} pen={pen} onPen={setPen} scale={scale} onScale={setScale}
        onBack={() => { if (!dirty || confirm('You have unsaved changes. Leave anyway?')) onClose(); }}
        canUndo={Boolean(lastStroke)} onUndoStroke={() => doc.actions.deleteStrokes([lastStroke.id])}
        historyCount={doc.versions.length} onToggleHistory={() => setShowHistory((v) => !v)}
      />

      {doc.status.text && (
        <div className={`status ${doc.status.type}`}>
          {doc.status.text}
          {doc.conflict && <> <button className="btn small" onClick={() => doc.openVersion(doc.meta.latestVersion)}>Reload latest</button></>}
        </div>
      )}
      {tool.startsWith('add-') && <div className="status">Click on the page where the field should go.</div>}

      <div className="workspace">
        <div className="pages">
          {Array.from({ length: doc.pdf.numPages }, (_, i) => (
            <PdfPage key={i + 1} pdf={doc.pdf} pageNumber={i + 1} scale={scale} draft={doc.draft} actions={doc.actions}
              tool={tool} onToolChange={setTool} pen={pen} />
          ))}
        </div>
        {showHistory && <VersionHistory versions={doc.versions} onOpen={doc.openVersion} onDownload={doc.download} />}
      </div>
    </div>
  );
}
