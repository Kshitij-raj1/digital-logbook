import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api/index.js';
import LoginPage from './pages/LoginPage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import EditorPage from './pages/EditorPage.jsx';

// Very simple navigation: not logged in -> login page, logged in -> library, or the editor when a document is open.
export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [openDocId, setOpenDocId] = useState(null);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOpenDocId(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) { setReady(true); return; }
    api.me().then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, [logout]);

  if (!ready) return <div className="center muted">Loading…</div>;
  if (!user) return <LoginPage onLogin={({ token, user }) => { setToken(token); setUser(user); }} />;

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand" onClick={() => setOpenDocId(null)}>📒 Digital Logbook</strong>
        <span className="spacer" />
        <span className="muted">{user.name}</span>
        <button className="btn ghost" onClick={logout}>Sign out</button>
      </header>
      {openDocId
        ? <EditorPage key={openDocId} docId={openDocId} onClose={() => setOpenDocId(null)} />
        : <LibraryPage onOpen={setOpenDocId} />}
    </div>
  );
}
