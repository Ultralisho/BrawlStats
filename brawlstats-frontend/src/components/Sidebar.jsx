import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

// Fallback estable: emojis del sistema (no dependen de paquetes externos)
const ICON = {
  dashboard:    '🏠',
  miCuenta:     '👤',
  estadisticas: '📊',
  builds:       '🔧',
  brawlers:     '⭐',
  tierList:     '📋',
  leaderboards: '🏆',
  calcCompeti:  '🧮',
  mapas:        '🗺️',
  tutoriales:   '▶️',
  reportes:     '📄',
  admin:        '⚙️',
  logout:       '🚪',
};

const NAV = [
  { label: 'Principal', items: [
    { to: '/dashboard',    icon: ICON.dashboard,    text: 'Dashboard' },
    { to: '/mi-cuenta',    icon: ICON.miCuenta,     text: 'Mi cuenta' },
    { to: '/estadisticas', icon: ICON.estadisticas, text: 'Estadisticas', badge: '7d' },
  ]},
  { label: 'Competitivo', items: [
    { to: '/builds',       icon: ICON.builds,       text: 'Builds' },
    { to: '/brawlers',     icon: ICON.brawlers,     text: 'Brawlers' },
    { to: '/tier-list',    icon: ICON.tierList,     text: 'Tier List' },
    { to: '/leaderboards', icon: ICON.leaderboards, text: 'Leaderboards' },
    { to: '/calc-competi', icon: ICON.calcCompeti,  text: 'Calc. Competi' },
    { to: '/comparador',   icon: '🆚',              text: 'Comparador' },
  ]},
  { label: 'Contenido', items: [
    { to: '/mapas',        icon: ICON.mapas,        text: 'Mapas' },
    { to: '/tutoriales',   icon: ICON.tutoriales,   text: 'Tutoriales' },
    { to: '/reportes',     icon: ICON.reportes,     text: 'Reportes PDF' },
  ]},
  { label: 'Admin', items: [
    { to: '/admin',        icon: ICON.admin,        text: 'Panel admin', requiresAdmin: true },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || 'U')[0].toUpperCase();

  const isAdmin = user?.role === 'admin';

  // Filtramos primero items que requieren admin, y luego grupos que queden vacíos.
  // Doble defensa: por item (requiresAdmin) y por grupo (label === 'Admin').
  const visibleNav = NAV
    .map(g => ({ ...g, items: g.items.filter(it => !it.requiresAdmin || isAdmin) }))
    .filter(g => g.items.length > 0 && (g.label !== 'Admin' || isAdmin));

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none' }} title="Ir al inicio">
        <div className="logo-mark">B</div>
        <span className="logo-text">BRAWL<span style={{ color: 'var(--blue)' }}>STATS</span></span>
      </Link>
      <nav className="sidebar-nav">
        {visibleNav.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon" style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                <span className="nav-text">{item.text}</span>
                {item.badge && <span className="nav-badge-count">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">
            <span className="user-avatar-placeholder">{initial}</span>
            <span className="user-status-dot" />
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'Usuario'}</div>
            <div className="user-tag">{user?.email || ''}</div>
          </div>
          <button
            type="button"
            className="user-logout"
            onClick={() => { logout(); navigate('/login'); }}
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
            style={{ fontSize: 16, lineHeight: 1, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {ICON.logout}
          </button>
        </div>
      </div>
    </aside>
  );
}
