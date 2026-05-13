import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

const BRAWLER_LIST = ['Leon','Sandy','Spike','Amber','Crow','Meg','Fang','Gray','Mortis','Tara','Gene','Buzz','Piper','Frank','Bibi','Shelly','Colt','Bull'];

function calcScore(b1, b2, b3, mode) {
  if (!b1 || !b2 || !b3) return null;
  const base = { 'Gem Grab': 68, 'Brawl Ball': 62, 'Showdown': 55, 'Hot Zone': 60, 'Knockout': 65 };
  const bonus = { Leon: 8, Sandy: 6, Spike: 5, Amber: 5, Crow: 4, Meg: 3, Fang: 7 };
  const score = (base[mode] || 60) + (bonus[b1] || 0) + (bonus[b2] || 0) + (bonus[b3] || 0);
  return Math.min(score, 99);
}

export default function CalcCompeti() {
  const [b1, setB1] = useState('');
  const [b2, setB2] = useState('');
  const [b3, setB3] = useState('');
  const [mode, setMode] = useState('Gem Grab');
  const score = calcScore(b1, b2, b3, mode);

  const scoreColor = score >= 75 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)';
  const scoreLabel = score >= 75 ? 'Composición fuerte ✓' : score >= 60 ? 'Composición viable' : 'Composición débil';

  return (
    <Layout>
      <Topbar title="Calculadora Competitiva" />
      <div className="page">

        <div className="grid cols-2" style={{ gap: 'var(--s5)' }}>

          {/* Config */}
          <div className="card">
            <div className="card-header"><span className="card-title">Configurar composición</span></div>

            <div className="form-group">
              <label className="form-label">Modo de juego</label>
              <select className="form-select" value={mode} onChange={e => setMode(e.target.value)}>
                {['Gem Grab','Brawl Ball','Showdown','Hot Zone','Knockout'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="grid cols-3" style={{ gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
              {[['Brawler 1', b1, setB1], ['Brawler 2', b2, setB2], ['Brawler 3', b3, setB3]].map(([label, val, setter]) => (
                <div key={label} className="form-group">
                  <label className="form-label">{label}</label>
                  <select className="form-select" value={val} onChange={e => setter(e.target.value)}>
                    <option value="">Seleccionar</option>
                    {BRAWLER_LIST.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Sinergias */}
            <div className="card mt-4" style={{ background: 'var(--bg-base)' }}>
              <div className="card-header"><span className="card-title">Sinergias detectadas</span></div>
              {b1 && b2 && b3 ? (
                <div>
                  {['Leon','Sandy','Fang'].includes(b1) && ['Sandy','Fang'].includes(b2)
                    ? <div className="alert alert-success mt-2">✓ Sinergia de invisibilidad detectada</div>
                    : <div className="t-sm text-3 mt-2">Sin sinergias especiales para esta combinación.</div>
                  }
                </div>
              ) : (
                <div className="t-sm text-3 mt-2">Selecciona los 3 brawlers para ver sinergias.</div>
              )}
            </div>
          </div>

          {/* Resultado */}
          <div className="card">
            <div className="card-header"><span className="card-title">Puntuación estimada</span></div>

            {score ? (
              <>
                <div style={{ textAlign: 'center', padding: 'var(--s6) 0' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                    {score}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: scoreColor, marginTop: 8 }}>{scoreLabel}</div>
                </div>

                <div className="progress-wrap mb-4">
                  <div className="progress-header"><span className="progress-label">Win rate estimado</span><span className="progress-value">{score}%</span></div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill progress-green" style={{ width: `${score}%`, background: scoreColor }} />
                  </div>
                </div>

                <div className="stat-row"><span className="stat-row-label">Modo</span><span className="stat-row-value">{mode}</span></div>
                <div className="stat-row"><span className="stat-row-label">Composición</span><span className="stat-row-value">{b1} + {b2} + {b3}</span></div>
                <div className="stat-row"><span className="stat-row-label">Puntuación</span><span className="stat-row-value" style={{ color: scoreColor, fontFamily: 'var(--font-mono)' }}>{score}/99</span></div>

                <button className="btn btn-primary mt-4 w-full">Guardar composición</button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--s8) 0', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⊞</div>
                <div className="t-sm">Selecciona modo y 3 brawlers para calcular</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabla comparativa de modos */}
        <div className="card mt-6">
          <div className="card-header"><span className="card-title">Win rate por modo según brawler</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Brawler</th><th>Gem Grab</th><th>Brawl Ball</th><th>Showdown</th><th>Hot Zone</th><th>Knockout</th><th>Mejor modo</th></tr>
              </thead>
              <tbody>
                {[
                  { name:'Leon',  gg:74, bb:62, sd:68, hz:55, ko:70, best:'Gem Grab'  },
                  { name:'Sandy', gg:71, bb:65, sd:55, hz:60, ko:58, best:'Gem Grab'  },
                  { name:'Spike', gg:68, bb:70, sd:55, hz:72, ko:64, best:'Hot Zone'  },
                  { name:'Amber', gg:65, bb:72, sd:48, hz:68, ko:55, best:'Brawl Ball'},
                  { name:'Crow',  gg:60, bb:55, sd:65, hz:58, ko:72, best:'Knockout'  },
                ].map(r => (
                  <tr key={r.name}>
                    <td className="table-name">{r.name}</td>
                    {[r.gg, r.bb, r.sd, r.hz, r.ko].map((v, i) => (
                      <td key={i}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: v >= 70 ? 'var(--success)' : v >= 60 ? 'var(--warning)' : 'var(--error)' }}>
                          {v}%
                        </span>
                      </td>
                    ))}
                    <td><span className="badge badge-info">{r.best}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}
