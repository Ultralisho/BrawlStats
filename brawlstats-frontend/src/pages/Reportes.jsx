import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import fetchApi from '../services/api';

// Mapeo display → ENUM del backend
const TYPE_MAP = {
  'Reporte de jugador':       'player',
  'Análisis de meta':         'meta',
  'Reporte de club':          'club',
  'Comparativa de brawlers':  'brawler_comparison',
};
const PERIOD_MAP = {
  'Últimos 7 días':   '7d',
  'Últimos 30 días':  '30d',
  'Últimos 90 días':  '90d',
  'Temporada actual': 'season',
};
const TYPE_LABELS   = Object.keys(TYPE_MAP);
const PERIOD_LABELS = Object.keys(PERIOD_MAP);

// Tipo y período de vuelta a display
const TYPE_DISPLAY   = Object.fromEntries(Object.entries(TYPE_MAP).map(([k,v]) => [v,k]));
const PERIOD_DISPLAY = Object.fromEntries(Object.entries(PERIOD_MAP).map(([k,v]) => [v,k]));

function fmtSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024)            return bytes + ' B';
  if (bytes < 1024 * 1024)    return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return dateStr; }
}


const STATUS_STYLE = {
  ready:      { label: 'Listo',      cls: 'badge-win'     },
  generating: { label: 'Generando…', cls: 'badge-default' },
  error:      { label: 'Error',      cls: 'badge-loss'    },
  pending:    { label: 'Pendiente',  cls: 'badge-default' },
};

export default function Reportes() {
  const [reports,    setReports]    = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [genError,   setGenError]   = useState('');
  const [genSuccess, setGenSuccess] = useState('');
  const [form, setForm] = useState({
    name:   '',
    type:   TYPE_LABELS[0],
    period: PERIOD_LABELS[1],
  });

  const pollRef = useRef(null);

  function loadReports(silent = false) {
    if (!silent) setLoadingList(true);
    fetchApi('/reports')
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => { if (!silent) setLoadingList(false); });
  }

  // Polling: si hay algún reporte "generating", refrescar cada 3 s
  useEffect(() => {
    const hasGenerating = reports.some(r => r.status === 'generating' || r.status === 'pending');
    if (hasGenerating) {
      pollRef.current = setInterval(() => loadReports(true), 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [reports]);

  useEffect(() => { loadReports(); }, []);

  async function generar(e) {
    e.preventDefault();
    const name = form.name.trim() || `${form.type} — ${form.period}`;
    setGenerating(true);
    setGenError('');
    setGenSuccess('');
    try {
      await fetchApi('/reports', {
        method: 'POST',
        body: {
          name,
          type:   TYPE_MAP[form.type],
          period: PERIOD_MAP[form.period],
        },
      });
      setGenSuccess('Reporte en generación. Aparecerá listo en unos segundos.');
      setForm(f => ({ ...f, name: '' }));
      loadReports(true);
    } catch (err) {
      setGenError(err.message || 'Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este reporte?')) return;
    setDeletingId(id);
    try {
      await fetchApi(`/reports/${id}`, { method: 'DELETE' });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  }

  async function descargar(report) {
    if (report.status !== 'ready') return;
    try {
      const BASE  = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('bs_token');
      const res   = await fetch(`${BASE}/reports/${report.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const blob   = await res.blob();
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href       = url;
      a.download   = report.name + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('No se pudo descargar: ' + err.message);
    }
  }

  const hasGenerating = reports.some(r => r.status === 'generating' || r.status === 'pending');
  const atLimit = reports.length >= 5;

  return (
    <Layout>
      <Topbar
        title="Reportes PDF"
        actions={
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => loadReports()}
            disabled={loadingList}
          >
            {loadingList ? 'Cargando…' : '↺ Actualizar'}
          </button>
        }
      />

      <div className="page">

        {/* Formulario */}
        <div className="card" style={{ marginBottom: 'var(--s5)' }}>
          <div className="card-header">
            <span className="card-title">Nuevo reporte</span>
            <span style={{ fontSize:12, color: atLimit ? '#ef4444' : 'var(--text-3)', fontFamily:'var(--font-mono)' }}>
              {reports.length} / 5 reportes usados
            </span>
          </div>
          {atLimit && (
            <div className="alert alert-error" style={{ marginBottom:'var(--s3)' }}>
              Elimina un reporte existente para poder crear uno nuevo.
            </div>
          )}
          <form onSubmit={generar}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nombre (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Informe Mayo 2026"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tipo de reporte</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {TYPE_LABELS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Período</label>
                <select
                  className="form-select"
                  value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                >
                  {PERIOD_LABELS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {genError   && <div className="alert alert-error"   style={{ marginBottom: 'var(--s3)' }}>{genError}</div>}
            {genSuccess && <div className="alert alert-success" style={{ marginBottom: 'var(--s3)' }}>{genSuccess}</div>}

            <button type="submit" className="btn btn-primary" disabled={generating || atLimit}>
              {generating ? (
                <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Generando…</>
              ) : atLimit ? 'Límite alcanzado' : '+ Generar reporte'}
            </button>
          </form>
        </div>

        {/* Lista de reportes */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Reportes generados {reports.length > 0 && `(${reports.length})`}
            </span>
            {hasGenerating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                <span className="loading-spinner" style={{ width: 12, height: 12 }} />
                Generando…
              </span>
            )}
          </div>

          {loadingList ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--s8)' }}>
              <div className="loading-spinner" />
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--s10)', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 'var(--s3)' }}>📄</div>
              <div style={{ fontSize: 14 }}>No tienes reportes todavía.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Genera uno con el formulario de arriba.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Período</th>
                    <th>Tamaño</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const st   = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                    const isOk = r.status === 'ready' && r.filePath;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>📄</span>
                            <span className="table-name">{r.name}</span>
                          </div>
                        </td>
                        <td className="t-sm text-2" style={{ fontFamily: 'var(--font-mono)' }}>
                          {fmtDate(r.createdAt)}
                        </td>
                        <td>
                          <span className="badge badge-info">
                            {TYPE_DISPLAY[r.type] || r.type}
                          </span>
                        </td>
                        <td className="t-sm text-2">
                          {PERIOD_DISPLAY[r.period] || r.period || '—'}
                        </td>
                        <td className="t-sm text-2">
                          {fmtSize(r.fileSize)}
                        </td>
                        <td>
                          {r.status === 'generating' || r.status === 'pending' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
                              <span className="loading-spinner" style={{ width: 10, height: 10 }} />
                              {st.label}
                            </span>
                          ) : (
                            <span className={`badge ${st.cls}`}>{st.label}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => descargar(r)}
                              disabled={!isOk}
                              title={!isOk ? 'El reporte aún no está listo' : 'Descargar PDF'}
                            >
                              ⬇ Descargar
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--error)' }}
                              onClick={() => eliminar(r.id)}
                              disabled={deletingId === r.id}
                            >
                              {deletingId === r.id ? '…' : '✕'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
