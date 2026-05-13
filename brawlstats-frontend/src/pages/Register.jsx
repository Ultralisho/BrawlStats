import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import fetchApi from '../services/api';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Rellena todos los campos.'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.'); return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi('/auth/register', { method: 'POST', body: { name: form.name, email: form.email, password: form.password } });
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
          <div className="card-title" style={{ marginBottom:20 }}>Crear cuenta</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" type="text" placeholder="Tu nombre" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="tu@email.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={e => setForm(f=>({...f,confirmPassword:e.target.value}))} />
            </div>
            {error && <div className="alert alert-error mb-4">{error}</div>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Creando cuenta…' : 'Registrarse'}
            </button>
          </form>
          <div style={{ textAlign:'center', marginTop:16, fontSize:13 }}>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
