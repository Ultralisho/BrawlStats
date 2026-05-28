# BrawlStats — Documentación técnica completa

> Documento técnico de referencia del proyecto BrawlStats (TFG 2DAW).
> Pensado para que cualquier persona pueda entender, instalar, modificar y
> desplegar el sistema completo.

---

## 1. Descripción general del proyecto

**BrawlStats** es una aplicación web *fan-site* para *Brawl Stars* que centraliza
estadísticas de jugadores, brawlers, mapas y eventos. Pensada como
herramienta de consulta y análisis competitivo, expone:

- Catálogo de brawlers con star powers, gadgets e hipercargas.
- Perfil personal del jugador con histórico de trofeos y win rate.
- Leaderboards globales y por país.
- Tier list por modo de juego.
- Calculadora competitiva con draft, bans/picks y sinergias.
- Comparador entre jugadores.
- Tutoriales con enlaces directos a YouTube.
- Reportes PDF generados en el servidor.
- Panel de administración para gestionar usuarios, brawlers, reportes y tutoriales.

**Stack:**
- **Frontend:** React 18 + React Router 6 + Recharts + CSS personalizado (CRA).
- **Backend:** Node.js + Express 4 + Sequelize 6 + JWT + bcryptjs + PDFKit.
- **BD:** MySQL 8.
- **APIs externas:** Supercell Brawl Stars API, BrawlAPI, CDN Brawlify.

---

## 2. Arquitectura del sistema

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  Frontend (React, :3000) │        │  APIs externas           │
│                          │        │                          │
│  - SPA con React Router  │        │  ┌────────────────────┐  │
│  - fetchApi (services)   │  HTTPS │  │ Supercell Brawl    │  │
│  - localStorage (JWT)    │ ──────►│  │ Stars API (oficial)│  │
│                          │  Bearer│  └────────────────────┘  │
└────────────┬─────────────┘  token │  ┌────────────────────┐  │
             │                      │  │ BrawlAPI           │  │
             │  HTTP (REST + JSON)  │  │ (comunidad: mapas, │  │
             │  proxy CRA → :3001   │  │  eventos, brawlers)│  │
             ▼                      │  └────────────────────┘  │
┌──────────────────────────┐        │  ┌────────────────────┐  │
│  Backend (Express, :3001)│        │  │ CDN Brawlify       │  │
│                          │        │  │ (imágenes)         │  │
│  ┌────────────────────┐  │        │  └────────────────────┘  │
│  │ Middlewares        │  │        └────────────┬─────────────┘
│  │ - cors             │  │                     │
│  │ - express.json     │  │  ┌──────────────────┘
│  │ - auth (JWT)       │  │  │  (axios)
│  │ - rate-limit       │  │  │
│  │ - validate         │  │  │
│  └────────────────────┘  │  ▼
│  ┌────────────────────┐  │ ┌──────────────────┐
│  │ Controllers        │──┼─┤ supercell.service│
│  │ Routes             │  │ │ brawlapi proxy   │
│  │ Models (Sequelize) │  │ └──────────────────┘
│  └─────────┬──────────┘  │
└────────────┼─────────────┘
             │ SQL
             ▼
┌──────────────────────────┐
│  MySQL                   │
│  - users                 │
│  - players               │
│  - brawlers              │
│  - stats                 │
│  - battles               │
│  - dataset_battles       │
│  - player_snapshots      │
│  - reports               │
│  - tutorials             │
└──────────────────────────┘
```

**Resumen del flujo:**
1. El frontend autentica con `POST /auth/login`, recibe un JWT y lo guarda en
   `localStorage`.
2. Todas las llamadas posteriores incluyen `Authorization: Bearer <token>`.
3. El backend valida el token (`protect` middleware), opera contra MySQL
   (Sequelize) y, si necesita datos en tiempo real, llama a las APIs externas
   vía `services/supercell.service.js` o el proxy `/api/brawlapi/*`.
4. Las imágenes se sirven directamente desde `cdn.brawlify.com` (no se
   almacenan en el servidor).

---

## 3. Estructura de carpetas completa

### Backend (`brawlstats-backend/`)

```
brawlstats-backend/
├── app.js                  Express: middlewares globales + montaje de rutas
├── index.js                Arranque del servidor + conexión a MySQL
├── package.json            Dependencias y scripts (start/dev/seed)
├── .env.example            Plantilla de variables de entorno
├── config/
│   ├── database.js         Instancia Sequelize (singleton conexión a MySQL)
│   └── seed.js             Carga datos de prueba (admin, brawlers, 9 tutoriales)
├── controllers/
│   ├── auth.controller.js        Registro, login, perfil, gestión usuarios
│   ├── player.controller.js      CRUD jugador vinculado + sync con Supercell
│   ├── brawler.controller.js     Brawlers, ranking, win rates, mapas
│   ├── stats.controller.js       Stats personales, win rate, evolución
│   ├── leaderboard.controller.js Ranking global y por país
│   ├── report.controller.js      Generación y descarga de PDFs
│   ├── events.controller.js      Rotación actual de eventos
│   └── tutorial.controller.js    CRUD de tutoriales
├── middlewares/
│   ├── auth.middleware.js        protect() y adminOnly()
│   ├── error.middleware.js       errorHandler global
│   └── validate.middleware.js    validate() para express-validator
├── models/
│   ├── index.js                  Importa todos los modelos y define asociaciones
│   ├── user.model.js             Tabla users
│   ├── player.model.js           Tabla players (jugadores vinculados)
│   ├── brawler.model.js          Tabla brawlers
│   ├── stat.model.js             Tabla stats (snapshots histórico jugador-brawler)
│   ├── battle.model.js           Tabla battles (batallas individuales por jugador)
│   ├── playerSnapshot.model.js   Tabla player_snapshots (evolución global)
│   ├── datasetBattle.model.js    Tabla dataset_battles (dataset masivo TFG)
│   ├── report.model.js           Tabla reports (PDFs generados)
│   └── tutorial.model.js         Tabla tutorials
├── routes/
│   ├── auth.routes.js            /api/v1/auth/*
│   ├── player.routes.js          /api/v1/players/*
│   ├── brawler.routes.js         /api/v1/brawlers/*
│   ├── stats.routes.js           /api/v1/stats/*
│   ├── report.routes.js          /api/v1/reports/*
│   ├── leaderboard.routes.js     /api/v1/leaderboard/*
│   ├── events.routes.js          /api/v1/events/*
│   ├── tutorial.routes.js        /api/v1/tutorials/*
│   └── brawlapi.routes.js        /api/brawlapi/* (proxy a brawlapi.com)
├── services/
│   └── supercell.service.js      Cliente axios para la API oficial de Brawl Stars
├── utils/
│   ├── jwt.js                    generateToken() y verifyToken()
│   └── apiResponse.js            ok(), created(), notFound(), badRequest()
└── scripts/                       Scripts auxiliares (sync, importación de datasets)
```

### Frontend (`brawlstats-frontend/src/`)

```
brawlstats-frontend/
├── package.json            Dependencias y scripts (start/build). Proxy a :3001
├── public/                 Estáticos servidos por CRA (favicon, index.html)
└── src/
    ├── App.jsx             Router + AuthContext + PrivateRoute/AdminRoute
    ├── index.js            Entry-point React
    ├── brawlstats.css      Estilos globales (variables CSS, layout, componentes)
    ├── services/
    │   └── api.js          Wrapper fetch con base + Authorization header
    ├── components/
    │   ├── Layout.jsx              Layout principal (sidebar + contenido)
    │   ├── Sidebar.jsx             Navegación lateral con iconos
    │   ├── Topbar.jsx              Cabecera con título y acciones
    │   ├── KpiCard.jsx             Card de KPI con label + valor + delta
    │   └── TrophyEvolutionChart.jsx Gráfica recharts de trofeos en el tiempo
    └── pages/
        ├── Home.jsx              Landing pública
        ├── Login.jsx             Formulario de login
        ├── Register.jsx          Formulario de registro
        ├── Dashboard.jsx         Vista personal (trofeos, win rate, evolución)
        ├── MiCuenta.jsx          Perfil del usuario + brawlers personales
        ├── Estadisticas.jsx      Estadísticas detalladas del jugador
        ├── Brawlers.jsx          Catálogo de brawlers (grid + filtros)
        ├── BrawlerDetail.jsx     Detalle de un brawler (star powers, gadgets, top 5)
        ├── Builds.jsx            Builds recomendadas por brawler y modo
        ├── TierList.jsx          Tier list por modo (datos BrawlAPI)
        ├── Leaderboards.jsx      Ranking global / por país
        ├── PlayerProfile.jsx     Perfil público de un jugador por tag
        ├── Comparador.jsx        Comparador 1v1 de jugadores
        ├── CalcCompeti.jsx       Calculadora competitiva (draft)
        ├── Mapas.jsx             Listado de mapas con rotación actual
        ├── MapaDetail.jsx        Detalle de un mapa + mejores brawlers
        ├── Tutoriales.jsx        Tutoriales con búsqueda en YouTube
        ├── Reportes.jsx          Lista y descarga de PDFs propios
        └── Admin.jsx             Panel admin (usuarios, brawlers, reportes, tutoriales)
```

---

## 4. Base de datos

### Esquema de tablas

#### `users`
| Campo       | Tipo                       | Nulo | Notas                          |
| ----------- | -------------------------- | ---- | ------------------------------ |
| id          | UUID (PK)                  | No   | Generado con uuidv4            |
| name        | VARCHAR(80)                | No   |                                |
| email       | VARCHAR(120) UNIQUE        | No   | Validado                       |
| password    | VARCHAR(255)               | No   | Hash bcrypt (10 rounds)        |
| role        | ENUM('user','admin')       | No   | Default 'user'                 |
| country     | VARCHAR(60)                | Sí   | Default 'España'               |
| avatarUrl   | VARCHAR(255)               | Sí   |                                |
| isActive    | BOOLEAN                    | No   | Default true                   |
| createdAt   | DATETIME                   | No   | Timestamp Sequelize            |
| updatedAt   | DATETIME                   | No   | Timestamp Sequelize            |

#### `players`
| Campo            | Tipo                       | Nulo | Notas                          |
| ---------------- | -------------------------- | ---- | ------------------------------ |
| id               | UUID (PK)                  | No   |                                |
| userId           | UUID (FK → users.id)       | No   |                                |
| tag              | VARCHAR(20) UNIQUE         | No   | Tag Brawl Stars (con `#`)      |
| name             | VARCHAR(80)                | No   |                                |
| trophies         | INT                        | No   | Default 0                      |
| highestTrophies  | INT                        | No   | Default 0                      |
| level            | INT                        | No   | Default 1                      |
| club             | VARCHAR(80)                | Sí   |                                |
| avatarId         | INT                        | Sí   | ID icono Supercell             |
| rawData          | JSON                       | Sí   | Caché última sync              |
| lastSync         | DATETIME                   | Sí   |                                |

#### `brawlers`
| Campo             | Tipo                       | Nulo | Notas                          |
| ----------------- | -------------------------- | ---- | ------------------------------ |
| id                | INT (PK, no autoincr)      | No   | ID oficial Supercell           |
| name              | VARCHAR(60)                | No   |                                |
| rarity            | ENUM(6)                    | No   | common…legendary               |
| role              | VARCHAR(40)                | Sí   | Fighter, Sharpshooter, ...     |
| description       | TEXT                       | Sí   |                                |
| imageUrl          | VARCHAR(255)               | Sí   |                                |
| rawData           | JSON                       | Sí   | Caché combinada Supercell+DB   |
| rawDataUpdatedAt  | DATETIME                   | Sí   |                                |
| isActive          | BOOLEAN                    | No   | Default true                   |

#### `stats`
| Campo            | Tipo                       | Nulo | Notas                          |
| ---------------- | -------------------------- | ---- | ------------------------------ |
| id               | UUID (PK)                  | No   |                                |
| playerId         | UUID (FK → players.id)     | No   |                                |
| brawlerId        | INT (FK → brawlers.id)     | No   |                                |
| trophies         | INT                        | No   | Default 0                      |
| highestTrophies  | INT                        | No   | Default 0                      |
| rank             | INT                        | No   | Default 0                      |
| wins             | INT                        | No   | Default 0                      |
| losses           | INT                        | No   | Default 0                      |
| winRate          | FLOAT                      | No   | 0-100                          |
| gameMode         | VARCHAR(40)                | Sí   | NULL = stat global del brawler |
| recordedAt       | DATETIME                   | No   | Default NOW                    |

#### `battles`
| Campo         | Tipo                       | Nulo | Notas                                 |
| ------------- | -------------------------- | ---- | ------------------------------------- |
| id            | UUID (PK)                  | No   |                                       |
| playerId      | UUID (FK → players.id)     | No   |                                       |
| battleTime    | VARCHAR(40)                | No   | Único por (playerId, battleTime)      |
| mode          | VARCHAR(40)                | No   |                                       |
| map           | VARCHAR(80)                | Sí   |                                       |
| brawler       | VARCHAR(40)                | Sí   |                                       |
| result        | ENUM('Win','Loss','Draw')  | No   |                                       |
| rank          | INT                        | Sí   |                                       |
| trophyChange  | INT                        | No   | Default 0                             |
| battleAt      | DATETIME                   | No   | Parseado para consultas               |

#### `dataset_battles`
| Campo            | Tipo                       | Nulo | Notas                                |
| ---------------- | -------------------------- | ---- | ------------------------------------ |
| id               | UUID (PK)                  | No   |                                      |
| battleKey        | VARCHAR(200) UNIQUE        | No   | Deduplicación                        |
| playerTag        | VARCHAR(20)                | No   |                                      |
| battleTime       | VARCHAR(40)                | Sí   |                                      |
| battleAt         | DATETIME                   | Sí   |                                      |
| mode             | VARCHAR(40)                | Sí   |                                      |
| map              | VARCHAR(100)               | Sí   |                                      |
| result           | ENUM('Win','Loss','Draw')  | Sí   |                                      |
| brawler          | VARCHAR(40)                | Sí   |                                      |
| brawlerTrophies  | INT                        | Sí   |                                      |
| rank             | INT                        | Sí   |                                      |
| trophyChange     | INT                        | Sí   |                                      |
| battleType       | VARCHAR(20)                | Sí   |                                      |

Índices: `brawler`, `mode`, `playerTag`, `battleAt`, y compuestos
`(brawler, result)` y `(mode, brawler, result)` para acelerar GROUP BY.

#### `player_snapshots`
| Campo            | Tipo                       | Nulo | Notas                |
| ---------------- | -------------------------- | ---- | -------------------- |
| id               | UUID (PK)                  | No   |                      |
| playerId         | UUID (FK → players.id)     | No   |                      |
| trophies         | INT                        | No   | Default 0            |
| highestTrophies  | INT                        | No   | Default 0            |
| level            | INT                        | No   | Default 1            |
| recordedAt       | DATETIME                   | No   | Default NOW          |

#### `reports`
| Campo      | Tipo                                                  | Nulo | Notas               |
| ---------- | ----------------------------------------------------- | ---- | ------------------- |
| id         | UUID (PK)                                             | No   |                     |
| userId     | UUID (FK → users.id)                                  | No   |                     |
| name       | VARCHAR(120)                                          | No   |                     |
| type       | ENUM('player','meta','club','brawler_comparison')     | No   |                     |
| period     | ENUM('7d','30d','90d','season')                       | No   | Default '30d'       |
| filePath   | VARCHAR(255)                                          | Sí   | Ruta del PDF        |
| fileSize   | INT                                                   | Sí   |                     |
| status     | ENUM('pending','generating','ready','error')          | No   | Default 'pending'   |
| params     | JSON                                                  | Sí   | Parámetros          |

#### `tutorials`
| Campo         | Tipo                                                          | Nulo | Notas             |
| ------------- | ------------------------------------------------------------- | ---- | ----------------- |
| id            | UUID (PK)                                                     | No   |                   |
| title         | VARCHAR(200)                                                  | No   |                   |
| description   | TEXT                                                          | Sí   |                   |
| category      | ENUM('Básico','Intermedio','Avanzado','Modos de juego')       | No   | Default 'Básico'  |
| brawler       | VARCHAR(80)                                                   | Sí   | Nombre brawler    |
| youtubeQuery  | VARCHAR(255)                                                  | Sí   | Query a YouTube   |
| level         | ENUM('Básico','Intermedio','Avanzado')                        | No   | Default 'Básico'  |
| createdAt     | DATETIME                                                      | No   | Timestamp         |
| updatedAt     | DATETIME                                                      | No   | Timestamp         |

### Diagrama ER (texto)

```
 ┌─────────┐ 1   N ┌─────────┐ 1   N ┌──────┐
 │  User   │──────►│ Player  │──────►│ Stat │
 └─────────┘       └─────────┘       └──────┘
      │ 1               │ 1              ▲
      │                 │                │ N
      │ N               │ N              │ 1
      ▼                 ▼               ┌──────────┐
 ┌─────────┐    ┌──────────────────┐    │ Brawler  │
 │ Report  │    │ Battle           │    └──────────┘
 └─────────┘    │ PlayerSnapshot   │
                └──────────────────┘

 ┌────────────────┐    (sin FK — dataset agregado independiente)
 │ DatasetBattle  │
 └────────────────┘

 ┌──────────┐    (sin FK — catálogo independiente)
 │ Tutorial │
 └──────────┘
```

---

## 5. API REST propia — Endpoints completos

Base: `http://localhost:3001/api/v1` (en producción cambia el host).
Autenticación: `Authorization: Bearer <token>`.

### Auth

| Método | Ruta                          | Auth   | Descripción                                   |
| ------ | ----------------------------- | ------ | --------------------------------------------- |
| POST   | `/auth/register`              | No     | Crea cuenta (`name`, `email`, `password`, `country?`) |
| POST   | `/auth/login`                 | No     | Devuelve `{ user, token }`                    |
| GET    | `/auth/me`                    | Auth   | Devuelve perfil del usuario actual            |
| PUT    | `/auth/me`                    | Auth   | Actualiza nombre/email/avatarUrl/country      |
| PUT    | `/auth/change-password`       | Auth   | Cambia contraseña                             |
| GET    | `/auth/users`                 | Admin  | Lista todos los usuarios                      |
| PUT    | `/auth/users/:id`             | Admin  | Activa/desactiva un usuario                   |
| PUT    | `/auth/users/:id/role`        | Admin  | Cambia rol entre user/admin                   |
| DELETE | `/auth/users/:id`             | Admin  | Borra usuario                                 |

### Players

| Método | Ruta                          | Auth   | Descripción                          |
| ------ | ----------------------------- | ------ | ------------------------------------ |
| GET    | `/players/search?tag=...`     | Auth   | Busca jugador por tag (vivo)         |
| GET    | `/players/all`                | Admin  | Lista todos los jugadores vinculados |
| GET    | `/players/me`                 | Auth   | Player vinculado del usuario         |
| DELETE | `/players/me`                 | Auth   | Desvincula                           |
| GET    | `/players/by-tag/:tag`        | Auth   | Perfil público por tag               |
| POST   | `/players`                    | Auth   | Vincula un player a la cuenta        |
| POST   | `/players/sync`               | Auth   | Sincroniza datos contra Supercell    |
| POST   | `/players/sync-top`           | Admin  | Sincroniza top jugadores globales    |

### Brawlers

| Método | Ruta                            | Auth   | Descripción                                |
| ------ | ------------------------------- | ------ | ------------------------------------------ |
| GET    | `/brawlers`                     | No     | Catálogo de brawlers (DB)                  |
| GET    | `/brawlers/maps`                | No     | Lista de mapas (BrawlAPI, cache 10 min)    |
| GET    | `/brawlers/maps/:id`            | No     | Detalle de un mapa                         |
| GET    | `/brawlers/winrates?mode=...`   | No     | Winrate agregado por brawler (cache 5 min) |
| GET    | `/brawlers/:id/full`            | Auth   | Brawler + star powers + gadgets            |
| GET    | `/brawlers/:id/ranking`         | Auth   | Top 5 con ese brawler (reconstruido vía Supercell global, cache 10 min) |
| GET    | `/brawlers/:id`                 | No     | Brawler básico                             |
| POST   | `/brawlers/sync`                | Admin  | Sincroniza catálogo con Supercell          |
| PUT    | `/brawlers/:id`                 | Admin  | Edita brawler                              |

### Stats

| Método | Ruta                          | Auth   | Descripción                          |
| ------ | ----------------------------- | ------ | ------------------------------------ |
| GET    | `/stats/me`                   | Auth   | Stats del usuario por brawler        |
| GET    | `/stats/winrate`              | Auth   | Win rate global del jugador          |
| GET    | `/stats/battlelog`            | Auth   | Últimas batallas                     |
| GET    | `/stats/trophy-history`       | Auth   | Evolución de trofeos en el tiempo    |
| GET    | `/stats/streak`               | Auth   | Racha actual                         |
| GET    | `/stats/mode-distribution`    | Auth   | Distribución de partidas por modo    |
| GET    | `/stats/favorite-brawler`     | Auth   | Brawler más jugado + agregados       |
| GET    | `/stats/tierlist?mode=...`    | No     | Tier list por modo desde la BD (stats → fallback dataset_battles) |
| POST   | `/stats/snapshot`             | Auth   | Guarda snapshot manual               |

### Leaderboard

| Método | Ruta                              | Auth   | Descripción                          |
| ------ | --------------------------------- | ------ | ------------------------------------ |
| GET    | `/leaderboard/global`             | Auth   | Top global (Supercell)               |
| GET    | `/leaderboard/country/:code`      | Auth   | Top por país (ISO 2 letras)          |
| GET    | `/leaderboard/local`              | Auth   | Top de la BD local                   |

### Reports

| Método | Ruta                          | Auth   | Descripción                                  |
| ------ | ----------------------------- | ------ | -------------------------------------------- |
| GET    | `/reports`                    | Auth   | Lista los reportes del usuario               |
| POST   | `/reports`                    | Auth   | Crea (y genera) un PDF                       |
| GET    | `/reports/:id/download`       | Auth   | Descarga el PDF                              |
| DELETE | `/reports/:id`                | Auth   | Borra reporte propio                         |
| GET    | `/reports/all`                | Admin  | Lista de todos los reportes                  |
| DELETE | `/reports/admin/:id`          | Admin  | Borra cualquier reporte                      |

### Tutorials

| Método | Ruta                          | Auth   | Descripción                          |
| ------ | ----------------------------- | ------ | ------------------------------------ |
| GET    | `/tutorials`                  | No     | Lista de tutoriales                  |
| POST   | `/tutorials`                  | No     | Crea tutorial                        |
| GET    | `/tutorials/admin`            | Admin  | Lista para panel admin               |
| POST   | `/tutorials/admin`            | Admin  | Crea desde panel admin               |
| PUT    | `/tutorials/admin/:id`        | Admin  | Edita                                |
| DELETE | `/tutorials/admin/:id`        | Admin  | Borra                                |

### Events

| Método | Ruta                          | Auth   | Descripción                          |
| ------ | ----------------------------- | ------ | ------------------------------------ |
| GET    | `/events/rotation`            | No     | Rotación actual (Supercell)          |

### Proxy BrawlAPI (passthrough)

| Método | Ruta                          | Auth   | Descripción                                |
| ------ | ----------------------------- | ------ | ------------------------------------------ |
| GET    | `/api/brawlapi/*`             | No     | Proxy directo a `https://api.brawlapi.com/v1/*` |

### Ejemplo de respuesta estándar

```json
{
  "success": true,
  "data":    { "...": "..." }
}
```

Errores:

```json
{
  "success": false,
  "error":   "Token inválido o expirado"
}
```

---

## 6. APIs externas utilizadas

### Supercell Brawl Stars API

- **Base:** `https://api.brawlstars.com/v1`
- **Auth:** `Authorization: Bearer <BRAWL_API_TOKEN>` (token con la IP del
  servidor autorizada en el portal de desarrolladores).
- **Endpoints usados** (vía `services/supercell.service.js`):
  - `GET /players/{tag}` — perfil completo del jugador.
  - `GET /players/{tag}/battlelog` — últimas 25 batallas.
  - `GET /brawlers` — catálogo oficial.
  - `GET /brawlers/{id}` — detalle (star powers + gadgets).
  - `GET /rankings/{country}/players` — top global o por país.
  - `GET /events/rotation` — eventos activos.
- **Endpoint retirado por Supercell:** `GET /rankings/{country}/brawlers/{id}/players`
  devuelve 404 desde la última actualización. Para reconstruir el top por
  brawler usamos `getTopPlayersForBrawler(brawlerId, opts)`:
  1. Lee el top global (`/rankings/global/players`, hasta 200 jugadores).
  2. Lee profiles individuales de los primeros 30 en lotes de 5 en paralelo
     (`Promise.all`), respetando el rate-limit.
  3. Filtra `profile.brawlers[]` por el `brawlerId`, ordena por trofeos DESC,
     devuelve top 5.
  Cachea ranking global y profiles por 10 minutos en memoria.

### BrawlAPI

- **Base:** `https://api.brawlapi.com/v1`
- **Auth:** no requerida.
- **Endpoints usados** (vía proxy `/api/brawlapi/*` para evitar CORS):
  - `GET /brawlers` — catálogo extendido con hipercarga.
  - `GET /brawlers/{id}` — detalle (incluye hipercarga).
  - `GET /maps` — todos los mapas + thumbnail.
  - `GET /maps/{id}` — detalle de un mapa.
- **Importante:** ya no se usa BrawlAPI como fuente de rankings ni de tier
  list. El ranking por brawler viene reconstruido de Supercell (ver arriba),
  y la tier list se sirve desde la BD propia (`GET /stats/tierlist`).

### CDN Brawlify

URLs construidas en el frontend:

| Recurso        | Patrón                                                         |
| -------------- | -------------------------------------------------------------- |
| Brawler border | `https://cdn.brawlify.com/brawlers/borders/{id}.png`           |
| Gadget         | `https://cdn.brawlify.com/gadgets/regular/{id}.png`            |
| Star power     | `https://cdn.brawlify.com/star-powers/regular/{id}.png`        |
| Avatar player  | `https://cdn.brawlify.com/profile-icons/regular/{id}.png`      |

Todas las imágenes incorporan `onError` con un placeholder de la inicial del
nombre para tolerar 404 puntuales.

---

## 7. Autenticación y seguridad

- **Hashing**: contraseñas con `bcryptjs` (10 rounds).
- **JWT**: firmado con `JWT_SECRET`, expiración configurable (`JWT_EXPIRES`,
  default 7d). Se devuelve en `POST /auth/login` y `POST /auth/register`.
- **Cliente**: el frontend guarda el token en `localStorage` (`bs_token`) y
  añade `Authorization: Bearer <token>` en cada request a través de
  `services/api.js`.
- **Refresh automático del user al cargar:** al montar `App.jsx`, si hay
  token, se llama a `GET /auth/me` y se sustituye el `user` del
  `localStorage` por el del backend. Esto garantiza que el `role` siempre
  refleja el estado real de la BD y que un usuario al que se le ha
  cambiado el rol no sigue viendo el panel admin escondido (ni al revés).
- **Middleware `protect`** (`middlewares/auth.middleware.js`):
  1. Lee `Authorization`.
  2. Verifica el token con `jwt.verify`.
  3. Resuelve el usuario en la BD y comprueba `isActive`.
  4. Inyecta `req.user`.
- **Middleware `adminOnly`**: comprueba `req.user.role === 'admin'`.
- **Rate limiting** en `/auth/login` (10 intentos / 15 min) y
  `/auth/register` (5 intentos / 1 h).
- **Validación** con `express-validator` (`validate` middleware) para todos
  los inputs sensibles (registro, login, cambio de contraseña).
- **CORS** restringido a `FRONTEND_URL`.
- **Gating del panel admin en 3 capas:**
  1. **Sidebar** (`components/Sidebar.jsx`): el item *Panel admin* lleva
     `requiresAdmin: true` y se filtra a nivel de item y de grupo si
     `user.role !== 'admin'`. Los no-admin no ven el enlace.
  2. **Cliente** (`App.jsx`): `<AdminRoute>` redirige a `/` si el rol no
     es admin (cualquiera que escriba `/admin` en la URL).
  3. **Servidor**: todas las rutas admin pasan por `protect + adminOnly`
     (`/auth/users*`, `/players/all`, `/players/sync-top`, `/brawlers/sync`,
     `/brawlers/:id` PUT, `/reports/all`, `/reports/admin/:id`,
     `/tutorials/admin*`). Devuelven `403 Acceso restringido a administradores`.

---

## 8. Páginas del frontend

| Ruta              | Página           | Auth   | Datos / endpoints                                         |
| ----------------- | ---------------- | ------ | --------------------------------------------------------- |
| `/`               | Home             | No     | Landing pública                                           |
| `/login`          | Login            | No     | `POST /auth/login`                                        |
| `/register`       | Register         | No     | `POST /auth/register`                                     |
| `/dashboard`      | Dashboard        | Auth   | `/stats/me`, `/stats/trophy-history`, `/players/me`       |
| `/mi-cuenta`      | MiCuenta         | Auth   | `/players/me`, `/stats/me`                                |
| `/estadisticas`   | Estadisticas     | Auth   | `/stats/*` (modo, racha, evolución, distribución)         |
| `/brawlers`       | Brawlers         | Auth   | `/brawlers`, `/brawlers/winrates`, `/api/brawlapi/brawlers` |
| `/brawlers/:id`   | BrawlerDetail    | Auth   | `/brawlers/:id/full`, `/brawlers/:id/ranking`, `/stats/me` |
| `/builds`         | Builds           | Auth   | `/api/brawlapi/brawlers` (catálogo completo)              |
| `/tier-list`      | TierList         | Auth   | `/stats/tierlist?mode=...` (BD propia, sin BrawlAPI)      |
| `/leaderboards`   | Leaderboards     | Auth   | `/leaderboard/global`, `/leaderboard/country/:code`       |
| `/jugador/:tag`   | PlayerProfile    | Auth   | `/players/by-tag/:tag`                                    |
| `/comparador`     | Comparador       | Auth   | `/players/by-tag/:tag` × 2                                |
| `/calc-competi`   | CalcCompeti      | Auth   | `/brawlers`, `/brawlers/winrates`                         |
| `/mapas`          | Mapas            | Auth   | `/brawlers/maps`, `/events/rotation`                      |
| `/mapas/:id`      | MapaDetail       | Auth   | `/brawlers/maps/:id`, `/brawlers/winrates?mode=...`       |
| `/tutoriales`     | Tutoriales       | Auth   | `/tutorials`, `/brawlers`                                 |
| `/reportes`       | Reportes         | Auth   | `/reports`, `/reports/:id/download`                       |
| `/admin`          | Admin            | Admin  | `/auth/users`, `/reports/all`, `/players/all`, `/brawlers`, `/tutorials/admin` (oculto del sidebar y de la ruta si `role !== 'admin'`) |

---

## 9. Componentes reutilizables

| Componente              | Props                                              | Renderiza                                          | Usado en                        |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| `Layout`                | `children`                                         | Sidebar + área de contenido                        | Casi todas las páginas privadas |
| `Sidebar`               | (lee `useAuth`)                                    | Navegación lateral con iconos y user-chip          | `Layout`                        |
| `Topbar`                | `title`, `actions?`                                | Cabecera de página con título y botones derecha    | Casi todas las páginas privadas |
| `KpiCard`               | `label`, `value`, `delta?`, `deltaType?`           | Card con label + valor grande + delta opcional     | `Dashboard`, `Estadisticas`, `Leaderboards` |
| `TrophyEvolutionChart`  | `data`, `delta?`                                   | Gráfica recharts de evolución de trofeos           | `Dashboard`, `MiCuenta`         |

`App.jsx` además expone:
- `AuthContext` y `useAuth()` con `{ user, login, logout, getToken }`.
- `<PrivateRoute>` y `<AdminRoute>` para gating.
- Efecto al montar que llama a `GET /auth/me` y refresca el `user` (incluido
  el `role`) si hay token, evitando que el `localStorage` quede desfasado
  respecto a la BD.

---

## 10. Variables de entorno

Fichero: `brawlstats-backend/.env` (plantilla en `.env.example`).

| Variable          | Descripción                                          | Ejemplo                            |
| ----------------- | ---------------------------------------------------- | ---------------------------------- |
| `PORT`            | Puerto del servidor Express                          | `3001`                             |
| `NODE_ENV`        | Entorno (`development` / `production`)               | `development`                      |
| `DB_HOST`         | Host de MySQL                                        | `localhost`                        |
| `DB_PORT`         | Puerto de MySQL                                      | `3306`                             |
| `DB_NAME`         | Nombre de la BD                                      | `brawlstats`                       |
| `DB_USER`         | Usuario MySQL                                        | `root`                             |
| `DB_PASS`         | Contraseña MySQL                                     | *(vacío en local)*                 |
| `JWT_SECRET`      | Cadena secreta para firmar los JWT                   | `cambia_esto_por_string_largo`     |
| `JWT_EXPIRES`     | Caducidad del token                                  | `7d`                               |
| `BRAWL_API_TOKEN` | Token de la API oficial de Brawl Stars               | `eyJ0eXAiOiJKV1Q...`               |
| `BRAWL_API_URL`   | URL base de la API de Supercell                      | `https://api.brawlstars.com/v1`    |
| `FRONTEND_URL`    | Origen permitido para CORS                           | `http://localhost:3000`            |

Frontend (`brawlstats-frontend/.env`, opcional):

| Variable             | Descripción                                       | Ejemplo     |
| -------------------- | ------------------------------------------------- | ----------- |
| `REACT_APP_API_URL`  | Base del backend si no se usa el proxy CRA       | `/api/v1`   |

---

## 11. Instalación y despliegue

### Local — Backend

```bash
cd brawlstats-backend
npm install
cp .env.example .env       # rellena DB y BRAWL_API_TOKEN
npm run seed               # crea tablas + admin/user + brawlers + 9 tutoriales
npm run dev                # arranca en http://localhost:3001 con nodemon
```

### Local — Frontend

```bash
cd brawlstats-frontend
npm install
npm start                  # arranca en http://localhost:3000 (proxy CRA al :3001)
```

Login de prueba tras seed:

| Rol    | Email                  | Password    |
| ------ | ---------------------- | ----------- |
| Admin  | `admin@brawlstats.gg`  | `admin1234` |
| User   | `ulises@brawlstats.gg` | `user1234`  |

### Despliegue en producción

Resumen orientativo (cualquier hosting Node + MySQL servirá):

1. **Base de datos**: provisionar MySQL 8 con un usuario sin privilegios
   excesivos. Crear la BD `brawlstats` (la migración la hace Sequelize en
   primer arranque o con `npm run seed`).
2. **Backend**: subir el repo, `npm ci --omit=dev`, definir las variables de
   entorno (no commitear el `.env`). Lanzar con `npm start` detrás de PM2,
   systemd o un orchestrator. Exponer 443 con un reverse proxy (Nginx /
   Caddy) que termine TLS.
3. **API de Supercell**: en `developer.brawlstars.com` autorizar la **IP
   pública saliente** del servidor (esta API rechaza peticiones si la IP no
   coincide con la del token).
4. **Frontend**: `npm run build` → desplegar `build/` en un CDN estático
   (Vercel, Netlify, Cloudflare Pages) o detrás del mismo reverse proxy. En
   producción definir `REACT_APP_API_URL=https://api.tu-dominio.com/api/v1`.
5. **CORS**: actualizar `FRONTEND_URL` en el backend con el dominio público.
6. **Logs**: redirigir stdout/stderr del backend a un fichero rotado o un
   stack tipo Loki/Grafana.

---

## 12. Decisiones técnicas

- **CRA en vez de Vite**: el proyecto se arrancó con CRA (5.0.1) por
  simplicidad de plantilla y porque el examen de TFG no exigía tooling
  específico. Migrar a Vite es trivial cuando convenga (5-10 min de cambios
  en scripts y `public/`).
- **CSS personalizado en vez de Tailwind / styled-components**: el diseño se
  basa en variables CSS y clases utilitarias (`.t-h2`, `.card`, `.btn`...),
  todo en un único `brawlstats.css`. Evita la curva de Tailwind y mantiene
  el bundle muy ligero.
- **Sequelize**: ORM maduro con buen soporte para MySQL, asociaciones
  declarativas en `models/index.js` y `sync({ alter: true })` cómodo en dev.
  En prod se desactiva el `alter` para evitar cambios automáticos.
- **JWT en `localStorage`**: simple y suficiente para un fan-site sin
  movimiento de dinero. Como mejora futura: pasar a cookies `httpOnly`
  + CSRF token.
- **Doble fuente de datos para win rate**:
  - `dataset_battles` (importado de scripts Python `recolector_*.py`) para
    estadísticas a gran escala.
  - `battles` (sincronizado del battlelog de cada usuario logueado) para
    estadísticas personales.
  El controlador elige automáticamente la fuente con datos.
- **Proxy `/api/brawlapi/*`**: BrawlAPI no expone CORS para `*`, así que el
  backend hace de passthrough con axios. Permite además cachear respuestas
  pesadas (`/maps` 10 min, `/brawlers/winrates` 5 min) en memoria.
- **Iconos del sidebar**: tras incidencias con `react-icons` en algunos
  entornos, se ha estabilizado un *fallback* con emojis del sistema en
  `Sidebar.jsx`. No dependen de paquetes externos y son consistentes en
  todos los navegadores soportados.
- **Tier list desde la BD propia (`GET /stats/tierlist`)**: pasamos de leer
  win rates de BrawlAPI a calcularlos desde nuestras propias partidas. El
  endpoint intenta agregar primero la tabla `stats` con JOIN a `brawlers`
  (lo deseable a futuro cuando se rellene con wins/losses); si está vacía,
  cae a `dataset_battles` (573 k partidas reales del dataset TFG). Filtra
  por `gameMode`, exige `totalGames >= 5` y ordena por `winRate DESC`. La
  decisión la motiva un bug: BrawlAPI dejó de exponer `stats.winRate` por
  modo para la mayoría de brawlers, así que dependía de un dato que ya no
  es fiable.
- **Top mundial por brawler reconstruido desde Supercell**: Supercell
  retiró `/rankings/{country}/brawlers/{id}/players` (responde 404). En su
  lugar, `services/supercell.service.js::getTopPlayersForBrawler()` lee el
  top global de jugadores y, para los primeros 30, consulta su profile en
  lotes de 5 (`Promise.all`), respetando rate-limit y cacheando 10 min.
  Filtra `profile.brawlers[]` por el `brawlerId`, ordena por trofeos y
  devuelve top 5. Eliminado el fallback antiguo a BrawlAPI rankings.
- **Reportes PDF generados con PDFKit**: librería pura JS, sin headless
  Chrome, así el servidor puede ser ligero (importante en el hosting de un
  TFG).
- **Dataset de partidas en `dataset_battles`**: separar el dataset masivo
  del histórico personal evita mezclar señal con ruido (los usuarios
  vinculados son pocos vs miles de batallas del dataset).
- **Sin ORM en el frontend**: las llamadas a la API se hacen con `fetch`
  envuelto en `services/api.js`. Suficiente para el alcance del proyecto y
  evita depender de TanStack Query u otras libs grandes.
- **Gating del panel admin en 3 capas**: ver §7. La motivación es no
  depender solo del frontend (que un usuario podría manipular). Sidebar
  esconde el item con `requiresAdmin: true`, `<AdminRoute>` redirige a `/`
  si se entra a `/admin` por URL, y el backend rechaza con 403 cualquier
  ruta admin sin `role === 'admin'`. El cliente además refresca el `user`
  desde `GET /auth/me` al montar para no fiarse de un `localStorage`
  obsoleto.
- **URL CDN `/regular/` para gadgets/star powers**: Brawlify dejó de
  publicar `/borderless/` para IDs nuevos (Glowbert, hipercargas recientes).
  `Builds.jsx` ignora el `imageUrl` que viene en la respuesta de BrawlAPI
  y construye la URL siempre desde el `id` con `/regular/`; añadido
  `fixCdn()` como red de seguridad por si alguna URL escapa con
  `/borderless/`.
- **Cache del seed con `Tutorial.sync({ force: true })`**: el cambio de
  esquema de la tabla `tutorials` (campos español → inglés) no lo resuelve
  `sync({ alter: true })` por la complejidad de renombrar columnas en
  MySQL. El seed dropea y recrea **solo** esa tabla, dejando las demás
  intactas. El resto del proyecto sigue con `sequelize.sync()` no
  destructivo en arranque.
