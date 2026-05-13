import React from 'react';
export default function Topbar({ title, actions, showSearch = true }) {
  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      {showSearch && (
        <div className="topbar-search">
          <span className="search-ico">⊕</span>
          <input type="text" placeholder="Buscar jugador — #XXXXXXX" />
        </div>
      )}
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}
