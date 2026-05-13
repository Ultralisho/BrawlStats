import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Rellena todos los campos.'); return; }
    login({ name: 'Ulises H.', tag: '#2PPU8QLYL', email: form.email, role: form.email.includes('admin') ? 'admin' : 'user' });
    navigate('/');
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="logo-mark" style={{ width:40, height:40, fontSize:20 }}>B</div>
          <span className="logo-text" style={{ fontSize:24 }}>BRAWL<span>STATS</span></span>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom:20 }}>Iniciar sesión</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="tu@email.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            </div>
            {error && <div className="alert alert-error mb-4">{error}</div>}
            <button type="submit" className="btn btn-primary w-full">Entrar</button>
          </form>
          <div className="alert alert-info mt-4" style={{ fontSize:11 }}>
            💡 Demo: cualquier email/contraseña funciona. Usa "admin@..." para acceso admin.
          </div>
        </div>
      </div>
    </div>
  );
}
