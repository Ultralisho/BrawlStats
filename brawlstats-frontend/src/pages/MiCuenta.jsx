import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';
import { useAuth } from '../App';
import fetchApi from '../services/api';

function parseTime(s) {
  if (!s) return 0;
  return new Date(s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).getTime();
}
function timeAgo(s) {
  if (!s) return '—';
  const d = Math.floor((Date.now() - parseTime(s)) / 60000);
  if (d < 60) return `${d} min`;
  if (d < 1440) return `${Math.floor(d/60)} h`;
  return `${Math.floor(d/1440)} d`;
}

export default function MiCuenta() {
  const { user, login } = useAuth();
  const [player,   setPlayer]   = useState(null);
  const [battles,  setBattles]  = useState([]);
  const [tag,      setTag]      = useState('');
  const [tagResult, setTagResult] = useState(null);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', country: user?.country || 'España', lang: 'Español' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });

  const [loadingSearch,   setLoadingSearch]   = useState(false);
  const [loadingVincular, setLoadingVincular] = useState(false);
  const [loadingGuardar,  setLoadingGuardar]  = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [syncing,         setSyncing]         = useState(false);

  const [searchError, setSearchError] = useState('');
  const [vincularMsg, setVincularMsg] = useState('');
  const [profileMsg,  setProfileMsg]  = useState('');
  const [pwMsg,       setPwMsg]       = useState('');

  function loadData() {
    fetchApi('/auth/me')
      .then(data => {
        const u = data.user || data;
        setForm(f => ({ ...f, name: u.name || f.name, email: u.email || f.email, country: u.country || f.country }));
      }).catch(() => {});
    fetchApi('/players/me').then(setPlayer).catch(() => {});
    fetchApi('/stats/battlelog').then(d => setBattles(Array.isArray(d) ? d : [])).catch(() => {});
  }

  useEffect(() => { loadData(); }, []);

  async function sincronizar() {
    setSyncing(true);
    try { await fetchApi('/players/sync', { method: 'POST' }); loadData(); }
    catch { } finally { setSyncing(false); }
  }

  async function buscarTag() {
    const t = tag.trim(); if (!t) return;
    setLoadingSearch(true); setSearchError(''); setTagResult(null);
    try { setTagResult(await fetchApi(`/players/search?tag=${encodeURIComponent(t)}`)); }
    catch (err) { setSearchError(err.message); }
    finally { setLoadingSearch(false); }
  }

  async function vincularTag() {
    setLoadingVincular(true); setVincularMsg('');
    try { setPlayer(await fetchApi('/players', { method: 'POST', body: { tag: tag.trim() } })); setTagResult(null); setVincularMsg('ok'); }
    catch (err) { setVincularMsg(err.message); }
    finally { setLoadingVincular(false); }
  }

  async function guardar(e) {
    e.preventDefault(); setLoadingGuardar(true); setProfileMsg('');
    try {
      const data = await fetchApi('/auth/me', { method: 'PUT', body: { name: form.name, country: form.country } });
      login({ ...user, ...(data.user || data) }); setProfileMsg('ok');
    } catch (err) { setProfileMsg(err.message); }
    finally { setLoadingGuardar(false); }
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) { setPwMsg('err:Rellena ambos campos.'); return; }
    setLoadingPassword(true); setPwMsg('');
    try {
      await fetchApi('/auth/change-password', { method: 'PUT', body: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword } });
      setPwMsg('ok'); setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) { setPwMsg('err:' + err.message); }
    finally { setLoadingPassword(false); }
  }

  // Datos reales del rawData de Supercell
  const rawData = player?.rawData;
  const raw = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) || {};
  const victories3v3  = raw['3vs3Victories'] ?? null;
  const victoriesSolo = raw.soloVictories    ?? null;
  const victoriesDuo  = raw.duoVictories     ?? null;
  const totalVictories = victories3v3 != null ? (victories3v3 + (victoriesSolo||0) + (victoriesDuo||0)) : null;
  const brawlerCount  = Array.isArray(raw.brawlers) ? raw.brawlers.length : null;
  const expLevel      = raw.expLevel ?? player?.level ?? null;

  // Win rate global de las últimas partidas
  const totalB = battles.length;
  const totalW = battles.filter(b => b.result === 'Win').length;
  const globalWR = totalB > 0 ? `${Math.round((totalW/totalB)*100)}%` : null;

  return (
    <Layout>
      <Topbar title="Mi Cuenta" actions={
        <div className="flex gap-2">
          <button className="btn btn-sm btn-secondary" onClick={sincronizar} disabled={syncing}>{syncing ? 'Sincronizando…' : 'Sincronizar'}</button>
          <button className="btn btn-sm btn-primary">+ Nuevo reporte</button>
        </div>
      }/>
      <div className="page">

        {/* Hero */}
        <div className="card mb-6" style={{ background:'linear-gradient(135deg,var(--bg-surface) 0%,var(--bg-elevated) 100%)', borderColor:'var(--blue-border)' }}>
          <div className="flex items-center gap-6">
            <div style={{ width:80, height:80, borderRadius:'var(--r-xl)', background:'var(--blue-dim)', border:'2px solid var(--blue-border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:32, fontWeight:800, color:'var(--blue)', flexShrink:0 }}>
              {(player?.name || user?.name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--text-1)' }}>{player?.name || user?.name || 'Usuario'}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-3)', marginTop:4 }}>{player?.tag || 'Sin jugador vinculado'}</div>
              <div className="flex gap-2 mt-2">
                <span className="badge badge-info">{form.country}</span>
                {player?.club && <span className="badge badge-info">{player.club}</span>}
                {expLevel && <span className="badge badge-legendary">Nv. {expLevel}</span>}
                <span className="badge badge-win">Online</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-secondary">Editar perfil</button>
              <button className="btn btn-primary">Vincular cuenta</button>
            </div>
          </div>
        </div>

        {/* KPIs reales */}
        <div className="grid cols-4 mb-6">
          <KpiCard label="Trofeos totales" value={player?.trophies ? Number(player.trophies).toLocaleString() : '—'} delta="" deltaType="neutral" sub="última sync"         icon="🏆" color="blue"   />
          <KpiCard label="Win Rate"        value={globalWR || '—'}                                                    delta="" deltaType="neutral" sub={`últimas ${totalB} partidas`} icon="📈" color="green"  />
          <KpiCard label="Nivel"           value={expLevel || '—'}                                                    delta="" deltaType="neutral" sub="experiencia"          icon="⭐" color="yellow" />
          <KpiCard label="Club"            value={player?.club || '—'}                                                delta="" deltaType="neutral" sub="club actual"           icon="🎯" color="red"   />
        </div>

        <div className="grid cols-2-1 mb-6" style={{ gap:'var(--s5)' }}>
          {/* Formulario vincular + datos personales */}
          <div className="card">
            <div className="card-header"><span className="card-title">Buscar y vincular jugador</span></div>
            <div className="form-group">
              <label className="form-label">Tag de jugador Brawl Stars</label>
              <div className="flex gap-2">
                <input type="text" className="form-input" placeholder="#2PPU8QLYL" value={tag} onChange={e=>setTag(e.target.value)} style={{ flex:1 }} />
                <button className="btn btn-primary" onClick={buscarTag} disabled={loadingSearch}>{loadingSearch?'Buscando…':'Buscar'}</button>
              </div>
              <div className="form-help">El tag se encuentra en tu perfil dentro del juego</div>
            </div>
            {searchError && <div className="alert alert-error">{searchError}</div>}
            {tagResult && (
              <div className="alert alert-success" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span>{tagResult.name} · {Number(tagResult.trophies).toLocaleString()} trofeos</span>
                <button className="btn btn-sm btn-primary" onClick={vincularTag} disabled={loadingVincular}>{loadingVincular?'Vinculando…':'Vincular'}</button>
              </div>
            )}
            {vincularMsg && <div className={`alert ${vincularMsg==='ok'?'alert-success':'alert-error'}`}>{vincularMsg==='ok'?'Cuenta vinculada correctamente.':vincularMsg}</div>}
            <hr className="divider" />
            <div className="card-header" style={{ marginBottom:'var(--s3)' }}><span className="card-title">Datos personales</span></div>
            <form onSubmit={guardar}>
              <div className="grid cols-2" style={{ gap:'var(--s4)' }}>
                <div className="form-group">
                  <label className="form-label">Nombre de usuario</label>
                  <input type="text" className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">País</label>
                  <select className="form-select" value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}>
                    <option>España</option><option>México</option><option>Argentina</option><option>Colombia</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Idioma</label>
                  <select className="form-select" value={form.lang} onChange={e=>setForm(f=>({...f,lang:e.target.value}))}>
                    <option>Español</option><option>English</option>
                  </select>
                </div>
              </div>
              {profileMsg && <div className={`alert mb-3 ${profileMsg==='ok'?'alert-success':'alert-error'}`}>{profileMsg==='ok'?'Cambios guardados.':profileMsg}</div>}
              <button type="submit" className="btn btn-primary" disabled={loadingGuardar}>{loadingGuardar?'Guardando…':'Guardar cambios'}</button>
            </form>
          </div>

          {/* Resumen rápido real + seguridad */}
          <div className="flex flex-col gap-5">
            <div className="card">
              <div className="card-header"><span className="card-title">Resumen rápido</span></div>
              {[
                ['Victorias 3v3',   victories3v3  != null ? Number(victories3v3).toLocaleString()  : '—'],
                ['Victorias Solo',  victoriesSolo != null ? Number(victoriesSolo).toLocaleString() : '—'],
                ['Victorias Dúo',   victoriesDuo  != null ? Number(victoriesDuo).toLocaleString()  : '—'],
                ['Total victorias', totalVictories != null ? Number(totalVictories).toLocaleString() : '—'],
                ['Brawlers',        brawlerCount  != null ? `${brawlerCount}` : '—'],
                ['Trofeos máximos', player?.highestTrophies ? Number(player.highestTrophies).toLocaleString() : '—'],
              ].map(([l,v]) => (
                <div key={l} className="stat-row"><span className="stat-row-label">{l}</span><span className="stat-row-value">{v}</span></div>
              ))}
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Seguridad</span></div>
              <form onSubmit={cambiarPassword}>
                <div className="form-group">
                  <label className="form-label">Contraseña actual</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={pwForm.currentPassword} onChange={e=>setPwForm(f=>({...f,currentPassword:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input type="password" className="form-input" placeholder="Mínimo 8 caracteres" value={pwForm.newPassword} onChange={e=>setPwForm(f=>({...f,newPassword:e.target.value}))} />
                  <div className="form-help">Letras, números y símbolos</div>
                </div>
                {pwMsg && <div className={`alert mb-3 ${pwMsg==='ok'?'alert-success':'alert-error'}`}>{pwMsg==='ok'?'Contraseña actualizada.':pwMsg.replace('err:','')}</div>}
                <button type="submit" className="btn btn-secondary w-full" disabled={loadingPassword}>{loadingPassword?'Cambiando…':'Cambiar contraseña'}</button>
              </form>
            </div>
          </div>
        </div>

        {/* Historial real */}
        <div className="t-label mb-4">▸ Últimas partidas</div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Historial reciente</div>
              <div className="t-sm text-3 mt-1" style={{ fontFamily:'var(--font-mono)' }}>Últimas {battles.length} partidas · Battle log API Supercell</div>
            </div>
          </div>
          {battles.length === 0
            ? <div className="t-sm text-3" style={{ padding:'var(--s4)' }}>Sin partidas recientes o jugador no vinculado</div>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Modo</th><th>Brawler</th><th>Mapa</th><th>Trofeos</th><th>Resultado</th><th>Hace</th></tr></thead>
                  <tbody>
                    {battles.map((m,i) => (
                      <tr key={i}>
                        <td className="t-sm">{m.mode}</td>
                        <td><div className="flex items-center gap-2"><div className="table-avatar"><span className="av-placeholder" style={{ fontSize:9 }}>img</span></div><span className="t-sm">{m.brawler}</span></div></td>
                        <td className="t-sm text-2">{m.map}</td>
                        <td className={`table-num ${m.result==='Win'?'text-success':m.result==='Loss'?'text-error':'text-warning'}`}>{m.trophyChange}</td>
                        <td><span className={`badge badge-${m.result==='Win'?'win':m.result==='Loss'?'loss':'draw'}`}>{m.result}{m.rank!=null?` #${m.rank}`:''}</span></td>
                        <td className="t-sm text-3">{timeAgo(m.battleTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

      </div>
    </Layout>
  );
}