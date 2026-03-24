import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import fetchApi from '../services/api';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';
import { useAuth } from '../App';

const TABS = ['Usuarios', 'Reportes', 'Jugadores', 'Brawlers', 'Sistema'];
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [tab,      setTab]      = useState('Usuarios');
  const [users,    setUsers]    = useState([]);
  const [reports,  setReports]  = useState([]);
  const [players,  setPlayers]  = useState([]);
  const [brawlers, setBrawlers] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [syncMsg,  setSyncMsg]  = useState(null);
  const [syncing,  setSyncing]  = useState(false);

  const [search,   setSearch]   = useState('');
  const [roleF,    setRoleF]    = useState('all');
  const [statusF,  setStatusF]  = useState('all');

  const loadUsers = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchApi('/auth/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const loadReports = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchApi('/reports/all');
      setReports(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const loadPlayers = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchApi('/players/all');
      setPlayers(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const loadBrawlers = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchApi('/brawlers');
      setBrawlers(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setSearch(''); setRoleF('all'); setStatusF('all'); setSyncMsg(null); setError(null);
    if (tab === 'Usuarios')        loadUsers();
    else if (tab === 'Reportes')   loadReports();
    else if (tab === 'Jugadores')  loadPlayers();
    else if (tab === 'Brawlers')   loadBrawlers();
    else if (tab === 'Sistema')    { loadUsers(); loadBrawlers(); }
  }, [tab]);

  /* ── Acciones sobre usuarios ────────────────────────────────────────── */
  const toggleBan = async (userId, isActive) => {
    try {
      await fetchApi('/auth/users/' + userId, { method: 'PUT', body: { isActive: !isActive } });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
    } catch (err) { setError(err.message); }
  };
  const toggleRole = async (userId, role) => {
    const next = role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`¿Cambiar rol de este usuario a "${next}"?`)) return;
    try {
      await fetchApi('/auth/users/' + userId + '/role', { method: 'PUT', body: { role: next } });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: next } : u));
    } catch (err) { setError(err.message); }
  };
  const deleteUser = async (u) => {
    const msg = `Vas a ELIMINAR al usuario "${u.name}" (${u.email}).\n\n` +
                `Esto borra:\n - su jugador vinculado y todo su historial\n - sus reportes PDF\n - sus snapshots y batallas\n\n` +
                `Esta accion NO se puede deshacer. ¿Continuar?`;
    if (!window.confirm(msg)) return;
    const confirmName = window.prompt(`Para confirmar, escribe el nombre del usuario: ${u.name}`);
    if (confirmName !== u.name) { setError('Nombre no coincide. Eliminacion cancelada.'); return; }
    try {
      await fetchApi('/auth/users/' + u.id, { method: 'DELETE' });
      setUsers(prev => prev.filter(x => x.id !== u.id));
      setSyncMsg(`Usuario "${u.name}" eliminado.`);
    } catch (err) { setError(err.message); }
  };

  /* ── Acciones sobre reportes ────────────────────────────────────────── */
  const deleteReport = async (id) => {
    if (!window.confirm('¿Eliminar este reporte?')) return;
    try {
      await fetchApi('/reports/admin/' + id, { method: 'DELETE' });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { setError(err.message); }
  };

  /* ── Sync brawlers ──────────────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null); setError(null);
    try {
      const result = await fetchApi('/brawlers/sync', { method: 'POST' });
      setSyncMsg('Sincronizados ' + result.synced + ' brawlers correctamente.');
      await loadBrawlers();
    } catch (err) { setError(err.message); }
    finally { setSyncing(false); }
  };

  /* ── Filtrado de usuarios ───────────────────────────────────────────── */
  const filteredUsers = users.filter(u => {
    if (roleF !== 'all'   && u.role !== roleF)                           return false;
    if (statusF === 'active'  && !u.isActive)                            return false;
    if (statusF === 'banned'  && u.isActive)                             return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeCount = users.filter(u => u.isActive).length;
  const bannedCount = users.filter(u => !u.isActive).length;
  const adminCount  = users.filter(u => u.role === 'admin').length;

  return (
    <Layout>
      <Topbar title="Panel de Administracion" />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
          <KpiCard label="Usuarios totales" value={users.length} />
          <KpiCard label="Activos"          value={activeCount} />
          <KpiCard label="Baneados"         value={bannedCount} />
          <KpiCard label="Brawlers en BD"   value={brawlers.length} />
        </div>

        <div className="card">
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
            {TABS.map(t => (
              <button
                key={t}
                className={"btn " + (tab === t ? 'btn-primary' : '')}
                style={tab !== t ? { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'var(--color-text-muted)' } : {}}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {error   && <Alert kind="error">{error}</Alert>}
          {syncMsg && <Alert kind="success">{syncMsg}</Alert>}
          {loading && <p style={{ color:'var(--color-text-muted)' }}>Cargando...</p>}

          {/* ── USUARIOS ─────────────────────────────────────────────── */}
          {tab === 'Usuarios' && !loading && (
            <>
              <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1rem', alignItems:'center' }}>
                <input
                  className="form-input"
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ flex:1, minWidth:'220px' }}
                />
                <select className="form-input" value={roleF} onChange={e => setRoleF(e.target.value)} style={{ minWidth:'120px' }}>
                  <option value="all">Todos los roles</option>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <select className="form-input" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ minWidth:'140px' }}>
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="banned">Baneados</option>
                </select>
                <span style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>
                  {filteredUsers.length} / {users.length}
                </span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="table">
                  <thead>
                    <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Pais</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const isMe = u.id === currentUser?.id;
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight:500 }}>
                            {u.name}
                            {isMe && <span style={{ marginLeft:6, fontSize:'0.7em', color:'var(--color-gold)' }}>(tu)</span>}
                          </td>
                          <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>{u.email}</td>
                          <td>
                            <span className={"badge " + (u.role === 'admin' ? 'badge-warning' : 'badge-default')}
                              style={u.role === 'admin' ? { background:'rgba(250,204,21,0.15)', color:'var(--color-gold)' } : {}}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>{u.country || '-'}</td>
                          <td>
                            <span className={"badge " + (u.isActive ? 'badge-win' : 'badge-loss')}>
                              {u.isActive ? 'Activo' : 'Baneado'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                              {!isMe && (
                                <button
                                  className="btn"
                                  style={{ fontSize:'0.78em', padding:'4px 8px', background:'rgba(59,130,246,0.15)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.4)' }}
                                  onClick={() => toggleRole(u.id, u.role)}
                                  title={u.role === 'admin' ? 'Degradar a user' : 'Promover a admin'}
                                >
                                  {u.role === 'admin' ? 'Degradar' : 'Promover'}
                                </button>
                              )}
                              {!isMe && (
                                <button
                                  className={"btn " + (u.isActive ? 'btn-danger' : 'btn-primary')}
                                  style={{ fontSize:'0.78em', padding:'4px 8px', background: u.isActive ? 'rgba(239,68,68,0.15)' : undefined, color: u.isActive ? '#ef4444' : undefined, border: u.isActive ? '1px solid #ef4444' : undefined }}
                                  onClick={() => toggleBan(u.id, u.isActive)}
                                >
                                  {u.isActive ? 'Banear' : 'Desbanear'}
                                </button>
                              )}
                              {!isMe && (
                                <button
                                  className="btn"
                                  style={{ fontSize:'0.78em', padding:'4px 8px', background:'rgba(239,68,68,0.10)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.4)' }}
                                  onClick={() => deleteUser(u)}
                                  title="Eliminar usuario y todos sus datos"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} style={{ color:'var(--color-text-muted)', textAlign:'center', padding:'1.5rem' }}>
                        No hay usuarios con esos filtros.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── REPORTES ─────────────────────────────────────────────── */}
          {tab === 'Reportes' && !loading && (
            <div style={{ overflowX:'auto' }}>
              <div style={{ marginBottom:'1rem', color:'var(--color-text-muted)', fontSize:'0.9em' }}>
                {reports.length} reportes en total
              </div>
              <table className="table">
                <thead>
                  <tr><th>Nombre</th><th>Autor</th><th>Tipo</th><th>Periodo</th><th>Fecha</th><th>Tamano</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight:500 }}>{r.name}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>
                        {r.user?.name || '-'}
                        <div style={{ fontSize:'0.85em' }}>{r.user?.email || ''}</div>
                      </td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>{r.type}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>{r.period}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>
                        {new Date(r.createdAt).toLocaleString('es-ES')}
                      </td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>
                        {r.fileSize ? Math.round(r.fileSize / 1024) + ' KB' : '-'}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:'0.4rem' }}>
                          {r.status === 'ready' && r.filePath && (
                            <a
                              href={BACKEND_URL + r.filePath}
                              download
                              target="_blank" rel="noopener noreferrer"
                              className="btn btn-primary"
                              style={{ fontSize:'0.78em', padding:'4px 8px' }}
                            >
                              Ver
                            </a>
                          )}
                          <button
                            className="btn"
                            style={{ fontSize:'0.78em', padding:'4px 8px', background:'rgba(239,68,68,0.10)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.4)' }}
                            onClick={() => deleteReport(r.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr><td colSpan={8} style={{ color:'var(--color-text-muted)', textAlign:'center', padding:'1.5rem' }}>
                      Aun no hay reportes generados en la plataforma.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── JUGADORES ────────────────────────────────────────────── */}
          {tab === 'Jugadores' && !loading && (
            <div style={{ overflowX:'auto' }}>
              <div style={{ marginBottom:'1rem', color:'var(--color-text-muted)', fontSize:'0.9em' }}>
                {players.length} jugadores vinculados en total
              </div>
              <table className="table">
                <thead>
                  <tr><th>Tag</th><th>Nombre</th><th>Owner</th><th>Trofeos</th><th>Max</th><th>Nivel</th><th>Club</th><th>Ultima sync</th></tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily:'monospace', color:'var(--color-gold)' }}>{p.tag}</td>
                      <td style={{ fontWeight:500 }}>{p.name}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>
                        {p.user?.name || '-'}
                        <div style={{ fontSize:'0.85em' }}>{p.user?.email || ''}</div>
                      </td>
                      <td style={{ color:'var(--color-gold)', fontFamily:'monospace' }}>
                        {p.trophies != null ? p.trophies.toLocaleString('es-ES') : '-'}
                      </td>
                      <td style={{ color:'var(--color-text-muted)', fontFamily:'monospace' }}>
                        {p.highestTrophies != null ? p.highestTrophies.toLocaleString('es-ES') : '-'}
                      </td>
                      <td style={{ color:'var(--color-text-muted)' }}>{p.level ?? '-'}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>{p.club || '-'}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.85em' }}>
                        {p.lastSync ? new Date(p.lastSync).toLocaleString('es-ES') : 'Nunca'}
                      </td>
                    </tr>
                  ))}
                  {players.length === 0 && (
                    <tr><td colSpan={8} style={{ color:'var(--color-text-muted)', textAlign:'center', padding:'1.5rem' }}>
                      No hay jugadores vinculados todavia.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── BRAWLERS ─────────────────────────────────────────────── */}
          {tab === 'Brawlers' && !loading && (
            <div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem', gap:'0.5rem', alignItems:'center' }}>
                {brawlers.length === 0 && (
                  <span style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>La base de datos de brawlers esta vacia.</span>
                )}
                <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
                  {syncing ? 'Sincronizando...' : 'Sincronizar desde API'}
                </button>
              </div>
              {brawlers.length > 0 && (
                <div className="brawler-grid">
                  {brawlers.map(b => (
                    <div key={b.id} className="brawler-card">
                      <div className="brawler-name">{b.name}</div>
                      <div style={{ fontSize:'0.75em', color:'var(--color-text-muted)', marginTop:'4px' }}>
                        {b.rarity} {b.role ? '- ' + b.role : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SISTEMA ──────────────────────────────────────────────── */}
          {tab === 'Sistema' && !loading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:'1rem' }}>
              <SystemCard label="TOTAL USUARIOS"   value={users.length} />
              <SystemCard label="USUARIOS ACTIVOS" value={activeCount}    color="#22c55e" />
              <SystemCard label="ADMINISTRADORES"  value={adminCount}     color="var(--color-gold)" />
              <SystemCard label="BRAWLERS EN BD"   value={brawlers.length} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Alert({ kind, children }) {
  const colors = kind === 'error'
    ? { bg:'rgba(239,68,68,0.12)', border:'#ef4444', text:'#ef4444' }
    : { bg:'rgba(34,197,94,0.12)', border:'#22c55e', text:'#22c55e' };
  return (
    <div style={{
      background: colors.bg, border: '1px solid ' + colors.border,
      borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', color: colors.text,
    }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    ready:      { label:'Listo',     bg:'rgba(34,197,94,0.12)',  color:'#22c55e' },
    generating: { label:'Generando', bg:'rgba(250,204,21,0.12)', color:'#FACC15' },
    error:      { label:'Error',     bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
    pending:    { label:'Pendiente', bg:'rgba(255,255,255,0.05)',color:'#9ca3af' },
  };
  const s = map[status] || { label: status, bg:'rgba(255,255,255,0.05)', color:'#9ca3af' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius:'4px', padding:'2px 8px', fontSize:'0.78em', fontWeight:600,
      border: '1px solid ' + s.color + '55',
    }}>
      {s.label}
    </span>
  );
}

function SystemCard({ label, value, color = 'var(--color-text)' }) {
  return (
    <div className="card" style={{ background:'rgba(255,255,255,0.03)' }}>
      <div style={{ color:'var(--color-text-muted)', fontSize:'0.8em', marginBottom:'0.5rem' }}>{label}</div>
      <div style={{ fontSize:'2rem', fontWeight:700, color }}>{value}</div>
    </div>
  );
}
