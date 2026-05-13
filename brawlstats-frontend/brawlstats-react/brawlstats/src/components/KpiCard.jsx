import React from 'react';
export default function KpiCard({ label, value, delta, deltaType = 'up', sub, icon, color = 'blue' }) {
  return (
    <div className={`kpi kpi-${color}`}>
      <div className="kpi-label">{label}{icon && <div className={`kpi-icon kpi-icon-${color}`}>{icon}</div>}</div>
      <div className="kpi-value">{value}</div>
      {delta && <span className={`kpi-delta kpi-delta-${deltaType}`}>{deltaType==='up'?'▲':deltaType==='down'?'▼':'→'} {delta}</span>}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
