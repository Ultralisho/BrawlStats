import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export default function Topbar({ title, actions, showSearch = true }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const tag = q.trim().replace(/^#/, '').toUpperCase();
    if (!tag) return;
    navigate('/jugador/' + tag);
    setQ('');
  };

  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      {showSearch && (
        <form onSubmit={handleSearch} className="topbar-search">
          <span className="search-ico"><SearchIcon /></span>
          <input
            type="text"
            placeholder="Buscar jugador  #XXXXXXX"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </form>
      )}
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}
