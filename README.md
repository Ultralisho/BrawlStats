# BrawlStats 🏆

Aplicación web **fan-site** de estadísticas para *Brawl Stars*: rankings globales y por
país, catálogo de brawlers, mapas y eventos en tiempo real, calculadora competitiva de
draft, perfiles de jugador y panel de administración.

> Proyecto de fin de ciclo (TFG) — 2º DAW. Fan-site **no oficial**, no afiliado a Supercell.

---

## Stack tecnológico

- **Frontend**: React 18, React Router 6, CSS personalizado
- **Backend**: Node.js, Express, Sequelize, MySQL
- **APIs**: Supercell Brawl Stars API, BrawlAPI, CDN Brawlify

---

## Características principales

- 🔐 **Autenticación** con JWT y roles (`user` / `admin`)
- 📊 **Dashboard personal** con trofeos, win rate y evolución histórica
- 👤 **Perfil de jugador** por tag con datos en vivo de la API oficial
- ⚔️ **Catálogo de brawlers** con star powers, gadgets, hypercharges y top jugadores
- 🏆 **Leaderboards** global y por país (ES, US, MX, AR, BR, DE, FR, KR, CN, JP)
- 🎯 **Tier list** con win rate por modo (datos de BrawlAPI)
- 🆚 **Comparador** de jugadores cara a cara
- 🧠 **Calculadora competitiva** con draft, bans/picks y análisis de sinergias
- 🗺️ **Mapas y rotación** de eventos con los mejores brawlers por modo
- 🎬 **Tutoriales** integrados con búsqueda directa en YouTube
- 📄 **Reportes PDF** generados en el servidor
- 🛠️ **Panel de administración** para usuarios, brawlers, reportes y tutoriales

---

## Capturas de pantalla

<!-- screenshot aquí -->
*Dashboard del usuario*

<!-- screenshot aquí -->
*Catálogo de brawlers*

<!-- screenshot aquí -->
*Tier list por modo*

<!-- screenshot aquí -->
*Calculadora competitiva (draft)*

<!-- screenshot aquí -->
*Panel de administración*

---

## Instalación y uso

### Backend

```bash
cd brawlstats-backend
npm install
cp .env.example .env       # edita .env con tus credenciales
npm run seed               # crea tablas y carga datos de prueba (incluye 9 tutoriales)
npm run dev                # arranca en http://localhost:3001
```

### Frontend

```bash
cd brawlstats-frontend
npm install
npm start                  # arranca en http://localhost:3000
```

El frontend incluye un *proxy* a `http://localhost:3001` definido en su `package.json`,
así que las llamadas a `/api/*` se redirigen automáticamente al backend en desarrollo.

---

## Variables de entorno

Definir en `brawlstats-backend/.env` (plantilla en `.env.example`):

| Variable          | Descripción                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `PORT`            | Puerto del servidor Express (por defecto `3001`)                  |
| `NODE_ENV`        | Entorno de ejecución (`development` o `production`)               |
| `DB_HOST`         | Host de MySQL                                                     |
| `DB_PORT`         | Puerto de MySQL (`3306` por defecto)                              |
| `DB_NAME`         | Nombre de la base de datos                                        |
| `DB_USER`         | Usuario de MySQL                                                  |
| `DB_PASS`         | Contraseña de MySQL                                               |
| `JWT_SECRET`      | Cadena secreta usada para firmar los tokens JWT                   |
| `JWT_EXPIRES`     | Caducidad del token (p. ej. `7d`)                                 |
| `BRAWL_API_TOKEN` | Token de la API oficial de Brawl Stars (registro en su portal)    |
| `BRAWL_API_URL`   | URL base de la API (`https://api.brawlstars.com/v1`)              |
| `FRONTEND_URL`    | Origen permitido para CORS (p. ej. `http://localhost:3000`)       |

> ⚠️ Nunca subas tu `.env` real al repositorio. Ya está incluido en `.gitignore`.

---

## Estructura del proyecto

```
playground bstats/
├── brawlstats-backend/              API REST (Express + Sequelize)
│   ├── config/                      Conexión a la BD y seed con datos de prueba
│   ├── controllers/                 Lógica de negocio (una por entidad)
│   ├── middlewares/                 Auth (JWT), validación y manejo de errores
│   ├── models/                      Modelos Sequelize y asociaciones
│   ├── routes/                      Rutas Express, una por entidad
│   ├── services/                    Cliente axios para la API de Supercell
│   ├── utils/                       Helpers JWT y respuestas de la API
│   ├── scripts/                     Scripts auxiliares (sincronización, importación)
│   ├── app.js                       Configuración de Express y montaje de rutas
│   └── index.js                     Arranque del servidor y conexión a la BD
│
├── brawlstats-frontend/             SPA en React (CRA)
│   ├── public/                      Estáticos servidos por CRA
│   └── src/
│       ├── pages/                   Páginas (Home, Dashboard, Brawlers, Mapas, ...)
│       ├── components/              Layout, Sidebar, Topbar, gráficas
│       ├── services/api.js          Cliente fetch al backend
│       ├── brawlstats.css           Estilos globales (no editar sin coordinarse)
│       └── App.jsx                  Router y contexto de autenticación
│
├── partidas*.csv / partidas*.json   Datasets de batallas exportados
├── recolector*.py                   Scripts de recolección de datos (Python)
└── README.md                        Este documento
```

---

## Autor

**Ulises Hernández** — 2DAW — IES Pere Maria Orts i Bosch
