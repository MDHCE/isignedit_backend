import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
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
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
