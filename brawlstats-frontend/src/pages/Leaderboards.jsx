import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import fetchApi from '../services/api';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';

const TABS = ['Global', 'Pais'];

const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brasil' },
  { code: 'DE', name: 'Alemania' },
  { code: 'FR', name: 'Francia' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japón' },
];

function PlayerAvatar({ player }) {
  const [failed, setFailed] = useState(false);
  const iconId = player?.icon?.id;
  const src = iconId ? `https://cdn.brawlify.com/profile-icons/regular/${iconId}.png` : null;
  const initial = (player?.name || '?')[0].toUpperCase();

  const wrap = {
    width: 32, height: 32, borderRadius: '50%',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  };

  if (!src || failed) {
    return (
      <div style={wrap}>
        <span style={{ fontWeight: 700, color: 'var(--text-2)', fontSize: 14 }}>{initial}</span>
      </div>
    );
  }
  return (
    <div style={wrap}>
      <img
        src={src}
        alt={player.name || ''}
        width={32}
        height={32}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: 32, height: 32, objectFit: 'cover' }}
      />
    </div>
  );
}

export default function Leaderboards() {
  const navigate = useNavigate();
  const [tab,     setTab]     = useState('Global');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [country, setCountry] = useState('ES');

  const loadTab = async (activeTab, code) => {
    setLoading(true); setError(null); setPlayers([]);
    try {
      let data;
      if (activeTab === 'Global') {
        data = await fetchApi('/leaderboard/global');
      } else {
        data = await fetchApi('/leaderboard/country/' + (code || 'ES'));
      }
      setPlayers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTab(tab, country); }, [tab, country]);

  const topPlayer   = players[0];
  const maxTrophies = topPlayer?.trophies ?? 0;

  const rankLabel = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return i + 1;
  };

  const countryNameOf = (code) => COUNTRIES.find(c => c.code === code)?.name || code;

  return (
    <Layout>
      <Topbar title="Leaderboards" />
      <div style={{ padding:'1.5rem', flex:1, overflowY:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
          <KpiCard label="Jugadores"     value={players.length} />
          <KpiCard label="Primer puesto" value={topPlayer?.name ?? '-'} />
          <KpiCard label="Max trofeos"   value={maxTrophies ? maxTrophies.toLocaleString() : '-'} />
        </div>

        <div className="card">
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap', alignItems:'center' }}>
            {TABS.map(t => (
              <button
                key={t}
                className={"btn " + (tab === t ? 'btn-primary' : '')}
                style={tab !== t ? { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'var(--color-text-muted)' } : {}}
                onClick={() => setTab(t)}
              >
                {t === 'Pais' ? 'Por País' : t}
              </button>
            ))}
            {tab === 'Pais' && (
              <div style={{ marginLeft:'auto' }}>
                <select
                  className="form-input"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  style={{ minWidth:'180px' }}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid #ef4444', borderRadius:'8px', padding:'0.75rem 1rem', marginBottom:'1rem', color:'#ef4444' }}>
              {error}
            </div>
          )}

          {loading ? (
            <p style={{ color:'var(--color-text-muted)', padding:'2rem', textAlign:'center' }}>Cargando ranking...</p>
          ) : players.length === 0 ? (
            <p style={{ color:'var(--color-text-muted)', padding:'2rem', textAlign:'center' }}>
              No hay datos disponibles para esta selección.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width:'48px' }}>#</th>
                  <th style={{ width:'48px' }}></th>
                  <th>Jugador</th>
                  <th>Tag</th>
                  <th>Trofeos</th>
                  <th>Club</th>
                  <th>País</th>
                </tr>
              </thead>
              <tbody>
                {players.slice(0,100).map((p, i) => {
                  const cleanTag = (p.tag || '').replace('#','');
                  const goProfile = () => { if (cleanTag) navigate('/jugador/' + cleanTag); };
                  return (
                    <tr key={p.tag || p.id || i}
                        onClick={goProfile}
                        style={{ cursor: cleanTag ? 'pointer' : 'default' }}
                        title={cleanTag ? 'Ver perfil completo' : ''}>
                      <td>
                        <span style={{ fontWeight:700, color: i === 0 ? '#FACC15' : i === 1 ? '#e2e8f0' : i === 2 ? '#cd7c2f' : 'var(--color-text-muted)', fontSize: i < 3 ? '1.1em' : '1em' }}>
                          {rankLabel(i)}
                        </span>
                      </td>
                      <td><PlayerAvatar player={p} /></td>
                      <td style={{ fontWeight: i < 3 ? 600 : 400, color: 'var(--color-gold)' }}>{p.name}</td>
                      <td style={{ color:'var(--color-text-muted)', fontFamily:'monospace', fontSize:'0.85em' }}>{p.tag}</td>
                      <td style={{ color:'var(--color-gold)', fontWeight:600 }}>{p.trophies != null ? p.trophies.toLocaleString() : '-'}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>{p.club?.name ?? p.club ?? '-'}</td>
                      <td style={{ color:'var(--color-text-muted)', fontSize:'0.9em' }}>
                        {tab === 'Pais' ? countryNameOf(country) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
