# BrawlStats — React App

## Instalación y arranque

```bash
npm install
npm start
```

Abre http://localhost:3000 en tu navegador.

## Login demo
- Email: cualquiera  →  rol usuario
- Email con "admin"  →  rol admin (acceso a /admin)
- Contraseña: cualquiera

## Estructura
```
src/
  components/
    Layout.jsx     ← envuelve sidebar + main
    Sidebar.jsx    ← navegación lateral
    Topbar.jsx     ← barra superior
    KpiCard.jsx    ← tarjeta de métrica reutilizable
  pages/
    Login.jsx
    Dashboard.jsx
    MiCuenta.jsx
    Estadisticas.jsx
    Leaderboards.jsx
    Builds.jsx
    Brawlers.jsx
    TierList.jsx
    CalcCompeti.jsx
    Mapas.jsx
    Tutoriales.jsx
    Reportes.jsx
    Admin.jsx
  App.jsx          ← rutas + AuthContext
  index.js         ← entrada
  brawlstats.css   ← estilos globales
```

## Conectar el backend (cuando lo tengas)
1. Crea `src/services/api.js` con axios/fetch apuntando a http://localhost:3001/api/v1
2. En Login.jsx: reemplaza el mock login por `POST /api/auth/login`
3. En MiCuenta.jsx: la búsqueda de tag llama a `GET /api/players/:tag`
4. En Estadisticas, Leaderboards, etc.: sustituye los arrays mock por llamadas reales

## Variables de entorno
Crea `.env` en la raíz:
```
REACT_APP_API_URL=http://localhost:3001/api/v1
```
