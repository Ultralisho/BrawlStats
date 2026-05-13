import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

const TIER_DATA = {
  s: ['Leon','Spike','Sandy','Mico','Lily','Cordelius','Fang','Gray'],
  a: ['Amber','Meg','Crow','Surge','Chester','Mortis','Tara','Gene','Max','Byron','Eve','Janet','Otis','Melodie'],
  b: ['Bo','Emz','Piper','Frank','Bibi','Bea','Edgar','Griff','Belle','Colette','Sam','Angelo','Charlie','Squeak','Lou','Buzz','Buster','R-T','Willow','Chuck'],
  c: ['Nani','Gale','Ash','Lola','Mandy','Maisie','Hank','Pearl','Stu','Mr.P','Sprout','Ruffs','Doug','Jessie','8-Bit','Rico','Darryl','Penny','Carl','Jacky','Gus'],
  d: ['Shelly','Nita','Colt','Bull','Brock','El Primo','Barley','Poco','Rosa','Dynamike','Tick','Bonnie','Pam','Larry & Lawrie','Berry','Clover','Ollie','Moe','Kenji','Shade','Juju','Clancy','Finx','Grom'],
};

const TIER_STYLES = {
  s: { bg: 'rgba(239,68,68,0.2)',   color: '#EF4444', border: 'rgba(239,68,68,0.3)'  },
  a: { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
  b: { bg: 'rgba(34,197,94,0.2)',   color: '#22C55E', border: 'rgba(34,197,94,0.3)'  },
  c: { bg: 'rgba(59,130,246,0.2)',  color: '#3B82F6', border: 'rgba(59,130,246,0.3)' },
  d: { bg: 'rgba(139,92,246,0.2)',  color: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
};

const MODES = ['Global','Gem Grab','Brawl Ball','Showdown','Hot Zone','Knockout','Heist','Bounty'];

const tierRowStyle = { display: 'flex', alignItems: 'stretch', gap: 'var(--s3)', marginBottom: 'var(--s3)' };
const tierLabelStyle = (t) => ({
  width: 56, minHeight: 56, borderRadius: 'var(--r-md)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, flexShrink: 0,
  background: TIER_STYLES[t].bg, color: TIER_STYLES[t].color,
  border: `1px solid ${TIER_STYLES[t].border}`,
});
const tierSlotsStyle = {
  flex: 1, display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', alignItems: 'center',
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)', padding: 'var(--s3)', minHeight: 64,
};

export default function TierList() {
  const [mode, setMode] = useState('Global');

  return (
    <Layout>
      <Topbar
        title="Tier List"
        actions={
          <div className="flex gap-2">
            <div className="api-status"><div className="api-dot online" /> API online</div>
            <button className="btn btn-sm btn-secondary">Compartir</button>
          </div>
        }
      />
      <div className="page">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="t-h2 mb-1">Tier List — Temporada actual</h1>
            <p className="t-sm text-3">Basada en win rate global · Actualizada hace 2 horas · <span style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>Fuente: API Supercell</span></p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="badge badge-info">Meta actual</span>
            <button className="btn btn-sm btn-secondary">Exportar imagen</button>
          </div>
        </div>

        {/* Filtro modo */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="t-label" style={{ marginRight: 'var(--s2)' }}>Modo:</span>
            {MODES.map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '7px 14px', borderRadius: 'var(--r-md)', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                  border: '1px solid var(--border)',
                  background: mode === m ? 'var(--blue-dim)' : 'transparent',
                  color: mode === m ? 'var(--blue)' : 'var(--text-2)',
                  borderColor: mode === m ? 'var(--blue-border)' : 'var(--border)',
                }}
              >{m}</button>
            ))}
          </div>
        </div>

        {/* Tier list */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Clasificación por rendimiento</span>
            <span className="t-xs text-3" style={{ fontFamily: 'var(--font-mono)' }}>102 brawlers clasificados</span>
          </div>
          {Object.entries(TIER_DATA).map(([tier, names]) => (
            <div key={tier} style={tierRowStyle}>
              <div style={tierLabelStyle(tier)}>{tier.toUpperCase()}</div>
              <div style={tierSlotsStyle}>
                {names.map(name => (
                  <div
                    key={name}
                    title={name}
                    style={{
                      width: 52, height: 52, borderRadius: 'var(--r-md)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'var(--transition)', fontSize: 8,
                      textAlign: 'center', color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = 'var(--blue-border)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    {name.substring(0, 5)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="card mt-4">
          <div className="card-header"><span className="card-title">Leyenda</span></div>
          <div className="grid cols-4" style={{ gap: 'var(--s3)' }}>
            {[
              { t: 's', label: 'Meta dominante', sub: 'Win rate >70%' },
              { t: 'a', label: 'Muy fuerte',     sub: 'Win rate 60-70%' },
              { t: 'b', label: 'Viable',          sub: 'Win rate 50-60%' },
              { t: 'c', label: 'Situacional',     sub: 'Win rate 40-50%' },
            ].map(({ t, label, sub }) => (
              <div key={t} className="flex items-center gap-3">
                <div style={{ ...tierLabelStyle(t), width: 40, height: 40, fontSize: 18 }}>{t.toUpperCase()}</div>
                <div>
                  <div className="t-sm text-1">{label}</div>
                  <div className="t-xs text-3">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
