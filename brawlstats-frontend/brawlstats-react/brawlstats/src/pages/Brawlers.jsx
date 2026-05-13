import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

const ALL_BRAWLERS = [
  { name:'Leon',    rarity:'legendary', role:'Assassin', wr:'74%', trophies:1840, owned:true  },
  { name:'Sandy',   rarity:'legendary', role:'Controller', wr:'69%', trophies:1720, owned:true  },
  { name:'Spike',   rarity:'legendary', role:'Controller', wr:'61%', trophies:1680, owned:true  },
  { name:'Amber',   rarity:'legendary', role:'Controller', wr:'66%', trophies:1520, owned:true  },
  { name:'Crow',    rarity:'legendary', role:'Assassin',   wr:'63%', trophies:1480, owned:true  },
  { name:'Meg',     rarity:'legendary', role:'Tank',       wr:'58%', trophies:1200, owned:true  },
  { name:'Fang',    rarity:'mythic',    role:'Assassin',   wr:'67%', trophies:1350, owned:true  },
  { name:'Gray',    rarity:'mythic',    role:'Support',    wr:'55%', trophies:980,  owned:true  },
  { name:'Mortis',  rarity:'mythic',    role:'Assassin',   wr:'52%', trophies:1100, owned:true  },
  { name:'Tara',    rarity:'mythic',    role:'Support',    wr:'60%', trophies:1050, owned:true  },
  { name:'Gene',    rarity:'mythic',    role:'Support',    wr:'57%', trophies:990,  owned:true  },
  { name:'Buzz',    rarity:'mythic',    role:'Tank',       wr:'53%', trophies:920,  owned:true  },
  { name:'Piper',   rarity:'epic',      role:'Sharpshooter', wr:'56%', trophies:860, owned:false },
  { name:'Frank',   rarity:'epic',      role:'Tank',       wr:'50%', trophies:780,  owned:false },
  { name:'Bibi',    rarity:'epic',      role:'Tank',       wr:'51%', trophies:700,  owned:false },
  { name:'Shelly',  rarity:'common',    role:'Fighter',    wr:'45%', trophies:620,  owned:true  },
  { name:'Colt',    rarity:'common',    role:'Sharpshooter', wr:'44%', trophies:580, owned:true },
  { name:'Bull',    rarity:'common',    role:'Tank',       wr:'46%', trophies:540,  owned:true  },
];

const RARITIES = ['Todas','legendary','mythic','epic','super-rare','rare','common'];
const ROLES    = ['Todos','Assassin','Controller','Tank','Support','Sharpshooter','Fighter'];

export default function Brawlers() {
  const [rarity, setRarity] = useState('Todas');
  const [role,   setRole]   = useState('Todos');
  const [search, setSearch] = useState('');
  const [onlyOwned, setOnlyOwned] = useState(false);

  const filtered = ALL_BRAWLERS.filter(b => {
    if (rarity !== 'Todas' && b.rarity !== rarity) return false;
    if (role   !== 'Todos' && b.role   !== role)   return false;
    if (onlyOwned && !b.owned) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <Topbar
        title="Brawlers"
        actions={
          <div className="flex gap-2">
            <span className="t-sm text-3" style={{ padding: '6px 0' }}>{filtered.length} brawlers</span>
          </div>
        }
      />
      <div className="page">

        {/* Filtros */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input className="form-input" style={{ maxWidth: 200 }} placeholder="Buscar brawler..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-select" style={{ width: 'auto', padding: '8px 14px' }} value={rarity} onChange={e => setRarity(e.target.value)}>
              {RARITIES.map(r => <option key={r}>{r}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto', padding: '8px 14px' }} value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <label className="flex items-center gap-2 t-sm" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyOwned} onChange={e => setOnlyOwned(e.target.checked)} />
              Solo los míos
            </label>
          </div>
        </div>

        {/* Grid de brawlers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--s4)' }}>
          {filtered.map(b => (
            <div key={b.name} className="card" style={{
              textAlign: 'center', cursor: 'pointer', opacity: b.owned ? 1 : 0.5,
              transition: 'var(--transition)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue-border)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
            >
              {/* Avatar placeholder */}
              <div style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'var(--bg-elevated)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--s3)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-3)' }}>
                {b.name[0]}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{b.name}</div>
              <span className={`badge badge-${b.rarity}`} style={{ fontSize: 9 }}>{b.rarity}</span>
              <div className="t-xs text-3 mt-2">{b.role}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success)', marginTop: 4 }}>WR {b.wr}</div>
              {!b.owned && <div className="t-xs text-3 mt-2" style={{ color: 'var(--warning)' }}>No desbloqueado</div>}
            </div>
          ))}
        </div>

      </div>
    </Layout>
  );
}
