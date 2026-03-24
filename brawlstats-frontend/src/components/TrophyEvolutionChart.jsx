import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import fetchApi from '../services/api';

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const RANGOS = [
  { dias: 7,   label: '7D'  },
  { dias: 30,  label: '30D' },
  { dias: 90,  label: '90D' },
  { dias: 365, label: '1A'  },
];

export default function TrophyEvolutionChart({ initialDays = 30, title = 'Evolucion de trofeos', compact = false }) {
  const [dias,    setDias]    = useState(initialDays);
  const [data,    setData]    = useState([]);
  const [suave,   setSuave]   = useState(true);
  const [showAvg, setShowAvg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fetchApi('/stats/trophy-history?days=' + dias)
      .then(d => { if (alive) setData(Array.isArray(d) ? d : []); })
      .catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [dias]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const puntos = data.map(d => ({ t: new Date(d.t).getTime(), v: d.v })).sort((a, b) => a.t - b.t);
    const vals   = puntos.map(p => p.v);
    let maxGain = 0, maxLoss = 0;
    for (let i = 1; i < vals.length; i++) {
      const d = vals[i] - vals[i-1];
      if (d > maxGain) maxGain = d;
      if (d < maxLoss) maxLoss = d;
    }
    return {
      puntos,
      actual: vals[vals.length - 1],
      alto:   Math.max(...vals),
      bajo:   Math.min(...vals),
      avg:    Math.round(vals.reduce((s,v) => s+v, 0) / vals.length),
      delta:  vals[vals.length - 1] - vals[0],
      maxGain, maxLoss,
      snapshots: puntos.length,
    };
  }, [data]);

  const wrapStyle = {
    background:'#0f1923', borderRadius:'12px',
    padding: compact ? '1rem' : '1.25rem',
    border:'1px solid rgba(255,255,255,0.04)',
  };

  if (loading && (!data || data.length === 0)) {
    return <div style={wrapStyle}>{titulo(title)}<Mensaje text="Cargando historico..." /></div>;
  }
  if (error) {
    return <div style={wrapStyle}>{titulo(title)}<Mensaje text={error} color="#ef4444" /></div>;
  }
  if (!stats || stats.puntos.length < 2) {
    return (
      <div style={wrapStyle}>
        {titulo(title)}
        {selectorRango(dias, setDias)}
        <Mensaje text="Sincroniza varias veces para ver la evolucion de tus trofeos en este rango." />
      </div>
    );
  }

  const { puntos, actual, alto, bajo, avg, delta, maxGain, maxLoss, snapshots } = stats;
  const positivo = delta >= 0;

  // Eje Y dinamico: domain ajustado a min/max con margen para que la
  // progresion se vea claramente y no parezca un grafico plano.
  const margen   = Math.max((alto - bajo) * 0.1, 500);
  const yDomain  = [bajo - margen, alto + margen];

  // Punto especial: solo el ultimo con anillo verde neon, resto blancos.
  const renderDot = (props) => {
    const { cx, cy, index } = props;
    const ultimo = index === puntos.length - 1;
    if (ultimo) {
      return <circle key={index} cx={cx} cy={cy} r={compact ? 4 : 5} fill="white" stroke="#00ff87" strokeWidth={2.5} />;
    }
    return <circle key={index} cx={cx} cy={cy} r={compact ? 2.5 : 3} fill="white" stroke="none" strokeWidth={0} />;
  };

  return (
    <div style={wrapStyle}>
      {titulo(title)}

      {/* KPIs + badge delta */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.9rem' }}>
        <div style={{ display:'flex', gap: compact ? '1.25rem' : '1.75rem', flexWrap:'wrap' }}>
          {[
            ['ACTUAL',   fmtK(actual), 'white'],
            ['ALTO',     fmtK(alto),   '#00ff87'],
            ['BAJO',     fmtK(bajo),   '#ef4444'],
            ['PROMEDIO', fmtK(avg),    '#f5a623'],
          ].map(([label, val, color]) => (
            <div key={label}>
              <div style={{ fontSize:'0.65em', color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', marginBottom:'2px' }}>{label}</div>
              <div style={{ fontSize: compact ? '0.95em' : '1.05em', fontWeight:700, color, fontFamily:'monospace' }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{
          background: positivo ? 'rgba(0,255,135,0.12)' : 'rgba(239,68,68,0.12)',
          border:     '1px solid ' + (positivo ? 'rgba(0,255,135,0.5)' : 'rgba(239,68,68,0.5)'),
          color:      positivo ? '#00ff87' : '#ef4444',
          borderRadius:'6px', padding:'2px 10px', fontSize:'0.82em', fontWeight:700, fontFamily:'monospace',
        }}>
          {fmtSigned(delta)} {positivo ? '▲' : '▼'}
        </div>
      </div>

      {/* Controles: rango + toggles */}
      <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'0.75rem', flexWrap:'wrap' }}>
        {selectorRango(dias, setDias)}
        <div style={{ marginLeft:'auto', display:'flex', gap:'4px' }}>
          {boton(suave   ? '∿ Suave' : '⌐ Lineal', suave,   () => setSuave(!suave),     '#00ff87')}
          {boton('⎯ Promedio',                     showAvg, () => setShowAvg(!showAvg), '#00ff87')}
        </div>
      </div>

      {/* Grafico */}
      <ResponsiveContainer width="100%" height={compact ? 170 : 210}>
        <AreaChart data={puntos} margin={{ top:8, right:6, left:0, bottom:0 }}>
          <defs>
            <linearGradient id="trophyEvoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.5}/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin','dataMax']}
            tickFormatter={fmtFecha} tick={ejeTick} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis tickFormatter={fmtK} tick={ejeTick} axisLine={false} tickLine={false} width={48}
            domain={yDomain} allowDataOverflow={false} />
          <Tooltip contentStyle={tooltipStyle}
            formatter={v => [fmtK(v) + ' trofeos', null]}
            labelFormatter={fmtFechaLarga} separator="" />
          {showAvg && (
            <ReferenceLine y={avg} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.5}
              label={{ value:'avg ' + fmtK(avg), position:'insideTopRight', fill:'#3b82f6', fontSize:10, fontFamily:'monospace' }} />
          )}
          <Area type={suave ? 'monotone' : 'linear'} dataKey="v"
            stroke="#3b82f6" strokeWidth={2.5} fill="url(#trophyEvoGrad)"
            dot={renderDot} activeDot={{ r:5, fill:'white', stroke:'#00ff87', strokeWidth:2 }}
            isAnimationActive animationDuration={450} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Footer */}
      <div style={{
        display:'flex', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap',
        marginTop:'0.75rem', paddingTop:'0.75rem',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        fontSize:'0.72em', color:'rgba(255,255,255,0.45)', fontFamily:'monospace',
      }}>
        <span><span style={{ color:'#22c55e', fontWeight:700 }}>+{maxGain}</span> mejor cambio</span>
        <span><span style={{ color:'#ef4444', fontWeight:700 }}>{maxLoss}</span> peor cambio</span>
        <span>{snapshots} snapshots</span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtK(v) {
  if (typeof v !== 'number') return '-';
  return Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(v);
}
function fmtSigned(v) {
  return (v >= 0 ? '+' : '') + fmtK(v);
}
function fmtFecha(t) {
  const d = new Date(t);
  return MESES[d.getMonth()] + ' ' + d.getDate();
}
function fmtFechaLarga(t) {
  return new Date(t).toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
}

const ejeTick      = { fill:'rgba(255,255,255,0.35)', fontSize:11 };
const tooltipStyle = { background:'#1a2840', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'white', fontSize:'0.85em' };

function titulo(text) {
  return (
    <div style={{ fontSize:'0.95em', fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:'0.85rem' }}>
      {text}
    </div>
  );
}

function Mensaje({ text, color = 'rgba(255,255,255,0.4)' }) {
  return <div style={{ padding:'2.5rem', textAlign:'center', color }}>{text}</div>;
}

function selectorRango(activo, onChange) {
  return (
    <div style={{ display:'flex', gap:'4px' }}>
      {RANGOS.map(r => {
        const on = activo === r.dias;
        return (
          <button key={r.dias} onClick={() => onChange(r.dias)} style={{
            padding:'4px 12px', fontSize:'0.75em', fontWeight:700, cursor:'pointer',
            border:'1px solid ' + (on ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'),
            borderRadius:'6px', fontFamily:'monospace',
            background: on ? 'rgba(245,166,35,0.15)' : 'transparent',
            color:      on ? '#f5a623' : 'rgba(255,255,255,0.5)',
          }}>{r.label}</button>
        );
      })}
    </div>
  );
}

function boton(label, activo, onClick, color) {
  return (
    <button onClick={onClick} style={{
      padding:'4px 10px', fontSize:'0.72em', fontWeight:600, cursor:'pointer',
      border:'1px solid ' + (activo ? color + '66' : 'rgba(255,255,255,0.08)'),
      borderRadius:'6px',
      background: activo ? color + '1a' : 'transparent',
      color:      activo ? color : 'rgba(255,255,255,0.45)',
    }}>{label}</button>
  );
}
