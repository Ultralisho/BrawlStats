import React, { useState } from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import KpiCard from '../components/KpiCard';

const MOCK_USERS = [
  { id:1, name:'Ulises H.',   email:'ulises@brawlstats.gg', role:'admin', status:'Active', joined:'12/01/2026' },
  { id:2, name:'ProBS',       email:'pro@bs.gg',            role:'user',  status:'Active', joined:'15/02/2026' },
  { id:3, name:'SandyPro',    email:'sandy@mail.com',       role:'user',  status:'Active', joined:'20/02/2026' },
  { id:4, name:'MetaGuru',    email:'meta@guru.gg',         role:'user',  status:'Banned', joined:'01/03/2026' },
  { id:5, name:'SpikeMX',     email:'spike@mx.com',         role:'user',  status:'Active', joined:'10/03/2026' },
];

export default function Admin() {
  const [tab, setTab] = useState('usuarios');
  const [users, setUsers] = useState(MOCK_USERS);

  function toggleBan(id) {
    setUsers(u => u.map(user => user.id === id ? { ...user, status: user.status === 'Banned' ? 'Active' : 'Banned' } : user));
  }

  return (
    <Layout>
      <Topbar
        title="Panel Admin"
        actions={
          <div className="flex gap-2">
            <span className="badge badge-info">Admin</span>
            <button className="btn btn-sm btn-secondary">Sincronizar API</button>
          </div>
        }
      />
      <div className="page">

        {/* KPIs admin */}
        <div className="grid cols-4 mb-6">
          <KpiCard label="Usuarios totales"   value="1,284"  delta="+12"   deltaType="up"  sub="esta semana"    icon="◉" color="blue"   />
          <KpiCard label="Partidas indexadas" value="4.2M"   delta="+80K"  deltaType="up"  sub="últimas 24h"    icon="▤" color="green"  />
          <KpiCard label="Reportes generados" value="3,420"  delta="+48"   deltaType="up"  sub="este mes"       icon="◎" color="yellow" />
          <KpiCard label="Brawlers en DB"     value="102"    delta="0"     deltaType="neutral" sub="sin cambios" icon="★" color="red"  />
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="flex gap-2 mb-4">
            {['usuarios','brawlers','estadísticas'].map(t => (
              <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
            ))}
          </div>

          {tab === 'usuarios' && (
            <>
              <div className="card-header mb-4">
                <span className="card-title">Gestión de usuarios</span>
                <button className="btn btn-sm btn-primary">+ Nuevo usuario</button>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="t-sm text-3">{u.id}</td>
                        <td className="table-name">{u.name}</td>
                        <td className="t-sm text-2">{u.email}</td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-legendary' : 'badge-info'}`}>{u.role}</span></td>
                        <td><span className={`badge ${u.status === 'Active' ? 'badge-win' : 'badge-loss'}`}>{u.status}</span></td>
                        <td className="t-sm text-3" style={{ fontFamily: 'var(--font-mono)' }}>{u.joined}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-secondary">Editar</button>
                            <button className={`btn btn-sm ${u.status === 'Banned' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleBan(u.id)} style={u.status !== 'Banned' ? { color: 'var(--error)' } : {}}>
                              {u.status === 'Banned' ? 'Desbanear' : 'Banear'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'brawlers' && (
            <>
              <div className="card-header mb-4">
                <span className="card-title">Gestión de brawlers</span>
                <button className="btn btn-sm btn-primary">+ Añadir brawler</button>
              </div>
              <div className="alert alert-info">Datos sincronizados automáticamente desde la API de Supercell. Última sync: hace 2 horas.</div>
              <div className="grid cols-4 mt-4" style={{ gap: 'var(--s3)' }}>
                {['Leon','Sandy','Spike','Amber','Crow','Meg','Fang','Gray'].map(name => (
                  <div key={name} className="stat-row">
                    <span className="stat-row-label">{name}</span>
                    <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>Editar</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'estadísticas' && (
            <>
              <div className="card-header mb-4"><span className="card-title">Estadísticas globales del sistema</span></div>
              {[
                ['Total de partidas indexadas', '4,218,430'],
                ['Win rate promedio global',     '53.2%'],
                ['Brawler más jugado (global)',  'Shelly'],
                ['Modo más popular',             'Gem Grab'],
                ['Usuarios activos hoy',         '842'],
                ['Llamadas API (24h)',            '128,420'],
                ['Reportes PDF generados (mes)',  '3,420'],
                ['Tiempo de respuesta API',       '124 ms'],
              ].map(([l,v]) => (
                <div key={l} className="stat-row"><span className="stat-row-label">{l}</span><span className="stat-row-value">{v}</span></div>
              ))}
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}
