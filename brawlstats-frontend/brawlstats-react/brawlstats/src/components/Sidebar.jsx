import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const NAV = [
  { label:'Principal', items:[
    { to:'/',             icon:'◈', text:'Dashboard' },
    { to:'/mi-cuenta',   icon:'◉', text:'Mi cuenta' },
    { to:'/estadisticas',icon:'▤', text:'Estadísticas', badge:'7d' },
  ]},
  { label:'Competitivo', items:[
    { to:'/builds',      icon:'⚔', text:'Builds' },
    { to:'/brawlers',    icon:'★', text:'Brawlers' },
    { to:'/tier-list',   icon:'S', text:'Tier List' },
    { to:'/leaderboards',icon:'▲', text:'Leaderboards' },
    { to:'/calc-competi',icon:'⊞', text:'Calc. Competi' },
  ]},
  { label:'Contenido', items:[
    { to:'/mapas',      icon:'▦', text:'Mapas' },
    { to:'/tutoriales', icon:'▶', text:'Tutoriales' },
    { to:'/reportes',   icon:'◎', text:'Reportes PDF' },
  ]},
  { label:'Admin', items:[
    { to:'/admin', icon:'⚙', text:'Panel admin' },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || 'U')[0].toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">B</div>
        <span className="logo-text">BRAWL<span>STATS</span></span>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to==='/'} className={({isActive})=>`nav-item${isActive?' active':''}`}>
                <span className="nav-icon">{item.icon}</span>
                {item.text}
                {item.badge && <span className="nav-badge-count">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip" onClick={() => { logout(); navigate('/login'); }} title="Cerrar sesión" style={{cursor:'pointer'}}>
          <div className="user-avatar"><span className="user-avatar-placeholder">{initial}</span></div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'Usuario'}</div>
            <div className="user-tag">{user?.tag || '#———'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
