import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

function Ico({ children }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const IcoHome     = () => <Ico><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico>;
const IcoUser     = () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>;
const IcoChart    = () => <Ico><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Ico>;
const IcoZap      = () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ico>;
const IcoStar     = () => <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Ico>;
const IcoList     = () => <Ico><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Ico>;
const IcoTrophy   = () => <Ico><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></Ico>;
const IcoHash     = () => <Ico><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></Ico>;
const IcoVs       = () => <Ico><path d="M8 3l4 18"/><path d="M3 8l9 4-9 4"/><path d="M21 8l-9 4 9 4"/></Ico>;
const IcoMap      = () => <Ico><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></Ico>;
const IcoPlay     = () => <Ico><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></Ico>;
const IcoFile     = () => <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Ico>;
const IcoSettings = () => <Ico><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico>;
const IcoLogout   = () => <Ico><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ico>;

const NAV = [
  { label: 'Principal', items: [
    { to: '/dashboard',     icon: IcoHome,     text: 'Dashboard' },
    { to: '/mi-cuenta',    icon: IcoUser,     text: 'Mi cuenta' },
    { to: '/estadisticas', icon: IcoChart,    text: 'Estadisticas', badge: '7d' },
  ]},
  { label: 'Competitivo', items: [
    { to: '/builds',       icon: IcoZap,      text: 'Builds' },
    { to: '/brawlers',     icon: IcoStar,     text: 'Brawlers' },
    { to: '/tier-list',    icon: IcoList,     text: 'Tier List' },
    { to: '/leaderboards', icon: IcoTrophy,   text: 'Leaderboards' },
    { to: '/calc-competi', icon: IcoHash,     text: 'Calc. Competi' },
    { to: '/comparador',   icon: IcoVs,       text: 'Comparador' },
  ]},
  { label: 'Contenido', items: [
    { to: '/mapas',        icon: IcoMap,      text: 'Mapas' },
    { to: '/tutoriales',   icon: IcoPlay,     text: 'Tutoriales' },
    { to: '/reportes',     icon: IcoFile,     text: 'Reportes PDF' },
  ]},
  { label: 'Admin', items: [
    { to: '/admin',        icon: IcoSettings, text: 'Panel admin' },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || 'U')[0].toUpperCase();

  const visibleNav = NAV.filter(g => g.label !== 'Admin' || user?.role === 'admin');

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">B</div>
        <span className="logo-text">BRAWL<span>STATS</span></span>
      </div>
      <nav className="sidebar-nav">
        {visibleNav.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon"><Icon /></span>
                  <span className="nav-text">{item.text}</span>
                  {item.badge && <span className="nav-badge-count">{item.badge}</span>}
                </NavLink>
              );
            })}
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
          >
            <IcoLogout />
          </button>
        </div>
      </div>
    </aside>
  );
}
