import { useState } from 'react';
import { api } from '../api/index.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('kshitij');
  const [password, setPassword] = useState('pass123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { onLogin(await api.login(username, password)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>📒 Digital Logbook</h1>
        <p className="muted">Demo sign-in. Users: <code>kshitij</code> or <code>alice</code>, password <code>pass123</code> for both.</p>
        <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
