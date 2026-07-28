import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { authEnabled, currentUser, signIn, signOut, userManager } from './auth';
import Dashboard from './pages/Dashboard';
import NewDocument from './pages/NewDocument';
import DocumentDetail from './pages/DocumentDetail';
import Verify from './pages/Verify';
import { Draft, Video, Profile, Billing, Contacts } from './pages/services';
import Batches from './pages/Batches';
import './ui.css';

function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <NavLink to="/" className="brand">
          i<span className="s">S</span>igned.it
        </NavLink>
        <nav>
          <NavLink to="/" end>Documents</NavLink>
          <NavLink to="/new">New document</NavLink>
          <NavLink to="/verify">Verify</NavLink>
          <NavLink to="/batches">Batches</NavLink>
          <NavLink to="/draft">AI Draft</NavLink>
          <NavLink to="/video">Video</NavLink>
          <NavLink to="/contacts">Contacts</NavLink>
          <NavLink to="/billing">Payment</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <SessionBox />
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewDocument />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/v/:code" element={<Verify />} />
        <Route path="/batches" element={<Batches />} />
        <Route path="/draft" element={<Draft />} />
        <Route path="/video" element={<Video />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

function SessionBox() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (authEnabled) currentUser().then((u) => setName(u?.profile.name ?? u?.profile.email ?? null));
  }, []);
  if (!authEnabled) {
    return <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>dev session</span>;
  }
  return name ? (
    <span style={{ marginLeft: 'auto', fontSize: 13, display: 'flex', gap: 12, alignItems: 'center' }}>
      <b style={{ color: 'var(--ink-800)' }}>{name}</b>
      <button className="btn ghost" style={{ padding: '6px 14px' }} onClick={signOut}>Sign out</button>
    </span>
  ) : (
    <button className="btn" style={{ marginLeft: 'auto', padding: '8px 18px' }} onClick={signIn}>
      Sign in
    </button>
  );
}

function AuthCallback() {
  const nav = useNavigate();
  const [error, setError] = useState('');
  useEffect(() => {
    userManager
      ?.signinRedirectCallback()
      .then(() => nav('/', { replace: true }))
      .catch((e) => setError((e as Error).message));
  }, [nav]);
  return <main className="page"><p className="empty">{error || 'Signing you in…'}</p></main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
