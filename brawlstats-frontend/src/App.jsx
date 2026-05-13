import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import MiCuenta     from './pages/MiCuenta';
import Estadisticas from './pages/Estadisticas';
import Leaderboards from './pages/Leaderboards';
import Builds       from './pages/Builds';
import Brawlers     from './pages/Brawlers';
import TierList     from './pages/TierList';
import CalcCompeti  from './pages/CalcCompeti';
import Mapas        from './pages/Mapas';
import Tutoriales   from './pages/Tutoriales';
import Reportes     from './pages/Reportes';
import Admin        from './pages/Admin';

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bs_user')); } catch { return null; }
  });
  function login(u) { const d = { ...u, role: u.role || 'user' }; localStorage.setItem('bs_user', JSON.stringify(d)); if (u.token) localStorage.setItem('bs_token', u.token); setUser(d); }
  function logout() { localStorage.removeItem('bs_user'); localStorage.removeItem('bs_token'); setUser(null); }
  function getToken() { return localStorage.getItem('bs_token'); }

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"         element={<Login />} />
          <Route path="/"              element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/mi-cuenta"     element={<PrivateRoute><MiCuenta /></PrivateRoute>} />
          <Route path="/estadisticas"  element={<PrivateRoute><Estadisticas /></PrivateRoute>} />
          <Route path="/leaderboards"  element={<PrivateRoute><Leaderboards /></PrivateRoute>} />
          <Route path="/builds"        element={<PrivateRoute><Builds /></PrivateRoute>} />
          <Route path="/brawlers"      element={<PrivateRoute><Brawlers /></PrivateRoute>} />
          <Route path="/tier-list"     element={<PrivateRoute><TierList /></PrivateRoute>} />
          <Route path="/calc-competi"  element={<PrivateRoute><CalcCompeti /></PrivateRoute>} />
          <Route path="/mapas"         element={<PrivateRoute><Mapas /></PrivateRoute>} />
          <Route path="/tutoriales"    element={<PrivateRoute><Tutoriales /></PrivateRoute>} />
          <Route path="/reportes"      element={<PrivateRoute><Reportes /></PrivateRoute>} />
          <Route path="/admin"         element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
