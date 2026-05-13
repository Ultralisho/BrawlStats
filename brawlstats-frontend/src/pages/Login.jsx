import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import fetchApi from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Rellena todos los campos.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi('/auth/login', { method: 'POST', body: { email: form.email, password: form.password } });
      login({ ...data.user, token: data.token });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
